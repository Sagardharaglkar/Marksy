const router = require("express").Router();
const { resolveCollegeCode, login, forgotPasswordSendOtp, forgotPasswordReset } = require("../controllers/authController");

router.post("/resolve-code", resolveCollegeCode);
router.post("/login", login);
router.post("/forgot-password/send-otp", forgotPasswordSendOtp);
router.post("/forgot-password/reset",    forgotPasswordReset);

module.exports = router;
