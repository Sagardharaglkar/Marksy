const router = require("express").Router();
const multer = require("multer");
const { authenticate, requireRole } = require("../middleware/auth");
const c = require("../controllers/clerkController");
const { importStudents, addStudent, listStudents } = require("../controllers/studentController");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate, requireRole("clerk"));

// classes
router.get("/classes", c.listClasses);
router.post("/classes", c.createClass);
router.put("/classes/:class_id", c.updateClass);
router.delete("/classes/:class_id", c.deleteClass);

// subjects (nested under class)
router.get("/classes/:class_id/subjects", c.listSubjects);
router.post("/classes/:class_id/subjects", c.createSubject);
router.put("/subjects/:subject_id", c.updateSubject);
router.delete("/subjects/:subject_id", c.deleteSubject);

// students
router.get("/classes/:class_id/students", listStudents);
router.post("/classes/:class_id/students", addStudent);
router.post("/classes/:class_id/students/import", upload.single("file"), importStudents);

// faculty
router.get("/faculty", c.listFaculty);
router.post("/faculty", c.createFaculty);
router.put("/faculty/:user_id", c.updateFaculty);
router.delete("/faculty/:user_id", c.deleteFaculty);

// assignments
router.get("/assignments", c.listAssignments);
router.post("/assignments", c.createAssignment);
router.put("/assignments/:assignment_id", c.updateAssignment);
router.delete("/assignments/:assignment_id", c.deleteAssignment);
router.patch("/assignments/:assignment_id/lock", c.lockAssignment);

// marks oversight
router.get("/assignments/:assignment_id/marks", c.viewMarks);
router.get("/assignments/:assignment_id/marks/download", c.downloadMarks);

module.exports = router;
