interface IBaseDTO {
  limit: number
  skip: number
  total: number
}

interface IListDTO {
  filter?: Record<string, string>[]
  limit?: number
  order?: 'asc' | 'desc'
  query?: string
  select?: string[]
  skip?: number
  sortBy?: string
}

export type { IBaseDTO, IListDTO }
