import { NextResponse } from 'next/server';
import { Pool } from 'pg';
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
    const { token } = await request.json();

    // Validate input
    if (!token) {
      return NextResponse.json(
        { error: { message: 'Token is required' } },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user from database
      const userResult = await client.query(
        'SELECT u.id, u.email, u.name, p.role FROM users u JOIN profiles p ON u.id = p.id WHERE u.id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: { message: 'User not found' } },
          { status: 404 }
        );
      }

      const user = userResult.rows[0];
      return NextResponse.json({ user });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Token verification error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: { message: 'Invalid token' } },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: { message: 'Error verifying token' } },
      { status: 500 }
    );
  }
} 
