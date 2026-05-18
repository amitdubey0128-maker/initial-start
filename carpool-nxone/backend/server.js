const express = require("express");

const cors = require("cors");
require("dotenv").config();

const app = express();

const profileRoutes =
  require("./routes/profileRoutes");

// =====================================
// CORS
// =====================================

app.use(cors());

// =====================================
// JSON
// =====================================

app.use(express.json());

// =====================================
// ROUTES
// =====================================

const authRoutes =
  require("./routes/auth");

const rideRoutes =
  require("./routes/rides");

const notificationRoutes =
  require("./routes/notifications");

// =====================================
// USE ROUTES
// =====================================

app.use(authRoutes);

app.use(rideRoutes);

app.use(notificationRoutes);

app.use(profileRoutes);

// =====================================
// ROOT
// =====================================

app.get("/", (req, res) => {

  res.send(
    "NX ONE Backend Running"
  );
});

// =====================================
// SERVER
// =====================================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(

    `Server running on port ${PORT}`
  );
});