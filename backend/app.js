const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();

// Security headers
app.use(helmet());

// CORS — only allow configured origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : ["https://marksy.vengurlatech.com", "http://localhost:5173", "http://localhost:5000"];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Rate limiting on auth endpoints (applied per-route below)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests, please try again later" },
});

app.use(cookieParser());
app.use(express.json());

app.use("/api/auth/forgot-password/send-otp", otpLimiter);
app.use("/api/profile/send-otp",              otpLimiter);
app.use("/api/auth",        authLimiter, require("./routes/auth"));
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
