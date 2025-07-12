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

export async function DELETE(request, { params }) {
  try {
    const { userId, skillId } = await params;
    const { skillType } = await request.json();

    // Validate input
    if (!skillType) {
      return NextResponse.json(
        { error: { message: 'Skill type is required' } },
        { status: 400 }
      );
    }

    if (!['offered', 'wanted'].includes(skillType)) {
      return NextResponse.json(
        { error: { message: 'Skill type must be "offered" or "wanted"' } },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      const result = await client.query(
        'DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2 AND skill_type = $3 RETURNING *',
        [userId, skillId, skillType]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: { message: 'User skill not found' } },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Remove user skill error:', error);
    return NextResponse.json(
      { error: { message: 'Error removing user skill' } },
      { status: 500 }
    );
  }
} 