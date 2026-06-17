import { queryOptions } from '@tanstack/react-query'
import { authApiV6 } from '@/api/v6/folder/folder'

export const folderQueries = {
  all: () => ['folders'] as const,
  repositories: () => [...folderQueries.all(), 'repositories'] as const,
}

export const getRepositoriesQueryOptions = () => {
  return queryOptions({
    queryKey: folderQueries.repositories(),
    queryFn: async () => {
      const { data, error } = await authApiV6.getRepositorys()
      if (error) throw new Error(String(error))

      const extractData = (obj: any): any[] => {
        if (!obj) return []
        if (Array.isArray(obj)) return obj
        const inner = obj.data || obj.payload || obj.value
        if (Array.isArray(inner)) return inner
        if (typeof obj === 'object') {
          for (const key in obj) {
            const result = extractData(obj[key])
            if (result.length > 0) return result
          }
        }
        return []
      }

      const repositories = extractData(data)

      // Map to standardized { id, name } structure
      return repositories.map((repo: any) => ({
        id: repo.id,
        name: repo.name || repo.value || 'Untitled Folder',
      }))
    },
  })
}
