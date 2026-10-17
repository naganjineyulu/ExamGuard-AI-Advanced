const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Database = require("better-sqlite3");
const path = require("path");
const crypto = require("crypto");
const { makeAuth, hashPassword, verifyPassword, hashEmailToken, sendVerificationEmail, EMAIL_TTL_MS } = require("./auth");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors:{origin:"*"} });
const db = new Database(path.join(__dirname, "examguard.db"));
db.pragma("foreign_keys = ON");

app.use(cors());
app.use(express.json({limit:"1mb"}));

db.exec(`
CREATE TABLE IF NOT EXISTS proctoring_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  confidence REAL DEFAULT 0,
  timestamp TEXT NOT NULL,
  duration REAL DEFAULT 0,
  snapshot_url TEXT,
  metadata TEXT,
  review_status TEXT DEFAULT 'pending',
  reviewer_id TEXT,
  review_comment TEXT
);
CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  organization TEXT,
  exam_url TEXT,
  provider TEXT,
  duration_minutes INTEGER DEFAULT 60,
  proctoring_level INTEGER DEFAULT 2,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT,
  action TEXT,
  target TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  email_verified_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS email_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_code TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  exam TEXT NOT NULL DEFAULT 'Unassigned',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(created_by, student_code),
  UNIQUE(created_by, email)
);
`);

const auth = makeAuth(db);
const emailLimit = new Map();
function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const key = `${req.path}:${req.ip}`;
    const now = Date.now();
    const entry = emailLimit.get(key);
    if (emailLimit.size > 10000) for (const [k,v] of emailLimit) if (v.expiresAt <= now) emailLimit.delete(k);
    if (!entry || entry.expiresAt <= now) emailLimit.set(key, { count: 1, expiresAt: now + windowMs });
    else if (++entry.count > max) return res.status(429).json({ error: "Too many attempts. Try again later." });
    next();
  };
}
const emailVerificationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 8 });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15 });
const appBaseUrl = () => {
  const value=(process.env.APP_BASE_URL||"http://localhost:5173").replace(/\/$/,"");
  if(process.env.NODE_ENV==="production" && !value.startsWith("https://")) throw new Error("APP_BASE_URL must use HTTPS in production.");
  return value;
};
const createVerification = db.transaction((userId, token, expiry) => {
  db.prepare("DELETE FROM email_verifications WHERE user_id=?").run(userId);
  db.prepare("INSERT INTO email_verifications(user_id,token_hash,expires_at) VALUES(?,?,?)").run(userId, hashEmailToken(token), expiry);
});

app.post("/api/auth/signup", emailVerificationLimiter, async (req,res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 12 || password.length > 128) return res.status(400).json({ error: "Use a password between 12 and 128 characters." });
  if (db.prepare("SELECT id FROM users WHERE email=?").get(email)) return res.status(409).json({ error: "An account already exists for this email. Sign in or resend the verification email." });
  const token = crypto.randomBytes(32).toString("base64url");
  let userId;
  try {
    const passwordHash = await hashPassword(password);
    const info = db.prepare("INSERT INTO users(email,password_hash,role) VALUES(?,?,'admin')").run(email,passwordHash);
    userId = info.lastInsertRowid;
    createVerification(userId, token, Date.now() + EMAIL_TTL_MS);
    const verifyUrl = `${appBaseUrl()}/?verify=${encodeURIComponent(token)}`;
    const delivery = await sendVerificationEmail(email, verifyUrl);
    res.status(201).json({ message: "Account created. Verify your email to activate admin access.", developmentVerificationUrl: delivery.developmentVerificationUrl || undefined });
  } catch (error) {
    if (userId) db.prepare("DELETE FROM users WHERE id=?").run(userId);
    console.error("Admin signup email delivery failed:", error.message);
    res.status(503).json({ error: "We couldn't send the verification email. Check the email service configuration and try again." });
  }
});

app.post("/api/auth/verify-email", emailVerificationLimiter, (req,res) => {
  const token = String(req.body?.token || "");
  if (token.length < 32 || token.length > 128) return res.status(400).json({ error: "This verification link is invalid or expired." });
  const row = db.prepare(`SELECT v.id AS verification_id,v.expires_at,u.id,u.email,u.role
    FROM email_verifications v JOIN users u ON u.id=v.user_id WHERE v.token_hash=?`).get(hashEmailToken(token));
  if (!row || row.expires_at < Date.now()) {
    if (row) db.prepare("DELETE FROM email_verifications WHERE id=?").run(row.verification_id);
    return res.status(400).json({ error: "This verification link is invalid or expired. Request a new one." });
  }
  db.prepare("UPDATE users SET email_verified_at=CURRENT_TIMESTAMP WHERE id=?").run(row.id);
  db.prepare("DELETE FROM email_verifications WHERE user_id=?").run(row.id);
  const user = { id: row.id, email: row.email, role: row.role };
  res.json({ message: "Email verified. Your admin account is active.", token: auth.issueFor(user), user });
});

