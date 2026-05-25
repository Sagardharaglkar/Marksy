const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth");
const f = require("../controllers/facultyController");

router.use(authenticate, requireRole("faculty"));

router.get("/assignments", f.listAssignments);
router.get("/assignments/:assignment_id/marks", f.getMarks);
router.post("/assignments/:assignment_id/marks", f.saveMarks);
router.patch("/assignments/:assignment_id/submit", f.submitAssignment);
router.patch("/assignments/:assignment_id/reopen", f.reopenAssignment);

module.exports = router;
