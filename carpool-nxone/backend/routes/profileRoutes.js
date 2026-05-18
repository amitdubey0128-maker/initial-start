const express =
  require("express");

const router =
  express.Router();

const pool =
  require("../db");

const authMiddleware =
  require("../middleware/authMiddleware");

// =====================================
// UPDATE PROFILE
// =====================================

router.put(

  "/update-profile",

  authMiddleware,

  async (req, res) => {

    try {

      const userId =
        req.user.id;

      const {

        mobile

      } = req.body;

      // VALIDATION

      if (!mobile) {

        return res.status(400).json({

          error:
            "Mobile Number Required"
        });
      }

      // UPDATE USER

      await pool.query(

        `UPDATE users

         SET mobile=$1

         WHERE id=$2`,

        [

          mobile,
          userId
        ]
      );

      res.json({

        message:
          "Profile Updated Successfully"
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        error:
          "Profile Update Failed"
      });
    }
  }
);

module.exports =
  router;