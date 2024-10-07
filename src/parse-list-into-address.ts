import TonWeb from "tonweb";


export function * splitLineInto(input:string, sepChar:string = '\n', pack=100) {
  const buff:string[] = []
  let start = 0
  for(let i = 0; i <= input.length; i++) {
    if (i === input.length) {
      buff.push(input.substring(start, i))
      continue
    }
    if (input[i] === sepChar) {
      buff.push(input.substring(start, i))
      start = i + 1
      if (buff.length >= pack) {
        yield buff
        buff.splice(0, buff.length)
      }
    }
  }
  if (buff.length) {
    yield buff
  }
}

function tParse(trys: ((x:string) => string)[], inputAddr:string) {
  let error = new Error('no wrapper')
  for (const fn of trys) {
    try {
      const addr = fn(inputAddr)
      return new TonWeb.Address(addr)
    } catch (e) {
      error = e as Error
    }
  }
  throw error
}


export async function parseAddress(list:string, opts: {
  as: AbortSignal,
  friendly: boolean,
  nonBounce: boolean,
  classic: boolean,
  originalLine: boolean,
  onStatus: (stat:{processed:number, failed:number}) => void,
}) {
  const x: string[][] = []
  const parserList = [
    (clearAddress:string) => clearAddress.trim(),
    (clearAddress:string) => ((clearAddress.match(/[A-z0-9-/]{48}/gmu) || [])[0] || ''),
    (clearAddress:string) => ((clearAddress.match(/[-0-9]{1,2}:[0-9a-z]{64}/gmu) || [])[0] || ''),
    (clearAddress:string) => '0:' + ((clearAddress.match(/[0-9a-z]{64}/gmu) || [])[0] || ''),
    (clearAddress:string) => '0:' + ((clearAddress.match(/[0-9a-z]{66}/gmu) || [])[0] || '').replace(/^0x/u, ''),
  ]
  let lastReport = Date.now()
  let processed = 0
  let failed = 0
  for await (const lines of splitLineInto(list, '\n', 1000)) {
    for (const line of lines) {
      const clearAddress = line.trim().split(' ')[0]
      try {
        const a = tParse(parserList, clearAddress)
        const oneLine: string[] = []
        if (opts.friendly) {
          const friendly = a.toString(true, true, true, false)
          oneLine.push(friendly)
        }
        if (opts.nonBounce) {
          const nonBounce = a.toString(true, true, false, false)
          oneLine.push(nonBounce)
        }
        if (opts.classic) {
          const classic = a.toString(false)
          oneLine.push(classic)
        }
        if (opts.originalLine) {
          oneLine.push(line)
        }
        x.push(oneLine)
      } catch (e) {
        x.push([ `wrong ${(e as any).message}\t${line}` ])
        failed++
      }
    }
    processed += lines.length
    if (opts.as.aborted) {
      return null
    }
    if (Date.now() - lastReport > 1000) {
      lastReport = Date.now()
      opts.onStatus({
        processed, failed
      })
    }
  }

  return x
}