app.post("/api/auth/resend-verification", emailVerificationLimiter, async (req,res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const user = db.prepare("SELECT id,email,email_verified_at FROM users WHERE email=?").get(email);
  if (!user || user.email_verified_at) return res.json({ message: "If that account needs verification, a new email will be sent." });
  const token = crypto.randomBytes(32).toString("base64url");
  createVerification(user.id,token,Date.now()+EMAIL_TTL_MS);
  try {
    const delivery = await sendVerificationEmail(user.email,`${appBaseUrl()}/?verify=${encodeURIComponent(token)}`);
    res.json({ message: "A new verification email has been sent.", developmentVerificationUrl: delivery.developmentVerificationUrl || undefined });
  } catch (error) {
    console.error("Verification resend failed:",error.message);
    res.status(503).json({ error: "We couldn't send the verification email. Try again later." });
  }
});

let dummyPasswordHash;
app.post("/api/auth/login", loginLimiter, async (req,res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const user = db.prepare("SELECT id,email,password_hash,role,email_verified_at FROM users WHERE email=?").get(email);
  if (!dummyPasswordHash) dummyPasswordHash = hashPassword(crypto.randomBytes(24).toString("hex"));
  const validPassword = await verifyPassword(password,user?.password_hash || await dummyPasswordHash);
  if (!user || !validPassword) return res.status(401).json({ error: "Email or password is incorrect." });
  if (!user.email_verified_at) return res.status(403).json({ error: "Verify your email before signing in.", code: "EMAIL_NOT_VERIFIED" });
  const publicUser = { id:user.id,email:user.email,role:user.role };
  res.json({ token:auth.issueFor(publicUser),user:publicUser });
});

app.get("/api/auth/me", auth.requireAuth, (req,res) => res.json({ user:{ id:req.user.id,email:req.user.email,role:req.user.role } }));

app.get("/api/students",auth.requireAuth,(req,res)=>{
  const rows=db.prepare("SELECT student_code,name,email,exam,created_at FROM students WHERE created_by=? ORDER BY id DESC").all(req.user.id);
  res.json({students:rows.map(s=>({id:s.student_code,name:s.name,email:s.email,exam:s.exam,risk:0,attention:null,faces:null,phone:false,status:"Enrolled",time:"—",createdAt:s.created_at}))});
});

app.post("/api/students",auth.requireAuth,(req,res)=>{
  const name=String(req.body?.name||"").trim();
  const email=String(req.body?.email||"").trim().toLowerCase();
  const exam=String(req.body?.exam||"Unassigned").trim()||"Unassigned";
  if(name.length<2||name.length>120)return res.status(400).json({error:"Student name must be between 2 and 120 characters."});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return res.status(400).json({error:"Enter a valid student email address."});
  if(exam.length>120)return res.status(400).json({error:"Exam name must be 120 characters or fewer."});
  if(db.prepare("SELECT id FROM students WHERE created_by=? AND email=?").get(req.user.id,email))return res.status(409).json({error:"A student with this email is already in your directory."});
  const info=db.prepare("INSERT INTO students(created_by,student_code,name,email,exam) VALUES(?,?,?,?,?)").run(req.user.id,"pending",name,email,exam);
  const code=`STU-${String(info.lastInsertRowid).padStart(4,"0")}`;
  db.prepare("UPDATE students SET student_code=? WHERE id=?").run(code,info.lastInsertRowid);
  db.prepare("INSERT INTO audit_logs(actor,action,target,metadata) VALUES(?,?,?,?)").run(req.user.email,"student.created",code,JSON.stringify({name,email,exam}));
  res.status(201).json({id:code,name,email,exam,risk:0,attention:null,faces:null,phone:false,status:"Enrolled",time:"—"});
});

const WEIGHTS = {
  NO_FACE:15, MULTIPLE_FACES:40, PHONE_DETECTED:50,
  LOOKING_AWAY:10, LONG_ABSENCE:20, POSSIBLE_PHONE_SCANNING:60,
  TAB_VISIBILITY:15, FULLSCREEN_EXIT:10
};

function riskFor(events){
  let score=0;
  for(const e of events) score += WEIGHTS[e.event_type] || 0;
  return Math.min(100, score);
}
function severityFor(score){
  if(score>=81) return "critical";
  if(score>=61) return "high";
  if(score>=41) return "medium";
  return score>=21 ? "low" : "normal";
}

app.get("/api/health",(req,res)=>res.json({ok:true,name:"ExamGuard AI",version:"1.0.0"}));

