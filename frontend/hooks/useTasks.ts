import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksAPI } from '@/lib/api'
import { Task, TaskStatus } from '@/types'

// Query Keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...taskKeys.lists(), { filters }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: number) => [...taskKeys.details(), id] as const,
}

// Fetch all tasks
export const useTasks = () => {
  return useQuery({
    queryKey: taskKeys.lists(),
    queryFn: tasksAPI.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create task mutation
export const useCreateTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tasksAPI.create,
    onSuccess: (newTask) => {
      // Add the new task to existing cache
      queryClient.setQueryData(taskKeys.lists(), (old: Task[] = []) => [...old, newTask])
      
      // Invalidate to refetch and ensure consistency
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to create task:', error)
    },
  })
}

// Update task mutation
export const useUpdateTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: number; updates: Partial<Task> }) =>
      tasksAPI.update(taskId, updates),
    onSuccess: (updatedTask) => {
      // Update the task in cache
      queryClient.setQueryData(taskKeys.lists(), (old: Task[] = []) =>
        old.map(task => task.id === updatedTask.id ? updatedTask : task)
      )
      
      // Update individual task cache if it exists
      queryClient.setQueryData(taskKeys.detail(updatedTask.id), updatedTask)
    },
    onError: (error) => {
      console.error('Failed to update task:', error)
    },
  })
}

// Delete task mutation
export const useDeleteTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tasksAPI.delete,
    onSuccess: (_, deletedTaskId) => {
      // Remove the task from cache
      queryClient.setQueryData(taskKeys.lists(), (old: Task[] = []) =>
        old.filter(task => task.id !== deletedTaskId)
      )
      
      // Remove individual task cache
      queryClient.removeQueries({ queryKey: taskKeys.detail(deletedTaskId) })
    },
    onError: (error) => {
      console.error('Failed to delete task:', error)
    },
  })
}

// Update task status (for drag & drop)
export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      tasksAPI.update(taskId, { status }),
    onMutate: async ({ taskId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(taskKeys.lists())

      // Optimistically update cache
      queryClient.setQueryData(taskKeys.lists(), (old: Task[] = []) =>
        old.map(task => task.id === taskId ? { ...task, status } : task)
      )

      return { previousTasks }
    },
    onError: (err, variables, context) => {
      // Revert on error
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.lists(), context.previousTasks)
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}