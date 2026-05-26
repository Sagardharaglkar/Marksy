const bcrypt = require("bcryptjs");
const ExcelJS = require("exceljs");
const db = require("../db/queries");
const { audit } = require("../db/audit");
const { validatePassword, validatePhone } = require("../utils/validate");

const toTitleCase = s => s.trim().replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1));

// ─── classes ──────────────────────────────────────────────────────────────────

async function listClasses(req, res) {
  const { college_id } = req.user;
  const classes = await db.getClasses(college_id);
  return res.json(classes);
}

async function createClass(req, res) {
  const { college_id } = req.user;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Class name required" });
  }
  const n = toTitleCase(name);
  const class_id = await db.createClass(college_id, n);
  audit(req, "CLASS_CREATED", { type: "class", id: class_id, name: n });
  return res.status(201).json({ class_id, name: n });
}

async function updateClass(req, res) {
  const { college_id } = req.user;
  const { class_id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Class name required" });
  }
  const n = toTitleCase(name);
  await db.updateClass(college_id, Number(class_id), n);
  audit(req, "CLASS_UPDATED", { type: "class", id: class_id, name: n });
  return res.json({ message: "Updated" });
}

async function deleteClass(req, res) {
  const { college_id } = req.user;
  const { class_id } = req.params;
  await db.deleteClass(college_id, Number(class_id));
  audit(req, "CLASS_DELETED", { type: "class", id: class_id });
  return res.json({ message: "Deleted" });
}

// ─── subjects ─────────────────────────────────────────────────────────────────

async function listSubjects(req, res) {
  const { college_id } = req.user;
  const { class_id } = req.params;
  const subjects = await db.getSubjectsByClass(college_id, Number(class_id));
  return res.json(subjects);
}

async function listSubjectsBySemester(req, res) {
  const { college_id } = req.user;
  const { class_id } = req.params;
  const { semester } = req.query;
  if (!semester) {
    const subjects = await db.getSubjectsByClass(college_id, Number(class_id));
    return res.json(subjects);
  }
  const subjects = await db.getSubjectsByClassAndSemester(college_id, Number(class_id), Number(semester));
  return res.json(subjects);
}

async function createSubject(req, res) {
  const { college_id } = req.user;
  const { class_id } = req.params;
  const { name, subject_code, semester, internal_max, external_max } = req.body;
  if (!name || !subject_code) {
    return res.status(400).json({ error: "name and subject_code required" });
  }
  const code = subject_code.trim().toUpperCase();
  if (code.length > 20) {
    return res.status(400).json({ error: "Subject code must be 20 characters or less" });
  }
  const existing = await db.getSubjectByCode(college_id, code);
  if (existing) {
    return res.status(409).json({ error: `Subject code "${code}" is already used` });
  }
  const n = toTitleCase(name);
  const subject_id = await db.createSubject(
    college_id, Number(class_id), n, code, semester ? Number(semester) : null, internal_max, external_max
  );
  audit(req, "SUBJECT_CREATED", { type: "subject", id: subject_id, name: `${n} (${code})` }, { class_id, semester });
  return res.status(201).json({ subject_id, name: n, subject_code: code, semester: semester ? Number(semester) : null });
}

async function updateSubject(req, res) {
  const { college_id } = req.user;
  const { subject_id } = req.params;
  const { name, subject_code, semester, internal_max, external_max } = req.body;
  if (!name || !subject_code) {
    return res.status(400).json({ error: "name and subject_code required" });
  }
  const n = toTitleCase(name);
  await db.updateSubject(
    college_id, Number(subject_id), n, subject_code.trim().toUpperCase(),
    semester ? Number(semester) : null, internal_max, external_max
  );
  audit(req, "SUBJECT_UPDATED", { type: "subject", id: subject_id, name: `${n} (${subject_code.trim().toUpperCase()})` }, { semester });
  return res.json({ message: "Updated" });
}

async function deleteSubject(req, res) {
  const { college_id } = req.user;
  const { subject_id } = req.params;
  await db.deleteSubject(college_id, Number(subject_id));
  audit(req, "SUBJECT_DELETED", { type: "subject", id: subject_id });
  return res.json({ message: "Deleted" });
}

// ─── faculty ──────────────────────────────────────────────────────────────────

async function listFaculty(req, res) {
  const { college_id } = req.user;
  const faculty = await db.getFacultyByCollege(college_id);
  return res.json(faculty);
}

async function createFaculty(req, res) {
  const { college_id } = req.user;
  const { name, phone, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: "name, phone, password required" });
  }
  const phoneErr = validatePhone(phone);
  if (phoneErr) return res.status(400).json({ error: phoneErr });
  const pwdErr = validatePassword(password);
  if (pwdErr) return res.status(400).json({ error: pwdErr });
  const existing = await db.getUserByPhone(college_id, phone);
  if (existing) {
    return res.status(409).json({ error: "Phone already registered in this college" });
  }
  const password_hash = await bcrypt.hash(password, 10);
  const n = toTitleCase(name);
  const user_id = await db.createUser(college_id, "faculty", n, phone.trim(), password_hash);
  audit(req, "FACULTY_CREATED", { type: "faculty", id: user_id, name: n }, { phone: phone.trim() });
  return res.status(201).json({ user_id, name: n, role: "faculty" });
}

