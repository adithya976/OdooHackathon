# Setup Guide for Skill Swap Platform

This guide will help you set up the Skill Swap Platform to run completely offline with a local PostgreSQL database.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v12 or higher)
3. **npm** or **pnpm**

## Step-by-Step Setup

### 1. Install PostgreSQL

#### Windows
1. Download PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user
4. Add PostgreSQL to your PATH if prompted

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL as the postgres user
psql -U postgres

# Create the database
CREATE DATABASE skill_swap_platform;

# Verify the database was created
\l

# Exit psql
\q
```

### 3. Install Dependencies

```bash
# Install all required packages
npm install
```

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory with the following content:

```env
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=skill_swap_platform
DB_PASSWORD=your_postgres_password
DB_PORT=5432

# JWT Secret (change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: Replace `your_postgres_password` with the password you set during PostgreSQL installation.

### 5. Set Up Database Schema

Run the database setup script:

```bash
npm run db:setup
```

This script will:
- Create all necessary database tables
- Insert default skills (Design, Development, Marketing, etc.)
- Create an admin user
- Create sample users for testing

### 6. Start the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Default Login Credentials

After running the setup script, you can log in with these accounts:

### Admin Account
- **Email**: admin@skillswap.com
- **Password**: admin123
- **Access**: Full admin dashboard

### Sample User Accounts
- **Email**: sarah@example.com
- **Password**: password123
- **Skills**: Photoshop, UI/UX Design, Figma

- **Email**: mike@example.com
- **Password**: password123
- **Skills**: Video Editing, After Effects, Motion Graphics

- **Email**: emily@example.com
- **Password**: password123
- **Skills**: Web Development, React, Node.js

## Testing the Application

1. **Browse Users**: Visit the home page to see sample users
2. **Create Account**: Sign up with a new email
3. **Complete Profile**: Add skills you can offer and want to learn
4. **Request Swap**: Send skill exchange requests to other users
5. **Admin Features**: Log in as admin to access the admin dashboard

## Troubleshooting

### Database Connection Issues

**Error**: `connection to server at "localhost" (127.0.0.1), port 5432 failed`

**Solutions**:
1. Ensure PostgreSQL is running:
   ```bash
   # Windows
   services.msc  # Look for "postgresql-x64-15" service
   
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Check your database credentials in `.env.local`
3. Verify the database exists:
   ```bash
   psql -U postgres -l
   ```

### Port Already in Use

**Error**: `Port 3000 is already in use`

**Solutions**:
1. Kill the process using port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   ```

2. Or change the port in `package.json`:
   ```json
   "dev": "next dev -p 3001"
   ```

### Module Not Found Errors

**Error**: `Cannot find module 'pg'`

**Solutions**:
1. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Check Node.js version:
   ```bash
   node --version  # Should be v18 or higher
   ```

### Database Setup Fails

**Error**: `Error setting up database`

**Solutions**:
1. Check PostgreSQL connection:
   ```bash
   psql -U postgres -d skill_swap_platform -c "SELECT 1;"
   ```

2. Verify database exists:
   ```bash
   psql -U postgres -l | grep skill_swap_platform
   ```

3. Drop and recreate database:
   ```bash
   psql -U postgres -c "DROP DATABASE IF EXISTS skill_swap_platform;"
   psql -U postgres -c "CREATE DATABASE skill_swap_platform;"
   npm run db:setup
   ```

## Development Workflow

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Database Changes**: Edit `scripts/setup-local-db.js` and run:
   ```bash
   npm run db:setup
   ```

3. **Code Changes**: Edit files in `src/` directory
4. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

## File Structure Overview

```
skill-swap-platform/
├── scripts/
│   └── setup-local-db.js    # Database setup script
├── src/
│   ├── lib/
│   │   ├── database.js      # Database operations
│   │   └── auth-context.js  # Authentication context
│   ├── pages/               # Page components
│   ├── components/          # Reusable components
│   └── App.jsx             # Main application
├── .env.local              # Environment variables
└── package.json            # Dependencies and scripts
```

## Security Notes

- Change the JWT_SECRET in production
- Use strong passwords for PostgreSQL
- Enable HTTPS in production
- Regularly update dependencies

## Support

If you encounter issues not covered in this guide:

1. Check the console for error messages
2. Verify all prerequisites are installed
3. Ensure PostgreSQL is running
4. Check environment variables are correct
5. Try resetting the database setup

For additional help, please refer to the main README.md file or open an issue in the repository. 