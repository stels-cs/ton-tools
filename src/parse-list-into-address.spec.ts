import { splitLineInto } from "./parse-list-into-address";


describe('parse-list-into-address', () => {
  it('split 1', () => {
    const i = splitLineInto(`a\nb\nc`)
    const b=  i.next().value
    expect(b).toEqual(['a','b','c'])
  })

  it('split 2', () => {
    const i = splitLineInto([
      100,
      200,
      300,
      400,
      500
    ].join('\n'), '\n', 3)
    const b = i.next().value
    expect(b).toEqual(['100','200','300'])

    const b1 = i.next().value
    expect(b1).toEqual(['400','500'])
  })

  it('split 3', async () => {
    const input = ['1','2','3','4','501','909','100004'].join('\n')
    const output:string[] = []
    for await (const x of splitLineInto(input)) {
      output.push(...x)
    }
    expect(output.join('\n')).toEqual(input)
  })
})
