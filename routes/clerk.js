const router = require("express").Router();
const multer = require("multer");
const { authenticate, requireRole } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const c = require("../controllers/clerkController");
const { importStudents, addStudent, listStudents } = require("../controllers/studentController");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate, requireRole("clerk"));

// classes
router.get("/classes",          asyncHandler(c.listClasses));
router.post("/classes",         asyncHandler(c.createClass));
router.put("/classes/:class_id",    asyncHandler(c.updateClass));
router.delete("/classes/:class_id", asyncHandler(c.deleteClass));

// subjects
router.get("/classes/:class_id/subjects",  asyncHandler(c.listSubjectsBySemester));
router.post("/classes/:class_id/subjects", asyncHandler(c.createSubject));
router.put("/subjects/:subject_id",        asyncHandler(c.updateSubject));
router.delete("/subjects/:subject_id",     asyncHandler(c.deleteSubject));

// students
router.get("/classes/:class_id/students",                              asyncHandler(listStudents));
router.post("/classes/:class_id/students",                             asyncHandler(addStudent));
router.post("/classes/:class_id/students/import", upload.single("file"), asyncHandler(importStudents));

// faculty
router.get("/faculty",           asyncHandler(c.listFaculty));
router.post("/faculty",          asyncHandler(c.createFaculty));
router.put("/faculty/:user_id",  asyncHandler(c.updateFaculty));
router.delete("/faculty/:user_id", asyncHandler(c.deleteFaculty));

// assignments
router.get("/assignments",                       asyncHandler(c.listAssignments));
router.post("/assignments",                      asyncHandler(c.createAssignment));
router.put("/assignments/:assignment_id",        asyncHandler(c.updateAssignment));
router.delete("/assignments/:assignment_id",     asyncHandler(c.deleteAssignment));
router.patch("/assignments/:assignment_id/lock", asyncHandler(c.lockAssignment));

// marks oversight
router.get("/assignments/:assignment_id/marks",          asyncHandler(c.viewMarks));
router.get("/assignments/:assignment_id/marks/download", asyncHandler(c.downloadMarks));

module.exports = router;
