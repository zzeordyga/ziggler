import { TaskStatus, TASK_STATUSES } from '@/types'

export const getStatusDisplayName = (status: TaskStatus): string => {
  const statusMap: Record<TaskStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress', 
    done: 'Done',
    cancelled: 'Cancelled'
  }
  return statusMap[status]
}

export const getStatusByIndex = (index: number): TaskStatus | undefined => {
  return TASK_STATUSES[index]
}

export const getStatusIndex = (status: TaskStatus): number => {
  return TASK_STATUSES.indexOf(status)
}

export const isValidTaskStatus = (status: string): status is TaskStatus => {
  return TASK_STATUSES.includes(status as TaskStatus)
}

export const getStatusColor = (status: TaskStatus): string => {
  const colorMap: Record<TaskStatus, string> = {
    todo: 'bg-gray-100 dark:bg-gray-800',
    in_progress: 'bg-blue-100 dark:bg-blue-900',
    done: 'bg-green-100 dark:bg-green-900',
    cancelled: 'bg-red-100 dark:bg-red-900'
  }
  return colorMap[status]
}