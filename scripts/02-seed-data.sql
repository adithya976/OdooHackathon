-- Seed initial data

-- Insert sample skills
INSERT INTO skills (name, category) VALUES
('JavaScript', 'Programming'),
('Python', 'Programming'),
('React', 'Programming'),
('Node.js', 'Programming'),
('Photoshop', 'Design'),
('Illustrator', 'Design'),
('Figma', 'Design'),
('Excel', 'Business'),
('PowerPoint', 'Business'),
('Marketing', 'Business'),
('Guitar', 'Music'),
('Piano', 'Music'),
('Spanish', 'Language'),
('French', 'Language'),
('Cooking', 'Lifestyle'),
('Photography', 'Creative'),
('Video Editing', 'Creative'),
('Yoga', 'Fitness'),
('Personal Training', 'Fitness'),
('Writing', 'Creative');

-- Insert admin user (password: admin123)
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@skillswap.com', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 'Admin User', 'admin');
