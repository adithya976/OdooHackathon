"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserIcon, MessageSquare, Star, Clock, CheckCircle, XCircle, Calendar, Plus } from "lucide-react"

interface SwapRequest {
  id: number
  requester_name: string
  provider_name: string
  requested_skill_name: string
  offered_skill_name: string
  status: string
  message: string
  created_at: string
  requester_id: number
  provider_id: number
}

interface UserProfile {
  id: number
  name: string
  email: string
  role: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/login")
      return
    }

    setUser(JSON.parse(userData))
    fetchSwapRequests(token)
  }, [router])

  const fetchSwapRequests = async (token: string) => {
    try {
      const response = await fetch("http://localhost:5000/api/swaps/my-requests", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSwapRequests(data)
      } else {
        setError("Failed to fetch swap requests")
      }
    } catch (error) {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (requestId: number, status: string) => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await fetch(`http://localhost:5000/api/swaps/${requestId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        // Refresh the requests
        fetchSwapRequests(token)
      } else {
        setError("Failed to update request status")
      }
    } catch (error) {
      setError("Network error")
    }
  }

  const handleDeleteRequest = async (requestId: number) => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await fetch(`http://localhost:5000/api/swaps/${requestId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        fetchSwapRequests(token)
      } else {
        setError("Failed to delete request")
      }
    } catch (error) {
      setError("Network error")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "default"
      case "accepted":
        return "secondary"
      case "completed":
        return "secondary"
      case "rejected":
        return "destructive"
      case "cancelled":
        return "outline"
      default:
        return "default"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />
      case "accepted":
        return <CheckCircle className="w-4 h-4" />
      case "completed":
        return <Star className="w-4 h-4" />
      case "rejected":
        return <XCircle className="w-4 h-4" />
      case "cancelled":
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const sentRequests = swapRequests.filter((req) => req.requester_id === user?.id)
  const receivedRequests = swapRequests.filter((req) => req.provider_id === user?.id)
  const pendingReceived = receivedRequests.filter((req) => req.status === "pending")

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">SkillSwap</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.push("/")}>
                Home
              </Button>
              <Button variant="ghost" onClick={() => router.push("/profile")}>
                Profile
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem("token")
                  localStorage.removeItem("user")
                  router.push("/")
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {user?.name}!</h2>
          <p className="text-gray-600">Manage your skill exchanges and connect with the community.</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/profile")}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Profile</CardTitle>
              <UserIcon className="h-4 w-4 ml-auto" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Manage your skills and availability</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/")}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Find Skills</CardTitle>
              <Plus className="h-4 w-4 ml-auto" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Search for people and skills</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <MessageSquare className="h-4 w-4 ml-auto" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingReceived.length}</div>
              <p className="text-xs text-muted-foreground">Requests awaiting your response</p>
            </CardContent>
          </Card>
        </div>

        {/* Swap Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Skill Exchange Requests</CardTitle>
            <CardDescription>Manage your sent and received swap requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="received" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="received">Received ({receivedRequests.length})</TabsTrigger>
                <TabsTrigger value="sent">Sent ({sentRequests.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="received" className="space-y-4">
                {receivedRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No requests received yet. Share your skills to get started!
                  </div>
                ) : (
                  receivedRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {request.requester_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{request.requester_name}</p>
                                <p className="text-sm text-gray-500">
                                  wants to learn <Badge variant="outline">{request.requested_skill_name}</Badge>
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              Offering: <Badge variant="secondary">{request.offered_skill_name}</Badge>
                            </p>
                            {request.message && (
                              <p className="text-sm text-gray-600 mb-3 italic">"{request.message}"</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {new Date(request.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusColor(request.status)} className="flex items-center gap-1">
                              {getStatusIcon(request.status)}
                              {request.status}
                            </Badge>
                            {request.status === "pending" && (
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleStatusUpdate(request.id, "accepted")}>
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusUpdate(request.id, "rejected")}
                                >
                                  Decline
                                </Button>
                              </div>
                            )}
                            {request.status === "accepted" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(request.id, "completed")}
                              >
                                Mark Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="sent" className="space-y-4">
                {sentRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No requests sent yet. Browse skills and send your first request!
                  </div>
                ) : (
                  sentRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {request.provider_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{request.provider_name}</p>
                                <p className="text-sm text-gray-500">
                                  You want to learn <Badge variant="outline">{request.requested_skill_name}</Badge>
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              You offered: <Badge variant="secondary">{request.offered_skill_name}</Badge>
                            </p>
                            {request.message && (
                              <p className="text-sm text-gray-600 mb-3 italic">Your message: "{request.message}"</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {new Date(request.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusColor(request.status)} className="flex items-center gap-1">
                              {getStatusIcon(request.status)}
                              {request.status}
                            </Badge>
                            {request.status === "pending" && (
                              <Button size="sm" variant="outline" onClick={() => handleDeleteRequest(request.id)}>
                                Cancel
                              </Button>
                            )}
                            {request.status === "accepted" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(request.id, "completed")}
                              >
                                Mark Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
