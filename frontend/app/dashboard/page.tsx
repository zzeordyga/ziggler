'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    useDroppable
} from '@dnd-kit/core'
import {
    SortableContext,
    verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { Task, User, TaskStatus, StatusColumns, TASK_STATUSES } from '@/types'
import { getStatusDisplayName, getStatusColor } from '@/utils/tasks'
import { useTasks, useCreateTask, useUpdateTaskStatus } from '@/hooks/useTasks'
import TaskCard from '@/components/TaskCard'
import SearchFilter from '@/components/SearchFilter'
import WebSocketStatus from '@/components/WebSocketStatus'

const STATUS_COLUMNS: StatusColumns = TASK_STATUSES.reduce((acc, status) => {
    acc[status] = {
        title: getStatusDisplayName(status),
        color: getStatusColor(status)
    }
    return acc
}, {} as StatusColumns)



function DroppableColumn({
    status,
    title,
    color,
    tasks,
    showNewTaskForm,
    setShowNewTaskForm,
    newTaskTitle,
    setNewTaskTitle,
    newTaskDescription,
    setNewTaskDescription,
    createTask,
    showMyTasksOnly
}: {
    status: string
    title: string
    color: string
    tasks: Task[]
    showNewTaskForm: string | null
    setShowNewTaskForm: (status: string | null) => void
    newTaskTitle: string
    setNewTaskTitle: (title: string) => void
    newTaskDescription: string
    setNewTaskDescription: (description: string) => void
    createTask: (status: string) => void
    showMyTasksOnly: boolean
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: status,
    })

    return (
        <div
            ref={setNodeRef}
            className={`${color} rounded-lg p-4 min-h-[600px] transition-all duration-200 ${isOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
        >
            <div className="flex-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="heading-3">{title}</h3>
                    <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                        {tasks.length}
                    </span>
                </div>
                <button
                    onClick={() => setShowNewTaskForm(status)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Add new task"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {showNewTaskForm === status && (
                <div className="task-card mb-4 border-2 border-dashed border-blue-300 dark:border-blue-600">
                    <input
                        type="text"
                        placeholder="Task title..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="input-field mb-3"
                        autoFocus
                    />
                    <textarea
                        placeholder="Task description (optional)..."
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                        className="input-field mb-3 min-h-20 resize-none"
                    />

                    {/* Show auto-assignment note when in "My Tasks" mode */}
                    <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {showMyTasksOnly ? "Task will be auto-assigned to you" : "Task will be unassigned"}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => createTask(status)}
                            disabled={!newTaskTitle.trim()}
                            className="btn-primary text-sm px-3 py-1 disabled:opacity-50"
                        >
                            Add Task
                        </button>
                        <button
                            onClick={() => {
                                setShowNewTaskForm(null)
                                setNewTaskTitle('')
                                setNewTaskDescription('')
                            }}
                            className="btn-secondary text-sm px-3 py-1"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                    {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                    ))}

                    {tasks.length === 0 && showNewTaskForm !== status && (
                        <div className="text-center py-8 text-muted">
                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p className="text-sm">No tasks yet</p>
                            <p className="text-xs">Drag tasks here or click + to add</p>
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    )
}

export default function DashboardPage() {
    const [user, setUser] = useState<User | null>(() => {
        if (typeof window !== 'undefined') {
            const userData = localStorage.getItem('user')
            if (userData) {
                try {
                    return JSON.parse(userData)
                } catch (error) {
                    console.error('Failed to parse user data:', error)
                }
            }
        }
        return null
    })
    const [activeTask, setActiveTask] = useState<Task | null>(null)
    const [showNewTaskForm, setShowNewTaskForm] = useState<string | null>(null)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [newTaskDescription, setNewTaskDescription] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [showMyTasksOnly, setShowMyTasksOnly] = useState(true) // Default to showing only assigned tasks
    const router = useRouter()

    // TanStack Query hooks
    const { data: tasks = [], isLoading, error } = useTasks({ myTasksOnly: showMyTasksOnly })
    const createTaskMutation = useCreateTask()
    const updateTaskStatusMutation = useUpdateTaskStatus()

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
        }
    }, [router])

    const createTask = async (status: string) => {
        if (!newTaskTitle.trim()) return

        const taskData: Partial<Task> = {
            title: newTaskTitle.trim(),
            description: newTaskDescription.trim(),
            status: status as TaskStatus,
        }

        // If "My Tasks Only" is enabled, auto-assign to current user
        if (showMyTasksOnly && user?.id) {
            taskData.assignee_id = user.id
        }

        createTaskMutation.mutate(taskData, {
            onSuccess: () => {
                setNewTaskTitle('')
                setNewTaskDescription('')
                setShowNewTaskForm(null)
            }
        })
    }

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const task = tasks.find(t => t.id === active.id)
        setActiveTask(task || null)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveTask(null)

        if (!over) return

        const taskId = active.id as number
        const newStatus = over.id as string

        const task = tasks.find(t => t.id === taskId)
        if (task && task.status !== newStatus && TASK_STATUSES.includes(newStatus as TaskStatus)) {
            updateTaskStatusMutation.mutate({ taskId, status: newStatus as TaskStatus })
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/')
    }

    const filterTasks = (tasksToFilter: Task[]) => {
        if (!searchTerm.trim()) return tasksToFilter

        const searchLower = searchTerm.toLowerCase()
        return tasksToFilter.filter(task => {
            // Search in title and description
            const titleMatch = task.title.toLowerCase().includes(searchLower)
            const descriptionMatch = task.description.toLowerCase().includes(searchLower)

            // Search in creator name
            const creatorMatch = task.creator && (
                task.creator.display_name?.toLowerCase().includes(searchLower) ||
                task.creator.username.toLowerCase().includes(searchLower)
            )

            // Search in assignee name
            const assigneeMatch = task.assignee && (
                task.assignee.display_name?.toLowerCase().includes(searchLower) ||
                task.assignee.username.toLowerCase().includes(searchLower)
            )

            return titleMatch || descriptionMatch || creatorMatch || assigneeMatch
        })
    }

    const getTasksByStatus = (status: string) => {
        const statusTasks = tasks.filter(task => task.status === status)
        return filterTasks(statusTasks)
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-muted">Loading your tasks...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <p className="text-red-600 dark:text-red-400">Failed to load tasks. Please try again.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 btn-primary"
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="container-main py-4">
                    <div className="flex-between">
                        <div>
                            <h1 className="heading-2">Task Board</h1>
                            <p className="text-muted">Welcome back, {user?.display_name || user?.username}!</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <a
                                href="/stats"
                                className="btn-secondary text-sm"
                            >
                                📊 Statistics
                            </a>
                            <button
                                onClick={handleLogout}
                                className="btn-secondary"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container-main py-8">
                {/* Filter Controls */}
                <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">View:</h3>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showMyTasksOnly}
                                        onChange={(e) => setShowMyTasksOnly(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${showMyTasksOnly ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                                        }`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showMyTasksOnly ? 'translate-x-6' : 'translate-x-1'
                                            }`} />
                                    </div>
                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                        My Tasks Only
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            {showMyTasksOnly ? (
                                <>
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Showing tasks assigned to you
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Showing all tasks
                                </>
                            )}
                            <WebSocketStatus />
                        </div>
                    </div>
                </div>

                <SearchFilter
                    onSearchChange={setSearchTerm}
                    placeholder="Search tasks by title, description, creator, or assignee..."
                />

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {Object.entries(STATUS_COLUMNS).map(([status, { title, color }]) => (
                            <DroppableColumn
                                key={status}
                                status={status}
                                title={title}
                                color={color}
                                tasks={getTasksByStatus(status)}
                                showNewTaskForm={showNewTaskForm}
                                setShowNewTaskForm={setShowNewTaskForm}
                                newTaskTitle={newTaskTitle}
                                setNewTaskTitle={setNewTaskTitle}
                                newTaskDescription={newTaskDescription}
                                setNewTaskDescription={setNewTaskDescription}
                                createTask={createTask}
                                showMyTasksOnly={showMyTasksOnly}
                            />
                        ))}
                    </div>

                    <DragOverlay>
                        {activeTask ? (
                            <div className="task-card cursor-move shadow-2xl rotate-3 scale-105">
                                <div className="flex-between mb-2">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                        {activeTask.title}
                                    </h4>
                                </div>
                                {activeTask.description && (
                                    <p className="text-sm text-muted mb-3 line-clamp-3">
                                        {activeTask.description}
                                    </p>
                                )}
                                <div className="flex-between text-xs text-muted">
                                    <span>Task #{activeTask.id}</span>
                                    <span>
                                        {new Date(activeTask.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </main>
        </div>
    )
}
