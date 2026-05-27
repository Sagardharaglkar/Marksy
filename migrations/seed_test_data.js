require("dotenv").config();
const sql = require("mssql");
const fs  = require("fs");
const path = require("path");

const cfg = {
  server:   process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD || process.env.DB_PASS,
  port:     parseInt(process.env.DB_PORT || "1433"),
  options:  { trustServerCertificate: true },
};

async function run() {
  const pool = await sql.connect(cfg);
  const file = path.join(__dirname, "seed_test_data.sql");
  const batches = fs.readFileSync(file, "utf8").split(/^\s*GO\s*$/im);

  for (const batch of batches) {
    const trimmed = batch.trim();
    if (trimmed) await pool.request().query(trimmed);
  }

  console.log("✓ Test data seeded successfully");
  await pool.close();
}

run().catch(e => { console.error("Seed failed:", e.message); process.exit(1); });
