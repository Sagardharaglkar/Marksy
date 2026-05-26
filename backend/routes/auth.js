const router = require("express").Router();
const { resolveCollegeCode, login, logout, forgotPasswordSendOtp, forgotPasswordReset } = require("../controllers/authController");
const asyncHandler = require("../middleware/asyncHandler");

router.post("/resolve-code",             asyncHandler(resolveCollegeCode));
router.post("/login",                    asyncHandler(login));
router.post("/logout",                   asyncHandler(logout));
router.post("/forgot-password/send-otp", asyncHandler(forgotPasswordSendOtp));
router.post("/forgot-password/reset",    asyncHandler(forgotPasswordReset));

module.exports = router;
