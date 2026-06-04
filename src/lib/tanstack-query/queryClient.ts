import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents queries from refetching automatically when the browser tab is refocused
      staleTime: 5000,             // Keeps data considered "fresh" for 5 seconds to avoid immediate double-fetching on navigation/tab switching
    },
  },
})

