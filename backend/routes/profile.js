const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { getProfile, requestOtp, changePassword } = require("../controllers/profileController");

router.use(authenticate, requireRole("clerk", "faculty"));

router.get("/",                 asyncHandler(getProfile));
router.post("/send-otp",        asyncHandler(requestOtp));
router.post("/change-password", asyncHandler(changePassword));

module.exports = router;
