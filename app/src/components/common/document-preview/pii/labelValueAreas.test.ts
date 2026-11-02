import { describe, expect, it } from 'vitest'
import type { TextBox } from './types'
import { findLabelValueAreas } from './labelValueAreas'

const box = (
  text: string,
  left: number,
  top: number,
  width: number,
  height = 1.2,
  pageIndex = 0,
): TextBox => ({ height, left, pageIndex, text, top, width })

/** Two reward-points tables like the bank statement: headers split over two lines. */
const rewardTables = [
  box('Scheme', 10, 20, 6),
  box('Opening', 40, 20, 6),
  box('Balance', 40, 21.5, 6),
  box('Points', 52, 20, 6),
  box('Accrued', 52, 21.5, 6),
  box('Reward Plus 2018', 10, 25, 12),
  box('1,456', 40, 25, 4),
  box('0', 52, 25, 1),
  box('REWARD POINTS STATEMENT FOR', 5, 29, 25),
  box('Opening', 40, 33, 6),
  box('Balance', 40, 34.5, 6),
  box('Points', 52, 33, 6),
  box('Accrued', 52, 34.5, 6),
  box('Reward Plus 2019', 10, 38, 12),
  box('525', 40, 38, 3),
  box('163', 52, 38, 3),
]

const texts = (boxes: TextBox[], labels: string[]) =>
  findLabelValueAreas(boxes, labels).map((area) => area.sourceValue)

describe('findLabelValueAreas', () => {
  it('masks the values under a header split over two lines, in every table', () => {
    expect(texts(rewardTables, ['Opening Balance'])).toEqual(['1,456', '525'])
  })

  it('leaves neighbouring columns and the label itself visible', () => {
    const values = texts(rewardTables, ['Opening Balance'])
    expect(values).not.toContain('0')
    expect(values).not.toContain('163')
    expect(values).not.toContain('Points')
    expect(values).not.toContain('Opening')
  })

  it('marks covers as exact unless told otherwise', () => {
    expect(
      findLabelValueAreas(rewardTables, ['Opening Balance']).every(
        (area) => area.precise,
      ),
    ).toBe(true)
    expect(
      findLabelValueAreas(rewardTables, ['Opening Balance'], false).every(
        (area) => !area.precise,
      ),
    ).toBe(true)
  })

  it('masks every statement row in a column, even rows far apart', () => {
    const boxes = [
      box('Withdrawal', 60, 10, 8),
      box('Balance', 75, 10, 6),
      box('ATM WITHDRAWAL SELF-SWITCH', 5, 14, 30),
      box('1,500.00', 62, 14, 6),
      box('112,953.65', 75, 14, 7),
      box('ATM WITHDRAWAL SELF-SWITCH', 5, 21, 30),
      box('966.00', 63, 21, 5),
      box('110,487.65', 75, 21, 7),
      box('POS PURCHASE', 5, 28, 15),
      box('2,000.00', 62, 28, 6),
      box('109,523.14', 75, 28, 7),
      box('Thank you for banking', 60, 32, 18),
    ]
    expect(texts(boxes, ['Withdrawal'])).toEqual([
      '1,500.00',
      '966.00',
      '2,000.00',
    ])
  })

  it('keeps going past rows with an empty cell in the column', () => {
    const boxes = [
      box('Deposit', 45, 10, 6),
      box('Withdrawal', 60, 10, 8),
      box('Balance', 75, 10, 6),
      // Three deposit-only rows first: no Withdrawal value for a long way.
      ...[13, 17, 21].flatMap((top) => [
        box('IMPS CREDIT', 5, top, 12),
        box('1,660.00', 46, top, 6),
        box('117,805.36', 75, top, 7),
      ]),
      box('ATM WITHDRAWAL', 5, 25, 15),
      box('1,500.00', 62, 25, 6),
      box('116,305.36', 75, 25, 7),
    ]
    expect(texts(boxes, ['Withdrawal'])).toEqual(['1,500.00'])
  })

  it('masks an inline value after "Label:"', () => {
    const boxes = [box('Account No:', 10, 50, 10), box('12345678', 21, 50, 8)]
    expect(texts(boxes, ['Account No'])).toEqual(['12345678'])
  })

  it('masks an inline value after a separate colon item', () => {
    const boxes = [
      box('PAN', 10, 55, 3),
      box(':', 13.5, 55, 0.5),
      box('ABCDE1234F', 15, 55, 9),
    ]
    expect(texts(boxes, ['PAN Number', 'PAN'])).toEqual(['ABCDE1234F'])
  })

  it('covers only the value part of "Label: value" inside one text item', () => {
    const [area] = findLabelValueAreas(
      [box('Opening Balance: 1,456', 10, 60, 22)],
      ['Opening Balance'],
    )
    expect(area.sourceValue).toBe('1,456')
    expect(area.left).toBeGreaterThan(10 + 22 * 0.7)
    expect(area.width).toBeLessThan(22 * 0.3)
  })

  it('does not treat the label inside body text as a column header', () => {
    const boxes = [
      box('BALANCE FORWARD', 10, 70, 15),
      box('SALARY CREDIT', 10, 72, 15),
    ]
    expect(texts(boxes, ['Balance'])).toEqual([])
  })

  it('returns nothing without labels or boxes', () => {
    expect(findLabelValueAreas(rewardTables, [])).toEqual([])
    expect(findLabelValueAreas([], ['Opening Balance'])).toEqual([])
  })
})
