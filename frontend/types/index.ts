// Task status constants
export const TASK_STATUSES = ['todo', 'in_progress', 'done', 'cancelled'] as const
export type TaskStatus = typeof TASK_STATUSES[number]

export interface Task {
  id: number
  title: string
  description: string
  status: TaskStatus
  creator_id: number
  assignee_id?: number
  parent_id?: number
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  username: string
  email: string
  display_name: string
  role?: string
}

export interface LoginResponse {
  message: string
  token: string
  user: {
    id: number
    username: string
    email: string
    display_name: string
    role: string
  }
}

export interface RegisterResponse {
  message: string
  token: string
  user: {
    id: number
    username: string
    email: string
    display_name: string
    role: string
  }
}

export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  username: string
  email: string
  password: string
  display_name: string
}

export interface StatusColumn {
  title: string
  color: string
}

export interface StatusColumns {
  [key: string]: StatusColumn
}

export interface WSMessage {
  type: 'task_created' | 'task_updated' | 'task_deleted'
  payload: Task | { id: number }
}