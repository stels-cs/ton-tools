import TonWeb from "tonweb";
import { delay } from "./utils";

const provider = new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC');
const origin = (provider as any).sendImpl as (x:any,y:any) => any

(provider as any).sendImpl = async function (x:any,y:any) {
  let attempts = 5
  let error:any = null
  while (attempts-- > 0) {
    try {
      return await origin.apply(provider, [x,y])
    } catch (e) {
      error = e
      if (typeof e === 'string' && e.includes('Rate limit')) {
        await delay(1000)
      } else {
        throw e
      }
    }
  }
  throw error
}

export function getProvider() {
  return provider
}