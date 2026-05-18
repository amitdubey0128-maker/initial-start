const express = require("express");

const router = express.Router();

const pool = require("../db");

const authMiddleware =
  require("../middleware/authMiddleware");

// =====================================
// GET USER NOTIFICATIONS
// =====================================

router.get(

  "/notifications",

  authMiddleware,

  async (req, res) => {

    try {

      const userId =
        req.user.id;

      const result =
        await pool.query(

          `SELECT *

           FROM notifications

           WHERE user_id=$1

           ORDER BY created_at DESC`,

          [userId]
        );

      res.json(
        result.rows
      );

    } catch (error) {

      console.log(error);

      res.status(500).json({

        error:
          "Failed To Fetch Notifications"
      });
    }
  }
);

// =====================================
// CLEAR NOTIFICATIONS
// =====================================

router.delete(

  "/clear-notifications",

  authMiddleware,

  async (req, res) => {

    try {

      const userId =
        req.user.id;

      await pool.query(

        `DELETE FROM notifications

         WHERE user_id=$1`,

        [userId]
      );

      res.json({

        message:
          "Notifications Cleared"
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        error:
          "Failed To Clear Notifications"
      });
    }
  }
);

module.exports = router;