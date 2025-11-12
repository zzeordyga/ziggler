'use client'

import { useState } from 'react'
import { useStats } from '@/hooks/useTasks'
import { UserStats } from '@/types'

export default function StatsPage() {
    const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined)
    const { data: stats, isLoading, error } = useStats(selectedUserId)

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-muted">Loading statistics...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <p className="text-red-600 dark:text-red-400">Failed to load statistics. Please try again.</p>
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

    const formatPercentage = (rate: number) => {
        return `${rate.toFixed(1)}%`
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="container-main py-4">
                    <div className="flex-between">
                        <div>
                            <h1 className="heading-2">Task Statistics</h1>
                            <p className="text-muted">Overview of task completion and user performance</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <a
                                href="/dashboard"
                                className="btn-secondary text-sm"
                            >
                                ← Back to Dashboard
                            </a>
                            <select
                                value={selectedUserId || ''}
                                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : undefined)}
                                className="input-field text-sm"
                            >
                                <option value="">All Users</option>
                                {stats?.user_stats.map((user) => (
                                    <option key={user.user_id} value={user.user_id}>
                                        {user.display_name || user.username}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container-main py-8">
                {/* Overall Statistics */}
                <div className="mb-8">
                    <h2 className="heading-3 mb-4">Overall Statistics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <div className="stat-card bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                            <div className="stat-number text-blue-600 dark:text-blue-400">
                                {stats?.overall_stats.total_tasks || 0}
                            </div>
                            <div className="stat-label">Total Tasks</div>
                        </div>

                        <div className="stat-card bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                            <div className="stat-number text-yellow-600 dark:text-yellow-400">
                                {stats?.overall_stats.todo_tasks || 0}
                            </div>
                            <div className="stat-label">To Do</div>
                        </div>

                        <div className="stat-card bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
                            <div className="stat-number text-purple-600 dark:text-purple-400">
                                {stats?.overall_stats.in_progress_tasks || 0}
                            </div>
                            <div className="stat-label">In Progress</div>
                        </div>

                        <div className="stat-card bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                            <div className="stat-number text-green-600 dark:text-green-400">
                                {stats?.overall_stats.completed_tasks || 0}
                            </div>
                            <div className="stat-label">Completed</div>
                        </div>

                        <div className="stat-card bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                            <div className="stat-number text-red-600 dark:text-red-400">
                                {stats?.overall_stats.cancelled_tasks || 0}
                            </div>
                            <div className="stat-label">Cancelled</div>
                        </div>

                        <div className="stat-card bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800">
                            <div className="stat-number text-gray-600 dark:text-gray-400">
                                {stats?.overall_stats.unassigned_tasks || 0}
                            </div>
                            <div className="stat-label">Unassigned</div>
                        </div>
                    </div>
                </div>

                {/* User Statistics */}
                <div>
                    <h2 className="heading-3 mb-4">User Performance</h2>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Total Tasks
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            To Do
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            In Progress
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Completed
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Completion Rate
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {stats?.user_stats.map((user: UserStats) => (
                                        <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                                            {(user.display_name || user.username).charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {user.display_name || user.username}
                                                        </div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            @{user.username}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {user.total_tasks}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 dark:text-yellow-400">
                                                {user.todo_tasks}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 dark:text-purple-400">
                                                {user.in_progress_tasks}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                                                {user.completed_tasks}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                                                        <div
                                                            className="bg-green-600 h-2 rounded-full"
                                                            style={{ width: `${Math.min(user.completion_rate, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm text-gray-900 dark:text-white">
                                                        {formatPercentage(user.completion_rate)}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {(!stats?.user_stats || stats.user_stats.length === 0) && (
                            <div className="text-center py-8 text-muted">
                                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <p className="text-sm">No user statistics available</p>
                                <p className="text-xs">Users need to have assigned tasks to appear here</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Generated At */}
                {stats?.generated_at && (
                    <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Last updated: {new Date(stats.generated_at).toLocaleString()}
                    </div>
                )}
            </main>
        </div>
    )
}