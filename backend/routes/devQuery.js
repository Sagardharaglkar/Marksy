/**
 * DEV-ONLY temp query runner — remove before production.
 * Run any SQL directly and print results to the console.
 *
 * Usage: node routes/devQuery.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { getPool, sql } = require("../db/connection");

// ─── Put your query here ──────────────────────────────────────────────────────

const QUERY = `
  SELECT * FROM users
`;

// For parameterised INSERT/UPDATE/DELETE, put values here.
// Key = param name used in query (without @), value = { type, value }
// Example for an INSERT:
//
// const QUERY = `
//   INSERT INTO colleges (name, college_code)
//   VALUES (@name, @code)
// `;
// const PARAMS = {
//   name: { type: sql.NVarChar(255), value: "Test College" },
//   code: { type: sql.NVarChar(8),   value: "TESTCOLL" },
// };

const PARAMS = {};

// ─────────────────────────────────────────────────────────────────────────────

function printTable(rows) {
  if (!rows || rows.length === 0) {
    console.log("(no rows returned)");
    return;
  }

  const cols = Object.keys(rows[0]);

  // Column widths = max of header length vs longest value in that column
  const widths = cols.reduce((acc, col) => {
    const maxVal = rows.reduce((m, row) => {
      const v = row[col] === null || row[col] === undefined ? "NULL" : String(row[col]);
      return Math.max(m, v.length);
    }, col.length);
    acc[col] = maxVal;
    return acc;
  }, {});

  const sep = "+" + cols.map(c => "-".repeat(widths[c] + 2)).join("+") + "+";
  const header = "|" + cols.map(c => ` ${c.padEnd(widths[c])} `).join("|") + "|";

  console.log("\n" + sep);
  console.log(header);
  console.log(sep);
  for (const row of rows) {
    const line = "|" + cols.map(c => {
      const v = row[c] === null || row[c] === undefined ? "NULL" : String(row[c]);
      return ` ${v.padEnd(widths[c])} `;
    }).join("|") + "|";
    console.log(line);
  }
  console.log(sep);
  console.log(`${rows.length} row(s)\n`);
}

async function run() {
  const pool = await getPool();
  const request = pool.request();

  for (const [key, { type, value }] of Object.entries(PARAMS)) {
    request.input(key, type, value);
  }

  console.log("\n── Query ────────────────────────────────────────────────────");
  console.log(QUERY.trim());
  console.log("────────────────────────────────────────────────────────────\n");

  const result = await request.query(QUERY);

  const isSelect = QUERY.trim().toUpperCase().startsWith("SELECT");

  if (isSelect) {
    printTable(result.recordset);
  } else {
    console.log("Result:");
    console.log("  rowsAffected:", result.rowsAffected);
    if (result.recordset && result.recordset.length > 0) {
      console.log("  OUTPUT rows:");
      printTable(result.recordset);
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Query failed:", err.message);
  process.exit(1);
});
