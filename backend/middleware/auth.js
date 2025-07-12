const jwt = require("jsonwebtoken")
const pool = require("../config/database")

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "Access token required" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Check if user still exists and is not banned
    const userResult = await pool.query("SELECT id, email, name, role, is_banned FROM users WHERE id = $1", [
      decoded.userId,
    ])

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: "User not found" })
    }

    const user = userResult.rows[0]

    if (user.is_banned) {
      return res.status(403).json({ message: "Account has been banned" })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" })
  }
}

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" })
  }
  next()
}

module.exports = { authenticateToken, requireAdmin }
