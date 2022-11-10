import React, { useState } from "react";
import { Button, Col, Container, Row } from "react-bootstrap";
import Form from 'react-bootstrap/Form';
import TonWeb from "tonweb";
import { getProvider } from "../tonProvider";
import { delay } from "../utils";

async function retry<T>(attempt:number, fn: () => Promise<T>):Promise<T> {
  let lastError: unknown|null = null
  while (attempt-- > 0) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      await delay(300)
    }
  }
  throw lastError
}

function buildContent(content:string) {
  const mimeType = 'application/octet-stream';
  return URL.createObjectURL(new Blob([content], {
    type: mimeType
  }));
}


function makeCSVLives(data:string[][], txs: any[]) {
  for(const tx of txs) {
    const {utime, in_msg: {value: in_value, source, destination}, out_msgs, transaction_id:{lt} } = tx

    const dateTime = new Date(Number(utime*1000))
    if (source) {
      data.push([
        dateTime.toISOString(),
        lt,
        TonWeb.utils.fromNano(in_value),
        source,
        destination,
        "0"
      ])
    }

    for(const out of out_msgs) {
      const {source, destination, value, created_lt} = out
      data.push([
        dateTime.toISOString(),
        created_lt,
        "0",
        source,
        destination,
        TonWeb.utils.fromNano(value)
      ])
    }
  }
}


const ExportTransactionHistory: React.FC<{}> = (props) => {
  const [ address, setAddress ] = useState('')
  const [ status, setStatus ] = useState('')
  const [ contentUrl, setContentUrl ] = useState('')
  const download =  () => {
    const p = getProvider()
    setContentUrl('')
    setStatus('working')
    p.getTransactions(address, 100)
      .then(async (head: any[]) => {
        let data: string[][] = []
        makeCSVLives(data, head)
        setStatus(`downloading... ${data.length}`)
        do {
          const oldId = head[head.length-1].transaction_id
          const archival = data.length >= 200
          head = await retry(5,() => p.getTransactions(address, archival ? 500 : 100, oldId.lt, oldId.hash, undefined, archival))
          makeCSVLives(data, head)
          setStatus(`downloading... ${data.length}`)
        } while (head.length >= 100)

        setStatus(`generating csv`)
        const csv = `Date & Time,In,From,To,Out\n${data.map(x => x.join(",")).join("\n")}`

        setContentUrl(buildContent(csv))
      }).catch(async e => {
        console.error(e)
        setStatus('error '+(e as any).message)
        await delay(10000);
    }).finally(() => {
      setStatus('')
    })
  }

  return <Container>
    <Row>
      <Col>
        <Form onSubmit={e => {
          e.preventDefault()
          if (!!status) return
          download()
        }}>
          <Row className="align-items-center">
            <Col xs="auto">
              <Form.Label className="mb-2">Paste ton address for download transaction history</Form.Label>
            </Col>
            <Col xs="auto">
                <Form.Control value={address}
                              className="mb-2"
                              onChange={e => setAddress(e.target.value)}
                              as="input" placeholder="EQ..." />
            </Col>
            <Col xs="auto">
              <Button disabled={!!status} variant="primary" type="submit" className="mb-2">
                {status || 'Download CSV'}
              </Button>
            </Col>
            {!!contentUrl && <Col xs="auto">
              <Button as="a"
                      href={contentUrl}
                      download={`${address}.csv`}
                      disabled={!!status} variant="secondary" className="mb-2">
                Save CSV file
              </Button>
            </Col>}
          </Row>
        </Form>
      </Col>
    </Row>
  </Container>
}

export default ExportTransactionHistory;