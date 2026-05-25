/**
 * Migration runner — executes all *.sql files in order (001, 002, …),
 * then seeds the super-admin user if one doesn't exist yet.
 *
 * Run: node migrations/migrate.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs      = require("fs");
const path    = require("path");
const sql     = require("mssql");
const bcrypt  = require("bcryptjs");

// ── Super-admin credentials (change before first run if desired) ──────────────
const SUPER_ADMIN_NAME     = "Super Admin";
const SUPER_ADMIN_PHONE    = "9999999999";
const SUPER_ADMIN_PASSWORD = "Admin@123";
// ─────────────────────────────────────────────────────────────────────────────

const config = {
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server:   process.env.DB_SERVER,
  port:     parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt:                true,
    trustServerCertificate: true,
  },
};

async function run() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log("Connected to database\n");

    // ── Run SQL migration files in sorted order ──────────────────────────────
    const dir   = __dirname;
    const files = fs
      .readdirSync(dir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const filePath = path.join(dir, file);
      const sqlText  = fs.readFileSync(filePath, "utf8");
      console.log(`Running: ${file}`);
      try {
        await pool.request().query(sqlText);
        console.log(`  ✓ done\n`);
      } catch (err) {
        console.error(`  ✗ failed: ${err.message}\n`);
        process.exit(1);
      }
    }

    // ── Seed super-admin if not present ─────────────────────────────────────
    console.log("Checking super-admin...");
    const existing = await pool.request()
      .input("phone", sql.NVarChar(20), SUPER_ADMIN_PHONE)
      .query(`SELECT user_id FROM users WHERE role = 'super_admin' AND phone = @phone`);

    if (existing.recordset.length === 0) {
      const hash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
      await pool.request()
        .input("name",          sql.NVarChar(255), SUPER_ADMIN_NAME)
        .input("phone",         sql.NVarChar(20),  SUPER_ADMIN_PHONE)
        .input("password_hash", sql.NVarChar(255), hash)
        .query(`
          INSERT INTO users (college_id, role, name, phone, password_hash)
          VALUES (NULL, 'super_admin', @name, @phone, @password_hash)
        `);
      console.log(`  ✓ Super-admin created`);
      console.log(`    Phone:    ${SUPER_ADMIN_PHONE}`);
      console.log(`    Password: ${SUPER_ADMIN_PASSWORD}`);
    } else {
      console.log("  ✓ Super-admin already exists, skipped");
    }

    console.log("\nAll done.");
  } catch (err) {
    console.error("Fatal:", err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

run();
