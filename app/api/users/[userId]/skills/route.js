import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

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
      const result = await client.query(
        `SELECT us.*, s.name as skill_name, s.category as skill_category
         FROM user_skills us
         JOIN skills s ON us.skill_id = s.id
         WHERE us.user_id = $1
         ORDER BY us.skill_type, s.name`,
        [userId]
      );

      const userSkills = result.rows.map(row => ({
        id: row.id,
        skill: {
          id: row.skill_id,
          name: row.skill_name,
          category: row.skill_category
        },
        skill_type: row.skill_type,
        proficiency_level: row.proficiency_level
      }));

      return NextResponse.json(userSkills);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get user skills error:', error);
    return NextResponse.json(
      { error: { message: 'Error fetching user skills' } },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { userId } = await params;
    const skillData = await request.json();
    const { skill_id, skill_type, proficiency_level = 'intermediate' } = skillData;

    // Validate input
    if (!skill_id || !skill_type) {
      return NextResponse.json(
        { error: { message: 'Skill ID and skill type are required' } },
        { status: 400 }
      );
    }

    if (!['offered', 'wanted'].includes(skill_type)) {
      return NextResponse.json(
        { error: { message: 'Skill type must be "offered" or "wanted"' } },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      const userSkillId = uuidv4();
      
      const result = await client.query(
        `INSERT INTO user_skills (id, user_id, skill_id, skill_type, proficiency_level)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, skill_id, skill_type) DO UPDATE SET
         proficiency_level = EXCLUDED.proficiency_level
         RETURNING *`,
        [userSkillId, userId, skill_id, skill_type, proficiency_level]
      );

      return NextResponse.json({ success: true });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Add user skill error:', error);
    return NextResponse.json(
      { error: { message: 'Error adding user skill' } },
      { status: 500 }
    );
  }
} 