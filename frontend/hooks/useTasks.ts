import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksAPI } from '@/lib/api'
import { Task, TaskStatus, TasksResponse, StatsResponse } from '@/types'

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...taskKeys.lists(), { filters }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: number) => [...taskKeys.details(), id] as const,
}

export const useTasks = (params?: { 
  myTasksOnly?: boolean
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}) => {
  return useQuery({
    queryKey: taskKeys.list({ 
      myTasksOnly: params?.myTasksOnly || false,
      page: params?.page || 1,
      pageSize: params?.pageSize || 50,
      sortBy: params?.sortBy || 'created_at',
      sortOrder: params?.sortOrder || 'desc'
    }),
    queryFn: () => tasksAPI.getAll(params),
    staleTime: 5 * 60 * 1000,
    select: (data: TasksResponse) => data.data
  })
}

export const useTasksWithPagination = (params?: { 
  myTasksOnly?: boolean
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}) => {
  return useQuery({
    queryKey: taskKeys.list({ 
      myTasksOnly: params?.myTasksOnly || false,
      page: params?.page || 1,
      pageSize: params?.pageSize || 50,
      sortBy: params?.sortBy || 'created_at',
      sortOrder: params?.sortOrder || 'desc'
    }),
    queryFn: () => tasksAPI.getAll(params),
    staleTime: 5 * 60 * 1000,
  })
}

export const useStats = (userId?: number) => {
  return useQuery({
    queryKey: ['stats', userId],
    queryFn: () => tasksAPI.getStats(userId),
    staleTime: 2 * 60 * 1000,
  })
}

export const useCreateTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tasksAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to create task:', error)
    },
  })
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: number; updates: Partial<Task> | { unassigned: boolean } }) =>
      tasksAPI.update(taskId, updates),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      
      queryClient.setQueryData(taskKeys.detail(updatedTask.id), updatedTask)
    },
    onError: (error) => {
      console.error('Failed to update task:', error)
    },
  })
}

export const useDeleteTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tasksAPI.delete,
    onSuccess: (_, deletedTaskId) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      
      queryClient.removeQueries({ queryKey: taskKeys.detail(deletedTaskId) })
    },
    onError: (error) => {
      console.error('Failed to delete task:', error)
    },
  })
}

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      tasksAPI.update(taskId, { status }),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })

      const previousQueries = new Map()
      queryClient.getQueryCache().findAll({ queryKey: taskKeys.lists() }).forEach(query => {
        previousQueries.set(query.queryKey, query.state.data)
        
        queryClient.setQueryData(query.queryKey, (old: Task[] = []) =>
          old.map(task => task.id === taskId ? { ...task, status } : task)
        )
      })

      return { previousQueries }
    },
    onError: (err, variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}