import React, { useEffect, useState } from "react";
import { Col, Row, Container, InputGroup, FormText } from "react-bootstrap";
import Form from 'react-bootstrap/Form';
import TonWeb from "tonweb";

function tParse(trys:(() => string)[]) {
  for(const fn of trys) {
    try {
      const addr = fn()
      return new TonWeb.Address(addr)
    } catch (e) {

    }
  }
  return new TonWeb.Address(trys[0]())
}

const Address: React.FC<{}> = (props) => {
  const [list, setList] = useState('')
  const [parsed, setParsed] = useState('')

  const parseList = (list:string) => {
    const lines = list.split("\n")
    const x = []
    for(const line of lines) {
      const clearAddress = line.trim().split(' ')[0]
      try {
        const a = tParse([
          () => clearAddress,
          () => clearAddress.trim(),
          () => ((clearAddress.match(/[A-z0-9-\/]{48}/gmu)||[])[0] || ''),
          () => ((clearAddress.match(/0:[0-9a-z]{64}/gmu)||[])[0] || ''),
          () => '0:'+((clearAddress.match(/[0-9a-z]{64}/gmu)||[])[0] || ''),
        ])
        const friendly = a.toString(true, true, true, false)
        const classic = a.toString(false)
        x.push(`${friendly}\t${classic}\t${line}`)
      } catch (e) {
        x.push(`wrong ${(e as any).message}\t${line}`)
      }
    }
    setParsed(x.join("\n"))
  }

  useEffect(() => {
    parseList(list)
  }, [list])

  return <Container>
    <Row>
      <Col>
        <Form>
          <Form.Group className="mb-3" controlId="formBasicEmail">
            <Form.Label>Ton address new lines</Form.Label>
            <Form.Control value={list}
                          rows={5}
                          onChange={e => setList(e.target.value)}
                          as="textarea" placeholder="EQ 0:" />
          </Form.Group>
        </Form>
      </Col>
    </Row>
    {!!parsed ? <Row><Col>
      <pre>{parsed}</pre>
    </Col></Row> : null}
  </Container>
}

export default Address;