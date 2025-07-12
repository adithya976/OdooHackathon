import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'skill_swap_platform',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: { message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Find user
      const userResult = await client.query(
        'SELECT u.id, u.email, u.password_hash, u.name, p.role FROM users u JOIN profiles p ON u.id = p.id WHERE u.email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: { message: 'Invalid login credentials' } },
          { status: 401 }
        );
      }

      const user = userResult.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: { message: 'Invalid login credentials' } },
          { status: 401 }
        );
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      return NextResponse.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { error: { message: 'Error signing in' } },
      { status: 500 }
    );
  }
} 
 