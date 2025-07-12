"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestPage() {
  const router = useRouter()
  const [status, setStatus] = useState('')

  const testLogin = async () => {
    setStatus('Testing login...')
    
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@skillswap.com',
          password: 'admin123'
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        localStorage.setItem('token', data.token)
        setStatus('Login successful! Redirecting to dashboard...')
        setTimeout(() => router.push('/dashboard'), 1000)
      } else {
        setStatus(`Login failed: ${data.error?.message}`)
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const testDashboard = async () => {
    setStatus('Testing dashboard access...')
    
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setStatus('No token found')
        return
      }

      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await response.json()
      
      if (response.ok) {
        setStatus(`Dashboard access successful! User: ${data.user.name}`)
      } else {
        setStatus(`Dashboard access failed: ${data.error?.message}`)
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testLogin} className="w-full">
            Test Login
          </Button>
          <Button onClick={testDashboard} className="w-full" variant="outline">
            Test Dashboard Access
          </Button>
          <Button onClick={() => router.push('/dashboard')} className="w-full" variant="secondary">
            Go to Dashboard
          </Button>
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <p className="text-sm">{status || 'Click a button to test'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 