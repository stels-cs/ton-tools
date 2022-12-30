import React, { useCallback, useEffect, useState } from "react";
import { Col, Container, Row, Table } from "react-bootstrap";
import Form from 'react-bootstrap/Form';
import TonWeb from "tonweb";
import './Address.css';
import { CopyButton } from "../CopyButton";
import { DownloadButton } from "../DownloadButton";

function tParse(trys: (() => string)[]) {
  for (const fn of trys) {
    try {
      const addr = fn()
      return new TonWeb.Address(addr)
    } catch (e) {

    }
  }
  return new TonWeb.Address(trys[0]())
}

const Address: React.FC<{}> = (props) => {
  const [ list, setList ] = useState(`EQB5HQfjevz9su4ZQGcDT_4IB0IUGh5PM2vAXPU2e4O6_d2j
0:791d07e37afcfdb2ee194067034ffe080742141a1e4f336bc05cf5367b83bafd`)
  const [ parsed, setParsed ] = useState<string[][]>([])

  const [ views, setViews ] = useState({
    friendly: true,
    classic: true,
    nonBounce: false,
    originalLine: false,
  })

  const parseList = useCallback((list: string) => {
    const lines = list.split("\n")
    const x: string[][] = []
    for (const line of lines) {
      const clearAddress = line.trim().split(' ')[0]
      try {
        const a = tParse([
          () => clearAddress,
          () => clearAddress.trim(),
          () => ((clearAddress.match(/[A-z0-9-/]{48}/gmu) || [])[0] || ''),
          () => ((clearAddress.match(/[-0-9]{1,2}:[0-9a-z]{64}/gmu) || [])[0] || ''),
          () => '0:' + ((clearAddress.match(/[0-9a-z]{64}/gmu) || [])[0] || ''),
          () => '0:' + ((clearAddress.match(/[0-9a-z]{66}/gmu) || [])[0] || '').replace(/^0x/u, ''),
        ])
        const friendly = a.toString(true, true, true, false)
        const nonBounce = a.toString(true, true, false, false)
        const classic = a.toString(false)
        const oneLine: string[] = []
        if (views.friendly) {
          oneLine.push(friendly)
        }
        if (views.classic) {
          oneLine.push(classic)
        }
        if (views.nonBounce) {
          oneLine.push(nonBounce)
        }
        if (views.originalLine) {
          oneLine.push(line)
        }
        x.push(oneLine)
      } catch (e) {
        x.push([ `wrong ${(e as any).message}\t${line}` ])
      }
    }
    setParsed(x)
  }, [views])

  useEffect(() => {
    parseList(list)
  }, [ list, parseList, views ])

  return <Container className="Address">
    <Form>
      <Row>
        <Col>
          <h1>TON Address</h1>
          <p>Один и тот-же адрес в TON может выглядеть по разному. Этот сервис парсит тон адрес и показывает его в
            различных форматах. Можно распарсить много адресов за раз если вставить их с новой строки.</p>
        </Col>
      </Row>
      <Form.Group className="mb-3" controlId="formBasicEmail">
        <Form.Label>Список адресов</Form.Label>
        <Form.Control value={list}
                      rows={5}
                      onChange={e => setList(e.target.value)}
                      as="textarea" placeholder="EQ 0:" />
      </Form.Group>

      <Row className="mb-1">
        <Form.Group className="mb-1" as={Col} controlId="flags">
          <Form.Check onChange={() => setViews({ ...views, friendly: !views.friendly })}
                      label="Friendly Bounce (как в тонкипере)" checked={views.friendly}></Form.Check>
        </Form.Group>
        <Form.Group className="mb-1 col-2" as={Col} controlId="classic">
          <Form.Check onChange={() => setViews({ ...views, classic: !views.classic })}
                      label="Raw (как в tonapi)" checked={views.classic}></Form.Check>
        </Form.Group>
        <Form.Group className="mb-1 col-4" as={Col} controlId="nonBounce">
          <Form.Check onChange={() => setViews({ ...views, nonBounce: !views.nonBounce })}
                      label="Friendly NonBounce (чтобы потерять тоны)" checked={views.nonBounce}></Form.Check>
        </Form.Group>
        <Form.Group className="mb-1" as={Col} controlId="originalLine">
          <Form.Check onChange={() => setViews({ ...views, originalLine: !views.originalLine })}
                      label="Исходная строка" checked={views.originalLine}></Form.Check>
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Col>
          <DownloadButton getText={() => ({
            data: [parsed.map(x => x.join(",")).join("\n")],
            mime: 'text/csv;charset=utf-8;',
            fileName: `ton-address-${(new Date()).toISOString().split('T').shift()}.csv`
          })} variant="secondary">Download CSV</DownloadButton>
          {' '}
          <DownloadButton getText={() => ({
            data: [parsed.map(x => x.join("\t")).join("\n")],
            mime: 'text/csv;charset=utf-8;',
            fileName: `ton-address-${(new Date()).toISOString().split('T').shift()}.tsv`
          })} variant="secondary">Download TSV</DownloadButton>
          {' '}
          <CopyButton getText={() => parsed.map(x => x.join(",")).join("\n")} variant="secondary">Copy CSV</CopyButton>
          {' '}
          <CopyButton getText={() => parsed.map(x => x.join("\t")).join("\n")} variant="secondary">Copy TSV</CopyButton>
        </Col>
        <Col>


        </Col>
      </Row>

    </Form>
    {!!parsed ? <Row><Col>
      <Table striped bordered>
        <tbody>
        {parsed.map((line, index) => <tr key={index}>{
          line.map((addr, index) => <td key={index}>{addr}</td>)
        }</tr>)}
        </tbody>
      </Table>
    </Col></Row> : null}
  </Container>
}

export default Address;