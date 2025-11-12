'use client'

import { useState, useEffect, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task, User } from '@/types'
import { useUpdateTask, useDeleteTask, useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { getStatusDisplayName } from '@/utils/tasks'

interface TaskCardProps {
    task: Task
}

export default function TaskCard({ task }: TaskCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editTitle, setEditTitle] = useState(task.title)
    const [editDescription, setEditDescription] = useState(task.description)
    const [editParentId, setEditParentId] = useState<number | null>(task.parent_id || null)
    const [showAssignDropdown, setShowAssignDropdown] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const updateMutation = useUpdateTask()
    const deleteMutation = useDeleteTask()
    const { data: users = [] } = useUsers()
    const { data: allTasks = [] } = useTasks()

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowAssignDropdown(false)
            }
        }

        if (showAssignDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showAssignDropdown])

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const handleSave = () => {
        const titleChanged = editTitle.trim() !== task.title
        const descriptionChanged = editDescription.trim() !== task.description
        const parentChanged = editParentId !== (task.parent_id || null)

        if (titleChanged || descriptionChanged || parentChanged) {
            updateMutation.mutate({
                taskId: task.id,
                updates: {
                    title: editTitle.trim(),
                    description: editDescription.trim(),
                    parent_id: editParentId || undefined,
                }
            })
        }
        setIsEditing(false)
    }

    const handleCancel = () => {
        setEditTitle(task.title)
        setEditDescription(task.description)
        setEditParentId(task.parent_id || null)
        setIsEditing(false)
    }

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            deleteMutation.mutate(task.id)
        }
    }

    const handleAssignUser = (userId: number | null) => {
        updateMutation.mutate({
            taskId: task.id,
            updates: {
                assignee_id: userId || undefined,
                unassigned: userId === null,
            }
        })
        setShowAssignDropdown(false)
    }

    if (isEditing) {
        return (
            <div className="task-card border-2 border-blue-300 dark:border-blue-600">
                <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="input-field mb-3 font-medium"
                    placeholder="Task title..."
                    autoFocus
                />
                <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="input-field mb-3 min-h-20 resize-none"
                    placeholder="Task description..."
                />

                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Parent Task (optional)
                    </label>
                    <select
                        value={editParentId || ''}
                        onChange={(e) => setEditParentId(e.target.value ? parseInt(e.target.value) : null)}
                        className="input-field"
                    >
                        <option value="">No parent task</option>
                        {allTasks
                            .filter(t => t.id !== task.id && t.status !== 'cancelled' && t.parent_id !== task.id)
                            .map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.title} ({getStatusDisplayName(t.status)})
                                </option>
                            ))}
                    </select>
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={handleCancel}
                        className="btn-secondary text-sm px-3 py-1"
                        disabled={updateMutation.isPending}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn-primary text-sm px-3 py-1"
                        disabled={updateMutation.isPending || !editTitle.trim()}
                    >
                        {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                zIndex: showAssignDropdown ? 1000 : 'auto'
            }}
            className={`task-card hover:shadow-lg transition-all duration-200 group relative ${isDragging ? 'opacity-50 scale-95' : ''}`}
            {...attributes}
        >
            <div
                className="absolute inset-0 cursor-move"
                {...listeners}
            />

            <div className="relative z-10">
                <div className="flex-between mb-2">
                    <div
                        className="flex-1 cursor-move"
                        {...listeners}
                    >
                        <h4 className="font-medium text-gray-900 dark:text-white">
                            {task.title}
                        </h4>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsEditing(true)
                            }}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600 relative z-20"
                            title="Edit task"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handleDelete()
                            }}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600 relative z-20"
                            title="Delete task"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            )}
                        </button>

                        <div
                            className="p-1 text-gray-400 cursor-move"
                            {...listeners}
                            title="Drag to move"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                            </svg>
                        </div>
                    </div>
                </div>

                {task.description && (
                    <div
                        className="cursor-move"
                        {...listeners}
                    >
                        <p className="text-sm text-muted mb-3 line-clamp-3">
                            {task.description}
                        </p>
                    </div>
                )}

                <div className="mb-3 space-y-2">
                    {task.parent_id && (
                        <div className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md border-l-2 border-blue-400">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <span className="font-medium">Subtask of #{task.parent_id}</span>
                        </div>
                    )}

                    {task.creator && (
                        <div className="flex items-center gap-2 text-xs text-muted">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>Created by: {task.creator.display_name || task.creator.username}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted" style={{ position: 'relative', zIndex: showAssignDropdown ? 1000 : 'auto' }}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {task.assignee ? (
                            <div className="flex items-center gap-1">
                                <span>Assigned to: {task.assignee.display_name || task.assignee.username}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setShowAssignDropdown(!showAssignDropdown)
                                    }}
                                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 relative z-20"
                                    title="Change assignee"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                <span className="text-gray-400">Unassigned</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setShowAssignDropdown(!showAssignDropdown)
                                    }}
                                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 relative z-20"
                                    title="Assign user"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {showAssignDropdown && (
                            <div
                                ref={dropdownRef}
                                className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-xl min-w-40"
                                style={{ zIndex: 9999 }}
                            >
                                <div className="py-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleAssignUser(null)
                                        }}
                                        className="w-full text-left px-3 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                                    >
                                        Unassign
                                    </button>
                                    {users.map((user) => (
                                        <button
                                            key={user.id}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleAssignUser(user.id)
                                            }}
                                            className={`w-full text-left px-3 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${task.assignee_id === user.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : ''
                                                }`}
                                        >
                                            {user.display_name || user.username}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div
                    className="flex-between text-xs text-muted cursor-move"
                    {...listeners}
                >
                    <span>Task #{task.id}</span>
                    <span>
                        {new Date(task.created_at).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>
    )
}