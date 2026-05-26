const { getPool, sql } = require("./connection");

/**
 * Write one audit log entry.
 *
 * @param {object} req        - Express request (for actor info, IP, UA)
 * @param {string} action     - Constant like "FACULTY_CREATED"
 * @param {object} [entity]   - { type, id, name }
 * @param {object} [meta]     - Any extra JSON-serialisable context
 */
async function audit(req, action, entity = {}, meta = null) {
  try {
    const actor = req.user || {};
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      null;
    const ua = req.headers["user-agent"]?.slice(0, 500) || null;
    const metaStr = meta ? JSON.stringify(meta) : null;

    const pool = await getPool();
    await pool.request()
      .input("college_id",   sql.Int,           actor.college_id  ?? null)
      .input("actor_id",     sql.Int,           actor.user_id)
      .input("actor_name",   sql.NVarChar(150), actor.name        || "")
      .input("actor_role",   sql.NVarChar(30),  actor.role        || "")
      .input("action",       sql.NVarChar(80),  action)
      .input("entity_type",  sql.NVarChar(50),  entity.type       ?? null)
      .input("entity_id",    sql.NVarChar(50),  entity.id != null ? String(entity.id) : null)
      .input("entity_name",  sql.NVarChar(200), entity.name       ?? null)
      .input("meta",         sql.NVarChar(sql.MAX), metaStr)
      .input("ip_address",   sql.NVarChar(60),  ip)
      .input("user_agent",   sql.NVarChar(500), ua)
      .query(`
        INSERT INTO audit_logs
          (college_id, actor_id, actor_name, actor_role, action,
           entity_type, entity_id, entity_name, meta, ip_address, user_agent)
        VALUES
          (@college_id, @actor_id, @actor_name, @actor_role, @action,
           @entity_type, @entity_id, @entity_name, @meta, @ip_address, @user_agent)
      `);
  } catch (err) {
    // Audit must never break the main request
    console.error("[audit] write failed:", err.message);
  }
}

/**
 * Fetch audit logs for a college (clerk/super-admin view).
 * Returns newest-first, paginated.
 */
async function getAuditLogs({ college_id, limit = 100, offset = 0, action, actor_id }) {
  const pool = await getPool();
  const req = pool.request()
    .input("limit",  sql.Int, limit)
    .input("offset", sql.Int, offset);

  const conditions = [];
  if (college_id !== undefined && college_id !== null) {
    req.input("college_id", sql.Int, college_id);
    conditions.push("college_id = @college_id");
  }
  if (action) {
    req.input("action", sql.NVarChar(80), action);
    conditions.push("action = @action");
  }
  if (actor_id) {
    req.input("actor_id", sql.Int, actor_id);
    conditions.push("actor_id = @actor_id");
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const result = await req.query(`
    SELECT id, college_id, actor_id, actor_name, actor_role,
           action, entity_type, entity_id, entity_name, meta,
           ip_address, user_agent, created_at
    FROM   audit_logs
    ${where}
    ORDER  BY created_at DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `);

  return result.recordset;
}

module.exports = { audit, getAuditLogs };
