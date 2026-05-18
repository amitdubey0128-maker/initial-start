const express =
  require("express");

const bcrypt =
  require("bcryptjs");

const jwt =
  require("jsonwebtoken");

const router =
  express.Router();

const pool =
  require("../db");

// =====================================
// REGISTER
// =====================================

router.post(

  "/register",

  async (req, res) => {

    try {

      const {

        firstName,
        lastName,
        username,
        password,
        flatNumber,
        mobile

      } = req.body;

      // VALIDATION

      if (

        !firstName ||
        !lastName ||
        !username ||
        !password ||
        !flatNumber ||
        !mobile

      ) {

        return res.status(400).json({

          error:
            "Please Fill All Fields"
        });
      }

      // CHECK USER

      const userExists =
        await pool.query(

          `SELECT *

           FROM users

           WHERE username=$1`,

          [username]
        );

      if (

        userExists.rows.length > 0

      ) {

        return res.status(400).json({

          error:
            "Username Already Exists"
        });
      }

      // HASH PASSWORD

      const hashedPassword =
        await bcrypt.hash(

          password,
          10
        );

      // INSERT USER

      await pool.query(

        `INSERT INTO users

        (

          first_name,
          last_name,
          username,
          password,
          flat_number,
          mobile

        )

        VALUES ($1,$2,$3,$4,$5,$6)`,

        [

          firstName,
          lastName,
          username,
          hashedPassword,
          flatNumber,
          mobile
        ]
      );

      res.json({

        message:
          "Registration Successful"
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        error:
          "Registration Failed"
      });
    }
  }
);

// =====================================
// LOGIN
// =====================================

router.post(

  "/login",

  async (req, res) => {

    try {

      const {

        username,
        password

      } = req.body;

      // VALIDATION

      if (

        !username ||
        !password

      ) {

        return res.status(400).json({

          error:
            "Please Fill All Fields"
        });
      }

      // FIND USER

      const userResult =
        await pool.query(

          `SELECT *

           FROM users

           WHERE username=$1`,

          [username]
        );

      if (

        userResult.rows.length === 0

      ) {

        return res.status(400).json({

          error:
            "Invalid Credentials"
        });
      }

      const user =
        userResult.rows[0];

      // CHECK PASSWORD

      const validPassword =
        await bcrypt.compare(

          password,
          user.password
        );

      if (!validPassword) {

        return res.status(400).json({

          error:
            "Invalid Credentials"
        });
      }

      // TOKEN

      const token =
        jwt.sign(

          {

            id: user.id

          },

          process.env.JWT_SECRET,

          {

            expiresIn: "7d"
          }
        );

      // RESPONSE

      res.json({

        token,

        user: {

          id: user.id,

          username:
            user.username,

          first_name:
            user.first_name,

          last_name:
            user.last_name,

          flat_number:
            user.flat_number,

          mobile:
            user.mobile
        }
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        error:
          "Login Failed"
      });
    }
  }
);

module.exports =
  router;