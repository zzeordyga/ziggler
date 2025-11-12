'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RegisterFormData, RegisterResponse } from '@/types'
import { authAPI } from '@/lib/api'

export default function RegisterPage() {
    const [formData, setFormData] = useState<RegisterFormData>({
        username: '',
        email: '',
        password: '',
        display_name: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const data: RegisterResponse = await authAPI.register(formData)

            if (typeof window !== 'undefined') {
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify(data.user))
            }
            router.push('/dashboard')
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <h2 className="heading-1 text-center">Create your account</h2>
                    <p className="text-center text-muted">Join Ziggler to manage your tasks</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="display_name" className="label">
                                Full Name
                            </label>
                            <input
                                id="display_name"
                                name="display_name"
                                type="text"
                                required
                                className="input-field"
                                placeholder="Enter your full name"
                                value={formData.display_name}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label htmlFor="username" className="label">
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                className="input-field"
                                placeholder="Choose a username"
                                value={formData.username}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="label">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="input-field"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="label">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="input-field"
                                placeholder="Create a password (min 6 characters)"
                                value={formData.password}
                                onChange={handleChange}
                                minLength={6}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm dark:bg-red-900 dark:border-red-700 dark:text-red-200">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating account...' : 'Create account'}
                        </button>
                    </div>

                    <div className="text-center">
                        <span className="text-muted">Already have an account? </span>
                        <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                            Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}