import type { IListDTO } from './types'

function normalizeQueryParams(dto: IListDTO) {
  const { filter, limit, order, query, select, skip, sortBy } = dto
  return {
    filter: filter ?? [],
    limit: limit ?? 50,
    order: order ?? 'asc',
    query: query ?? '',
    select: select ? select.join(',') : '',
    skip: skip ?? 0,
    sortBy: sortBy ?? 'id',
  }
}

export { normalizeQueryParams }
