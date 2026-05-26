const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const {
  createCollege, listColleges, listClerks, createFirstClerk,
  editClerk, removeClerk, blockClerk, toggleCollegeActive,
} = require("../controllers/superAdminController");

router.use(authenticate, requireRole("super_admin"));

router.get("/colleges",                                    asyncHandler(listColleges));
router.post("/colleges",                                   asyncHandler(createCollege));
router.patch("/colleges/:college_id/active",               asyncHandler(toggleCollegeActive));
router.get("/colleges/:college_id/clerks",                 asyncHandler(listClerks));
router.post("/colleges/:college_id/clerk",                 asyncHandler(createFirstClerk));
router.put("/colleges/:college_id/clerks/:user_id",        asyncHandler(editClerk));
router.delete("/colleges/:college_id/clerks/:user_id",     asyncHandler(removeClerk));
router.patch("/colleges/:college_id/clerks/:user_id/block",asyncHandler(blockClerk));

module.exports = router;
