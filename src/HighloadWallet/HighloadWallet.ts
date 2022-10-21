import {
  Address,
  Cell,
  CellMessage,
  CommonMessageInfo,
  ExternalMessage,
  InternalMessage,
  SendMode,
  serializeDict,
  StateInit,
  toNano,
} from 'ton'
import { KeyPair, sign } from 'ton-crypto'
import { HighloadWalletSource } from './HighloadWalletSource'
import { Contract } from 'ton/dist/contracts/Contract'
import BN from 'bn.js'
import { delay } from "../utils";
import { HttpProvider } from "tonweb/dist/types/providers/http-provider";
import TonWeb from "tonweb";

type ContractState = {
  balance: number,
  state: "uninitialized"|"active",
  code: string,
  data: string,
}


export class HighloadWallet implements Contract {
  public source: HighloadWalletSource
  private keyPair: KeyPair
  private readonly subwalletId: number
  public readonly MAX_TRANSACTIONS = 100
  public address: Address
  private readonly innerClient: HttpProvider|undefined
  private lastKnownState?: ContractState

  constructor(options: { keyPair: KeyPair; subwalletId?: number; client?: HttpProvider }) {
    this.subwalletId = options.subwalletId ?? 1
    this.keyPair = options.keyPair
    this.innerClient = options.client
    this.source = new HighloadWalletSource(this.keyPair.publicKey, this.subwalletId)
    this.address = this.source.getAddress()
  }

  get client() {
    if (!this.innerClient) {
      throw new Error('client not created')
    }
    return this.innerClient
  }

  public async getState() {
    this.lastKnownState = await this.getContractState(this.address)
    console.log('state', this.lastKnownState)
    return this.lastKnownState
  }

  public async getCachesState() {
    if (this.lastKnownState) {
      return this.lastKnownState
    }
    return await this.getState()
  }

  public async getSegno():Promise<BN> {
    // const contractState = await this.getCachesState()
    // if (contractState.state === 'uninitialized') {
    //   return new BN(0)
    // }

    const res = await this.client.call2(this.address.toFriendly(), 'seqno', []).catch(e => {
      if (e instanceof Error && e.message.includes('parse response error')) {
        return null
      }
      throw e
    })
    if (res === null) {
      return new BN(0)
    }
    if (res instanceof TonWeb.utils.BN) {
      return new BN(res.toString())
    }
    console.error('Unexpected response', res)
    throw new Error('seqno bad response')
  }

  public async getBalance(): Promise<BN> {
    const contractState = await this.getCachesState()
    return new BN(contractState.balance)
  }

  public async sendMessage(body: Cell) {
    const isContractDeployed = (await this.getCachesState()).state === 'active'
    if (isContractDeployed) {
      const message = new ExternalMessage({
        to: this.address,
        body: new CommonMessageInfo({
          body: new CellMessage(body),
        }),
      })
      await this.sendExternalMessage(message)
    } else {
      const message = new ExternalMessage({
        to: this.address,
        body: new CommonMessageInfo({
          stateInit: new StateInit({ code: this.source.initialCode, data: this.source.initialData }),
          body: new CellMessage(body),
        }),
      })
      await this.sendExternalMessage(message)
    }
    this.lastKnownState = undefined
  }

  protected async sendExternalMessage(message:ExternalMessage) {
    const c = new Cell()
    message.writeTo(c)
    await this.client.sendBoc(c.toBoc({idx:false}).toString('base64'))
  }

  public async prepareMessage(transactionList: InternalMessage[], sendMode?: number) {
    const segno = await this.getSegno()
    return this.buildMessage({
      segno: segno.toNumber(),
      transactionList,
      sendMode,
    })
  }

  public sendTransactions(transactionList: InternalMessage[], sendMode?: number) {
    return {
      send: async () => {
        const body = await this.prepareMessage(transactionList, sendMode)
        const segno = await this.getSegno()
        await this.sendMessage(body)
        return segno.toNumber()
      },
      fee: async () => {
        return await this.fee(transactionList, sendMode)
      },
    }
  }

