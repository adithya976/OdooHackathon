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
    const messageData = await request.json();
    const { adminId, title, message, type = 'info', expiresAt } = messageData;

    // Validate input
    if (!adminId || !title || !message) {
      return NextResponse.json(
        { error: { message: 'Admin ID, title, and message are required' } },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      const messageId = uuidv4();
      
      const result = await client.query(
        `INSERT INTO platform_messages (id, admin_id, title, message, message_type, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [messageId, adminId, title, message, type, expiresAt]
      );

      return NextResponse.json({ data: result.rows[0] });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create platform message error:', error);
    return NextResponse.json(
      { error: { message: 'Error creating platform message' } },
      { status: 500 }
    );
  }
} 
