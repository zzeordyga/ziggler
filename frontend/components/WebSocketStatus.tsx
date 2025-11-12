'use client'

import { useEffect, useState } from 'react'
import { createSocketIOConnection } from '@/lib/api'
import { WSMessage } from '@/types'

interface WebSocketStatusProps {
    className?: string
}

export default function WebSocketStatus({ className = '' }: WebSocketStatusProps) {
    const [isConnected, setIsConnected] = useState(false)
    const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) return

        const socket = createSocketIOConnection(token)

        socket.on('connect', () => {
            setIsConnected(true)
        })

        socket.on('disconnect', () => {
            setIsConnected(false)
        })

        socket.on('connect_error', () => {
            setIsConnected(false)
        })

        // Listen for task events
        socket.on('task_created', (message) => {
            setLastMessage({ type: 'task_created', payload: message.payload })
        })

        socket.on('task_updated', (message) => {
            setLastMessage({ type: 'task_updated', payload: message.payload })
        })

        socket.on('task_deleted', (message) => {
            setLastMessage({ type: 'task_deleted', payload: message.payload })
        })

        socket.on('task_assigned', (message) => {
            setLastMessage({ type: 'task_created', payload: message.payload })
        })

        return () => {
            socket.disconnect()
        }
    }, [])

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted">
                {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {lastMessage && (
                <span className="text-xs text-blue-600 dark:text-blue-400">
                    Last: {lastMessage.type}
                </span>
            )}
        </div>
    )
}