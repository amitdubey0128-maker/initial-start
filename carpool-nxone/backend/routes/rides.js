const express =
  require("express");

const router =
  express.Router();

const pool =
  require("../db");

const authMiddleware =
  require("../middleware/authMiddleware");

// =====================================
// REMOVE EXPIRED RIDES
// =====================================

const removeExpiredRides =
  async () => {

    try {

      await pool.query(

        `DELETE FROM rides

         WHERE

         (ride_date + ride_time)

         < NOW()`
      );

    } catch (error) {

      console.log(error);
    }
  };

// =====================================
// OFFER RIDE
// =====================================

router.post(

  "/offer-ride",

  authMiddleware,

  async (req, res) => {

    try {

      const {

        sourceCity,
        destinationCity,
        via,
        rideDate,
        rideTime,
        totalSeats,
        fare

      } = req.body;

      // VALIDATION

      if (

        !sourceCity ||
        !destinationCity ||
        !rideDate ||
        !rideTime ||
        !totalSeats ||
        !fare

      ) {

        return res.status(400).json({

          error:
            "Please Fill All Fields"
        });
      }

      // CREATE RIDE

      const rideResult =
        await pool.query(

          `INSERT INTO rides

          (

            source_city,
            destination_city,
            via,
            ride_date,
            ride_time,
            total_seats,
            fare,
            driver_id

          )

          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)

          RETURNING *`,

          [

            sourceCity,
            destinationCity,
            via,
            rideDate,
            rideTime,
            totalSeats,
            fare,
            req.user.id
          ]
        );

      const ride =
        rideResult.rows[0];

      // CREATE SEATS

      for (

        let i = 1;

        i <= totalSeats;

        i++
      ) {

        await pool.query(

          `INSERT INTO seats

          (

            ride_id,
            seat_number,
            is_booked

          )

          VALUES ($1,$2,$3)`,

          [

            ride.id,
            i,
            false
          ]
        );
      }

      res.json({

        message:
          "Ride Offered Successfully"
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        error:
          "Offer Ride Failed"
      });
    }
  }
);

// =====================================
// GET ALL RIDES
// =====================================

router.get(

  "/rides",

  async (req, res) => {

    try {

      await removeExpiredRides();

      const ridesResult =
        await pool.query(

          `SELECT

            rides.*,

            users.first_name,
            users.last_name,
            users.flat_number,
            users.mobile

           FROM rides

           JOIN users

           ON rides.driver_id = users.id

           ORDER BY

           ride_date ASC,
           ride_time ASC`
        );

      const rides =
        ridesResult.rows;

      const ridesWithSeats =
        await Promise.all(

          rides.map(

            async (ride) => {

              const seatsResult =
                await pool.query(

                  `SELECT *

                   FROM seats

                   WHERE ride_id=$1

                   ORDER BY seat_number ASC`,

                  [ride.id]
                );

              return {

                ...ride,

                bookedSeats:

                  seatsResult.rows

                    .filter(

                      (seat) =>
                        seat.is_booked
                    )

                    .map(

                      (seat) => ({

                        seatNumber:
                          seat.seat_number,

                        bookedBy:
                          seat.booked_by,

                        booked_by_id:
                          seat.booked_by_id,

                        flat_number:
                          seat.flat_number,

                        mobile:
                          seat.mobile
                      })
                    )
              };
            }
          )
        );

      res.json(
        ridesWithSeats
      );

    } catch (error) {

      console.log(error);

      res.status(500).json({

        error:
          "Failed To Fetch Rides"
      });
    }
  }
);

// =====================================
// BOOK SEAT
// =====================================

router.post(

  "/book-seat",

  authMiddleware,

  async (req, res) => {

    try {

      const {

        rideId,
        seatNumber

      } = req.body;

      // GET USER

      const userResult =
        await pool.query(

          `SELECT *

           FROM users

           WHERE id=$1`,

          [req.user.id]
        );

      const user =
        userResult.rows[0];

      // FIND SEAT

      const seatResult =
        await pool.query(

          `SELECT *

           FROM seats

           WHERE

           ride_id=$1

           AND seat_number=$2`,

          [

            rideId,
            seatNumber
          ]
        );

      if (

        seatResult.rows.length === 0

      ) {

        return res.status(404).json({

          error:
            "No Seat Found"
        });
      }

      const seat =
        seatResult.rows[0];

      // CHECK BOOKED

      if (seat.is_booked) {

        return res.status(400).json({

          error:
            "Seat Already Booked"
        });
      }

      // BOOK SEAT

      await pool.query(

        `UPDATE seats

         SET

           is_booked=true,
           booked_by=$1,
           booked_by_id=$2,
           flat_number=$3,
           mobile=$4

         WHERE

         ride_id=$5

         AND seat_number=$6`,

        [

          `${user.first_name} ${user.last_name}`,

          user.id,

          user.flat_number,

          user.mobile,

          rideId,

          seatNumber
        ]
      );

      // GET RIDE

      const rideResult =
        await pool.query(

          `SELECT *

           FROM rides

           WHERE id=$1`,

          [rideId]
        );

      const ride =
        rideResult.rows[0];

      // CREATE NOTIFICATION

      await pool.query(

        `INSERT INTO notifications

        (

          user_id,
          message

        )

        VALUES ($1,$2)`,

        [

          ride.driver_id,

          `${user.first_name} ${user.last_name} booked Seat ${seatNumber}`
        ]
      );

      res.json({

        message:
          "Seat Booked Successfully"
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        error:
          "Booking Failed"
      });
    }
  }
);

