"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, Users, Handshake, Star, Settings, LogOut, User, Mail, MapPin, Calendar } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Profile {
  id: string
  email: string
  name: string
  location: string
  bio: string
  availability: string
  rating: number
  photo: string
}

interface Skill {
  id: string
  name: string
  category: string
}

interface UserSkill {
  id: string
  skill: Skill
  skill_type: 'offered' | 'wanted'
  proficiency_level: string
}

interface SwapRequest {
  id: string
  from_user: { id: string; name: string; photo: string }
  to_user: { id: string; name: string; photo: string }
  from_skill: { id: string; name: string; category: string }
  to_skill: { id: string; name: string; category: string }
  message: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed'
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [userSkills, setUserSkills] = useState<UserSkill[]>([])
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: '',
    location: '',
    bio: '',
    availability: 'flexible',
    isPublic: true
  })

  const [newSkill, setNewSkill] = useState({
    skillId: '',
    skillType: 'offered' as 'offered' | 'wanted',
    proficiencyLevel: 'intermediate'
  })

  const [newRequest, setNewRequest] = useState({
    toUserId: '',
    fromSkillId: '',
    toSkillId: '',
    message: ''
  })

  useEffect(() => {
    checkAuth()
  }, [])

  // Load dashboard data when user is set
  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  // Debug effect to log skills state changes
  useEffect(() => {
    console.log('Skills state updated:', skills.length, 'skills')
  }, [skills])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      console.log('Checking auth, token exists:', !!token)
      
      if (!token) {
        console.log('No token found, redirecting to home')
        router.push('/')
        return
      }

      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      
      console.log('Auth verify response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Auth verify successful, user:', data.user)
        setUser(data.user)
        // Don't call loadDashboardData here, let the useEffect handle it
      } else {
        console.log('Auth verify failed, removing token')
        localStorage.removeItem('token')
        router.push('/')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    if (!user) {
      console.log('No user available for loading dashboard data')
      return
    }

    try {
      console.log('Loading dashboard data for user:', user.id)
      
      // Load profile
      const profileResponse = await fetch(`/api/profiles/${user.id}`)
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        console.log('Profile loaded:', profileData)
        setProfile(profileData)
        setProfileForm({
          name: profileData.name || '',
          location: profileData.location || '',
          bio: profileData.bio || '',
          availability: profileData.availability || 'flexible',
          isPublic: profileData.is_public || true
        })
      } else {
        console.error('Failed to load profile:', profileResponse.status)
      }

      // Load skills
      const skillsResponse = await fetch('/api/skills')
      if (skillsResponse.ok) {
        const skillsData = await skillsResponse.json()
        console.log('Skills loaded:', skillsData.length, 'skills:', skillsData)
        setSkills(skillsData)
      } else {
        console.error('Failed to load skills:', skillsResponse.status)
      }

      // Load user skills
      const userSkillsResponse = await fetch(`/api/users/${user.id}/skills`)
      if (userSkillsResponse.ok) {
        const userSkillsData = await userSkillsResponse.json()
        console.log('User skills loaded:', userSkillsData.length, 'user skills:', userSkillsData)
        setUserSkills(userSkillsData)
      } else {
        console.error('Failed to load user skills:', userSkillsResponse.status)
      }

      // Load swap requests
      const requestsResponse = await fetch(`/api/users/${user.id}/swap-requests`)
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json()
        console.log('Swap requests loaded:', requestsData.length)
        setSwapRequests(requestsData)
      } else {
        console.error('Failed to load swap requests:', requestsResponse.status)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  const handleProfileUpdate = async () => {
    if (!user) return
    
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/profiles/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name,
          location: profileForm.location,
          bio: profileForm.bio,
          availability: profileForm.availability,
          is_public: profileForm.isPublic
        })
      })

      if (response.ok) {
        setSuccess('Profile updated successfully!')
        await loadDashboardData()
      } else {
        const data = await response.json()
        setError(data.error?.message || 'Failed to update profile')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSkill = async () => {
    if (!user || !newSkill.skillId) {
      console.log('Cannot add skill - missing user or skillId:', { user: !!user, skillId: newSkill.skillId })
      return
    }

    console.log('Adding skill:', newSkill)

    try {
      const response = await fetch(`/api/users/${user.id}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_id: newSkill.skillId,
          skill_type: newSkill.skillType,
          proficiency_level: newSkill.proficiencyLevel
        })
      })

      console.log('Add skill response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Skill added successfully:', result)
        setNewSkill({ skillId: '', skillType: 'offered', proficiencyLevel: 'intermediate' })
        await loadDashboardData()
        setSuccess('Skill added successfully!')
      } else {
        const data = await response.json()
        console.error('Failed to add skill:', data)
        setError(data.error?.message || 'Failed to add skill')
      }
    } catch (error) {
      console.error('Network error adding skill:', error)
      setError('Network error. Please try again.')
    }
  }

  const handleRemoveSkill = async (skillId: string, skillType: string) => {
    if (!user) return

    try {
      const response = await fetch(`/api/users/${user.id}/skills/${skillId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillType })
      })

      if (response.ok) {
        await loadDashboardData()
        setSuccess('Skill removed successfully!')
      } else {
        const data = await response.json()
        setError(data.error?.message || 'Failed to remove skill')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    }
  }

  const handleUpdateRequest = async (requestId: string, status: string) => {
    try {
      const response = await fetch(`/api/swap-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        await loadDashboardData()
        setSuccess('Request updated successfully!')
      } else {
        const data = await response.json()
        setError(data.error?.message || 'Failed to update request')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Handshake className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">SkillSwap</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.name}</span>
              <Button onClick={() => router.push('/')} variant="outline" size="sm">
                Home
              </Button>
              <Button onClick={handleLogout} variant="ghost" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="requests">Swap Requests</TabsTrigger>
            <TabsTrigger value="browse">Browse Users</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Profile Information
                    </CardTitle>
                    <CardDescription>
                      Update your profile information and preferences
                    </CardDescription>
                  </div>
                  <Badge variant={profileForm.isPublic ? "default" : "secondary"}>
                    {profileForm.isPublic ? "Public" : "Private"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="availability">Availability</Label>
                  <Select
                    value={profileForm.availability}
                    onValueChange={(value) => setProfileForm({...profileForm, availability: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flexible">Flexible</SelectItem>
                      <SelectItem value="weekdays">Weekdays</SelectItem>
                      <SelectItem value="weekends">Weekends</SelectItem>
                      <SelectItem value="evenings">Evenings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="isPublic">Profile Visibility</Label>
                  <Select
                    value={profileForm.isPublic ? 'public' : 'private'}
                    onValueChange={(value) => setProfileForm({...profileForm, isPublic: value === 'public'})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public - Others can see your profile and skills</SelectItem>
                      <SelectItem value="private">Private - Only you can see your profile</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {profileForm.isPublic 
                      ? "Your profile will be visible to other users in Browse Users" 
                      : "Your profile will be hidden from other users"
                    }
                  </p>
                </div>
                <Button onClick={handleProfileUpdate} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  My Skills
                </CardTitle>
                <CardDescription>
                  Manage the skills you offer and want to learn
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add New Skill */}
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <h3 className="font-medium mb-3">Add New Skill</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Select Skill</label>
                      <Select
                        value={newSkill.skillId}
                        onValueChange={(value) => {
                          console.log('Skill selected:', value)
                          setNewSkill({...newSkill, skillId: value})
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a skill to add" />
                        </SelectTrigger>
                        <SelectContent>
                          {skills.length > 0 ? (
                            skills.map((skill) => (
                              <SelectItem key={skill.id} value={skill.id}>
                                {skill.name} ({skill.category})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>Loading skills...</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Available skills: {skills.length}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <Select
                          value={newSkill.skillType}
                          onValueChange={(value: 'offered' | 'wanted') => setNewSkill({...newSkill, skillType: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="offered">I Offer</SelectItem>
                            <SelectItem value="wanted">I Want</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Level</label>
                        <Select
                          value={newSkill.proficiencyLevel}
                          onValueChange={(value) => setNewSkill({...newSkill, proficiencyLevel: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                            <SelectItem value="expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleAddSkill} 
                      disabled={!newSkill.skillId}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Skill
                    </Button>
                  </div>
                </div>

                {/* Skills Lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Offered Skills */}
                  <div>
                    <h3 className="font-medium mb-3 text-green-700">Skills I Offer</h3>
                    <div className="space-y-2">
                      {userSkills
                        .filter(skill => skill.skill_type === 'offered')
                        .map((userSkill) => (
                          <div key={userSkill.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div>
                              <div className="font-medium">{userSkill.skill.name}</div>
                              <div className="text-sm text-gray-600 capitalize">{userSkill.proficiency_level}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSkill(userSkill.skill.id, 'offered')}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      {userSkills.filter(skill => skill.skill_type === 'offered').length === 0 && (
                        <p className="text-gray-500 text-sm">No skills offered yet</p>
                      )}
                    </div>
                  </div>

                  {/* Wanted Skills */}
                  <div>
                    <h3 className="font-medium mb-3 text-blue-700">Skills I Want</h3>
                    <div className="space-y-2">
                      {userSkills
                        .filter(skill => skill.skill_type === 'wanted')
                        .map((userSkill) => (
                          <div key={userSkill.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div>
                              <div className="font-medium">{userSkill.skill.name}</div>
                              <div className="text-sm text-gray-600 capitalize">{userSkill.proficiency_level}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSkill(userSkill.skill.id, 'wanted')}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      {userSkills.filter(skill => skill.skill_type === 'wanted').length === 0 && (
                        <p className="text-gray-500 text-sm">No skills wanted yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Swap Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Handshake className="h-5 w-5" />
                  Swap Requests
                </CardTitle>
                <CardDescription>
                  Manage your skill swap requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {swapRequests.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No swap requests yet</p>
                  ) : (
                    swapRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">
                                {request.from_user.id === user.id ? 'To: ' : 'From: '}
                                {request.from_user.id === user.id ? request.to_user.name : request.from_user.name}
                              </span>
                              <Badge variant={
                                request.status === 'pending' ? 'secondary' :
                                request.status === 'accepted' ? 'default' :
                                request.status === 'rejected' ? 'destructive' :
                                'outline'
                              }>
                                {request.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Exchange:</span> {request.from_skill.name} ↔ {request.to_skill.name}
                            </div>
                            <p className="text-sm text-gray-700">{request.message}</p>
                            <div className="text-xs text-gray-500 mt-2">
                              {new Date(request.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          
                          {request.status === 'pending' && request.to_user.id === user.id && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUpdateRequest(request.id, 'accepted')}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateRequest(request.id, 'rejected')}
                              >
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Browse Users Tab */}
          <TabsContent value="browse" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Browse Users
                </CardTitle>
                <CardDescription>
                  Find people to swap skills with
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Ready to find people to swap skills with?</p>
                  <Button onClick={() => router.push('/browse')}>
                    Browse Users
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 