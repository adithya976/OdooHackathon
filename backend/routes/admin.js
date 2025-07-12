const express = require("express")
const { body, validationResult } = require("express-validator")
const pool = require("../config/database")
const { authenticateToken, requireAdmin } = require("../middleware/auth")

const router = express.Router()

// All admin routes require authentication and admin role
router.use(authenticateToken)
router.use(requireAdmin)

// Get platform statistics
router.get("/stats", async (req, res) => {
  try {
    const stats = await Promise.all([
      pool.query("SELECT COUNT(*) as total_users FROM users WHERE is_banned = false"),
      pool.query("SELECT COUNT(*) as total_skills FROM skills"),
      pool.query("SELECT COUNT(*) as total_swaps FROM swap_requests"),
      pool.query("SELECT COUNT(*) as pending_swaps FROM swap_requests WHERE status = $1", ["pending"]),
      pool.query("SELECT COUNT(*) as completed_swaps FROM swap_requests WHERE status = $1", ["completed"]),
      pool.query("SELECT AVG(rating)::numeric(3,2) as avg_rating FROM ratings"),
    ])

    res.json({
      totalUsers: Number.parseInt(stats[0].rows[0].total_users),
      totalSkills: Number.parseInt(stats[1].rows[0].total_skills),
      totalSwaps: Number.parseInt(stats[2].rows[0].total_swaps),
      pendingSwaps: Number.parseInt(stats[3].rows[0].pending_swaps),
      completedSwaps: Number.parseInt(stats[4].rows[0].completed_swaps),
      avgRating: Number.parseFloat(stats[5].rows[0].avg_rating) || 0,
    })
  } catch (error) {
    console.error("Get admin stats error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get all users with pagination
router.get("/users", async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query
    const offset = (page - 1) * limit

    let whereClause = ""
    const params = [limit, offset]

    if (search) {
      whereClause = "WHERE (name ILIKE $3 OR email ILIKE $3)"
      params.push(`%${search}%`)
    }

    const query = `
      SELECT id, email, name, location, role, is_banned, is_public, created_at,
             (SELECT COUNT(*) FROM swap_requests WHERE requester_id = users.id OR provider_id = users.id) as total_swaps,
             (SELECT AVG(rating)::numeric(3,2) FROM ratings WHERE rated_id = users.id) as avg_rating
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `

    const result = await pool.query(query, params)

    // Get total count
    const countQuery = search
      ? "SELECT COUNT(*) FROM users WHERE (name ILIKE $1 OR email ILIKE $1)"
      : "SELECT COUNT(*) FROM users"
    const countParams = search ? [`%${search}%`] : []
    const countResult = await pool.query(countQuery, countParams)

    res.json({
      users: result.rows,
      totalUsers: Number.parseInt(countResult.rows[0].count),
      currentPage: Number.parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / limit),
    })
  } catch (error) {
    console.error("Get admin users error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Ban/unban user
router.put("/users/:id/ban", [body("banned").isBoolean()], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { id } = req.params
    const { banned } = req.body

    // Can't ban other admins
    const userResult = await pool.query("SELECT role FROM users WHERE id = $1", [id])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    if (userResult.rows[0].role === "admin") {
      return res.status(403).json({ message: "Cannot ban admin users" })
    }

    await pool.query("UPDATE users SET is_banned = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [banned, id])

    res.json({ message: `User ${banned ? "banned" : "unbanned"} successfully` })
  } catch (error) {
    console.error("Ban user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get all swap requests with details
router.get("/swaps", async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "" } = req.query
    const offset = (page - 1) * limit

    let whereClause = ""
    const params = [limit, offset]

    if (status) {
      whereClause = "WHERE sr.status = $3"
      params.push(status)
    }

    const query = `
      SELECT sr.*, 
             requester.name as requester_name, requester.email as requester_email,
             provider.name as provider_name, provider.email as provider_email,
             rs.name as requested_skill_name, os.name as offered_skill_name
      FROM swap_requests sr
      JOIN users requester ON sr.requester_id = requester.id
      JOIN users provider ON sr.provider_id = provider.id
      JOIN skills rs ON sr.requested_skill_id = rs.id
      JOIN skills os ON sr.offered_skill_id = os.id
      ${whereClause}
      ORDER BY sr.created_at DESC 
      LIMIT $1 OFFSET $2
    `

    const result = await pool.query(query, params)

    // Get total count
    const countQuery = status
      ? "SELECT COUNT(*) FROM swap_requests WHERE status = $1"
      : "SELECT COUNT(*) FROM swap_requests"
    const countParams = status ? [status] : []
    const countResult = await pool.query(countQuery, countParams)

    res.json({
      swaps: result.rows,
      totalSwaps: Number.parseInt(countResult.rows[0].count),
      currentPage: Number.parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / limit),
    })
  } catch (error) {
    console.error("Get admin swaps error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create platform-wide message
router.post(
  "/messages",
  [body("title").trim().isLength({ min: 1 }), body("content").trim().isLength({ min: 1 })],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { title, content } = req.body

      const result = await pool.query("INSERT INTO admin_messages (title, content) VALUES ($1, $2) RETURNING *", [
        title,
        content,
      ])

      res.status(201).json(result.rows[0])
    } catch (error) {
      console.error("Create admin message error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get active admin messages
router.get("/messages", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM admin_messages WHERE is_active = true ORDER BY created_at DESC")
    res.json(result.rows)
  } catch (error) {
    console.error("Get admin messages error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Deactivate admin message
router.put("/messages/:id/deactivate", async (req, res) => {
  try {
    const { id } = req.params

    await pool.query("UPDATE admin_messages SET is_active = false WHERE id = $1", [id])

    res.json({ message: "Message deactivated successfully" })
  } catch (error) {
    console.error("Deactivate message error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Export user activity report
router.get("/reports/users", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.created_at,
        COUNT(DISTINCT uso.id) as skills_offered,
        COUNT(DISTINCT usw.id) as skills_wanted,
        COUNT(DISTINCT sr1.id) as swaps_requested,
        COUNT(DISTINCT sr2.id) as swaps_provided,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as total_ratings_received
      FROM users u
      LEFT JOIN user_skills_offered uso ON u.id = uso.user_id
      LEFT JOIN user_skills_wanted usw ON u.id = usw.user_id
      LEFT JOIN swap_requests sr1 ON u.id = sr1.requester_id
      LEFT JOIN swap_requests sr2 ON u.id = sr2.provider_id
      LEFT JOIN ratings r ON u.id = r.rated_id
      WHERE u.is_banned = false
      GROUP BY u.id, u.name, u.email, u.created_at
      ORDER BY u.created_at DESC
    `)

    res.json(result.rows)
  } catch (error) {
    console.error("Generate user report error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
