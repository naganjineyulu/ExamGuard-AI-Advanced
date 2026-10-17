const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);
if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /replace-with|change-me/i.test(process.env.JWT_SECRET))) {
  throw new Error("Set a private JWT_SECRET of at least 32 characters before production startup.");
}
const JWT_ISSUER = "examguard-ai";
const EMAIL_TTL_MS = 60 * 60 * 1000;

function base64url(value) { return Buffer.from(value).toString("base64url"); }
function signJwt(payload, secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iss: JWT_ISSUER, iat: now, exp: now + 8 * 60 * 60 }));
  const input = `${header}.${body}`;
  const signature = crypto.createHmac("sha256", secret).update(input).digest("base64url");
  return `${input}.${signature}`;
}
function verifyJwt(token, secret) {
  const pieces = String(token || "").split(".");
  if (pieces.length !== 3) return null;
  const input = `${pieces[0]}.${pieces[1]}`;
  const expected = crypto.createHmac("sha256", secret).update(input).digest();
  let header, payload, actual;
  try {
    header = JSON.parse(Buffer.from(pieces[0], "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(pieces[1], "base64url").toString("utf8"));
    actual = Buffer.from(pieces[2], "base64url");
  } catch { return null; }
  if (header.alg !== "HS256" || actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  if (payload.iss !== JWT_ISSUER || !Number.isFinite(payload.exp) || payload.exp <= Date.now() / 1000) return null;
  return payload;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, 64, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}
async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored || "").split(":");
  if (!/^[a-f0-9]{32}$/i.test(saltHex || "") || !/^[a-f0-9]{128}$/i.test(hashHex || "")) return false;
  const candidate = await scrypt(password, Buffer.from(saltHex, "hex"), 64, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const expected = Buffer.from(hashHex, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}
function hashEmailToken(token) { return crypto.createHash("sha256").update(token).digest("hex"); }

async function sendVerificationEmail(to, link) {
  const { CLOUDFLARE_EMAIL_ACCOUNT_ID: accountId, CLOUDFLARE_EMAIL_API_TOKEN: apiToken, EMAIL_FROM: from } = process.env;
  if (!accountId || !apiToken || !from) {
    if (process.env.NODE_ENV !== "production") {
      return { developmentVerificationUrl: link };
    }
    throw new Error("Email verification is not configured. Set the Cloudflare Email Service environment variables.");
  }
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/email/sending/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      from: { address: from, name: "ExamGuard AI" },
      subject: "Verify your ExamGuard AI admin email",
      text: `Verify your ExamGuard AI account using this link. It expires in one hour.\n\n${link}\n\nIf you did not create this account, you can ignore this message.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h1>Verify your admin email</h1><p>Confirm this email address to activate your ExamGuard AI admin account. This link expires in one hour.</p><p><a href="${link}" style="display:inline-block;background:#6656c8;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Verify email</a></p><p>If you did not create this account, ignore this message.</p></div>`
    })
  });
  const result = await response.json().catch(() => ({}));
  const rejected = result.result?.permanent_bounces?.includes(to) || result.result?.suppressed_recipients?.includes(to);
  if (!response.ok || result.success !== true || rejected) {
    throw new Error(result.errors?.[0]?.message || "Email provider rejected the verification message.");
  }
  return { sent: true };
}

function makeAuth(db) {
  let jwtSecret=process.env.JWT_SECRET;
  if(!jwtSecret){
    db.exec("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    jwtSecret=db.prepare("SELECT value FROM app_settings WHERE key='jwt_secret'").get()?.value;
    if(!jwtSecret){jwtSecret=crypto.randomBytes(48).toString("base64url");db.prepare("INSERT INTO app_settings(key,value) VALUES('jwt_secret',?)").run(jwtSecret)}
  }
  function issueFor(user) {
    return signJwt({ sub: String(user.id), email: user.email, role: user.role },jwtSecret);
  }
  function requireAuth(req, res, next) {
    const token = req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    const claims = verifyJwt(token,jwtSecret);
    if (!claims || !/^\d+$/.test(String(claims.sub))) return res.status(401).json({ error: "Sign in to continue.", code: "AUTH_REQUIRED" });
    const user = db.prepare("SELECT id,email,role,email_verified_at FROM users WHERE id=?").get(Number(claims.sub));
    if (!user || !user.email_verified_at || user.email !== claims.email) return res.status(401).json({ error: "Your session is no longer valid. Sign in again.", code: "AUTH_REQUIRED" });
    if (user.role !== "admin") return res.status(403).json({ error: "Admin access is required." });
    req.user = user;
    next();
  }
  function authenticateToken(token) {
    const claims = verifyJwt(token,jwtSecret);
    if (!claims || !/^\d+$/.test(String(claims.sub))) return null;
    const user = db.prepare("SELECT id,email,role,email_verified_at FROM users WHERE id=?").get(Number(claims.sub));
    if (!user || !user.email_verified_at || user.email !== claims.email) return null;
    return user;
  }
  return { issueFor, requireAuth, authenticateToken };
}

module.exports = { makeAuth, hashPassword, verifyPassword, hashEmailToken, sendVerificationEmail, EMAIL_TTL_MS };
