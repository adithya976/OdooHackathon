"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Search, Users, Handshake, Star, MapPin, Calendar, ArrowLeft, Send } from 'lucide-react'

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
  user_skills: Array<{
    id: string
    skill: {
      id: string
      name: string
      category: string
    }
    skill_type: 'offered' | 'wanted'
    proficiency_level: string
  }>
}

interface Skill {
  id: string
  name: string
  category: string
}

export default function BrowsePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [userSkills, setUserSkills] = useState<Array<{
    id: string
    skill: Skill
    skill_type: 'offered' | 'wanted'
    proficiency_level: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSkill, setSelectedSkill] = useState('all')
  const [selectedAvailability, setSelectedAvailability] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Swap request states
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [requestForm, setRequestForm] = useState({
    fromSkillId: '',
    toSkillId: '',
    message: ''
  })
  const [sendingRequest, setSendingRequest] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  // Load user skills when user changes
  useEffect(() => {
    if (user) {
      loadUserSkills()
    }
  }, [user])

  const loadUserSkills = async () => {
    if (!user) return
    
    try {
      const userSkillsResponse = await fetch(`/api/users/${user.id}/skills`)
      if (userSkillsResponse.ok) {
        const userSkillsData = await userSkillsResponse.json()
        console.log('User skills loaded:', userSkillsData.length)
        setUserSkills(userSkillsData)
      } else {
        console.error('Failed to load user skills:', userSkillsResponse.status)
      }
    } catch (error) {
      console.error('Failed to load user skills:', error)
    }
  }

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        await loadData()
      } else {
        localStorage.removeItem('token')
        router.push('/login')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      console.log('Loading browse data...')
      
      // Load skills
      const skillsResponse = await fetch('/api/skills')
      if (skillsResponse.ok) {
        const skillsData = await skillsResponse.json()
        console.log('Skills loaded:', skillsData.length)
        setSkills(skillsData)
      } else {
        console.error('Failed to load skills:', skillsResponse.status)
      }

      // Load current user's skills
      if (user) {
        const userSkillsResponse = await fetch(`/api/users/${user.id}/skills`)
        if (userSkillsResponse.ok) {
          const userSkillsData = await userSkillsResponse.json()
          console.log('User skills loaded:', userSkillsData.length)
          setUserSkills(userSkillsData)
        } else {
          console.error('Failed to load user skills:', userSkillsResponse.status)
        }
      }

      // Load profiles
      await searchProfiles()
    } catch (error) {
      console.error('Failed to load data:', error)
      setError('Failed to load data. Please try again.')
    }
  }

  const searchProfiles = async () => {
    setSearchLoading(true)
    setError('')
    
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (selectedSkill !== 'all') params.append('skill', selectedSkill)
      if (selectedAvailability !== 'all') params.append('availability', selectedAvailability)
      if (selectedCategory !== 'all') params.append('category', selectedCategory)

      console.log('Searching profiles with params:', params.toString())
      
      const response = await fetch(`/api/profiles?${params}`)
      console.log('Profiles response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Profiles loaded:', data.length, 'profiles:', data)
        
        // Filter out current user
        const filteredProfiles = data.filter((profile: Profile) => profile.id !== user?.id)
        console.log('Filtered profiles (excluding current user):', filteredProfiles.length)
        
        setProfiles(filteredProfiles)
      } else {
        console.error('Failed to search profiles:', response.status)
        const errorData = await response.json()
        setError(errorData.error?.message || 'Failed to load profiles')
      }
    } catch (error) {
      console.error('Failed to search profiles:', error)
      setError('Network error. Please try again.')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSendRequest = async () => {
    if (!selectedProfile || !user) {
      console.log('Cannot send request - missing profile or user:', { profile: !!selectedProfile, user: !!user })
      return
    }

    setSendingRequest(true)
    setError('')

    try {
      console.log('Sending swap request:', {
        fromUserId: user.id,
        toUserId: selectedProfile.id,
        fromSkillId: requestForm.fromSkillId,
        toSkillId: requestForm.toSkillId,
        message: requestForm.message
      })

      const response = await fetch('/api/swap-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: user.id,
          toUserId: selectedProfile.id,
          fromSkillId: requestForm.fromSkillId,
          toSkillId: requestForm.toSkillId,
          message: requestForm.message
        })
      })

      console.log('Swap request response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Swap request created successfully:', result)
        setRequestForm({ fromSkillId: '', toSkillId: '', message: '' })
        setSelectedProfile(null)
        setError('') // Clear any previous errors
        // You could show a success message here
        alert('Swap request sent successfully!')
      } else {
        const data = await response.json()
        console.error('Failed to send swap request:', data)
        setError(data.error?.message || 'Failed to send request')
      }
    } catch (error) {
      console.error('Network error sending swap request:', error)
      setError('Network error. Please try again.')
    } finally {
      setSendingRequest(false)
    }
  }

  const getOfferedSkills = (profile: Profile) => {
    return profile.user_skills.filter(skill => skill.skill_type === 'offered')
  }

  const getWantedSkills = (profile: Profile) => {
    return profile.user_skills.filter(skill => skill.skill_type === 'wanted')
  }

  const getCurrentUserOfferedSkills = () => {
    return userSkills.filter(skill => skill.skill_type === 'offered')
  }

  const getUserOfferedSkills = () => {
    if (!user) return []
    // This would need to be loaded from the user's profile
    return []
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
              <Button onClick={() => router.push('/dashboard')} variant="outline" size="sm">
                Dashboard
              </Button>
              <Button onClick={() => router.push('/')} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Users</h1>
          <p className="text-gray-600">Find people to swap skills with</p>
          <p className="text-sm text-gray-500 mt-1">
            Only users with public profiles are shown here. Users can control their privacy in their dashboard.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="skill">Skill</Label>
                <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any skill" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any skill</SelectItem>
                    {skills.map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>
                        {skill.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="availability">Availability</Label>
                <Select value={selectedAvailability} onValueChange={setSelectedAvailability}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any availability</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                    <SelectItem value="weekdays">Weekdays</SelectItem>
                    <SelectItem value="weekends">Weekends</SelectItem>
                    <SelectItem value="evenings">Evenings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button onClick={searchProfiles} className="w-full" disabled={searchLoading}>
                  {searchLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No users found matching your criteria</p>
            </div>
          ) : (
            profiles.map((profile) => (
              <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{profile.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {profile.location || 'Location not specified'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{profile.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.bio && (
                    <p className="text-sm text-gray-600 line-clamp-2">{profile.bio}</p>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span className="capitalize">{profile.availability}</span>
                  </div>

                  {/* Skills */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-green-700 mb-2">Offers:</h4>
                      <div className="flex flex-wrap gap-1">
                        {getOfferedSkills(profile).map((userSkill) => (
                          <Badge key={userSkill.id} variant="secondary" className="text-xs">
                            {userSkill.skill.name}
                          </Badge>
                        ))}
                        {getOfferedSkills(profile).length === 0 && (
                          <span className="text-xs text-gray-500">No skills offered</span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-blue-700 mb-2">Wants:</h4>
                      <div className="flex flex-wrap gap-1">
                        {getWantedSkills(profile).map((userSkill) => (
                          <Badge key={userSkill.id} variant="outline" className="text-xs">
                            {userSkill.skill.name}
                          </Badge>
                        ))}
                        {getWantedSkills(profile).length === 0 && (
                          <span className="text-xs text-gray-500">No skills wanted</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full" 
                        onClick={() => setSelectedProfile(profile)}
                      >
                        <Handshake className="h-4 w-4 mr-2" />
                        Request Swap
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Request Skill Swap</DialogTitle>
                        <DialogDescription>
                          Send a swap request to {profile.name}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {error && (
                        <Alert>
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="fromSkill">Your Skill (You Offer)</Label>
                          <Select 
                            value={requestForm.fromSkillId} 
                            onValueChange={(value) => setRequestForm({...requestForm, fromSkillId: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select your skill" />
                            </SelectTrigger>
                            <SelectContent>
                              {getCurrentUserOfferedSkills().map((userSkill) => (
                                <SelectItem key={userSkill.id} value={userSkill.skill.id}>
                                  {userSkill.skill.name} ({userSkill.proficiency_level})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {getCurrentUserOfferedSkills().length === 0 && (
                            <p className="text-xs text-red-500 mt-1">You need to add skills to your profile first</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="toSkill">Their Skill (You Want)</Label>
                          <Select 
                            value={requestForm.toSkillId} 
                            onValueChange={(value) => setRequestForm({...requestForm, toSkillId: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select their skill" />
                            </SelectTrigger>
                            <SelectContent>
                              {getOfferedSkills(profile).map((userSkill) => (
                                <SelectItem key={userSkill.id} value={userSkill.skill.id}>
                                  {userSkill.skill.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="message">Message</Label>
                          <Textarea
                            id="message"
                            placeholder="Introduce yourself and explain what you'd like to learn..."
                            value={requestForm.message}
                            onChange={(e) => setRequestForm({...requestForm, message: e.target.value})}
                            rows={3}
                          />
                        </div>
                        
                        <Button 
                          onClick={handleSendRequest} 
                          className="w-full" 
                          disabled={sendingRequest || !requestForm.fromSkillId || !requestForm.toSkillId || !requestForm.message}
                        >
                          {sendingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <Send className="h-4 w-4 mr-2" />
                          Send Request
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
} 