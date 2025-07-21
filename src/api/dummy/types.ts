import type { IBaseDTO } from '../types'

interface IUser {
  firstName: string
  id: number
  lastName: string
}

interface IUsersDTO extends IBaseDTO {
  users: IUser[]
}

export type { IUser, IUsersDTO }
