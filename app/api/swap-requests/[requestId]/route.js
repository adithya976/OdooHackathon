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

export async function PUT(request, { params }) {
  try {
    const { requestId } = params;
    const updateData = await request.json();
    const { status, cancelledReason } = updateData;

    // Validate input
    if (!status) {
      return NextResponse.json(
        { error: { message: 'Status is required' } },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      let query = `UPDATE swap_requests SET status = $1, updated_at = NOW()`;
      const queryParams = [status];

      if (status === 'cancelled' && cancelledReason) {
        query += `, cancelled_reason = $2`;
        queryParams.push(cancelledReason);
      }

      if (status === 'completed') {
        query += `, completed_at = NOW()`;
      }

      query += ` WHERE id = $${queryParams.length + 1} RETURNING *`;
      queryParams.push(requestId);

      const result = await client.query(query, queryParams);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: { message: 'Swap request not found' } },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: result.rows[0] });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Update swap request error:', error);
    return NextResponse.json(
      { error: { message: 'Error updating swap request' } },
      { status: 500 }
    );
  }
} 