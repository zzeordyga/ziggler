'use client'

import { useEffect, useState } from 'react'
import { createWebSocketConnection } from '@/lib/api'
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

        const ws = createWebSocketConnection(token)

        ws.addEventListener('open', () => {
            setIsConnected(true)
        })

        ws.addEventListener('close', () => {
            setIsConnected(false)
        })

        ws.addEventListener('error', () => {
            setIsConnected(false)
        })

        ws.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data)
                setLastMessage(data)
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error)
            }
        })

        return () => {
            ws.close()
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