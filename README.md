# Skill Swap Platform - Full Stack Application

A complete full-stack web application for skill swapping between users, built with Next.js, React, and PostgreSQL.

## 🚀 Features

- **User Authentication**: Secure signup/signin with JWT tokens
- **User Profiles**: Customizable profiles with skills, bio, and availability
- **Skill Management**: Add/remove skills you can offer or want to learn
- **Swap Requests**: Create and manage skill swap requests
- **Feedback System**: Rate and review other users after swaps
- **Admin Dashboard**: Manage users, view statistics, and platform messages
- **Real-time Updates**: Dynamic UI updates for better user experience

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library

### Backend
- **Next.js API Routes** - Server-side API endpoints
- **PostgreSQL** - Primary database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication

### Database
- **PostgreSQL** - Relational database
- **UUID** - Primary keys for better security
- **Triggers** - Automatic timestamp updates

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **pnpm**

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd skill-swap-platform
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up PostgreSQL
Make sure PostgreSQL is running and create a database:
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE skill_swap_platform;

# Exit psql
\q
```

### 4. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=skill_swap_platform
DB_PASSWORD=admin
DB_PORT=5432

# JWT Secret (change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Set Up Database Schema
```bash
npm run db:setup
```

This will:
- Create all necessary tables
- Insert default skills
- Create admin user
- Add sample users

### 6. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 👥 Default Users

After running the database setup, you'll have these default users:

### Admin User
- **Email**: admin@skillswap.com
- **Password**: admin123
- **Role**: Admin

### Sample Users
- **Email**: john@example.com
- **Password**: password123

- **Email**: sarah@example.com  
- **Password**: password123

- **Email**: mike@example.com
- **Password**: password123


## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/verify` - Verify JWT token

### Profiles
- `GET /api/profiles` - Get all public profiles
- `GET /api/profiles/[userId]` - Get specific profile
- `PUT /api/profiles/[userId]` - Update profile

### Skills
- `GET /api/skills` - Get all skills
- `POST /api/users/[userId]/skills` - Add user skill
- `DELETE /api/users/[userId]/skills/[skillId]` - Remove user skill

### Swap Requests
- `POST /api/swap-requests` - Create swap request
- `GET /api/users/[userId]/swap-requests` - Get user's swap requests
- `PUT /api/swap-requests/[requestId]` - Update swap request

### Feedback
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback/[userId]` - Get user feedback

### Admin
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users/[userId]/ban` - Ban user
- `POST /api/admin/users/[userId]/unban` - Unban user
- `GET /api/admin/stats` - Get admin statistics
- `GET /api/admin/swap-requests` - Get all swap requests
- `POST /api/admin/platform-messages` - Create platform message

## 🗄️ Database Schema

### Core Tables
- **users** - User authentication data
- **profiles** - User profile information
- **skills** - Available skills
- **user_skills** - User-skill relationships
- **swap_requests** - Skill swap requests
- **feedback** - User feedback and ratings
- **platform_messages** - Admin announcements
- **admin_actions** - Admin activity log

### Key Features
- UUID primary keys for security
- Automatic timestamp updates
- Foreign key constraints
- Indexes for performance
- Soft deletes where appropriate

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **SQL Injection Prevention**: Parameterized queries
- **CORS Protection**: Configured for local development
- **Input Validation**: Server-side validation
- **Error Handling**: Secure error messages

