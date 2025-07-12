"use client"

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface Skill {
  id: string
  name: string
  category: string
}

export default function TestSkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkill, setSelectedSkill] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSkills()
  }, [])

  const loadSkills = async () => {
    try {
      console.log('Loading skills...')
      const response = await fetch('/api/skills')
      console.log('Skills response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Skills loaded:', data.length, 'skills:', data)
        setSkills(data)
      } else {
        console.error('Failed to load skills:', response.status)
      }
    } catch (error) {
      console.error('Error loading skills:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSkillSelect = (value: string) => {
    console.log('Skill selected:', value)
    setSelectedSkill(value)
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Skills Selection Test</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-medium mb-2">Available Skills ({skills.length})</h2>
          {loading ? (
            <p>Loading skills...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {skills.map((skill) => (
                <div key={skill.id} className="p-2 border rounded">
                  <div className="font-medium">{skill.name}</div>
                  <div className="text-sm text-gray-600">{skill.category}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-medium mb-2">Select a Skill</h2>
          <Select value={selectedSkill} onValueChange={handleSkillSelect}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choose a skill" />
            </SelectTrigger>
            <SelectContent>
              {skills.map((skill) => (
                <SelectItem key={skill.id} value={skill.id}>
                  {skill.name} ({skill.category})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedSkill && (
            <div className="mt-2 p-2 bg-green-100 border rounded">
              Selected: {skills.find(s => s.id === selectedSkill)?.name}
            </div>
          )}
        </div>

        <Button onClick={loadSkills}>
          Reload Skills
        </Button>
      </div>
    </div>
  )
} 