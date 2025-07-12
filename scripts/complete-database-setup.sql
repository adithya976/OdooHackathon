-- Complete Skill Swap Platform Database Setup
-- Drop existing tables and start fresh

DROP TABLE IF EXISTS platform_messages CASCADE;
DROP TABLE IF EXISTS admin_actions CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS swap_requests CASCADE;
DROP TABLE IF EXISTS user_skills CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table with all required fields
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  photo TEXT,
  bio TEXT,
  availability TEXT DEFAULT 'flexible' CHECK (availability IN ('weekdays', 'weekends', 'evenings', 'flexible')),
  is_public BOOLEAN DEFAULT true,
  is_banned BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0.0,
  total_swaps INTEGER DEFAULT 0,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create skills table
CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  is_approved BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_skills junction table
CREATE TABLE user_skills (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  skill_type TEXT NOT NULL CHECK (skill_type IN ('offered', 'wanted')),
  proficiency_level TEXT DEFAULT 'intermediate' CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
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
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_reason TEXT
);

-- Create feedback table
CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  swap_request_id INTEGER NOT NULL REFERENCES swap_requests(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_actions table for audit trail
CREATE TABLE admin_actions (
  id SERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('ban_user', 'unban_user', 'reject_skill', 'approve_skill', 'delete_request', 'send_message')),
  target_id TEXT, -- Can be user_id, skill_id, request_id, etc.
  reason TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create platform_messages table
CREATE TABLE platform_messages (
  id SERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'info' CHECK (message_type IN ('info', 'warning', 'update', 'maintenance')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Insert default skills with categories
INSERT INTO skills (name, category, is_approved) VALUES
  -- Design Skills
  ('Photoshop', 'Design', true),
  ('UI/UX Design', 'Design', true),
  ('Figma', 'Design', true),
  ('Graphic Design', 'Design', true),
  ('Logo Design', 'Design', true),
  ('Illustration', 'Design', true),
  ('3D Modeling', 'Design', true),
  ('Blender', 'Design', true),
  
  -- Development Skills
  ('Web Development', 'Development', true),
  ('React', 'Development', true),
  ('Node.js', 'Development', true),
  ('Python', 'Development', true),
  ('JavaScript', 'Development', true),
  ('WordPress', 'Development', true),
  ('Mobile App Development', 'Development', true),
  
  -- Media Skills
  ('Video Editing', 'Media', true),
  ('After Effects', 'Media', true),
  ('Motion Graphics', 'Media', true),
  ('Photography', 'Media', true),
  ('Lightroom', 'Media', true),
  ('Portrait Photography', 'Media', true),
  ('Animation', 'Media', true),
  ('YouTube', 'Media', true),
  
  -- Marketing Skills
  ('Social Media Marketing', 'Marketing', true),
  ('Content Strategy', 'Marketing', true),
  ('Copywriting', 'Marketing', true),
  ('SEO', 'Marketing', true),
  ('Google Ads', 'Marketing', true),
  ('Facebook Ads', 'Marketing', true),
  ('Email Marketing', 'Marketing', true),
  ('Branding', 'Marketing', true),
  
  -- Analytics Skills
  ('Data Analysis', 'Analytics', true),
  ('Excel', 'Analytics', true),
  ('PowerBI', 'Analytics', true),
  ('Tableau', 'Analytics', true),
  ('Google Analytics', 'Analytics', true),
  
  -- Business Skills
  ('Project Management', 'Business', true),
  ('Business Strategy', 'Business', true),
  ('Financial Planning', 'Business', true),
  ('Public Speaking', 'Business', true),
  ('Leadership', 'Business', true),
  
  -- Language Skills
  ('English Tutoring', 'Languages', true),
  ('Spanish', 'Languages', true),
  ('French', 'Languages', true),
  ('German', 'Languages', true),
  ('Mandarin', 'Languages', true),
  
  -- Creative Skills
  ('Music Production', 'Creative', true),
  ('Guitar', 'Creative', true),
  ('Piano', 'Creative', true),
  ('Writing', 'Creative', true),
  ('Creative Writing', 'Creative', true),
  ('Cooking', 'Creative', true);

-- Create indexes for performance
CREATE INDEX idx_profiles_public ON profiles(is_public) WHERE is_public = true;
CREATE INDEX idx_profiles_banned ON profiles(is_banned) WHERE is_banned = false;
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_skills_approved ON skills(is_approved) WHERE is_approved = true;
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX idx_user_skills_type ON user_skills(skill_type);
CREATE INDEX idx_swap_requests_from_user ON swap_requests(from_user_id);
CREATE INDEX idx_swap_requests_to_user ON swap_requests(to_user_id);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);
CREATE INDEX idx_feedback_to_user ON feedback(to_user_id);
CREATE INDEX idx_feedback_public ON feedback(is_public) WHERE is_public = true;
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX idx_platform_messages_active ON platform_messages(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Anyone can view public, non-banned profiles" ON profiles
  FOR SELECT USING (is_public = true AND is_banned = false OR auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for user_skills
CREATE POLICY "Anyone can view skills of public profiles" ON user_skills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = user_skills.user_id 
      AND (profiles.is_public = true AND profiles.is_banned = false OR auth.uid() = profiles.id)
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
  FOR UPDATE USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

CREATE POLICY "Users can delete their own requests" ON swap_requests
  FOR DELETE USING (auth.uid() = from_user_id);

CREATE POLICY "Admins can view all swap requests" ON swap_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for skills
CREATE POLICY "Anyone can view approved skills" ON skills
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can create skills" ON skills
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can manage all skills" ON skills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for feedback
CREATE POLICY "Anyone can view public feedback" ON feedback
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can create feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can view their own feedback" ON feedback
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- RLS Policies for admin_actions
CREATE POLICY "Admins can manage admin actions" ON admin_actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for platform_messages
CREATE POLICY "Anyone can view active platform messages" ON platform_messages
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Admins can manage platform messages" ON platform_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's rating when new feedback is added
  UPDATE profiles 
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 2)
    FROM feedback 
    WHERE to_user_id = NEW.to_user_id AND is_public = true
  )
  WHERE id = NEW.to_user_id;
  
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

CREATE TRIGGER update_user_rating_trigger
  AFTER INSERT ON feedback
  FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE 
      WHEN NEW.email = 'admin@skillswap.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create admin user (you can change this email)
-- Note: You'll need to sign up with this email to get admin access
INSERT INTO profiles (id, email, name, role) VALUES 
  ('00000000-0000-0000-0000-000000000000', 'admin@skillswap.com', 'Admin User', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';
