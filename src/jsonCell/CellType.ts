

export type CellField = {
  type: 'buffer', buffer: Buffer
} | {type: 'string', string: string}
| {type: 'uint', size:number, uint:number|string}
  | {type: 'int', size:number, int:number|string}
| {type: 'ton', ton:number}
  | {type: 'nanoton', nanoton:number|string}
  | {type: 'address', address:string|null}


export type CellType = (CellField|{type: 'ref', cell: CellType})[]
