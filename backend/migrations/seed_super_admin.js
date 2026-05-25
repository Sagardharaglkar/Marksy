/**
 * Seed script — creates the initial super-admin account.
 * Run ONCE after migrations: node migrations/seed_super_admin.js
 *
 * Set SUPER_ADMIN_PHONE and SUPER_ADMIN_PASS env vars or edit the defaults below.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true },
};

const PHONE = process.env.SUPER_ADMIN_PHONE || "9000000000";
const PASS  = process.env.SUPER_ADMIN_PASS  || "Admin@123";
const NAME  = process.env.SUPER_ADMIN_NAME  || "Super Admin";

async function seed() {
  const pool = await sql.connect(config);
  const existing = await pool.request()
    .input("phone", sql.NVarChar(20), PHONE)
    .query("SELECT user_id FROM users WHERE role = 'super_admin' AND phone = @phone");

  if (existing.recordset.length > 0) {
    console.log("Super-admin already exists. Skipping.");
    await pool.close();
    return;
  }

  const hash = await bcrypt.hash(PASS, 10);
  await pool.request()
    .input("name", sql.NVarChar(255), NAME)
    .input("phone", sql.NVarChar(20), PHONE)
    .input("hash", sql.NVarChar(255), hash)
    .query(`INSERT INTO users (college_id, role, name, phone, password_hash)
            VALUES (NULL, 'super_admin', @name, @phone, @hash)`);

  console.log(`Super-admin created: phone=${PHONE}`);
  await pool.close();
}

seed().catch(err => { console.error(err); process.exit(1); });
