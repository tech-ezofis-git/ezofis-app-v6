import { describe, expect, it } from 'vitest'
import { buildEntryTrashPayload } from './entrySearchFilter'

describe('buildEntryTrashPayload', () => {
  it('asks the API for soft-deleted entries', () => {
    expect(buildEntryTrashPayload(500)).toEqual({
      currentPage: 1,
      includeFormJson: true,
      itemsPerPage: 500,
      mode: 'recyclebin',
    })
  })
})
