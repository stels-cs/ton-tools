import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import * as tonMnemonic from "tonweb-mnemonic";
import TonWeb from "tonweb";
import { HttpProvider } from "tonweb/dist/types/providers/http-provider";
import { delay } from "./utils";

type Inputs = {
  fromWallet: 'v2R1'|'v2R2'|'v3R1'|'v3R2'|'v4R1'|'v4R2',
  nftAddress: string,
  value: string,
  newOwnerAddress: string,
  responseAddress: string,
  forwardAmount: string,
};

function addr(address:string) {
  if (address) {
    return  new TonWeb.Address(address)
  }
  return undefined as any as InstanceType<typeof TonWeb.Address>
}

export const TransferForm: React.FC<{seed:string[],provider:HttpProvider}> = (props) => {
  const { register, handleSubmit, formState: { errors } } = useForm<Inputs>();
  const [sendStatus, setStatus] = useState('Send')
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

  const makeTransfer = async (input: Inputs) => {
      const keyPair = await tonMnemonic.mnemonicToKeyPair(props.seed);
      const wallet = new TonWeb.Wallets.all[input.fromWallet](props.provider, { publicKey: keyPair.publicKey });
      const nft = new TonWeb.token.nft.NftItem(props.provider, {});
      const payload = await nft.createTransferBody({
        newOwnerAddress: addr(input.newOwnerAddress),
        responseAddress: addr(input.responseAddress),
        forwardAmount: input.forwardAmount ? TonWeb.utils.toNano(input.forwardAmount) : undefined
      })
      const seqno = await wallet.methods.seqno().call();
      await delay(1000);
      await wallet.methods.transfer({
        secretKey: keyPair.secretKey,
        toAddress: addr(input.nftAddress),
        amount: TonWeb.utils.toNano(input.value),
        seqno: seqno || 0,
        payload: payload,
        sendMode: 3,
      }).send();
  }

  // console.log(watch("example")) // watch input value by passing the name of it

  return (
    /* "handleSubmit" will validate your inputs before invoking "onSubmit" */
    <form onSubmit={handleSubmit(onSubmit)}>

      {errors.fromWallet && <span>This field is required</span>}
      <select defaultValue="v3R2" {...register("fromWallet")}>
        <option value="v3R2">v3R2</option>
        <option value="v4R2">v4R2</option>
        <option value="v4R1">v4R1</option>
        <option value="v2R1">v2R1</option>
        <option value="v2R2">v2R2</option>
        <option value="v3R1">v3R1</option>
      </select>

      {errors.nftAddress && <span>This field is required</span>}
      <input placeholder="nftAddress"
             defaultValue=""
             {...register("nftAddress", {required:true})} />


      {errors.value && <span>This field is required</span>}
      <input placeholder="value"
             defaultValue="0.03"
             {...register("value", {required:true})} />

      {errors.newOwnerAddress && <span>This field is required</span>}
      <input placeholder="newOwnerAddress"
             defaultValue=""
             {...register("newOwnerAddress", {required:true})} />

      <input placeholder="responseAddress"
             defaultValue=""
             {...register("responseAddress")} />

      <input placeholder="forwardAmount"
             defaultValue=""
             {...register("forwardAmount")} />


      <input type="submit" value={sendStatus} disabled={sendStatus !== 'Send'}/>
    </form>
  );
}
