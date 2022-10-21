import { CellType } from "./CellType";
import { Address, Builder, toNano } from "ton";
import BN from "bn.js";


export function build(source: CellType) {
  const builder = new Builder()
  for(const field of source) {
    switch (field.type) {
      case "address":
        builder.storeAddress(field.address !== null  ? Address.parse(field.address) : null)
        break;
      case "buffer":
        builder.storeBuffer(field.buffer)
        break;
      case "int":
        builder.storeInt(typeof field.int === "string" ? new BN(field.int) : field.int, field.size)
        break
      case "uint":
        builder.storeInt(typeof field.uint === "string" ? new BN(field.uint) : field.uint, field.size)
        break
      case "nanoton":
        builder.storeCoins(typeof field.nanoton === "string" ? new BN(field.nanoton) : field.nanoton)
        break
      case "ton":
        builder.storeCoins(new BN(toNano(field.ton)))
        break;
      case "string":
        builder.storeBuffer(Buffer.from(field.string, "utf8"))
        break
      case "ref":
        const cell = build(field.cell)
        builder.storeRef(cell)
        break
      default:
        ((x:never) => {
          throw new Error(`unexpected type ${(x as any).type}`)
        })(field)
    }
  }
  return builder.endCell()
}