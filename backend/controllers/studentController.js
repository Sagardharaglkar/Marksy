const ExcelJS = require("exceljs");
const db = require("../db/queries");

const REQUIRED_COLUMNS = ["seat_no", "registration_no", "name"];

async function importStudents(req, res) {
  const { college_id } = req.user;
  const { class_id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: "Excel file required (.xlsx)" });
  }

  // Parse workbook from uploaded buffer
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(req.file.buffer);
  } catch {
    return res.status(400).json({ error: "Invalid Excel file" });
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return res.status(400).json({ error: "Excel file has no sheets" });
  }

  // First row = headers
  const headerRow = sheet.getRow(1).values.slice(1); // exceljs row values are 1-indexed, index 0 is empty
  const headers = headerRow.map(h => String(h || "").trim().toLowerCase());

  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      return res.status(400).json({ error: `Missing required column: ${col}` });
    }
  }

  const colIndex = {};
  REQUIRED_COLUMNS.forEach(col => { colIndex[col] = headers.indexOf(col); });

  // Collect data rows (skip header row 1)
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = row.values.slice(1); // 1-indexed
    rows.push({
      rowNumber,
      seat_no: String(vals[colIndex.seat_no] ?? "").trim(),
      registration_no: String(vals[colIndex.registration_no] ?? "").trim(),
      name: String(vals[colIndex.name] ?? "").trim(),
    });
  });

  if (rows.length === 0) {
    return res.status(400).json({ error: "No data rows found in the file" });
  }

  // Validate — collect all errors before rejecting
  const errors = [];
  const seenSeats = new Set();
  const seenRegs = new Set();

  for (const row of rows) {
    if (!row.seat_no) errors.push({ line: row.rowNumber, error: "seat_no is required" });
    if (!row.registration_no) errors.push({ line: row.rowNumber, error: "registration_no is required" });
    if (!row.name) errors.push({ line: row.rowNumber, error: "name is required" });

    if (row.seat_no) {
      if (seenSeats.has(row.seat_no)) {
        errors.push({ line: row.rowNumber, error: `Duplicate seat_no in file: ${row.seat_no}` });
      }
      seenSeats.add(row.seat_no);
    }
    if (row.registration_no) {
      if (seenRegs.has(row.registration_no)) {
        errors.push({ line: row.rowNumber, error: `Duplicate registration_no in file: ${row.registration_no}` });
      }
      seenRegs.add(row.registration_no);
    }
  }

  if (errors.length > 0) {
    return res.status(422).json({ errors });
  }

  // Commit all rows
  const created = [];
  const dbErrors = [];
  for (const row of rows) {
    try {
      const student_id = await db.createStudent(
        college_id, Number(class_id),
        row.seat_no, row.registration_no, row.name
      );
      created.push(student_id);
    } catch (err) {
      dbErrors.push({ line: row.rowNumber, error: err.message });
    }
  }

  if (dbErrors.length > 0) {
    return res.status(422).json({ errors: dbErrors, partial: created.length });
  }

  return res.status(201).json({ imported: created.length });
}

async function addStudent(req, res) {
  const { college_id } = req.user;
  const { class_id } = req.params;
  const { seat_no, registration_no, name } = req.body;
  if (!seat_no || !registration_no || !name) {
    return res.status(400).json({ error: "seat_no, registration_no, and name are required" });
  }
  try {
    const student_id = await db.createStudent(
      college_id, Number(class_id),
      seat_no.trim(), registration_no.trim(), name.trim()
    );
    return res.status(201).json({ student_id, seat_no: seat_no.trim(), registration_no: registration_no.trim(), name: name.trim() });
  } catch (err) {
    if (err.message && err.message.includes("duplicate") || err.number === 2627 || err.number === 2601) {
      return res.status(409).json({ error: "Seat no or registration no already exists in this class" });
    }
    throw err;
  }
}

async function listStudents(req, res) {
  const { college_id } = req.user;
  const { class_id } = req.params;
  const students = await db.getStudentsByClass(college_id, Number(class_id));
  return res.json(students);
}

module.exports = { importStudents, addStudent, listStudents };
