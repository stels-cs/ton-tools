import React, { useEffect, useState } from 'react';
import * as tonMnemonic from 'tonweb-mnemonic'
import TonWeb from "tonweb";
import { HttpProvider } from "tonweb/dist/types/providers/http-provider";
import { TransferForm } from "../TransferForm";
import { Button, Col, Container, Row } from "react-bootstrap";
import { HighloadWallet } from "../HighloadWallet/HighloadWallet";
import {mnemonicToWalletKey} from 'ton-crypto'
import { MessageForm } from '../MessageForm';
import { getProvider } from "../tonProvider";

const provider = getProvider();

function App() {
  const [v,setV] = useState(1);
  const [seed, setSeed] = useState<string[]>([]);
  const [walletV3, setWalletV3] = useState('');
  const [walletV4, setWalletV4] = useState('');
  const [walletV4r2, setWalletV4r2] = useState('');
  const [hightLoadWalletV1, setHightLoadWalletV1] = useState('');

  const setupSeed = async (seed:string[]) => {
    const keyPair = await tonMnemonic.mnemonicToKeyPair(seed);
    setSeed(seed);
    const wallet = async (v:'v3R2'|'v4R1'|'v4R2'|'HLV1') => {
      if (v === "HLV1") {
        const hlw1 = new HighloadWallet({
          keyPair: await mnemonicToWalletKey(seed)
        })
        return new TonWeb.Address(hlw1.address.toFriendly())
      }
      const w = new TonWeb.Wallets.all[v]({} as HttpProvider, { publicKey: keyPair.publicKey });
      const { address } = await w.createStateInit()
      return address;
    }
    setWalletV3((await wallet('v3R2')).toString(true, true, true))
    setWalletV4((await wallet('v4R1')).toString(true, true, true))
    setWalletV4r2((await wallet('v4R2')).toString(true, true, true))
    setHightLoadWalletV1((await wallet('HLV1')).toString(true, true, true))
  }

  useEffect( () => {
    tonMnemonic.generateMnemonic().then(setupSeed);
  }, [v])
  return (
    <Container>
      <Row>
        <Col>
          <textarea style={{width:'100%'}} id="ownSeed"
                    onChange={async () => {
                      const seed = (document.getElementById('ownSeed') as any).value;
                      await setupSeed(seed.split(/[^a-z]/gmu));
                    }}
                    value={seed.join(',')} placeholder="own seed"/>
        </Col>
      </Row>
      <Row><Col>v3r2: {walletV3}</Col></Row>
      <Row><Col>v4r1: {walletV4}</Col></Row>
      <Row><Col>v4r2: {walletV4r2}</Col></Row>
      <Row><Col>hlv1: {hightLoadWalletV1}</Col></Row>

      <Row className="mb-3"><Col><Button variant="primary" onClick={() => setV(v => v+1)}>Generate next sid</Button></Col></Row>
      <Row>
        <Col>
          <h5 style={{marginBottom:'0'}}>Send any message</h5>
          <MessageForm provider={provider} seed={seed}/>
        </Col>
      </Row>
      <Row>
        <Col>
          <h5 style={{marginBottom:'0'}}>Send transfer payload</h5>
          <TransferForm provider={provider} seed={seed}/>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
