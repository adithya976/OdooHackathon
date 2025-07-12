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
      const result = await client.query(`
        SELECT f.*, p.name AS from_user_name, p.photo AS from_user_photo
        FROM feedback f
        JOIN profiles p ON f.from_user_id = p.id
        WHERE f.to_user_id = $1 AND f.is_public = TRUE
        ORDER BY f.created_at DESC
      `, [userId]);

      const enrichedFeedback = result.rows.map((item) => ({
        ...item,
        from_user: {
          id: item.from_user_id,
          name: item.from_user_name,
          photo: item.from_user_photo,
        },
      }));

      return NextResponse.json({ data: enrichedFeedback });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get feedback error:', error);
    return NextResponse.json(
      { error: { message: 'Error fetching feedback' } },
      { status: 500 }
    );
  }
} 