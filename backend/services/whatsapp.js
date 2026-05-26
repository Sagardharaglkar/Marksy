/*
 * SMSala WhatsApp OTP Service
 * Docs: https://api2.smsala.com
 *
 * Sends OTP via WhatsApp for password-change verification.
 * Set WHATSAPP_ENABLED=true and WHATSAPP_API_TOKEN in .env to activate.
 * Failures are logged to console but never throw — they must not break
 * the main request flow unless the caller explicitly needs the result.
 */

const https = require("https");

const API_TOKEN    = process.env.WHATSAPP_API_TOKEN || "";
const OTP_TEMPLATE = process.env.WHATSAPP_OTP_TEMPLATE_ID || "";

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: "api2.smsala.com",
      path,
      method: "POST",
      headers: {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ─── Phone normaliser ─────────────────────────────────────────────────────────

function normalisePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

// ─── OTP send ─────────────────────────────────────────────────────────────────

async function sendOtp(phone, otpCode) {
  if (!API_TOKEN || API_TOKEN.startsWith("REPLACE")) {
    throw new Error("WhatsApp API token not configured.");
  }

  const normPhone = normalisePhone(phone);
  if (!normPhone) throw new Error("Invalid phone number.");

  const result = await postJson("/whatsapp/SendOtp", {
    PhoneNumber: normPhone,
    OtpCode:     String(otpCode),
    ApiToken:    API_TOKEN,
    TemplateId:  OTP_TEMPLATE || undefined,
  });

  const success = result.IsSuccess || result.ErrorCode === 0;
  if (!success) {
    console.error("[WhatsApp] OTP send failed:", result.ErrorDescription || JSON.stringify(result));
    throw new Error(result.ErrorDescription || "OTP send failed.");
  }

  console.log(`[WhatsApp] OTP sent to ${normPhone} — CampaignId: ${result.ReturnData}`);
  return result;
}

module.exports = { sendOtp, normalisePhone };
