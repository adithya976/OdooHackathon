-- First, let's drop and recreate the tables with proper relationships

-- Drop existing tables in correct order (due to foreign key constraints)
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS swap_requests CASCADE;
DROP TABLE IF EXISTS user_skills CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  photo TEXT,
  bio TEXT,
  availability TEXT DEFAULT 'flexible',
  is_public BOOLEAN DEFAULT true,
  rating DECIMAL(2,1) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create skills table
CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_skills table with explicit foreign key names
CREATE TABLE user_skills (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  skill_id INTEGER NOT NULL,
  skill_type TEXT CHECK (skill_type IN ('offered', 'wanted')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_user_skills_user_id FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_skills_skill_id FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  UNIQUE(user_id, skill_id, skill_type)
);

-- Create swap_requests table
CREATE TABLE swap_requests (
  id SERIAL PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  from_skill_id INTEGER NOT NULL,
  to_skill_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_swap_requests_from_user FOREIGN KEY (from_user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_swap_requests_to_user FOREIGN KEY (to_user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_swap_requests_from_skill FOREIGN KEY (from_skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  CONSTRAINT fk_swap_requests_to_skill FOREIGN KEY (to_skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Create feedback table
CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  swap_request_id INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_feedback_from_user FOREIGN KEY (from_user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_to_user FOREIGN KEY (to_user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_swap_request FOREIGN KEY (swap_request_id) REFERENCES swap_requests(id) ON DELETE SET NULL
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

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User skills policies
CREATE POLICY "Public user skills are viewable by everyone" ON user_skills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = user_skills.user_id 
      AND profiles.is_public = true
    )
  );

CREATE POLICY "Users can view own skills" ON user_skills
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own skills" ON user_skills
  FOR ALL USING (auth.uid() = user_id);

-- Swap requests policies
CREATE POLICY "Users can view own swap requests" ON swap_requests
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create swap requests" ON swap_requests
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update received requests" ON swap_requests
  FOR UPDATE USING (auth.uid() = to_user_id);

-- Skills policies (public read)
CREATE POLICY "Skills are viewable by everyone" ON skills
  FOR SELECT TO authenticated USING (true);

-- Feedback policies
CREATE POLICY "Public feedback is viewable by everyone" ON feedback
  FOR SELECT USING (true);

CREATE POLICY "Users can create feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Create functions for triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_swap_requests_updated_at BEFORE UPDATE ON swap_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'New User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX idx_user_skills_type ON user_skills(skill_type);
CREATE INDEX idx_swap_requests_from_user ON swap_requests(from_user_id);
CREATE INDEX idx_swap_requests_to_user ON swap_requests(to_user_id);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);
CREATE INDEX idx_feedback_to_user ON feedback(to_user_id);
CREATE INDEX idx_profiles_public ON profiles(is_public);
