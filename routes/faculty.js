const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const f = require("../controllers/facultyController");

router.use(authenticate, requireRole("faculty"));

router.get("/assignments",                         asyncHandler(f.listAssignments));
router.get("/assignments/:assignment_id/marks",    asyncHandler(f.getMarks));
router.post("/assignments/:assignment_id/marks",   asyncHandler(f.saveMarks));
router.patch("/assignments/:assignment_id/submit", asyncHandler(f.submitAssignment));
router.patch("/assignments/:assignment_id/reopen", asyncHandler(f.reopenAssignment));

module.exports = router;
