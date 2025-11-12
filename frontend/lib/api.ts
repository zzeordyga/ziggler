import axios, { AxiosResponse, AxiosError } from 'axios'
import { Task, User, LoginResponse, RegisterResponse, LoginFormData, RegisterFormData, TasksResponse, StatsResponse } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
const API_FULL_URL = `${API_BASE_URL}/api/v1`
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'

const apiClient = axios.create({
  baseURL: API_FULL_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError) => {

    if (error.response?.status === 401) {
    
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export { apiClient }

export const createWebSocketConnection = (token: string): WebSocket => {
  const ws = new WebSocket(`${WS_BASE_URL}/api/v1/ws`)
  
  ws.onopen = () => {
    console.log('WebSocket connected')
    // Authenticate after connection
    ws.send(JSON.stringify({
      type: 'authenticate',
      token: token
    }))
  }
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('WebSocket message:', data)
      
      if (data.type === 'authenticated') {
        console.log('WebSocket authenticated:', data.payload)
      } else if (data.type === 'auth_error') {
        console.error('WebSocket authentication error:', data.payload)
        ws.close()
      }
    } catch (error) {
      console.error('WebSocket message parse error:', error)
    }
  }
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }
  
  ws.onclose = () => {
    console.log('WebSocket disconnected')
  }
  
  return ws
}

export const authAPI = {
  login: async (credentials: LoginFormData): Promise<LoginResponse> => {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Login failed')
      }
      throw new Error('Login failed')
    }
  },

  register: async (userData: RegisterFormData): Promise<RegisterResponse> => {
    try {
      const response = await apiClient.post<RegisterResponse>('/auth/register', userData)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Registration failed')
      }
      throw new Error('Registration failed')
    }
  }
}

export const tasksAPI = {
  getAll: async (params?: { 
    myTasksOnly?: boolean
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<TasksResponse> => {
    try {
      const queryParams = new URLSearchParams()
      if (params?.myTasksOnly) {
        queryParams.append('my_tasks', 'true')
      }
      if (params?.page) {
        queryParams.append('page', params.page.toString())
      }
      if (params?.pageSize) {
        queryParams.append('page_size', params.pageSize.toString())
      }
      if (params?.sortBy) {
        queryParams.append('sort_by', params.sortBy)
      }
      if (params?.sortOrder) {
        queryParams.append('sort_order', params.sortOrder)
      }
      
      const url = queryParams.toString() ? `/tasks?${queryParams.toString()}` : '/tasks'
      const response = await apiClient.get<TasksResponse>(url)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Unauthorized')
        }
        throw new Error(error.response?.data?.error || 'Failed to fetch tasks')
      }
      throw new Error('Failed to fetch tasks')
    }
  },

  getStats: async (userId?: number): Promise<StatsResponse> => {
    try {
      const queryParams = new URLSearchParams()
      if (userId) {
        queryParams.append('user_id', userId.toString())
      }
      
      const url = queryParams.toString() ? `/stats?${queryParams.toString()}` : '/stats'
      const response = await apiClient.get<StatsResponse>(url)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Unauthorized')
        }
        throw new Error(error.response?.data?.error || 'Failed to fetch stats')
      }
      throw new Error('Failed to fetch stats')
    }
  },

  create: async (taskData: Partial<Task>): Promise<Task> => {
    try {
      const response = await apiClient.post<Task>('/tasks', taskData)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to create task')
      }
      throw new Error('Failed to create task')
    }
  },

  update: async (taskId: number, updates: Partial<Task> | { unassigned: boolean }): Promise<Task> => {
    try {
      const response = await apiClient.put<Task>(`/tasks/${taskId}`, updates)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to update task')
      }
      throw new Error('Failed to update task')
    }
  },

  delete: async (taskId: number): Promise<void> => {
    try {
      await apiClient.delete(`/tasks/${taskId}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to delete task')
      }
      throw new Error('Failed to delete task')
    }
  }
}

export const usersAPI = {
  getAll: async (): Promise<User[]> => {
    try {
      const response = await apiClient.get<User[]>('/users')
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Unauthorized')
        }
        throw new Error(error.response?.data?.error || 'Failed to fetch users')
      }
      throw new Error('Failed to fetch users')
    }
  }
}