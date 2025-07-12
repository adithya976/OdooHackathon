-- Complete database setup for Skill Swap Platform
-- This script will create everything from scratch

-- Drop all existing tables and policies
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS swap_requests CASCADE;
DROP TABLE IF EXISTS user_skills CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Public user skills are viewable by everyone" ON user_skills;
DROP POLICY IF EXISTS "Users can view own skills" ON user_skills;
DROP POLICY IF EXISTS "Users can manage own skills" ON user_skills;
DROP POLICY IF EXISTS "Users can view own swap requests" ON swap_requests;
DROP POLICY IF EXISTS "Users can create swap requests" ON swap_requests;
DROP POLICY IF EXISTS "Users can update received requests" ON swap_requests;
DROP POLICY IF EXISTS "Skills are viewable by everyone" ON skills;
DROP POLICY IF EXISTS "Public feedback is viewable by everyone" ON feedback;
DROP POLICY IF EXISTS "Users can create feedback" ON feedback;

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_swap_requests_updated_at ON swap_requests;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  photo TEXT,
  bio TEXT,
  availability TEXT DEFAULT 'flexible' CHECK (availability IN ('weekdays', 'weekends', 'evenings', 'flexible')),
  is_public BOOLEAN DEFAULT true,
  rating DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create skills table
CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_skills junction table
CREATE TABLE user_skills (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  skill_type TEXT NOT NULL CHECK (skill_type IN ('offered', 'wanted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_id, skill_type)
);

-- Create swap_requests table
CREATE TABLE swap_requests (
  id SERIAL PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  to_skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create feedback table
CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  swap_request_id INTEGER REFERENCES swap_requests(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default skills
INSERT INTO skills (name, category) VALUES
  ('Photoshop', 'Design'),
  ('UI/UX Design', 'Design'),
  ('Figma', 'Design'),
  ('Video Editing', 'Media'),
  ('After Effects', 'Media'),
  ('Motion Graphics', 'Media'),
  ('Web Development', 'Development'),
  ('React', 'Development'),
  ('Node.js', 'Development'),
  ('3D Modeling', 'Design'),
  ('Blender', 'Design'),
  ('Animation', 'Media'),
  ('Photography', 'Media'),
  ('Lightroom', 'Media'),
  ('Portrait Photography', 'Media'),
  ('Social Media Marketing', 'Marketing'),
  ('Content Strategy', 'Marketing'),
  ('Copywriting', 'Marketing'),
  ('YouTube', 'Media'),
  ('Graphic Design', 'Design'),
  ('Branding', 'Marketing'),
  ('Illustration', 'Design'),
  ('Logo Design', 'Design'),
  ('WordPress', 'Development'),
  ('SEO', 'Marketing'),
  ('Google Ads', 'Marketing'),
  ('Facebook Ads', 'Marketing'),
  ('Email Marketing', 'Marketing'),
  ('Data Analysis', 'Analytics'),
  ('Excel', 'Analytics'),
  ('PowerBI', 'Analytics'),
  ('Tableau', 'Analytics');

-- Create indexes for performance
CREATE INDEX idx_profiles_public ON profiles(is_public);
CREATE INDEX idx_profiles_availability ON profiles(availability);
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX idx_user_skills_type ON user_skills(skill_type);
CREATE INDEX idx_swap_requests_from_user ON swap_requests(from_user_id);
CREATE INDEX idx_swap_requests_to_user ON swap_requests(to_user_id);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);
CREATE INDEX idx_feedback_to_user ON feedback(to_user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Anyone can view public profiles" ON profiles
  FOR SELECT USING (is_public = true OR auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_skills
CREATE POLICY "Anyone can view skills of public profiles" ON user_skills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = user_skills.user_id 
      AND (profiles.is_public = true OR auth.uid() = profiles.id)
    )
  );

CREATE POLICY "Users can manage their own skills" ON user_skills
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for swap_requests
CREATE POLICY "Users can view their own swap requests" ON swap_requests
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create swap requests" ON swap_requests
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update requests sent to them" ON swap_requests
  FOR UPDATE USING (auth.uid() = to_user_id);

-- RLS Policies for skills (public read)
CREATE POLICY "Anyone can view skills" ON skills
  FOR SELECT USING (true);

-- RLS Policies for feedback
CREATE POLICY "Anyone can view feedback" ON feedback
  FOR SELECT USING (true);

CREATE POLICY "Users can create feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_swap_requests_updated_at 
  BEFORE UPDATE ON swap_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