async function updateFaculty(req, res) {
  const { college_id } = req.user;
  const { user_id } = req.params;
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: "name and phone required" });
  }
  const phoneErr = validatePhone(phone);
  if (phoneErr) return res.status(400).json({ error: phoneErr });
  const existing = await db.getUserByPhone(college_id, phone.trim());
  if (existing && existing.user_id !== Number(user_id)) {
    return res.status(409).json({ error: "Phone already in use by another user" });
  }
  const n = toTitleCase(name);
  await db.updateFaculty(college_id, Number(user_id), n, phone.trim());
  audit(req, "FACULTY_UPDATED", { type: "faculty", id: user_id, name: n }, { phone: phone.trim() });
  return res.json({ ok: true });
}

async function deleteFaculty(req, res) {
  const { college_id } = req.user;
  const { user_id } = req.params;
  await db.deleteFaculty(college_id, Number(user_id));
  audit(req, "FACULTY_DELETED", { type: "faculty", id: user_id });
  return res.json({ ok: true });
}

// ─── assignments ──────────────────────────────────────────────────────────────

async function listAssignments(req, res) {
  const { college_id } = req.user;
  const assignments = await db.getAssignmentsByCollege(college_id);
  return res.json(assignments);
}

async function createAssignment(req, res) {
  const { college_id } = req.user;
  const { faculty_id, subject_id, mark_type } = req.body;
  if (!faculty_id || !subject_id || !["internal", "external"].includes(mark_type)) {
    return res.status(400).json({ error: "faculty_id, subject_id, and mark_type (internal|external) required" });
  }
  const assignment_id = await db.createAssignment(college_id, Number(faculty_id), Number(subject_id), mark_type);
  audit(req, "ASSIGNMENT_CREATED", { type: "assignment", id: assignment_id }, { faculty_id, subject_id, mark_type });
  return res.status(201).json({ assignment_id });
}

async function updateAssignment(req, res) {
  const { college_id } = req.user;
  const { assignment_id } = req.params;
  const { faculty_id } = req.body;
  if (!faculty_id) {
    return res.status(400).json({ error: "faculty_id required" });
  }
  const assignment = await db.getAssignmentById(college_id, Number(assignment_id));
  if (!assignment) return res.status(404).json({ error: "Assignment not found" });
  if (assignment.status === "locked") {
    return res.status(400).json({ error: "Cannot edit a locked assignment" });
  }
  await db.updateAssignmentFaculty(college_id, Number(assignment_id), Number(faculty_id));
  audit(req, "ASSIGNMENT_UPDATED", { type: "assignment", id: assignment_id, name: assignment.subject_name }, { old_faculty_id: assignment.faculty_id, new_faculty_id: faculty_id });
  return res.json({ ok: true });
}

async function deleteAssignment(req, res) {
  const { college_id } = req.user;
  const { assignment_id } = req.params;
  const assignment = await db.getAssignmentById(college_id, Number(assignment_id));
  if (!assignment) return res.status(404).json({ error: "Assignment not found" });
  if (assignment.status === "locked") {
    return res.status(400).json({ error: "Cannot delete a locked assignment" });
  }
  await db.deleteAssignment(college_id, Number(assignment_id));
  audit(req, "ASSIGNMENT_UNASSIGNED", { type: "assignment", id: assignment_id, name: assignment.subject_name }, { mark_type: assignment.mark_type, removed_faculty_id: assignment.faculty_id });
  return res.json({ ok: true });
}

async function lockAssignment(req, res) {
  const { college_id } = req.user;
  const { assignment_id } = req.params;
  const assignment = await db.getAssignmentById(college_id, Number(assignment_id));
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  if (assignment.status === "locked") {
    return res.status(400).json({ error: "Already locked" });
  }
  await db.updateAssignmentStatus(college_id, Number(assignment_id), "locked");
  audit(req, "ASSIGNMENT_LOCKED", { type: "assignment", id: assignment_id, name: assignment.subject_name }, { mark_type: assignment.mark_type });
  return res.json({ message: "Locked" });
}

// ─── marks oversight ──────────────────────────────────────────────────────────

async function viewMarks(req, res) {
  const { college_id } = req.user;
  const { assignment_id } = req.params;
  const assignment = await db.getAssignmentById(college_id, Number(assignment_id));
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  const marks = await db.getMarksByAssignment(college_id, Number(assignment_id));
  return res.json({ assignment, marks });
}

async function downloadMarks(req, res) {
  const { college_id } = req.user;
  const { assignment_id } = req.params;
  const assignment = await db.getAssignmentById(college_id, Number(assignment_id));
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  const marks = await db.getMarksByAssignment(college_id, Number(assignment_id));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Marks");

  sheet.columns = [
    { header: "Seat No",      key: "seat_no",       width: 14 },
    { header: "Reg No",       key: "registration_no", width: 18 },
    { header: "Student Name", key: "student_name",  width: 30 },
    { header: "Mark",         key: "value",          width: 10 },
  ];

  // Bold header row
  sheet.getRow(1).font = { bold: true };

  marks.forEach(m => {
    sheet.addRow({
      seat_no: m.seat_no,
      registration_no: m.registration_no,
      student_name: m.student_name,
      value: m.value !== null ? m.value : "",
    });
  });

  const filename = `${assignment.subject_name}_${assignment.mark_type}.xlsx`
    .replace(/[^a-z0-9_.-]/gi, "_");

  audit(req, "MARKS_DOWNLOADED", { type: "assignment", id: assignment_id, name: assignment.subject_name }, { mark_type: assignment.mark_type });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = {
  listClasses, createClass, updateClass, deleteClass,
  listSubjects, listSubjectsBySemester, createSubject, updateSubject, deleteSubject,
  listFaculty, createFaculty, updateFaculty, deleteFaculty,
  listAssignments, createAssignment, updateAssignment, deleteAssignment, lockAssignment,
  viewMarks, downloadMarks,
};
