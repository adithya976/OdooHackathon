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

export async function POST(request, { params }) {
  try {
    const { userId } = params;

    const client = await pool.connect();

    try {
      // Update user to unbanned status
      const result = await client.query(
        'UPDATE profiles SET is_banned = FALSE WHERE id = $1 RETURNING *',
        [userId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: { message: 'User not found' } },
          { status: 404 }
        );
      }

      // Log admin action
      await client.query(
        'INSERT INTO admin_actions (admin_id, action_type, target_id, reason) VALUES ($1, $2, $3, $4)',
        [userId, 'unban_user', userId, 'User unbanned']
      );

      return NextResponse.json({ data: result.rows[0] });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Unban user error:', error);
    return NextResponse.json(
      { error: { message: 'Error unbanning user' } },
      { status: 500 }
    );
  }
} 