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
    const feedbackData = await request.json();
    const { fromUserId, toUserId, swapRequestId, rating, comment, isPublic = true } = feedbackData;

    // Validate input
    if (!fromUserId || !toUserId || !rating || !comment) {
      return NextResponse.json(
        { error: { message: 'From user, to user, rating, and comment are required' } },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: { message: 'Rating must be between 1 and 5' } },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      const feedbackId = uuidv4();
      
      const result = await client.query(
        `INSERT INTO feedback (id, from_user_id, to_user_id, swap_request_id, rating, comment, is_public)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [feedbackId, fromUserId, toUserId, swapRequestId, rating, comment, isPublic]
      );

      return NextResponse.json({ data: result.rows[0] });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Submit feedback error:', error);
    return NextResponse.json(
      { error: { message: 'Error submitting feedback' } },
      { status: 500 }
    );
  }
} 
