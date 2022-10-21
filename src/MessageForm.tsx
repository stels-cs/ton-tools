import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { delay } from "./utils";
import Form from "react-bootstrap/Form";
import { Button, Col, Row } from "react-bootstrap";
import TonWeb from "tonweb";
import { Address, Builder, Cell, toNano } from "ton";
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
};

export const MessageForm: React.FC<{ seed: string[], provider:HttpProvider }> = (props) => {
  const { register, handleSubmit } = useForm<Inputs>();
  const [ sendStatus, setStatus ] = useState('Send')

  const makeTransfer = async (input: Inputs) => {
    // const keyPair = await tonMnemonic.mnemonicToKeyPair(props.seed);
    const cell = ((type, payload) => {
      switch (type) {
        case "cell":
          return Cell.fromBoc(input.payload)[0]
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
    })(input.payloadType, input.payload)


    if (input.fromWallet === 'hlv1') {

      const hlw1 = new HighloadWallet({
        keyPair: await mnemonicToWalletKey(props.seed),
        client: props.provider,
      })

      await hlw1.sendOneTransaction({
        to: Address.parse(input.toAddress),
        value: toNano(input.value),
        body: cell
      }).send()

      return
    }
    const keyPair = await tonMnemonic.mnemonicToKeyPair(props.seed);
    const wallet = new TonWeb.Wallets.all[input.fromWallet](props.provider, { publicKey: keyPair.publicKey });
    const seqno = await wallet.methods.seqno().call();
    await wallet.methods.transfer({
      secretKey: keyPair.secretKey,
      toAddress: Address.parse(input.toAddress).toFriendly(),
      amount: TonWeb.utils.toNano(input.value),
      seqno: seqno || 0,
      payload: TonWeb.boc.Cell.oneFromBoc(cell.toBoc({idx:false}).toString('hex')),
      sendMode: 3,
    }).send();
  }

  const onSubmit: SubmitHandler<Inputs> = data => {
    console.log(data);
    setStatus('...');
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
    <Button variant="primary" type="submit">
      {sendStatus}
    </Button>
  </Form>

}