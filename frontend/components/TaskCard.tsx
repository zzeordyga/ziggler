'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from '@/types'
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks'

interface TaskCardProps {
    task: Task
}

export default function TaskCard({ task }: TaskCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editTitle, setEditTitle] = useState(task.title)
    const [editDescription, setEditDescription] = useState(task.description)

    const updateMutation = useUpdateTask()
    const deleteMutation = useDeleteTask()

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
        if (editTitle.trim() !== task.title || editDescription.trim() !== task.description) {
            updateMutation.mutate({
                taskId: task.id,
                updates: {
                    title: editTitle.trim(),
                    description: editDescription.trim(),
                }
            })
        }
        setIsEditing(false)
    }

    const handleCancel = () => {
        setEditTitle(task.title)
        setEditDescription(task.description)
        setIsEditing(false)
    }

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            deleteMutation.mutate(task.id)
        }
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
            style={style}
            className={`task-card hover:shadow-lg transition-all duration-200 group relative ${isDragging ? 'opacity-50 scale-95' : ''
                }`}
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

                {/* User Information */}
                <div className="mb-3 space-y-2">
                    {task.creator && (
                        <div className="flex items-center gap-2 text-xs text-muted">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>Created by: {task.creator.display_name || task.creator.username}</span>
                        </div>
                    )}
                    {task.assignee && (
                        <div className="flex items-center gap-2 text-xs text-muted">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Assigned to: {task.assignee.display_name || task.assignee.username}</span>
                        </div>
                    )}
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