import { ContractSource } from 'ton/dist/contracts/sources/ContractSource'
import { Cell, contractAddress } from 'ton'

export const HighloadWalletCodeBoc =
  'te6cckEBCAEAlwABFP8A9KQT9LzyyAsBAgEgAwIAuPKDCNcYINMf0x/THwL4I7vyY+1E0NMf0x/T/9FRMrryoVFEuvKiBPkBVBBV+RDyo/QE0fgAf44WIYAQ9HhvpSCYAtMH1DAB+wCRMuIBs+ZbAaTIyx/LH8v/ye1UAgFIBwQCAUgGBQARuMl+1E0NcLH4ABe7Oc7UTQ0z8x1wv/gABNAwE3l/rQ=='

export const HighloadWalletCodeCell = Cell.fromBoc(Buffer.from(HighloadWalletCodeBoc, 'base64'))[0]

export class HighloadWalletSource implements ContractSource {
  initialCode: Cell
  initialData: Cell
  type: string
  workchain: number

  constructor(publicKey: Buffer, subwalletId: number = 1) {
    this.initialCode = HighloadWalletCodeCell
    this.initialData = HighloadWalletSource.createInitialData(publicKey, subwalletId)
    this.type = 'HighloadWalletSource'
    this.workchain = 0
  }

  public static createInitialData(publicKey: Buffer, subwalletId: number = 1) {
    const dataCell = new Cell()
    dataCell.bits.writeUint(0, 32) // segno
    dataCell.bits.writeUint(subwalletId, 32)
    dataCell.bits.writeBuffer(publicKey)
    return dataCell
  }

  backup(): string {
    return ''
  }

  describe(): string {
    return this.type
  }

  getAddress() {
    return contractAddress(this)
  }
}
