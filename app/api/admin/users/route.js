import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'skill_swap_platform',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

export async function GET() {
  try {
    const client = await pool.connect();

    try {
      const result = await client.query('SELECT * FROM profiles ORDER BY created_at DESC');
      return NextResponse.json({ data: result.rows });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get all users error:', error);
    return NextResponse.json(
      { error: { message: 'Error fetching users' } },
      { status: 500 }
    );
  }
} 
