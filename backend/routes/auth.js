const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { body, validationResult } = require("express-validator")
const pool = require("../config/database")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Register
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("name").trim().isLength({ min: 2 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, password, name, location } = req.body

      // Check if user already exists
      const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: "User already exists with this email" })
      }

      // Hash password
      const saltRounds = 10
      const passwordHash = await bcrypt.hash(password, saltRounds)

      // Create user
      const result = await pool.query(
        "INSERT INTO users (email, password_hash, name, location) VALUES ($1, $2, $3, $4) RETURNING id, email, name, location, is_public, role",
        [email, passwordHash, name, location || null],
      )

      const user = result.rows[0]

      // Generate JWT
      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      })

      res.status(201).json({
        message: "User created successfully",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          location: user.location,
          isPublic: user.is_public,
          role: user.role,
        },
      })
    } catch (error) {
      console.error("Registration error:", error)
      res.status(500).json({ message: "Server error during registration" })
    }
  },
)

// Login
router.post("/login", [body("email").isEmail().normalizeEmail(), body("password").exists()], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    // Find user
    const result = await pool.query(
      "SELECT id, email, password_hash, name, location, is_public, role, is_banned FROM users WHERE email = $1",
      [email],
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const user = result.rows[0]

    if (user.is_banned) {
      return res.status(403).json({ message: "Account has been banned" })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    })

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        location: user.location,
        isPublic: user.is_public,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error during login" })
  }
})

// Get current user
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, name, location, profile_photo, availability, is_public, role FROM users WHERE id = $1",
      [req.user.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    const user = result.rows[0]
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      location: user.location,
      profilePhoto: user.profile_photo,
      availability: user.availability,
      isPublic: user.is_public,
      role: user.role,
    })
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
