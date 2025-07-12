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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const skill = searchParams.get('skill') || '';
    const availability = searchParams.get('availability') || '';
    const category = searchParams.get('category') || '';

    const client = await pool.connect();

    try {
      // Start with a simple query to get all profiles
      let query = `
        SELECT p.*, 
               COALESCE(AVG(f.rating), 0) as rating
        FROM profiles p
        LEFT JOIN feedback f ON p.id = f.to_user_id AND f.is_public = TRUE
        WHERE p.is_public = TRUE
      `;

      const params = [];
      let paramCount = 0;

      // Add search filter
      if (search) {
        paramCount++;
        query += ` AND (p.name ILIKE $${paramCount} OR p.bio ILIKE $${paramCount} OR p.location ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      // Add availability filter
      if (availability) {
        paramCount++;
        query += ` AND p.availability = $${paramCount}`;
        params.push(availability);
      }

      // Add skill filter
      if (skill) {
        paramCount++;
        query += ` AND EXISTS (
          SELECT 1 FROM user_skills us 
          WHERE us.user_id = p.id 
          AND us.skill_id = $${paramCount}
        )`;
        params.push(skill);
      }

      // Add category filter
      if (category) {
        paramCount++;
        query += ` AND EXISTS (
          SELECT 1 FROM user_skills us 
          JOIN skills s ON us.skill_id = s.id
          WHERE us.user_id = p.id 
          AND s.category = $${paramCount}
        )`;
        params.push(category);
      }

      query += ` GROUP BY p.id ORDER BY p.created_at DESC`;

      console.log('Profiles query:', query, 'params:', params);

      const result = await client.query(query, params);
      console.log('Found profiles:', result.rows.length);

      // Get skills for each user
      const profilesWithSkills = await Promise.all(
        result.rows.map(async (profile) => {
          try {
            const skillsResult = await client.query(`
              SELECT us.id, us.skill_type, us.proficiency_level,
                     s.id as skill_id, s.name, s.category
              FROM user_skills us
              JOIN skills s ON us.skill_id = s.id
              WHERE us.user_id = $1
            `, [profile.id]);

            const user_skills = skillsResult.rows.map(row => ({
              id: row.id,
              skill: {
                id: row.skill_id,
                name: row.name,
                category: row.category
              },
              skill_type: row.skill_type,
              proficiency_level: row.proficiency_level
            }));

            return {
              ...profile,
              user_skills,
              rating: parseFloat(profile.rating || 0)
            };
          } catch (skillError) {
            console.error('Error loading skills for profile:', profile.id, skillError);
            return {
              ...profile,
              user_skills: [],
              rating: parseFloat(profile.rating || 0)
            };
          }
        })
      );

      console.log('Profiles with skills:', profilesWithSkills.length);
      return NextResponse.json(profilesWithSkills);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get profiles error:', error);
    return NextResponse.json(
      { error: { message: 'Error fetching profiles: ' + error.message } },
      { status: 500 }
    );
  }
} 
 