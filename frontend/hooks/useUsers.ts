import { useQuery } from '@tanstack/react-query'
import { usersAPI } from '@/lib/api'

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
}

export const useUsers = () => {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: usersAPI.getAll,
    staleTime: 10 * 60 * 1000,
  })
}