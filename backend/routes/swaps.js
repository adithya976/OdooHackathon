const express = require("express")
const { body, validationResult } = require("express-validator")
const pool = require("../config/database")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Create swap request
router.post(
  "/",
  authenticateToken,
  [
    body("providerId").isInt(),
    body("requestedSkillId").isInt(),
    body("offeredSkillId").isInt(),
    body("message").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { providerId, requestedSkillId, offeredSkillId, message } = req.body

      // Can't request swap with yourself
      if (providerId === req.user.id) {
        return res.status(400).json({ message: "Cannot create swap request with yourself" })
      }

      // Check if provider has the requested skill
      const providerSkill = await pool.query(
        "SELECT id FROM user_skills_offered WHERE user_id = $1 AND skill_id = $2",
        [providerId, requestedSkillId],
      )

      if (providerSkill.rows.length === 0) {
        return res.status(400).json({ message: "Provider does not offer the requested skill" })
      }

      // Check if requester has the offered skill
      const requesterSkill = await pool.query(
        "SELECT id FROM user_skills_offered WHERE user_id = $1 AND skill_id = $2",
        [req.user.id, offeredSkillId],
      )

      if (requesterSkill.rows.length === 0) {
        return res.status(400).json({ message: "You do not offer the skill you are proposing to exchange" })
      }

      // Check for existing pending request
      const existingRequest = await pool.query(
        "SELECT id FROM swap_requests WHERE requester_id = $1 AND provider_id = $2 AND status = $3",
        [req.user.id, providerId, "pending"],
      )

      if (existingRequest.rows.length > 0) {
        return res.status(400).json({ message: "You already have a pending request with this user" })
      }

      const result = await pool.query(
        "INSERT INTO swap_requests (requester_id, provider_id, requested_skill_id, offered_skill_id, message) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [req.user.id, providerId, requestedSkillId, offeredSkillId, message || null],
      )

      res.status(201).json(result.rows[0])
    } catch (error) {
      console.error("Create swap request error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get user's swap requests (sent and received)
router.get("/my-requests", authenticateToken, async (req, res) => {
  try {
    const { type = "all" } = req.query

    let whereClause = ""
    const params = [req.user.id]

    if (type === "sent") {
      whereClause = "WHERE sr.requester_id = $1"
    } else if (type === "received") {
      whereClause = "WHERE sr.provider_id = $1"
    } else {
      whereClause = "WHERE (sr.requester_id = $1 OR sr.provider_id = $1)"
    }

    const query = `
      SELECT sr.*, 
             requester.name as requester_name, requester.profile_photo as requester_photo,
             provider.name as provider_name, provider.profile_photo as provider_photo,
             rs.name as requested_skill_name, os.name as offered_skill_name
      FROM swap_requests sr
      JOIN users requester ON sr.requester_id = requester.id
      JOIN users provider ON sr.provider_id = provider.id
      JOIN skills rs ON sr.requested_skill_id = rs.id
      JOIN skills os ON sr.offered_skill_id = os.id
      ${whereClause}
      ORDER BY sr.created_at DESC
    `

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error("Get swap requests error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update swap request status
router.put(
  "/:id/status",
  authenticateToken,
  [body("status").isIn(["accepted", "rejected", "completed", "cancelled"])],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id } = req.params
      const { status } = req.body

      // Get the swap request
      const swapResult = await pool.query("SELECT * FROM swap_requests WHERE id = $1", [id])

      if (swapResult.rows.length === 0) {
        return res.status(404).json({ message: "Swap request not found" })
      }

      const swap = swapResult.rows[0]

      // Check permissions
      if (status === "accepted" || status === "rejected") {
        // Only provider can accept/reject
        if (swap.provider_id !== req.user.id) {
          return res.status(403).json({ message: "Only the provider can accept or reject requests" })
        }
      } else if (status === "cancelled") {
        // Only requester can cancel
        if (swap.requester_id !== req.user.id) {
          return res.status(403).json({ message: "Only the requester can cancel requests" })
        }
      } else if (status === "completed") {
        // Either party can mark as completed
        if (swap.requester_id !== req.user.id && swap.provider_id !== req.user.id) {
          return res.status(403).json({ message: "Access denied" })
        }
      }

      // Update status
      const result = await pool.query(
        "UPDATE swap_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
        [status, id],
      )

      res.json(result.rows[0])
    } catch (error) {
      console.error("Update swap status error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Delete swap request
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Check if user owns the request and it's still pending
    const result = await pool.query(
      "DELETE FROM swap_requests WHERE id = $1 AND requester_id = $2 AND status = $3 RETURNING *",
      [id, req.user.id, "pending"],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Swap request not found or cannot be deleted" })
    }

    res.json({ message: "Swap request deleted successfully" })
  } catch (error) {
    console.error("Delete swap request error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Add rating/feedback
router.post(
  "/:id/rating",
  authenticateToken,
  [body("rating").isInt({ min: 1, max: 5 }), body("feedback").optional().trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id } = req.params
      const { rating, feedback } = req.body

      // Get the swap request
      const swapResult = await pool.query("SELECT * FROM swap_requests WHERE id = $1 AND status = $2", [
        id,
        "completed",
      ])

      if (swapResult.rows.length === 0) {
        return res.status(404).json({ message: "Completed swap request not found" })
      }

      const swap = swapResult.rows[0]

      // Check if user was part of the swap
      if (swap.requester_id !== req.user.id && swap.provider_id !== req.user.id) {
        return res.status(403).json({ message: "Access denied" })
      }

      // Determine who is being rated
      const ratedId = swap.requester_id === req.user.id ? swap.provider_id : swap.requester_id

      // Check if already rated
      const existingRating = await pool.query("SELECT id FROM ratings WHERE swap_request_id = $1 AND rater_id = $2", [
        id,
        req.user.id,
      ])

      if (existingRating.rows.length > 0) {
        return res.status(400).json({ message: "You have already rated this swap" })
      }

      const result = await pool.query(
        "INSERT INTO ratings (swap_request_id, rater_id, rated_id, rating, feedback) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [id, req.user.id, ratedId, rating, feedback || null],
      )

      res.status(201).json(result.rows[0])
    } catch (error) {
      console.error("Add rating error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

module.exports = router
