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

export async function POST(request) {
  try {
    const requestData = await request.json();
    const { fromUserId, toUserId, fromSkillId, toSkillId, message } = requestData;

    // Validate input
    if (!fromUserId || !toUserId || !fromSkillId || !toSkillId || !message) {
      return NextResponse.json(
        { error: { message: 'All fields are required' } },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      const requestId = uuidv4();
      
      const result = await client.query(
        `INSERT INTO swap_requests (id, from_user_id, to_user_id, from_skill_id, to_skill_id, message)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [requestId, fromUserId, toUserId, fromSkillId, toSkillId, message]
      );

      return NextResponse.json({ data: result.rows[0] });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create swap request error:', error);
    return NextResponse.json(
      { error: { message: 'Error creating swap request' } },
      { status: 500 }
    );
  }
} 
