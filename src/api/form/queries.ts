import { queryOptions } from '@tanstack/react-query'
import formApi from './form'

export const formQueries = {
    all: () => ['forms'] as const,
    list: (page: number, size: number) => [...formQueries.all(), 'list', { page, size }] as const,
    detail: (id: string) => [...formQueries.all(), 'detail', id] as const,
}

export const getFormsListQueryOptions = (page: number, size: number) => {
    return queryOptions({
        queryKey: formQueries.list(page, size),
        queryFn: () => formApi.listAllForms(page, size),
    })
}
