const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 15000,
  },
  connectionTimeout: 15000,
  requestTimeout: 30000,
};

let pool = null;
let connecting = null;

async function getPool() {
  if (pool && pool.connected) return pool;

  // Prevent multiple simultaneous reconnect attempts
  if (connecting) return connecting;

  connecting = (async () => {
    try {
      if (pool) {
        try { await pool.close(); } catch { /* ignore */ }
        pool = null;
      }
      pool = await sql.connect(config);
      pool.on("error", (err) => {
        console.error("[db] Pool error:", err.message);
        pool = null; // Force reconnect on next request
      });
      console.log("[db] Connected");
      return pool;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

// Graceful shutdown — close pool cleanly on process exit
async function closePool() {
  if (pool) {
    try {
      await pool.close();
      console.log("[db] Pool closed");
    } catch (err) {
      console.error("[db] Error closing pool:", err.message);
    } finally {
      pool = null;
    }
  }
}

process.on("SIGTERM", async () => {
  console.log("[server] SIGTERM received, shutting down...");
  await closePool();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[server] SIGINT received, shutting down...");
  await closePool();
  process.exit(0);
});

module.exports = { getPool, closePool, sql };
