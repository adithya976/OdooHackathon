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
      const [usersResult, requestsResult, feedbackResult] = await Promise.all([
        client.query('SELECT id, created_at, is_banned FROM profiles ORDER BY created_at'),
        client.query('SELECT id, status, created_at FROM swap_requests ORDER BY created_at'),
        client.query('SELECT id, rating, created_at FROM feedback ORDER BY created_at')
      ]);

      const users = usersResult.rows;
      const requests = requestsResult.rows;
      const feedback = feedbackResult.rows;

      return NextResponse.json({
        data: {
          totalUsers: users.length,
          bannedUsers: users.filter((u) => u.is_banned).length,
          totalRequests: requests.length,
          pendingRequests: requests.filter((r) => r.status === 'pending').length,
          completedRequests: requests.filter((r) => r.status === 'completed').length,
          totalFeedback: feedback.length,
          averageRating: feedback.length > 0 ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length : 0,
          users,
          requests,
          feedback,
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json(
      { error: { message: 'Error fetching admin stats' } },
      { status: 500 }
    );
  }
} 
