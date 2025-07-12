const express = require("express")
const { body, validationResult } = require("express-validator")
const pool = require("../config/database")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Get all skills
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM skills ORDER BY name")
    res.json(result.rows)
  } catch (error) {
    console.error("Get skills error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Search skills
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query
    if (!q) {
      return res.status(400).json({ message: "Search query required" })
    }

    const result = await pool.query("SELECT * FROM skills WHERE name ILIKE $1 ORDER BY name", [`%${q}%`])
    res.json(result.rows)
  } catch (error) {
    console.error("Search skills error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Add new skill (authenticated users can suggest new skills)
router.post(
  "/",
  authenticateToken,
  [body("name").trim().isLength({ min: 2 }), body("category").optional().trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { name, category } = req.body

      // Check if skill already exists
      const existing = await pool.query("SELECT id FROM skills WHERE name ILIKE $1", [name])
      if (existing.rows.length > 0) {
        return res.status(400).json({ message: "Skill already exists" })
      }

      const result = await pool.query("INSERT INTO skills (name, category) VALUES ($1, $2) RETURNING *", [
        name,
        category || null,
      ])

      res.status(201).json(result.rows[0])
    } catch (error) {
      console.error("Add skill error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

module.exports = router