  public async fee(transactionList: InternalMessage[], sendMode?: number) {
    const body = await this.prepareMessage(transactionList, sendMode)
    const contractState = await this.getCachesState()
    const contractIsActive = contractState.state === 'active'
    const fee = await this.client.getEstimateFee( {
      address: this.address.toFriendly(),
      body:body.toBoc({idx:false}).toString('base64'),
      init_data: contractIsActive ? undefined : this.source.initialData.toBoc({idx:false}).toString('base64'),
      init_code: contractIsActive ? undefined : this.source.initialCode.toBoc({idx:false}).toString('base64'),
      ignore_chksig: false,
    })
    return new BN(
      fee.source_fees.in_fwd_fee +
        fee.source_fees.gas_fee +
        fee.source_fees.fwd_fee +
        fee.source_fees.storage_fee
    )
  }

  public buildMessage(opts: { transactionList: InternalMessage[]; segno: number; sendMode?: number }) {
    const { transactionList, segno, sendMode } = opts
    if (transactionList.length > this.MAX_TRANSACTIONS) {
      throw new Error(
        `Transaction list too large, max ${this.MAX_TRANSACTIONS}, got ${transactionList.length}`
      )
    }
    if (transactionList.length === 0) {
      throw new Error('Transaction list empty')
    }
    const message = new Cell()
    message.bits.writeUint(this.subwalletId, 32)
    message.bits.writeUint(Math.round(Date.now() / 1000) + 180, 32)
    message.bits.writeUint(segno, 32)
    message.bits.writeUint(1, 1) // idk why but its need to for parse dict

    const transactionMap = new Map<string, InternalMessage>()
    transactionList.forEach((message, index) => {
      transactionMap.set(new BN(index).toString(), message)
    })

    const dict = serializeDict(transactionMap, 16, (src, cell) => {
      cell.bits.writeUint(sendMode ?? SendMode.IGNORE_ERRORS + SendMode.PAY_GAS_SEPARATLY, 8)
      const c = new Cell()
      src.writeTo(c)
      cell.refs.push(c)
    })

    message.refs.push(dict)

    const signature = sign(message.hash(), this.keyPair.secretKey)
    const body = new Cell()
    body.bits.writeBuffer(signature)
    body.writeCell(message)

    return body
  }

  async getContractState(address: Address): Promise<ContractState> {
    return await this.client.getAddressInfo(address.toFriendly())
  }

  deployContract(value: BN, stateInit: { stateInitMessage: StateInit; address: Address; stateInit: Cell }) {
    return this.sendTransactions([
      new InternalMessage({
        to: stateInit.address,
        value,
        bounce: false,
        body: new CommonMessageInfo({
          stateInit: stateInit.stateInitMessage,
        }),
      }),
    ])
  }

  sendOneTransaction(tx: { sendMode?: number; to: Address; body?: Cell; value: BN; bounce?: boolean }) {
    return this.sendTransactions(
      [
        new InternalMessage({
          to: tx.to,
          value: tx.value,
          bounce: tx.bounce ?? true,
          body: new CommonMessageInfo({
            body: tx.body ? new CellMessage(tx.body) : undefined,
          }),
        }),
      ],
      tx.sendMode
    )
  }

  async waitNextSegno(segno: number) {
    let attempt = 0
    while (true) {
      attempt++
      this.lastKnownState = undefined
      const currentSegno = await this.getSegno()
      if (currentSegno.toNumber() !== segno) {
        return
      }
      if (attempt > 10) {
        throw new Error(`Segno not changed, expect not equal ${segno}, got ${currentSegno.toString()}`)
      }
      await delay(6000)
    }
  }

  async destroy(sendValueTo: Address) {
    return this.sendOneTransaction({
      to: sendValueTo,
      value: toNano(0),
      sendMode: SendMode.CARRRY_ALL_REMAINING_BALANCE + SendMode.DESTROY_ACCOUNT_IF_ZERO,
    }).send()
  }
}
