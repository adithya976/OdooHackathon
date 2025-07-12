const express = require("express")
const { body, validationResult } = require("express-validator")
const pool = require("../config/database")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Get user profile
router.get("/profile/:id", async (req, res) => {
  try {
    const { id } = req.params

    // Get user basic info
    const userResult = await pool.query(
      "SELECT id, name, location, profile_photo, availability, is_public FROM users WHERE id = $1 AND is_banned = false",
      [id],
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    const user = userResult.rows[0]

    // If profile is private and not the owner, return limited info
    if (!user.is_public && (!req.user || req.user.id !== Number.parseInt(id))) {
      return res.json({
        id: user.id,
        name: user.name,
        isPublic: false,
      })
    }

    // Get skills offered
    const skillsOfferedResult = await pool.query(
      `
      SELECT s.id, s.name, s.category, uso.proficiency_level, uso.description
      FROM user_skills_offered uso
      JOIN skills s ON uso.skill_id = s.id
      WHERE uso.user_id = $1
      ORDER BY s.name
    `,
      [id],
    )

    // Get skills wanted
    const skillsWantedResult = await pool.query(
      `
      SELECT s.id, s.name, s.category, usw.urgency, usw.description
      FROM user_skills_wanted usw
      JOIN skills s ON usw.skill_id = s.id
      WHERE usw.user_id = $1
      ORDER BY s.name
    `,
      [id],
    )

    // Get average rating
    const ratingResult = await pool.query(
      "SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as total_ratings FROM ratings WHERE rated_id = $1",
      [id],
    )

    res.json({
      id: user.id,
      name: user.name,
      location: user.location,
      profilePhoto: user.profile_photo,
      availability: user.availability,
      isPublic: user.is_public,
      skillsOffered: skillsOfferedResult.rows,
      skillsWanted: skillsWantedResult.rows,
      avgRating: ratingResult.rows[0].avg_rating || 0,
      totalRatings: Number.parseInt(ratingResult.rows[0].total_ratings),
    })
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update user profile
router.put(
  "/profile",
  authenticateToken,
  [
    body("name").optional().trim().isLength({ min: 2 }),
    body("location").optional().trim(),
    body("availability").optional().trim(),
    body("isPublic").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { name, location, availability, isPublic } = req.body
      const updates = []
      const values = []
      let paramCount = 1

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`)
        values.push(name)
      }
      if (location !== undefined) {
        updates.push(`location = $${paramCount++}`)
        values.push(location)
      }
      if (availability !== undefined) {
        updates.push(`availability = $${paramCount++}`)
        values.push(availability)
      }
      if (isPublic !== undefined) {
        updates.push(`is_public = $${paramCount++}`)
        values.push(isPublic)
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: "No updates provided" })
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(req.user.id)

      const query = `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING id, name, location, availability, is_public`

      const result = await pool.query(query, values)

      res.json({
        message: "Profile updated successfully",
        user: result.rows[0],
      })
    } catch (error) {
      console.error("Update profile error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Add skill offered
router.post(
  "/skills/offered",
  authenticateToken,
  [
    body("skillId").isInt(),
    body("proficiencyLevel").optional().isIn(["beginner", "intermediate", "advanced"]),
    body("description").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { skillId, proficiencyLevel, description } = req.body

      const result = await pool.query(
        "INSERT INTO user_skills_offered (user_id, skill_id, proficiency_level, description) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, skill_id) DO UPDATE SET proficiency_level = $3, description = $4 RETURNING *",
        [req.user.id, skillId, proficiencyLevel || "intermediate", description || null],
      )

      res.status(201).json(result.rows[0])
    } catch (error) {
      console.error("Add skill offered error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Add skill wanted
router.post(
  "/skills/wanted",
  authenticateToken,
  [
    body("skillId").isInt(),
    body("urgency").optional().isIn(["low", "medium", "high"]),
    body("description").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { skillId, urgency, description } = req.body

      const result = await pool.query(
        "INSERT INTO user_skills_wanted (user_id, skill_id, urgency, description) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, skill_id) DO UPDATE SET urgency = $3, description = $4 RETURNING *",
        [req.user.id, skillId, urgency || "medium", description || null],
      )

      res.status(201).json(result.rows[0])
    } catch (error) {
      console.error("Add skill wanted error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Remove skill offered
router.delete("/skills/offered/:skillId", authenticateToken, async (req, res) => {
  try {
    const { skillId } = req.params

    await pool.query("DELETE FROM user_skills_offered WHERE user_id = $1 AND skill_id = $2", [req.user.id, skillId])

    res.json({ message: "Skill removed successfully" })
  } catch (error) {
    console.error("Remove skill offered error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Remove skill wanted
router.delete("/skills/wanted/:skillId", authenticateToken, async (req, res) => {
  try {
    const { skillId } = req.params

    await pool.query("DELETE FROM user_skills_wanted WHERE user_id = $1 AND skill_id = $2", [req.user.id, skillId])

    res.json({ message: "Skill removed successfully" })
  } catch (error) {
    console.error("Remove skill wanted error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Search users by skill
router.get("/search", async (req, res) => {
  try {
    const { skill, type = "offered" } = req.query

    if (!skill) {
      return res.status(400).json({ message: "Skill parameter required" })
    }

    let query
    if (type === "offered") {
      query = `
        SELECT DISTINCT u.id, u.name, u.location, u.profile_photo,
               s.name as skill_name, uso.proficiency_level,
               COALESCE(AVG(r.rating), 0) as avg_rating,
               COUNT(r.rating) as total_ratings
        FROM users u
        JOIN user_skills_offered uso ON u.id = uso.user_id
        JOIN skills s ON uso.skill_id = s.id
        LEFT JOIN ratings r ON u.id = r.rated_id
        WHERE s.name ILIKE $1 AND u.is_public = true AND u.is_banned = false
        GROUP BY u.id, u.name, u.location, u.profile_photo, s.name, uso.proficiency_level
        ORDER BY avg_rating DESC, u.name
      `
    } else {
      query = `
        SELECT DISTINCT u.id, u.name, u.location, u.profile_photo,
               s.name as skill_name, usw.urgency
        FROM users u
        JOIN user_skills_wanted usw ON u.id = usw.user_id
        JOIN skills s ON usw.skill_id = s.id
        WHERE s.name ILIKE $1 AND u.is_public = true AND u.is_banned = false
        ORDER BY u.name
      `
    }

    const result = await pool.query(query, [`%${skill}%`])
    res.json(result.rows)
  } catch (error) {
    console.error("Search users error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
