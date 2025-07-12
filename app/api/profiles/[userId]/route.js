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
    const { userId } = await params;

    const client = await pool.connect();

    try {
      const result = await client.query('SELECT * FROM profiles WHERE id = $1', [userId]);
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: { message: 'Profile not found' } },
          { status: 404 }
        );
      }
      return NextResponse.json(result.rows[0]);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: { message: 'Error fetching profile' } },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { userId } = await params;
    const profileData = await request.json();

    const client = await pool.connect();

    try {
      const result = await client.query(
        `UPDATE profiles 
         SET name = $1, location = $2, bio = $3, availability = $4, is_public = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [
          profileData.name,
          profileData.location,
          profileData.bio,
          profileData.availability,
          profileData.is_public,
          userId
        ]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: { message: 'Profile not found' } },
          { status: 404 }
        );
      }

      return NextResponse.json(result.rows[0]);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: { message: 'Error updating profile' } },
      { status: 500 }
    );
  }
} 