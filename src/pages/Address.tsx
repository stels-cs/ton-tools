import React, { useEffect, useState } from "react";
import { Col, Container, Row, Table } from "react-bootstrap";
import Form from 'react-bootstrap/Form';
import './Address.css';
import { CopyButton } from "../CopyButton";
import { DownloadButton } from "../DownloadButton";
import { parseAddress } from "../parse-list-into-address";

const Address: React.FC<{}> = (props) => {
  const [ list, setList ] = useState(``)
  const [ parsed, setParsed ] = useState<string[][]>([])
  const [ process, setProcess ] = useState<null | { ac: AbortController }>(null)

  const [ views, setViews ] = useState({
    friendly: true,
    classic: false,
    nonBounce: true,
    originalLine: false,
  })

  const onChangeParseTask = (list: string, v: typeof views) => {
    if (process) {
      process.ac.abort()
    }
    if (!list) {
      setParsed([])
      return
    }
    const as = new AbortController()
    parseAddress(list, {
      as: as.signal,
      friendly: v.friendly,
      nonBounce: v.nonBounce,
      classic: v.classic,
      originalLine: v.originalLine,
      onStatus: (stat) => {
          console.log('parse stat', stat)
      }
    }).then(x => {
      if (x) {
        setParsed(x)
      }
    }).catch(e => {
      if (!as.signal.aborted) {
        console.error('fail to parse list', e)
      }
    })
    setProcess({
      ac: as,
    })
  }

  useEffect(() => {
    onChangeParseTask(list, views)
  }, [list, views]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setList(e.target.value)
  }

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
        <Form.Label column="sm">Список адресов</Form.Label>
        <Form.Control value={list}
                      rows={5}
                      onChange={onChange}
                      as="textarea" placeholder="EQ..., 0:..., UQ..." />
      </Form.Group>

      <Row className="mb-1">
        <Form.Group className="mb-1" as={Col} controlId="flags">
          <Form.Check onChange={() => setViews({ ...views, friendly: !views.friendly })}
                      label="EQ (with bounce)" checked={views.friendly}></Form.Check>
        </Form.Group>
        <Form.Group className="mb-1 col-4" as={Col} controlId="nonBounce">
          <Form.Check onChange={() => setViews({ ...views, nonBounce: !views.nonBounce })}
                      label="UQ (no bounce)" checked={views.nonBounce}></Form.Check>
        </Form.Group>
        <Form.Group className="mb-1 col-2" as={Col} controlId="classic">
          <Form.Check onChange={() => setViews({ ...views, classic: !views.classic })}
                      label="0:fe (raw)" checked={views.classic}></Form.Check>
        </Form.Group>
        <Form.Group className="mb-1" as={Col} controlId="originalLine">
          <Form.Check onChange={() => setViews({ ...views, originalLine: !views.originalLine })}
                      label="Исходная строка" checked={views.originalLine}></Form.Check>
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Col>
          <DownloadButton getText={() => ({
            data: [ parsed.map(x => x.join(",")).join("\n") ],
            mime: 'text/csv;charset=utf-8;',
            fileName: `ton-address-${(new Date()).toISOString().split('T').shift()}.csv`
          })} variant="secondary">Download CSV</DownloadButton>
          {' '}
          <DownloadButton getText={() => ({
            data: [ parsed.map(x => x.join("\t")).join("\n") ],
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
        {parsed.slice(0, 1500).map((line, index) => <tr key={index}>{
          line.map((addr, index) => <td key={index}>{addr}</td>)
        }</tr>)}
        </tbody>
      </Table>
      {parsed.length >= 1500 && <h4>Can't show all ${parsed.length} lines, download file of need</h4>}
    </Col></Row> : null}
  </Container>
}

export default Address;
