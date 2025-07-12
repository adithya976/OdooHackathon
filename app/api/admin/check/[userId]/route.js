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

export async function GET(request, { params }) {
  try {
    const { userId } = params;

    const client = await pool.connect();

    try {
      const result = await client.query('SELECT role FROM profiles WHERE id = $1', [userId]);
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: { message: 'User not found' } },
          { status: 404 }
        );
      }
      return NextResponse.json({ isAdmin: result.rows[0].role === 'admin' });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Check admin status error:', error);
    return NextResponse.json(
      { error: { message: 'Error checking admin status' } },
      { status: 500 }
    );
  }
} 