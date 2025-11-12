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
    createTask
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
    const router = useRouter()

    // TanStack Query hooks
    const { data: tasks = [], isLoading, error } = useTasks()
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

        createTaskMutation.mutate({
            title: newTaskTitle.trim(),
            description: newTaskDescription.trim(),
            status: status as TaskStatus,
        }, {
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

    const getTasksByStatus = (status: string) => {
        return tasks.filter(task => task.status === status)
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
                        <button
                            onClick={handleLogout}
                            className="btn-secondary"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="container-main py-8">
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
