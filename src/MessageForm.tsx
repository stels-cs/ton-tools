import React, { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { delay } from "./utils";
import Form from "react-bootstrap/Form";
import { Button, Col, Row } from "react-bootstrap";
import TonWeb from "tonweb";
import { Address, Builder, Cell, StateInit, toNano } from "ton";
import { HighloadWallet } from "./HighloadWallet/HighloadWallet";
import { mnemonicToWalletKey } from "ton-crypto";
import { HttpProvider } from "tonweb/dist/types/providers/http-provider";
import { build } from "./jsonCell/builder";
import { CellType } from "./jsonCell/CellType";
import * as tonMnemonic from "tonweb-mnemonic";
import JSON5 from 'json5';

type Inputs = {
  fromWallet: 'v2R1' | 'v2R2' | 'v3R1' | 'v3R2' | 'v4R1' | 'v4R2' | 'hlv1',
  toAddress: string,
  value: string,
  mode: number,
  payload: string,
  payloadType: 'text' | 'cell' | 'json',
  stateInitCode: string,
  stateInitData: string,
  stateInitDataType:  'cell' | 'json',
};

export const MessageForm: React.FC<{ seed: string[], provider:HttpProvider }> = (props) => {
  const { register, handleSubmit } = useForm<Inputs>();
  const [ sendStatus, setStatus ] = useState('Send')

  const makeTransfer = async (input: Inputs) => {
    // const keyPair = await tonMnemonic.mnemonicToKeyPair(props.seed);
    const buildCell = ((type:Inputs['payloadType'], payload:string) => {
      switch (type) {
        case "cell":

          return Cell.fromBoc(Buffer.from(payload, 'base64'))[0]
        case "json":

          return build(JSON5.parse(payload) as CellType)
        case "text":
          return (new Builder()).storeUint(0, 32)
            .storeBuffer(Buffer.from(payload, 'utf8')).endCell()
        default:
          ((x:never) => {
            throw new Error(`unexpected type ${(x as any)}`)
          })(type)
      }
    })

    let stateInit: StateInit|null = null
    if (input.stateInitCode) {
      const code = Cell.fromBoc(Buffer.from(input.stateInitCode, 'base64'))[0];
      const data = buildCell(input.stateInitDataType, input.stateInitData)
      stateInit = new StateInit({
        code: code,
        data: data,
      })
    }


    if (input.fromWallet === 'hlv1') {

      const hlw1 = new HighloadWallet({
        keyPair: await mnemonicToWalletKey(props.seed),
        client: props.provider,
      })

      await hlw1.sendOneTransaction({
        to: Address.parse(input.toAddress),
        value: toNano(input.value),
        body: buildCell(input.payloadType, input.payload),
        stateInit: stateInit||undefined,
      }).send()

      return
    }

    const payload = buildCell(input.payloadType, input.payload);
    const webPayload = TonWeb.boc.Cell.oneFromBoc(payload.toBoc({idx:false}).toString('hex'));
    const keyPair = await tonMnemonic.mnemonicToKeyPair(props.seed);
    const wallet = new TonWeb.Wallets.all[input.fromWallet](props.provider, { publicKey: keyPair.publicKey });
    const seqno = await wallet.methods.seqno().call();
    await wallet.methods.transfer({
      secretKey: keyPair.secretKey,
      toAddress: Address.parse(input.toAddress).toFriendly(),
      amount: TonWeb.utils.toNano(input.value),
      seqno: seqno || 0,
      payload: webPayload,
      stateInit: stateInit ? ((s:StateInit) => {
        const c = new Cell();
        s.writeTo(c);
        return TonWeb.boc.Cell.oneFromBoc(c.toBoc({idx:false}).toString('hex'))
      })(stateInit) : undefined,
      sendMode: 3,
    }).send();
  }

  const processTransfer = (data:Inputs) => {
    makeTransfer(data).then(async () => {
      setStatus('Done!');
      await delay(500);
      setStatus('Send');
    }).catch(async e => {
      console.log('Error transfer', e);
      setStatus('Error');
      await delay(1500);
      setStatus('Send');
    })
  }

  useEffect(() => {
    (window as any).dSend = processTransfer
    return () => {
      (window as any).dSend = null;
    }
    // eslint-disable-next-line
  }, [props.seed, props.provider])

  const onSubmit: SubmitHandler<Inputs> = data => {
    console.log(data);
    setStatus('...');
    processTransfer(data)
  };

  return <Form onSubmit={handleSubmit(onSubmit)}>
    <Row className="mb-3">
      <Form.Group lg={2} as={Col} className="mb-3">
        <Form.Label>Wallet</Form.Label>
        <Form.Select {...register('fromWallet')}>
          <option value="v2R1">v2R1</option>
          <option value="v2R2">v2R2</option>
          <option value="v3R1">v3R1</option>
          <option value="v3R2">v3R2</option>
          <option value="v4R1">v4R1</option>
          <option value="v4R2">v4R2</option>
          <option value="hlv1">hlv1</option>
        </Form.Select>
      </Form.Group>

      <Form.Group as={Col}  className="mb-3">
        <Form.Label>Address</Form.Label>
        <Form.Control as="input" placeholder="EQ..." {...register('toAddress')} />
      </Form.Group>

      <Form.Group lg={2} as={Col} className="mb-3">
        <Form.Label>Amount (TON)</Form.Label>
        <Form.Control as="input" placeholder="0.05" {...register('value')} />
      </Form.Group>
    </Row>

    <Row className="mb-3">
      <Form.Group lg={2} as={Col}>
        <Form.Label>Payload type</Form.Label>
        <Form.Select {...register('payloadType')}>
          <option value="text">text</option>
          <option value="cell">cell</option>
          <option value="json">json</option>
        </Form.Select>
      </Form.Group>
      <Form.Group as={Col}>
        <Form.Label>Payload</Form.Label>
        <Form.Control as="textarea" placeholder="" {...register('payload')} />
      </Form.Group>
    </Row>

    <Row className="mb-3">
      <Form.Group lg={2} as={Col}>
      </Form.Group>
      <Form.Group as={Col}>
        <Form.Label>StateInit code</Form.Label>
        <Form.Control as="textarea" placeholder="base64..." {...register('stateInitCode')} />
      </Form.Group>
    </Row>
    <Row className="mb-3">
      <Form.Group lg={2} as={Col}>
        <Form.Label>StateInit data type</Form.Label>
        <Form.Select {...register('stateInitDataType')}>
          <option value="cell">cell</option>
          <option value="json">json</option>
        </Form.Select>
      </Form.Group>
      <Form.Group as={Col}>
        <Form.Label>StateInit data</Form.Label>
        <Form.Control as="textarea" placeholder="" {...register('stateInitData')} />
      </Form.Group>
    </Row>
    <Button variant="primary" type="submit">
      {sendStatus}
    </Button>
  </Form>

}