const db = require("../db/queries");

async function listAssignments(req, res) {
  const { college_id, user_id } = req.user;
  const assignments = await db.getAssignmentsByFaculty(college_id, user_id);
  return res.json(assignments);
}

async function getMarks(req, res) {
  const { college_id, user_id } = req.user;
  const { assignment_id } = req.params;

  const assignment = await db.getAssignmentById(college_id, Number(assignment_id));
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  // Faculty can only access their own assignments
  if (assignment.faculty_id !== user_id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Ensure mark rows exist for all students in the class
  await db.seedMarksForAssignment(college_id, Number(assignment_id), assignment.class_id);

  const marks = await db.getMarksByAssignment(college_id, Number(assignment_id));
  return res.json({ assignment, marks });
}

async function saveMarks(req, res) {
  const { college_id, user_id } = req.user;
  const { assignment_id } = req.params;
  const { marks } = req.body; // [{ student_id, value }]

  if (!Array.isArray(marks)) {
    return res.status(400).json({ error: "marks must be an array" });
  }

  const assignment = await db.getAssignmentById(college_id, Number(assignment_id));
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  if (assignment.faculty_id !== user_id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (assignment.status === "locked") {
    return res.status(400).json({ error: "Assignment is locked" });
  }

  for (const { student_id, value } of marks) {
    await db.upsertMark(college_id, Number(assignment_id), Number(student_id), value);
  }

  return res.json({ message: "Saved" });
}

async function submitAssignment(req, res) {
  const { college_id, user_id } = req.user;
  const { assignment_id } = req.params;

  const assignment = await db.getAssignmentById(college_id, Number(assignment_id));
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  if (assignment.faculty_id !== user_id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (assignment.status === "locked") {
    return res.status(400).json({ error: "Assignment is locked" });
  }

  await db.updateAssignmentStatus(college_id, Number(assignment_id), "submitted");
  return res.json({ message: "Submitted" });
}

async function reopenAssignment(req, res) {
  const { college_id, user_id } = req.user;
  const { assignment_id } = req.params;

  const assignment = await db.getAssignmentById(college_id, Number(assignment_id));
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  if (assignment.faculty_id !== user_id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (assignment.status === "locked") {
    return res.status(400).json({ error: "Cannot reopen a locked assignment" });
  }
  if (assignment.status === "open") {
    return res.status(400).json({ error: "Already open" });
  }

  await db.updateAssignmentStatus(college_id, Number(assignment_id), "open");
  return res.json({ message: "Reopened" });
}

module.exports = { listAssignments, getMarks, saveMarks, submitAssignment, reopenAssignment };
