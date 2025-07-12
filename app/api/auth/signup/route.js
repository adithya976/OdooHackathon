import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

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
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: { message: 'Email, password, and name are required' } },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Check if user already exists
      const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          { error: { message: 'User already exists with this email' } },
          { status: 409 }
        );
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      // Create user
      await client.query(
        'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)',
        [userId, email, passwordHash, name]
      );

      // Create profile
      await client.query(
        'INSERT INTO profiles (id, email, name) VALUES ($1, $2, $3)',
        [userId, email, name]
      );

      // Generate JWT token
      const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });

      return NextResponse.json({
        token,
        user: {
          id: userId,
          email,
          name,
          role: 'user'
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: { message: 'Error creating user' } },
      { status: 500 }
    );
  }
} 
 