// =====================================
// CANCEL SEAT
// =====================================

router.post(

  "/cancel-seat",

  authMiddleware,

  async (req, res) => {

    try {

      const {

        rideId,
        seatNumber

      } = req.body;

      // GET USER

      const userResult =
        await pool.query(

          `SELECT *

           FROM users

           WHERE id=$1`,

          [req.user.id]
        );

      const user =
        userResult.rows[0];

      // FIND SEAT

      const seatResult =
        await pool.query(

          `SELECT *

           FROM seats

           WHERE

           ride_id=$1

           AND seat_number=$2`,

          [

            rideId,
            seatNumber
          ]
        );

      if (

        seatResult.rows.length === 0

      ) {

        return res.status(404).json({

          error:
            "Seat Not Found"
        });
      }

      const seat =
        seatResult.rows[0];

      // ALLOW ONLY OWNER

      if (

        seat.booked_by_id !==
        req.user.id

      ) {

        return res.status(403).json({

          error:
            "Not Allowed"
        });
      }

      // CANCEL SEAT

      await pool.query(

        `UPDATE seats

         SET

           is_booked=false,
           booked_by=NULL,
           booked_by_id=NULL,
           flat_number=NULL,
           mobile=NULL

         WHERE

         ride_id=$1

         AND seat_number=$2`,

        [

          rideId,
          seatNumber
        ]
      );

      // GET RIDE

      const rideResult =
        await pool.query(

          `SELECT *

           FROM rides

           WHERE id=$1`,

          [rideId]
        );

      const ride =
        rideResult.rows[0];

      // CREATE NOTIFICATION

      await pool.query(

        `INSERT INTO notifications

        (

          user_id,
          message

        )

        VALUES ($1,$2)`,

        [

          ride.driver_id,

          `${user.first_name} ${user.last_name} cancelled Seat ${seatNumber}`
        ]
      );

      res.json({

        message:
          "Seat Cancelled Successfully"
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        error:
          "Cancel Failed"
      });
    }
  }
);

// =====================================
// GET NOTIFICATIONS
// =====================================

router.get(

  "/notifications",

  authMiddleware,

  async (req, res) => {

    try {

      const result =
        await pool.query(

          `SELECT *

           FROM notifications

           WHERE user_id=$1

           ORDER BY created_at DESC`,

          [req.user.id]
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
// MY RIDES
// =====================================

router.get(

  "/my-rides",

  authMiddleware,

  async (req, res) => {

    try {

      await removeExpiredRides();

      const userId =
        req.user.id;

      // OFFERED RIDES

      const offeredResult =
        await pool.query(

          `SELECT *

           FROM rides

           WHERE driver_id=$1

           ORDER BY

           ride_date ASC,
           ride_time ASC`,

          [userId]
        );

      const offeredRidesRaw =
        offeredResult.rows;

      const offeredRides =
        await Promise.all(

          offeredRidesRaw.map(

            async (ride) => {

              const seatsResult =
                await pool.query(

                  `SELECT *

                   FROM seats

                   WHERE ride_id=$1

                   ORDER BY seat_number ASC`,

                  [ride.id]
                );

              return {

                ...ride,

                bookedSeats:

                  seatsResult.rows

                    .filter(

                      (seat) =>
                        seat.is_booked
                    )

                    .map(

                      (seat) => ({

                        seatNumber:
                          seat.seat_number,

                        bookedBy:
                          seat.booked_by,

                        flat_number:
                          seat.flat_number,

                        mobile:
                          seat.mobile
                      })
                    )
              };
            }
          )
        );

      // BOOKED RIDES

      const bookedResult =
        await pool.query(

          `SELECT DISTINCT

             rides.*,

             users.first_name,
             users.last_name,
             users.flat_number,
             users.mobile

           FROM rides

           JOIN seats

           ON rides.id = seats.ride_id

           JOIN users

           ON rides.driver_id = users.id

           WHERE seats.booked_by_id=$1

           ORDER BY

           rides.ride_date ASC,
           rides.ride_time ASC`,

          [userId]
        );

      res.json({

        offeredRides,

        bookedRides:
          bookedResult.rows
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        error:
          "Failed To Fetch My Rides"
      });
    }
  }
);

// =====================================
// DELETE RIDE
// =====================================

router.delete(

  "/delete-ride/:id",

  authMiddleware,

  async (req, res) => {

    try {

      const rideId =
        req.params.id;

      // DELETE SEATS

      await pool.query(

        `DELETE FROM seats

         WHERE ride_id=$1`,

        [rideId]
      );

      // DELETE RIDE

      await pool.query(

        `DELETE FROM rides

         WHERE

         id=$1

         AND driver_id=$2`,

        [

          rideId,
          req.user.id
        ]
      );

      res.json({

        message:
          "Ride Deleted Successfully"
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        error:
          "Delete Ride Failed"
      });
    }
  }
);

module.exports =
  router;