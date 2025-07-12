"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Users, ArrowRight, Star, MapPin, Clock } from "lucide-react"

interface User {
  id: number
  name: string
  location?: string
  profile_photo?: string
  skill_name: string
  proficiency_level?: string
  urgency?: string
  avg_rating: number
  total_ratings: number
}

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState("offered")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    setIsAuthenticated(!!token)
  }, [])

  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setLoading(true)
    try {
      const response = await fetch(
        `http://localhost:5000/api/users/search?skill=${encodeURIComponent(searchTerm)}&type=${searchType}`,
      )
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">SkillSwap</h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                    Dashboard
                  </Button>
                  <Button variant="ghost" onClick={() => router.push("/profile")}>
                    Profile
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      localStorage.removeItem("token")
                      setIsAuthenticated(false)
                      router.push("/")
                    }}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => router.push("/login")}>
                    Login
                  </Button>
                  <Button onClick={() => router.push("/register")}>Sign Up</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Exchange Skills, Build Connections</h2>
          <p className="text-xl text-gray-600 mb-8">
            Connect with others to share knowledge, learn new skills, and grow together in our community-driven
            platform.
          </p>

          {/* Search Section */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Find Skills
              </CardTitle>
              <CardDescription>Search for people offering or wanting specific skills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., JavaScript, Photoshop, Guitar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offered">Offered</SelectItem>
                    <SelectItem value="wanted">Wanted</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? "Searching..." : "Search"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Search Results */}
      {users.length > 0 && (
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Search Results ({users.length} found)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((user) => (
                <Card key={`${user.id}-${user.skill_name}`} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.profile_photo || "/placeholder.svg"} />
                        <AvatarFallback>
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{user.name}</CardTitle>
                        {user.location && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {user.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Badge variant="secondary" className="mb-2">
                        {user.skill_name}
                      </Badge>
                      {user.proficiency_level && (
                        <Badge variant="outline" className="ml-2">
                          {user.proficiency_level}
                        </Badge>
                      )}
                      {user.urgency && (
                        <Badge
                          variant={
                            user.urgency === "high"
                              ? "destructive"
                              : user.urgency === "medium"
                                ? "default"
                                : "secondary"
                          }
                          className="ml-2"
                        >
                          {user.urgency} priority
                        </Badge>
                      )}
                    </div>

                    {user.total_ratings > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{user.avg_rating.toFixed(1)}</span>
                        <span className="text-gray-500">({user.total_ratings} reviews)</span>
                      </div>
                    )}

                    <Button
                      className="w-full bg-transparent"
                      variant="outline"
                      onClick={() => (isAuthenticated ? router.push(`/profile/${user.id}`) : router.push("/login"))}
                    >
                      View Profile
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">How SkillSwap Works</h3>
            <p className="text-lg text-gray-600">Simple steps to start exchanging skills with others</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Create Your Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  List the skills you can offer and the ones you want to learn. Set your availability and preferences.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Find & Connect</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Browse through profiles, search for specific skills, and send swap requests to potential learning
                  partners.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Start Learning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Once connected, coordinate your skill exchange sessions and provide feedback to build trust in the
                  community.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-3xl font-bold text-white mb-6">Ready to Start Your Skill Journey?</h3>
            <p className="text-xl text-blue-100 mb-8">
              Join our community of learners and teachers. Share what you know, learn what you need.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" variant="secondary" onClick={() => router.push("/register")}>
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-blue-600 bg-transparent"
                onClick={() => router.push("/login")}
              >
                Sign In
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h4 className="text-xl font-bold mb-4">SkillSwap</h4>
              <p className="text-gray-400 mb-4">
                Connecting people through skill exchange. Learn, teach, and grow together in our vibrant community.
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Platform</h5>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    How it Works
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Safety
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Community Guidelines
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Support</h5>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SkillSwap. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
