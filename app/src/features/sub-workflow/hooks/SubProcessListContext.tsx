import { createContext, useContext } from 'react'
import type { SubProcessRow } from '../types'

/** Children of every request on the visible page of a list, keyed by parent process id. */
export const SubProcessListContext = createContext<
  Record<string, SubProcessRow[]>
>({})

export const useSubProcessList = () => useContext(SubProcessListContext)
