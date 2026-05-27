// Returns an error string if invalid, null if valid.
function validatePassword(password) {
  if (!password || password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  return null;
}

// Validates a 10-digit Indian mobile number (digits only, starts with 6-9).
function validatePhone(phone) {
  if (!phone) return "Phone number is required";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length !== 10) return "Phone number must be exactly 10 digits";
  if (!/^[6-9]/.test(digits)) return "Phone number must start with 6, 7, 8, or 9";
  return null;
}

module.exports = { validatePassword, validatePhone };
