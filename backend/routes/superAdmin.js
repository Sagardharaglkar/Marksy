const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth");
const {
  createCollege, listColleges, listClerks, createFirstClerk,
  editClerk, removeClerk, blockClerk, toggleCollegeActive,
} = require("../controllers/superAdminController");

router.use(authenticate, requireRole("super_admin"));

router.get("/colleges", listColleges);
router.post("/colleges", createCollege);
router.patch("/colleges/:college_id/active", toggleCollegeActive);
router.get("/colleges/:college_id/clerks", listClerks);
router.post("/colleges/:college_id/clerk", createFirstClerk);
router.put("/colleges/:college_id/clerks/:user_id", editClerk);
router.delete("/colleges/:college_id/clerks/:user_id", removeClerk);
router.patch("/colleges/:college_id/clerks/:user_id/block", blockClerk);

module.exports = router;
