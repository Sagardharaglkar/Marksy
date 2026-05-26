const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth",        require("./routes/auth"));
app.use("/api/super-admin", require("./routes/superAdmin"));
app.use("/api/clerk",       require("./routes/clerk"));
app.use("/api/faculty",     require("./routes/faculty"));
app.use("/api/profile",     require("./routes/profile"));

// Serve React build
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// Catch-all: send index.html for any non-API route (client-side routing)
app.get("*path", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
