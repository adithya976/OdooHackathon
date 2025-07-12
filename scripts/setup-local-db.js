const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'skill_swap_platform',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Setting up Skill Swap Platform database...');

    // Create tables
    await client.query(`
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Users table (replaces Supabase auth)
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Profiles table
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        photo VARCHAR(500),
        bio TEXT,
        availability VARCHAR(50) DEFAULT 'flexible',
        is_public BOOLEAN DEFAULT TRUE,
        is_banned BOOLEAN DEFAULT FALSE,
        role VARCHAR(20) DEFAULT 'user',
        rating DECIMAL(3,2) DEFAULT 0.0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Skills table
      CREATE TABLE IF NOT EXISTS skills (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(50) NOT NULL,
        is_approved BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- User skills table
      CREATE TABLE IF NOT EXISTS user_skills (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
        skill_type VARCHAR(20) NOT NULL CHECK (skill_type IN ('offered', 'wanted')),
        proficiency_level VARCHAR(20) DEFAULT 'intermediate',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, skill_id, skill_type)
      );

      -- Swap requests table
      CREATE TABLE IF NOT EXISTS swap_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        from_skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
        to_skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')),
        cancelled_reason TEXT,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Feedback table
      CREATE TABLE IF NOT EXISTS feedback (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        swap_request_id UUID REFERENCES swap_requests(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        is_public BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Platform messages table
      CREATE TABLE IF NOT EXISTS platform_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'info' CHECK (message_type IN ('info', 'warning', 'update', 'maintenance')),
        is_active BOOLEAN DEFAULT TRUE,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Admin actions table
      CREATE TABLE IF NOT EXISTS admin_actions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        target_id UUID,
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
      CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON profiles(is_public);
      CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned);
      CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON user_skills(skill_id);
      CREATE INDEX IF NOT EXISTS idx_swap_requests_from_user_id ON swap_requests(from_user_id);
      CREATE INDEX IF NOT EXISTS idx_swap_requests_to_user_id ON swap_requests(to_user_id);
      CREATE INDEX IF NOT EXISTS idx_swap_requests_status ON swap_requests(status);
      CREATE INDEX IF NOT EXISTS idx_feedback_to_user_id ON feedback(to_user_id);
      CREATE INDEX IF NOT EXISTS idx_feedback_is_public ON feedback(is_public);
      CREATE INDEX IF NOT EXISTS idx_platform_messages_is_active ON platform_messages(is_active);

      -- Create function to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Create triggers for updated_at
      DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
      CREATE TRIGGER update_profiles_updated_at 
        BEFORE UPDATE ON profiles 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_swap_requests_updated_at ON swap_requests;
      CREATE TRIGGER update_swap_requests_updated_at 
        BEFORE UPDATE ON swap_requests 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('Database tables created successfully!');

    // Insert default skills
    const defaultSkills = [
      // Design & Creative
      { name: 'Photoshop', category: 'Design & Creative' },
      { name: 'UI/UX Design', category: 'Design & Creative' },
      { name: 'Figma', category: 'Design & Creative' },
      { name: 'Graphic Design', category: 'Design & Creative' },
      { name: 'Branding', category: 'Design & Creative' },
      { name: 'Illustration', category: 'Design & Creative' },
      { name: 'Logo Design', category: 'Design & Creative' },
      
      // Video & Animation
      { name: 'Video Editing', category: 'Video & Animation' },
      { name: 'After Effects', category: 'Video & Animation' },
      { name: 'Motion Graphics', category: 'Video & Animation' },
      { name: '3D Modeling', category: 'Video & Animation' },
      { name: 'Blender', category: 'Video & Animation' },
      { name: 'Animation', category: 'Video & Animation' },
      
      // Development
      { name: 'Web Development', category: 'Development' },
      { name: 'React', category: 'Development' },
      { name: 'Node.js', category: 'Development' },
      { name: 'WordPress', category: 'Development' },
      
      // Photography
      { name: 'Photography', category: 'Photography' },
      { name: 'Lightroom', category: 'Photography' },
      { name: 'Portrait Photography', category: 'Photography' },
      
      // Marketing
      { name: 'Social Media Marketing', category: 'Marketing' },
      { name: 'Content Strategy', category: 'Marketing' },
      { name: 'Copywriting', category: 'Marketing' },
      { name: 'SEO', category: 'Marketing' },
      { name: 'Google Ads', category: 'Marketing' },
      { name: 'Facebook Ads', category: 'Marketing' },
      { name: 'Email Marketing', category: 'Marketing' },
      { name: 'YouTube', category: 'Marketing' },
      
      // Business & Analytics
      { name: 'Data Analysis', category: 'Business & Analytics' },
      { name: 'Excel', category: 'Business & Analytics' },
      { name: 'PowerBI', category: 'Business & Analytics' },
      { name: 'Tableau', category: 'Business & Analytics' }
    ];

    for (const skill of defaultSkills) {
      await client.query(
        'INSERT INTO skills (name, category) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [skill.name, skill.category]
      );
    }

    console.log('Default skills inserted successfully!');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminId = uuidv4();
    
    await client.query(
      'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
      [adminId, 'admin@skillswap.com', adminPassword, 'Admin User']
    );

    await client.query(
      'INSERT INTO profiles (id, email, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET role = $4',
      [adminId, 'admin@skillswap.com', 'Admin User', 'admin']
    );

    console.log('Admin user created: admin@skillswap.com / admin123');

    // Create some sample users
    const sampleUsers = [
      {
        email: 'sarah@example.com',
        password: 'password123',
        name: 'Sarah Johnson',
        location: 'San Francisco, CA',
        bio: 'Passionate designer with 5+ years of experience in digital design.',
        skillsOffered: ['Photoshop', 'UI/UX Design', 'Figma'],
        skillsWanted: ['Video Editing', '3D Modeling']
      },
      {
        email: 'mike@example.com',
        password: 'password123',
        name: 'Mike Chen',
        location: 'New York, NY',
        bio: 'Video editor and motion graphics artist working in advertising.',
        skillsOffered: ['Video Editing', 'After Effects', 'Motion Graphics'],
        skillsWanted: ['Web Development', 'React']
      },
      {
        email: 'emily@example.com',
        password: 'password123',
        name: 'Emily Rodriguez',
        location: 'Austin, TX',
        bio: 'Full-stack developer passionate about creating amazing user experiences.',
        skillsOffered: ['Web Development', 'React', 'Node.js'],
        skillsWanted: ['Graphic Design', 'Branding']
      }
    ];

    for (const userData of sampleUsers) {
      const userId = uuidv4();
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      // Create user
      await client.query(
        'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
        [userId, userData.email, passwordHash, userData.name]
      );

      // Create profile
      await client.query(
        'INSERT INTO profiles (id, email, name, location, bio) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
        [userId, userData.email, userData.name, userData.location, userData.bio]
      );

      // Add skills
      for (const skillName of userData.skillsOffered) {
        const skillResult = await client.query('SELECT id FROM skills WHERE name = $1', [skillName]);
        if (skillResult.rows.length > 0) {
          await client.query(
            'INSERT INTO user_skills (user_id, skill_id, skill_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [userId, skillResult.rows[0].id, 'offered']
          );
        }
      }

      for (const skillName of userData.skillsWanted) {
        const skillResult = await client.query('SELECT id FROM skills WHERE name = $1', [skillName]);
        if (skillResult.rows.length > 0) {
          await client.query(
            'INSERT INTO user_skills (user_id, skill_id, skill_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [userId, skillResult.rows[0].id, 'wanted']
          );
        }
      }
    }

    console.log('Sample users created successfully!');
    console.log('Database setup completed!');

  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Database setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase }; 