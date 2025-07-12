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
      const result = await client.query(`
        SELECT sr.*, 
               p1.name as from_user_name, p1.photo as from_user_photo,
               p2.name as to_user_name, p2.photo as to_user_photo,
               s1.name as from_skill_name, s1.category as from_skill_category,
               s2.name as to_skill_name, s2.category as to_skill_category
        FROM swap_requests sr
        JOIN profiles p1 ON sr.from_user_id = p1.id
        JOIN profiles p2 ON sr.to_user_id = p2.id
        JOIN skills s1 ON sr.from_skill_id = s1.id
        JOIN skills s2 ON sr.to_skill_id = s2.id
        ORDER BY sr.created_at DESC
      `);

      const enrichedRequests = result.rows.map((row) => ({
        ...row,
        from_user: {
          id: row.from_user_id,
          name: row.from_user_name,
          photo: row.from_user_photo,
        },
        to_user: {
          id: row.to_user_id,
          name: row.to_user_name,
          photo: row.to_user_photo,
        },
        from_skill: {
          id: row.from_skill_id,
          name: row.from_skill_name,
          category: row.from_skill_category,
        },
        to_skill: {
          id: row.to_skill_id,
          name: row.to_skill_name,
          category: row.to_skill_category,
        },
      }));

      return NextResponse.json({ data: enrichedRequests });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get all swap requests error:', error);
    return NextResponse.json(
      { error: { message: 'Error fetching swap requests' } },
      { status: 500 }
    );
  }
} 
