const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth");
const { getProfile, requestOtp, changePassword } = require("../controllers/profileController");

// Any authenticated non-super-admin user
router.use(authenticate, requireRole("clerk", "faculty"));

router.get("/",                 getProfile);
router.post("/send-otp",        requestOtp);
router.post("/change-password", changePassword);

module.exports = router;
