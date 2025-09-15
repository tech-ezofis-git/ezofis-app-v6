import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { InfiniteQueryOptions } from '@/api/dummy/types/option'

export default function useAsyncOptions(
  getQueryOptions: () => InfiniteQueryOptions,
) {
  const [search, setSearch] = useState('')
  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    useInfiniteQuery(getQueryOptions())

  const loading = isFetching || isFetchingNextPage
  const options = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) ?? []
  }, [data])

  const handleBottomReached = () => {
    if (hasNextPage && !loading) {
      fetchNextPage()
    }
  }

  return {
    handleBottomReached,
    loading,
    options,
    search,
    onSearch: setSearch,
  }
}
