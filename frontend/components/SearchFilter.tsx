'use client'

import { useState } from 'react'

interface SearchFilterProps {
    onSearchChange: (searchTerm: string) => void
    placeholder?: string
}

export default function SearchFilter({ onSearchChange, placeholder = "Search tasks..." }: SearchFilterProps) {
    const [searchTerm, setSearchTerm] = useState('')

    const handleSearchChange = (value: string) => {
        setSearchTerm(value)
        onSearchChange(value)
    }

    const clearSearch = () => {
        setSearchTerm('')
        onSearchChange('')
    }

    return (
        <div className="relative mb-6">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder={placeholder}
                />
                {searchTerm && (
                    <button
                        onClick={clearSearch}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Clear search"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                )}
            </div>
            
            {searchTerm && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>Searching in: title, description, creator, and assignee</p>
                </div>
            )}
        </div>
    )
}