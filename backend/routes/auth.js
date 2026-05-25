const router = require("express").Router();
const { resolveCollegeCode, login } = require("../controllers/authController");

router.post("/resolve-code", resolveCollegeCode);
router.post("/login", login);

module.exports = router;
