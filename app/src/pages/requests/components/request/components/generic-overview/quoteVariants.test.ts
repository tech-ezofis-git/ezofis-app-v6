import { describe, expect, it } from 'vitest'
import { extractQuoteVariants } from './quoteVariants'

const row = (Product: string, Price: number) => ({
  Price,
  Product,
  Qty: 1,
  Subtotal: Price,
})

const main = [row('SGV2_DOOR_OP_1S42_L', 4955.28), row('ADAPTOR', 264.32)]
const recommended = [row('SGV2_DOOR_OP_1S42_L', 4955.28), row('DOOR', 1797.6)]

describe('quote variant totals', () => {
  const variants = () =>
    extractQuoteVariants({
      formVariantTables: [
        // Saved totals leave out freight and repeat Quote 1's total.
        { columns: [], freight: 375, id: 'main', rows: main, total: 5898.74 },
        { columns: [], id: 'alt', rows: recommended, total: 5898.74 },
      ],
      freight: 375,
      lineItems: main,
      result: {},
      taxRate: 0.13,
    } as never)

  it('works the total out from the lines and includes freight', () => {
    const quote1 = variants().find((variant) => variant.id === 'main')
    expect(quote1?.total).toBe(6321.9)
  })

  it('gives Quote 2 its own total with the freight from Quote 1', () => {
    const quote2 = variants().find((variant) => variant.id === 'alt')
    expect(quote2?.freight).toBe(375)
    expect(quote2?.total).toBe(8054.5)
  })
})