app.post("/api/proctoring/events",(req,res)=>{
  const b=req.body||{};
  const type=b.event_type||b.type||"UNKNOWN";
  const session=b.sessionId||b.session_id||"demo-session";
  const severity=b.severity||severityFor(WEIGHTS[type]||0);
  const confidence=Number(b.confidence||0);
  const timestamp=b.timestamp||new Date().toISOString();
  const stmt=db.prepare(`INSERT INTO proctoring_events
    (session_id,event_type,severity,confidence,timestamp,duration,snapshot_url,metadata)
    VALUES (?,?,?,?,?,?,?,?)`);
  const info=stmt.run(session,type,severity,confidence,timestamp,Number(b.duration||0),b.snapshot_url||null,JSON.stringify(b.metadata||{}));
  const event={id:info.lastInsertRowid,sessionId:session,type,severity,confidence,time:new Date(timestamp).toLocaleTimeString()};
  io.emit("proctoring:event",event);
  res.status(201).json({ok:true,event});
});

app.get("/api/proctoring/events/:sessionId",auth.requireAuth,(req,res)=>{
  const rows=db.prepare("SELECT * FROM proctoring_events WHERE session_id=? ORDER BY id DESC").all(req.params.sessionId);
  res.json(rows);
});

app.get("/api/proctoring/risk/:sessionId",auth.requireAuth,(req,res)=>{
  const rows=db.prepare("SELECT event_type FROM proctoring_events WHERE session_id=?").all(req.params.sessionId);
  const score=riskFor(rows);
  res.json({score,severity:severityFor(score),eventCount:rows.length});
});

app.post("/api/integrations/validate",auth.requireAuth,(req,res)=>{
  const raw=String(req.body?.url||"").trim();
  try{
    const u=new URL(raw);
    const approvedDomains=["localhost","127.0.0.1","examguard.local"];
    const supported=approvedDomains.includes(u.hostname) || u.hostname.endsWith(".examguard.local");
    res.json(supported
      ? {mode:"supported",label:"SUPPORTED INTEGRATION",message:"This domain is configured for the ExamGuard demo integration."}
      : {mode:"unsupported",label:"UNSUPPORTED EXTERNAL SITE",message:"The exam host must explicitly integrate the ExamGuard SDK/extension. Arbitrary third-party pages are not controlled automatically."});
  }catch{
    res.status(400).json({mode:"invalid",label:"INVALID URL",message:"Enter a valid HTTPS exam URL."});
  }
});

app.post("/api/exams",auth.requireAuth,(req,res)=>{
  const b=req.body||{};
  const name=String(b.name||"").trim();
  const rawUrl=String(b.exam_url||"").trim();
  let examUrl;
  try {
    examUrl=new URL(rawUrl);
    if(!["https:","http:"].includes(examUrl.protocol) || (examUrl.protocol==="http:" && !["localhost","127.0.0.1"].includes(examUrl.hostname))) throw new Error("scheme");
  } catch {
    return res.status(400).json({error:"Enter a valid HTTPS exam URL (HTTP is allowed for localhost only)."});
  }
  if(name.length<2 || name.length>120) return res.status(400).json({error:"Exam name must be between 2 and 120 characters."});
  const duration=Math.min(600,Math.max(5,Number(b.duration_minutes)||60));
  const level=Math.min(3,Math.max(1,Number(b.proctoring_level)||2));
  const info=db.prepare(`INSERT INTO exams(name,organization,exam_url,provider,duration_minutes,proctoring_level)
  VALUES(?,?,?,?,?,?)`).run(name,String(b.organization||"").trim(),examUrl.href,String(b.provider||"external").trim(),duration,level);
  const exam=db.prepare("SELECT * FROM exams WHERE id=?").get(info.lastInsertRowid);
  db.prepare("INSERT INTO audit_logs(actor,action,target,metadata) VALUES(?,?,?,?)").run(req.user.email,"exam.created",String(info.lastInsertRowid),JSON.stringify({name,exam_url:examUrl.href}));
  res.status(201).json(exam);
});

app.get("/api/exams",auth.requireAuth,(req,res)=>res.json(db.prepare("SELECT * FROM exams ORDER BY id DESC").all()));
app.get("/api/exams/:id",(req,res)=>{
  const exam=db.prepare("SELECT * FROM exams WHERE id=?").get(Number(req.params.id));
  if(!exam) return res.status(404).json({error:"Exam not found."});
  res.json(exam);
});

app.get("/api/reports/:sessionId",auth.requireAuth,(req,res)=>{
  const events=db.prepare("SELECT * FROM proctoring_events WHERE session_id=? ORDER BY timestamp").all(req.params.sessionId);
  const score=riskFor(events);
  res.json({sessionId:req.params.sessionId,score,severity:severityFor(score),events,generatedAt:new Date().toISOString(),humanReviewRequired:score>=41});
});

io.use((socket,next)=>{
  const user=auth.authenticateToken(socket.handshake.auth?.token);
  if(!user) return next(new Error("Authentication required"));
  socket.user=user;
  next();
});
io.on("connection",socket=>{ socket.emit("server:ready",{at:new Date().toISOString()}); });

const PORT=process.env.PORT||5050;
server.listen(PORT,()=>console.log(`ExamGuard API running on http://localhost:${PORT}`));
