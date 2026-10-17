import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  Activity, AlertTriangle, BarChart3, Bell, BookOpen, BrainCircuit,
  Camera, CheckCircle2, ChevronRight, Clock3, Eye, FileText, Gauge,
  Globe2, LayoutDashboard, LockKeyhole, Menu, MonitorCheck, Moon,
  Play, Radio, Search, Shield, Smartphone, Users, Video, XCircle,
  Plus, ExternalLink, Copy, LoaderCircle, LogOut
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5050";
const authFetch = (token,url,options={}) => fetch(url,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${token}`}});

function LoginPage({ onLogin, verificationMessage, verificationError }) {
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [mode, setMode] = useState("login");
  const [error, setError] = useState(verificationError || "");
  const [message, setMessage] = useState(verificationMessage || "");
  const [devLink, setDevLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [resend, setResend] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    setError(""); setMessage(""); setDevLink("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Use a valid institutional email address.");
      return;
    }

    if (mode === "signup" && password.length < 12) {
      setError("Use a password with at least 12 characters.");
      return;
    }
    if (mode === "signup" && password !== form.confirmPassword) {
      setError("The passwords do not match."); return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${API}/api/auth/${mode === "signup" ? "signup" : "login"}`, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,password})
      });
      const data = await response.json();
      if (!response.ok) {
        const authError = new Error(data.error || "Authentication failed."); authError.code=data.code; throw authError;
      }
      if (mode === "signup") {
        const localLink = data.developmentVerificationUrl || "";
        setMessage(localLink
          ? "Email delivery is not configured here. Use the local verification link below to activate your account."
          : data.message);
        setDevLink(localLink);
      } else onLogin(data);
    } catch (e) { setError(e.message); setResend(e.code === "EMAIL_NOT_VERIFIED"); }
    finally { setBusy(false); }
  };

  const resendVerification = async () => {
    setBusy(true); setError(""); setMessage(""); setDevLink("");
    try {
      const response=await fetch(`${API}/api/auth/resend-verification`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:form.email.trim().toLowerCase()})});
      const data=await response.json(); if(!response.ok)throw new Error(data.error||"Could not resend email.");
      const localLink=data.developmentVerificationUrl||"";
      setMessage(localLink
        ? "Email delivery is not configured here. Use the local verification link below to activate your account."
        : data.message);
      setDevLink(localLink); setResend(false);
    } catch(e){setError(e.message)} finally{setBusy(false)}
  };

  return (
    <div className="login-shell">
      <div className="login-overlay" />
      <div className="login-grid">
        <div className="login-card login-panel">
          <div className="login-badge">{mode === "signup" ? "Admin registration" : "Secure admin access"}</div>
          <h1>{mode === "signup" ? "Create your admin account" : "Welcome back to ExamGuard AI"}</h1>
          <p className="login-subtitle">{mode === "signup" ? "Register your organization admin account. Verify your email before opening the workspace." : "Protect every exam with live intelligence, student tracking, and privacy-first review controls."}</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input
                name="email"
                type="email"
                placeholder="admin@university.edu"
                value={form.email}
                onChange={handleChange}
              />
            </label>

            <label>
              <span>Password</span>
              <input
                name="password"
                type="password"
                placeholder={mode === "signup" ? "At least 12 characters" : "Enter your password"}
                value={form.password}
                onChange={handleChange}
              />
            </label>

            {mode === "signup" && <label><span>Confirm password</span><input name="confirmPassword" type="password" autoComplete="new-password" placeholder="Re-enter your password" value={form.confirmPassword} onChange={handleChange} required/></label>}

            {error && <div className="login-error">{error}</div>}
            {message && <div className="auth-message">{message}{devLink&&<a href={devLink}>Open local verification link</a>}</div>}

            <div className="login-actions">
              <button type="submit" className="primary large" disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>:null}{mode === "signup" ? "Create account" : "Sign in"}</button>
              {resend&&<button type="button" className="secondary small" disabled={busy} onClick={resendVerification}>Resend verification email</button>}
            </div>
          </form>

          <div className="login-footer">
            <span>{mode === "signup" ? "Already have an account?" : "New organization admin?"}</span>
            <button type="button" className="auth-mode-toggle" onClick={()=>{setMode(v=>v === "login" ? "signup" : "login");setForm(v=>({...v,password:"",confirmPassword:""}));setError("");setMessage("");setDevLink("");setResend(false)}}>{mode === "signup" ? "Sign in" : "Sign up"}</button>
          </div>
        </div>

        <div className="login-card login-visual">
          <div className="video-panel">
            <div className="video-topbar">
              <span className="dot red" />
              <span className="dot amber" />
              <span className="dot green" />
              <span className="live-pill"><i /> LIVE PROCTORING</span>
            </div>

            <div className="scene">
              <div className="monitor-glow" />
              <div className="desk" />
              <div className="student-figure">
                <div className="head" />
                <div className="body" />
                <div className="arm arm-left" />
                <div className="arm arm-right" />
                <div className="hand" />
              </div>
              <div className="laptop">
                <div className="screen">
                  <div className="screen-glow" />
                  <div className="screen-lines">
                    <div className="screen-line line-1" />
                    <div className="screen-line line-2" />
                    <div className="screen-line line-3" />
                    <div className="screen-line line-4" />
                  </div>
                </div>
                <div className="laptop-base" />
              </div>
              <div className="floating-card card-one">
                <strong>91%</strong>
                <span>Attention</span>
              </div>
              <div className="floating-card card-two">
                <strong>Safe</strong>
                <span>Session state</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const demoStudents = [
  { id:"STU-1042", name:"Rahul Kumar", exam:"Data Structures", risk:12, attention:91, faces:1, phone:false, status:"Normal", time:"42:15" },
  { id:"STU-1088", name:"Priya Sharma", exam:"Machine Learning", risk:67, attention:71, faces:2, phone:false, status:"High", time:"31:08" },
  { id:"STU-1097", name:"Anil Kumar", exam:"Computer Networks", risk:34, attention:78, faces:1, phone:false, status:"Warning", time:"26:49" },
  { id:"STU-1132", name:"Sneha Reddy", exam:"Compiler Design", risk:8, attention:96, faces:1, phone:false, status:"Normal", time:"51:03" }
];

const riskSeries = [
  {t:"10:15",risk:9},{t:"10:20",risk:13},{t:"10:25",risk:10},{t:"10:30",risk:28},
  {t:"10:35",risk:42},{t:"10:40",risk:37},{t:"10:45",risk:64},{t:"10:50",risk:51},
  {t:"10:55",risk:29},{t:"11:00",risk:12}
];

const initialEvents = [
  {type:"PHONE_DETECTED", student:"Rahul Kumar", confidence:87, time:"10:42:18", severity:"high"},
  {type:"MULTIPLE_FACES", student:"Priya Sharma", confidence:94, time:"10:44:32", severity:"high"},
  {type:"LOOKING_AWAY", student:"Anil Kumar", confidence:81, time:"10:46:09", severity:"medium"},
  {type:"TAB_VISIBILITY", student:"Priya Sharma", confidence:100, time:"10:47:51", severity:"medium"}
];

function ExamGuardApp() {
  const examId = new URLSearchParams(window.location.search).get("exam");
  const verifyToken = new URLSearchParams(window.location.search).get("verify");
  const [session,setSession] = useState(()=>{try{return JSON.parse(sessionStorage.getItem("examguard-session")||"null")}catch{return null}});
  const [authReady,setAuthReady] = useState(false);
  const [verificationError,setVerificationError] = useState("");
  useEffect(()=>{
    let active=true;
    const initialize=async()=>{
      if(verifyToken){
        try{
          const r=await fetch(`${API}/api/auth/verify-email`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:verifyToken})});
          const data=await r.json();if(!r.ok)throw new Error(data.error||"Email verification failed.");
          sessionStorage.setItem("examguard-session",JSON.stringify(data));if(active)setSession(data);
          window.history.replaceState({},"",window.location.pathname);
        }catch(e){if(active)setVerificationError(e.message)}
      }else if(session?.token){
        try{const r=await authFetch(session.token,`${API}/api/auth/me`);if(!r.ok)throw new Error();const data=await r.json();if(active)setSession(s=>({...s,user:data.user}))}
        catch{sessionStorage.removeItem("examguard-session");if(active)setSession(null)}
      }
      if(active)setAuthReady(true);
    };
    initialize();return()=>{active=false};
  },[]);
  const handleLogin=(data)=>{sessionStorage.setItem("examguard-session",JSON.stringify(data));setSession(data)};
  const handleLogout=()=>{sessionStorage.removeItem("examguard-session");setSession(null)};
  if (examId) return <StudentExam examId={examId} />;
  if (!authReady) return <div className="auth-loading"><LoaderCircle className="spin" size={22}/> Securely checking your session…</div>;
  if (!session?.token) return <LoginPage onLogin={handleLogin} verificationError={verificationError}/>;
  return <App token={session.token} user={session.user} onLogout={handleLogout}/>;
}

function App({token,user,onLogout}){
  const [page,setPage] = useState("overview");
  const role=user?.role||"admin";
  const [events,setEvents] = useState(initialEvents);
  const [students,setStudents] = useState(demoStudents);
  const [studentLoadError,setStudentLoadError] = useState("");
  const [sidebar,setSidebar] = useState(true);
  const [demo,setDemo] = useState(true);

  useEffect(()=>{
    let active=true;
    authFetch(token,`${API}/api/students`).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||"Could not load the student directory.");if(active)setStudents([...data.students,...demoStudents])}).catch(e=>{if(active)setStudentLoadError(e.message)});
    const socket = io(API, { transports:["websocket"], reconnectionAttempts:2, auth:{token} });
    socket.on("proctoring:event", e => setEvents(prev => [e, ...prev].slice(0,20)));
    return ()=>{active=false;socket.disconnect()};
  },[token]);

  const addStudent=student=>setStudents(prev=>[student,...prev]);

  const emitDemo = async(type) => {
    const event = {
      type, student:"Demo Student", confidence:Math.floor(80+Math.random()*19),
      time:new Date().toLocaleTimeString(), severity:type==="PHONE_DETECTED"?"high":"medium"
    };
    setEvents(prev=>[event,...prev]);
    try { await authFetch(token,`${API}/api/proctoring/events`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({sessionId:"demo-session",...event})
    }); } catch {}
  };

  const nav = [
    ["overview","Overview",LayoutDashboard],
    ["monitoring","Live Monitoring",Radio],
    ["students","Students",Users],
    ["exams","Exams",BookOpen],
    ["alerts","Alerts",Bell],
    ["reports","Reports",FileText],
    ["integrations","Integrations",Globe2],
    ["settings","Settings",Gauge],
  ];

  return <div className="app">
    <aside className={`sidebar ${sidebar?"open":""}`}>
      <div className="brand"><div className="brandmark"><Shield size={20}/></div><div><b>ExamGuard</b><span>AI PROCTORING</span></div></div>
      <div className="rolebox"><small>VERIFIED WORKSPACE</small><div className="role-name">Organization Admin</div></div>
      <nav>{nav.map(([id,label,Icon])=><button key={id} className={page===id?"active":""} onClick={()=>setPage(id)}><Icon size={18}/><span>{label}</span>{id==="alerts"&&<em>{events.length}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="secure"><LockKeyhole size={16}/><span>Privacy-first mode</span></div><div className="profile"><div className="avatar">{(user?.email||"AD").slice(0,2).toUpperCase()}</div><div className="profile-email"><b>Admin</b><span>{user?.email}</span></div><button className="iconbtn logout-btn" onClick={onLogout} aria-label="Sign out" title="Sign out"><LogOut size={16}/></button></div></div>
    </aside>

    <main className="main">
      <header className="topbar">
        <button className="iconbtn" onClick={()=>setSidebar(v=>!v)}><Menu size={20}/></button>
        <div className="crumb"><span>ExamGuard AI</span><ChevronRight size={14}/><b>{nav.find(x=>x[0]===page)?.[1]}</b></div>
        <div className="top-actions"><span className="live"><i/> SYSTEM OPERATIONAL</span><button className="iconbtn"><Bell size={18}/></button><div className="avatar">{(user?.email||"AD").slice(0,2).toUpperCase()}</div></div>
      </header>

      <div className="content">
        {page==="overview" && <Overview students={students} events={events} riskSeries={riskSeries} setPage={setPage}/>}
        {page==="monitoring" && <Monitoring students={students} events={events}/>}
        {page==="students" && <Students students={students} onAddStudent={addStudent} token={token} loadError={studentLoadError}/>}
        {page==="exams" && <Exams role={role} token={token} onAuthExpired={onLogout}/>}
        {page==="alerts" && <Alerts events={events}/>}
        {page==="reports" && <Reports/>}
        {page==="integrations" && <Integrations token={token}/>}
        {page==="settings" && <Settings demo={demo} setDemo={setDemo}/>} 
      </div>

      {demo && <div className="demo-bar">
        <span><BrainCircuit size={16}/> DEMO MODE — simulated AI events are clearly marked</span>
        <div>
          <button onClick={()=>emitDemo("PHONE_DETECTED")}><Smartphone size={14}/> Phone</button>
          <button onClick={()=>emitDemo("MULTIPLE_FACES")}><Users size={14}/> Multiple face</button>
          <button onClick={()=>emitDemo("LOOKING_AWAY")}><Eye size={14}/> Looking away</button>
        </div>
      </div>}
    </main>
  </div>
}

function Overview({students,events,riskSeries,setPage}){
  const high=students.filter(s=>s.risk>=61).length, warn=students.filter(s=>s.risk>=21&&s.risk<61).length;
  return <section>
    <div className="hero-row"><div><p className="eyebrow">COMMAND CENTER</p><h1>Good morning, Admin.</h1><p className="muted">Monitor exam integrity with explainable AI signals and human review.</p></div><button className="primary" onClick={()=>setPage("monitoring")}><Radio size={17}/> Open live monitoring</button></div>
    <div className="stat-grid">
      <Stat icon={MonitorCheck} label="Active Exams" value="12" delta="+3 today"/>
      <Stat icon={Users} label="Students Online" value="284" delta="+18%"/>
      <Stat icon={AlertTriangle} label="Warnings" value={warn} delta="last 60 min"/>
      <Stat icon={Shield} label="High Risk" value={high} delta="needs review"/>
    </div>
    <div className="grid2">
      <Card title="Risk activity" icon={Activity} action="Live"><div className="chart"><ResponsiveContainer width="100%" height={260}><AreaChart data={riskSeries}><defs><linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity=".35"/><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#20283a"/><XAxis dataKey="t" stroke="#667085"/><YAxis stroke="#667085"/><Tooltip contentStyle={{background:"#101625",border:"1px solid #263047",borderRadius:10}}/><Area type="monotone" dataKey="risk" stroke="#9b8cff" fill="url(#riskFill)" strokeWidth={2}/></AreaChart></ResponsiveContainer></div></Card>
      <Card title="Event distribution" icon={BarChart3}><div className="pie-wrap"><ResponsiveContainer width="55%" height={220}><PieChart><Pie data={[{n:"Phone",v:22},{n:"Faces",v:18},{n:"Attention",v:35},{n:"Browser",v:25}]} dataKey="v" nameKey="n" innerRadius={58} outerRadius={82}><Cell fill="#9b8cff"/><Cell fill="#38bdf8"/><Cell fill="#f59e0b"/><Cell fill="#22c55e"/></Pie></PieChart></ResponsiveContainer><div className="legend">{[["Phone","22%"],["Multiple faces","18%"],["Attention","35%"],["Browser","25%"]].map(x=><div><i/> <span>{x[0]}</span><b>{x[1]}</b></div>)}</div></div></Card>
    </div>
    <Card title="Active sessions" icon={Video} action="View all" onAction={()=>setPage("monitoring")}><SessionTable students={students}/></Card>
    <Card title="Recent AI events" icon={Bell} action="Review alerts" onAction={()=>setPage("alerts")}><EventList events={events.slice(0,4)}/></Card>
  </section>
}

function Stat({icon:Icon,label,value,delta}){return <div className="stat"><div className="stat-icon"><Icon size={19}/></div><div><span>{label}</span><strong>{value}</strong><small>{delta}</small></div></div>}
function Card({title,icon:Icon,children,action,onAction}){return <div className="card"><div className="card-head"><div><h3><Icon size={17}/>{title}</h3></div>{action&&<button className="linkbtn" onClick={onAction}>{action}<ChevronRight size={14}/></button>}</div>{children}</div>}

function SessionTable({students,exams=[]}){return <div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>EXAM</th><th>ATTENTION</th><th>RISK</th><th>STATUS</th><th>TIME</th></tr></thead><tbody>{students.map(s=>{const assignedExam=exams.find(exam=>exam.name.trim().toLowerCase()===String(s.exam||"").trim().toLowerCase());return <tr key={s.id}><td><div className="person"><div className="mini-avatar">{s.name.split(" ").map(x=>x[0]).join("")}</div><div><b>{s.name}</b><span>{s.id}</span>{s.email&&<small>{s.email}</small>}</div></div></td><td>{assignedExam?<a className="student-exam-launch" href={`/?exam=${encodeURIComponent(assignedExam.id)}`} target="_blank" rel="noreferrer" title={`Open ${assignedExam.name} camera preflight`}>{s.exam}<ExternalLink size={13}/></a>:s.exam}</td><td>{s.attention==null?<span className="table-dash">—</span>:<><div className="meter"><i style={{width:s.attention+"%"}}/></div><span className="meter-label">{s.attention}%</span></>}</td><td><Risk value={s.risk}/></td><td><Badge text={s.status}/></td><td>{s.time}</td></tr>})}</tbody></table></div>}
function Risk({value}){let cls=value>=61?"critical":value>=41?"high":value>=21?"medium":"low";return <span className={`risk ${cls}`}>{value}</span>}
function Badge({text}){return <span className={`badge ${text.toLowerCase()}`}><i/>{text}</span>}
function EventList({events}){return <div className="events">{events.map((e,i)=><div className="event" key={i}><div className={`event-icon ${e.severity}`}><AlertTriangle size={16}/></div><div className="event-main"><b>{e.type.replaceAll("_"," ")}</b><span>{e.student} · {e.time}</span></div><div className="confidence">{e.confidence}%</div></div>)}</div>}

function Monitoring({students,events}){
  return <section><div className="hero-row"><div><p className="eyebrow">REAL-TIME PROCTORING</p><h1>Live monitoring</h1><p className="muted">Human-in-the-loop review of AI-generated suspicious events.</p></div><span className="live large"><i/> 284 STUDENTS LIVE</span></div>
  <div className="monitor-grid">{students.map(s=><div className="student-card" key={s.id}><div className={`video ${s.status==="Enrolled"?"not-started":""}`}><div className="scanline"/><div className="face-placeholder"><Video size={32}/><span>{s.status==="Enrolled"?"AWAITING SESSION":"LIVE CAMERA"}</span></div><span className="cam-label"><i/> {s.status==="Enrolled"?"NOT STARTED":"LIVE"}</span><span className="student-risk"><Risk value={s.risk}/></span></div><div className="student-info"><div><b>{s.name}</b><span>{s.id} · {s.exam}</span></div><Badge text={s.status}/></div>{s.status==="Enrolled"?<div className="session-pending">No proctored session has started for this student.</div>:<div className="signals"><Signal label="Face" value={s.faces===1?"Verified":"Multiple"} ok={s.faces===1}/><Signal label="Phone" value={s.phone?"Detected":"Clear"} ok={!s.phone}/><Signal label="Attention" value={s.attention+"%"} ok={s.attention>75}/></div>}</div>)}</div>
  <Card title="Live event stream" icon={Radio}><EventList events={events}/></Card></section>
}
function Signal({label,value,ok}){return <div><span>{label}</span><b className={ok?"ok":"bad"}>{ok?<CheckCircle2 size={13}/>:<AlertTriangle size={13}/>} {value}</b></div>}

function Students({students,onAddStudent,token,loadError}){
  const [open,setOpen]=useState(false);const [saving,setSaving]=useState(false);const [error,setError]=useState("");const [form,setForm]=useState({name:"",email:"",exam:""});
  const [exams,setExams]=useState([]);
  useEffect(()=>{let live=true;authFetch(token,`${API}/api/exams`).then(async r=>{if(!r.ok)throw new Error("Could not load exam launch links.");return r.json()}).then(data=>{if(live)setExams(data)}).catch(()=>{});return()=>{live=false}},[token]);
  const update=e=>setForm(v=>({...v,[e.target.name]:e.target.value}));
  const submit=async e=>{e.preventDefault();setSaving(true);setError("");try{const r=await authFetch(token,`${API}/api/students`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const data=await r.json();if(!r.ok)throw new Error(data.error||"Could not add student.");onAddStudent(data);setForm({name:"",email:"",exam:""});setOpen(false)}catch(e){setError(e.message)}finally{setSaving(false)}};
  return <section><div className="hero-row"><div><p className="eyebrow">PEOPLE</p><h1>Students</h1><p className="muted">Manage active and historical exam participants.</p></div><button className="primary" onClick={()=>{setOpen(true);setError("")}}><Users size={16}/> Add student</button></div>
    {loadError&&<div className="login-error student-error">{loadError}</div>}
    {open&&<div className="student-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><div className="student-modal" role="dialog" aria-modal="true" aria-labelledby="student-form-title"><div className="student-modal-head"><div><p className="eyebrow">DIRECTORY</p><h2 id="student-form-title">Add a student</h2><p>Enter the student’s contact details and exam assignment.</p></div><button type="button" className="iconbtn" onClick={()=>setOpen(false)} aria-label="Close">×</button></div><form className="student-form" onSubmit={submit}><label>Full name<input autoFocus name="name" value={form.name} onChange={update} placeholder="e.g. Aisha Patel" minLength="2" maxLength="120" required/></label><label>Student email<input name="email" type="email" value={form.email} onChange={update} placeholder="student@university.edu" required/></label><label>Exam assignment <span className="optional-label">Optional</span><input name="exam" value={form.exam} onChange={update} placeholder="e.g. Data Structures Midterm" maxLength="120"/></label>{error&&<div className="login-error">{error}</div>}<div className="student-form-actions"><button type="button" className="secondary" onClick={()=>setOpen(false)}>Cancel</button><button type="submit" className="primary" disabled={saving}>{saving?<LoaderCircle className="spin" size={15}/>:<Plus size={15}/>} {saving?"Adding…":"Add student"}</button></div></form></div></div>}
    <Card title={`Student directory · ${students.length}`} icon={Users}>{students.length?<SessionTable students={students} exams={exams}/>:<div className="exam-empty"><Users size={24}/><b>No students yet</b><span>Add students to your directory to assign them to exams.</span></div>}</Card>
  </section>
}
function Exams({role,token,onAuthExpired}){
  const [exams,setExams]=useState([]); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState(""); const [notice,setNotice]=useState(""); const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({name:"",exam_url:"",duration_minutes:60,proctoring_level:2});
  const load=async()=>{try{const r=await authFetch(token,`${API}/api/exams`);const data=await r.json().catch(()=>({}));if(r.status===401){onAuthExpired();return}if(!r.ok)throw new Error(data.error||`Exam API request failed (${r.status}).`);setExams(data)}catch(e){setError(e.message==="Failed to fetch"?"The ExamGuard API could not be reached. Check that it is running.":e.message)}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const update=(e)=>setForm(v=>({...v,[e.target.name]:e.target.value}));
  const create=async(e)=>{e.preventDefault();setError("");setNotice("");setSaving(true);try{const r=await authFetch(token,`${API}/api/exams`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form})});const data=await r.json();if(r.status===401){onAuthExpired();return}if(!r.ok)throw new Error(data.error||"Could not create exam.");setExams(v=>[data,...v]);setForm({name:"",exam_url:"",duration_minutes:60,proctoring_level:2});setShowForm(false);setNotice(`${data.name} is ready. Share its student preflight link with candidates.`)}catch(e){setError(e.message)}finally{setSaving(false)}};
  const copyLink=async(id)=>{const link=`${window.location.origin}/?exam=${id}`;try{await navigator.clipboard.writeText(link);setNotice("Student preflight link copied.")}catch{setNotice(link)}};
  return <section>
    <div className="hero-row"><div><p className="eyebrow">ASSESSMENTS</p><h1>Exam workspace</h1><p className="muted">Register provider exam links, set session rules, and share a proctored student launch page.</p></div>{role==="admin"&&<button className="primary" onClick={()=>{setShowForm(v=>!v);setError("")}}><Plus size={16}/>{showForm?"Close form":"Add exam"}</button>}</div>
    <div className="exam-notice"><Shield size={17}/><span>ExamGuard opens the provider link in a separate tab and runs the consent and camera preflight here. Capturing activity inside an external exam requires that provider to authorize and install the ExamGuard SDK or extension.</span></div>
    {notice&&<div className="exam-feedback">{notice}</div>}{error&&<div className="login-error exam-error">{error}</div>}
    {showForm&&<Card title="Register an exam" icon={BookOpen}><form className="exam-form" onSubmit={create}>
      <label>Exam name<input name="name" value={form.name} onChange={update} placeholder="e.g. Data Structures Midterm" required minLength="2" maxLength="120"/></label>
      <label className="exam-url-field">Authorized exam website URL<input name="exam_url" type="url" value={form.exam_url} onChange={update} placeholder="https://exams.your-university.edu/session/123" required/><small>Use a provider URL your organization is authorized to use. HTTPS is required outside localhost.</small></label>
      <div className="exam-form-row"><label>Duration (minutes)<input name="duration_minutes" type="number" min="5" max="600" value={form.duration_minutes} onChange={update}/></label><label>Proctoring level<select name="proctoring_level" value={form.proctoring_level} onChange={update}><option value="1">1 · Essential</option><option value="2">2 · Standard</option><option value="3">3 · Enhanced</option></select></label></div>
      <div className="exam-form-actions"><span>Provider integration may be required for in-page proctoring signals.</span><button className="primary" disabled={saving}>{saving?<LoaderCircle size={15} className="spin"/>:<Plus size={15}/>} {saving?"Saving…":"Save exam"}</button></div>
    </form></Card>}
    <div className="exam-summary"><div><span>REGISTERED EXAMS</span><b>{exams.length}</b></div><div><span>STUDENT LAUNCH LINKS</span><b>{exams.length}</b></div><div><span>REQUIRES PROVIDER SETUP</span><b>{exams.filter(x=>!isBuiltInHost(x.exam_url)).length}</b></div></div>
    <Card title="Exam catalog" icon={BookOpen} action={loading?"Loading":"Updated"}>{loading?<div className="exam-empty">Loading registered exams…</div>:exams.length===0?<div className="exam-empty"><BookOpen size={24}/><b>No exams registered yet</b><span>Add an authorized exam URL to create a student preflight and launch link.</span></div>:<div className="exam-list">{exams.map(exam=><div className="exam-row exam-catalog-row" key={exam.id}><div className="exam-icon"><BookOpen size={17}/></div><div className="exam-meta"><b>{exam.name}</b><span className="exam-domain" title={exam.exam_url}>{new URL(exam.exam_url).hostname}</span><small>{exam.duration_minutes} min · Proctoring level {exam.proctoring_level}</small></div><span className={`badge ${isBuiltInHost(exam.exam_url)?"normal":"warning"}`}><i/>{isBuiltInHost(exam.exam_url)?"Demo host":"Provider setup"}</span><button className="secondary copy-link" onClick={()=>copyLink(exam.id)}><Copy size={14}/> Student link</button><a className="secondary student-access" href={`/?exam=${encodeURIComponent(exam.id)}`} target="_blank" rel="noreferrer"><Camera size={14}/> Student access</a></div>)}</div>}</Card>
  </section>
}

function isBuiltInHost(raw){try{const host=new URL(raw).hostname;return ["localhost","127.0.0.1","examguard.local"].includes(host)||host.endsWith(".examguard.local")}catch{return false}}
function Alerts({events}){return <section><div className="hero-row"><div><p className="eyebrow">REVIEW QUEUE</p><h1>Suspicious events</h1><p className="muted">AI signals are evidence for review, not automatic misconduct decisions.</p></div><button className="secondary"><FileText size={16}/> Export CSV</button></div><Card title={`${events.length} recent events`} icon={Bell}><EventList events={events}/></Card></section>}
function Reports(){return <section><div className="hero-row"><div><p className="eyebrow">AUDIT & EVIDENCE</p><h1>Proctoring reports</h1><p className="muted">Generate reviewable, timestamped exam-session reports.</p></div><button className="primary"><FileText size={16}/> Generate report</button></div><Card title="Recent reports" icon={FileText}><div className="exam-list">{["Rahul Kumar · Data Structures","Priya Sharma · Machine Learning","Anil Kumar · Computer Networks"].map((x,i)=><div className="exam-row"><div className="exam-icon"><FileText size={17}/></div><div><b>{x}</b><span>Session EG-{1042+i} · Human review {i===0?"pending":"completed"}</span></div><Badge text={i===0?"Warning":"Normal"}/><button className="iconbtn"><ChevronRight size={16}/></button></div>)}</div></Card></section>}
function Integrations({token}){const [url,setUrl]=useState(""); const [result,setResult]=useState(null); const validate=async()=>{try{const r=await authFetch(token,`${API}/api/integrations/validate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})});setResult(await r.json())}catch{setResult({mode:"demo",message:"Backend unavailable — local demo validation"})}};return <section><div className="hero-row"><div><p className="eyebrow">PLATFORM CONNECTORS</p><h1>Exam integrations</h1><p className="muted">Connect only to exam providers that explicitly authorize ExamGuard.</p></div></div><Card title="Demo URL Analyzer" icon={Globe2}><div className="url-form"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://exam.example.com/session/123"/><button className="primary" onClick={validate}>Validate URL</button></div>{result&&<div className={`integration-result ${result.mode}`}><div><b>{result.label||result.mode.toUpperCase()}</b><span>{result.message}</span></div><Badge text={result.mode==="supported"?"Normal":"Warning"}/></div>}<div className="integration-grid">{["JavaScript SDK","Chrome / Edge Extension","REST API","Webhooks","OAuth"].map((x,i)=><div><div className="integration-icon"><Globe2 size={18}/></div><b>{x}</b><span>{i===0?"Embed session controls":"Provider-authorized integration"}</span></div>)}</div></Card></section>}
function Settings({demo,setDemo}){return <section><div className="hero-row"><div><p className="eyebrow">CONFIGURATION</p><h1>Proctoring settings</h1><p className="muted">Tune thresholds without changing application code.</p></div></div><Card title="Detection policy" icon={Gauge}><div className="settings"><Toggle label="Phone detection" on/><Toggle label="Multiple-face detection" on/><Toggle label="Head-pose monitoring" on/><Toggle label="Browser visibility events" on/><div className="range"><span>Looking-away threshold</span><b>3 seconds</b><input type="range" min="1" max="10" defaultValue="3"/></div><div className="range"><span>Critical risk threshold</span><b>81 / 100</b><input type="range" min="60" max="100" defaultValue="81"/></div><div className="setting-row"><div><b>Developer demo mode</b><span>Shows simulated events clearly labeled as DEMO EVENT.</span></div><button className={`switch ${demo?"on":""}`} onClick={()=>setDemo(v=>!v)}><i/></button></div></div></Card><Card title="Privacy controls" icon={LockKeyhole}><div className="privacy-grid"><div><CheckCircle2/> No webcam recording by default</div><div><CheckCircle2/> Explicit consent required</div><div><CheckCircle2/> Configurable retention</div><div><CheckCircle2/> Human review required</div></div></Card></section>}
function Toggle({label,on}){const [v,setV]=useState(on);return <div className="setting-row"><div><b>{label}</b><span>AI signal is assistive, not a misconduct verdict.</span></div><button className={`switch ${v?"on":""}`} onClick={()=>setV(x=>!x)}><i/></button></div>}

function StudentExam({examId}){
  const videoRef=useRef(null);const streamRef=useRef(null);const [exam,setExam]=useState(null);const [error,setError]=useState("");const [consent,setConsent]=useState(false);const [status,setStatus]=useState("Camera permission not requested");const [started,setStarted]=useState(false);const [examOpened,setExamOpened]=useState(false);const [popupBlocked,setPopupBlocked]=useState(false);
  useEffect(()=>{let live=true;fetch(`${API}/api/exams/${encodeURIComponent(examId)}`).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Exam not found.");if(live)setExam(d)}).catch(e=>live&&setError(e.message));return()=>{live=false;streamRef.current?.getTracks().forEach(t=>t.stop())}},[examId]);
  useEffect(()=>{if(started&&videoRef.current&&streamRef.current)videoRef.current.srcObject=streamRef.current},[started]);
  const start=async()=>{if(!consent)return;if(!navigator.mediaDevices?.getUserMedia){setStatus("Camera access requires HTTPS or localhost. Open this page on a secure connection.");return}const examTab=window.open("about:blank","_blank");setPopupBlocked(!examTab);try{const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});streamRef.current=stream;setStarted(true);if(examTab){examTab.location.replace(exam.exam_url);setExamOpened(true);setStatus("Camera approved · exam opened in a new tab")}else setStatus("Camera approved · allow pop-ups, then continue to your exam") }catch{examTab?.close();setStatus("Camera permission was not granted. Allow camera access to continue.")}};
  const openExam=()=>{window.open(exam.exam_url,"_blank","noopener,noreferrer");setExamOpened(true);setStatus("Exam opened in a new tab · keep this ExamGuard tab open")};
  if(error)return <div className="exam-page"><main className="student-launch"><h1>Exam unavailable</h1><p>{error}</p><a href="/">Return to ExamGuard</a></main></div>;
  if(!exam)return <div className="exam-page"><main className="student-launch">Loading exam session…</main></div>;
  return <div className="exam-page"><header className="exam-top"><div className="brand"><div className="brandmark"><Shield size={20}/></div><b>ExamGuard AI</b></div><span className="live"><i/> CAMERA PREFLIGHT</span><a href="/">Admin sign in</a></header><main className="student-launch"><div className="student-intro"><p className="eyebrow">SECURE EXAM ACCESS</p><h1>{exam.name}</h1><p>Allow camera access first. Once approved, your exam website will open in a new tab.</p><div className="student-exam-details"><span><Clock3 size={15}/>{exam.duration_minutes} minutes</span><span><Shield size={15}/>Proctoring level {exam.proctoring_level}</span><span><Globe2 size={15}/>{new URL(exam.exam_url).hostname}</span></div></div><div className="student-preflight"><div className="camera-box"><video ref={videoRef} autoPlay muted playsInline/><div className="camera-status"><i/> {status}</div></div><div className="preflight-checks"><b>BEFORE YOU BEGIN</b><span><CheckCircle2 size={15}/>Your browser will ask for camera permission</span><span><CheckCircle2 size={15}/>Keep this ExamGuard tab open during your exam</span><span><ExternalLink size={15}/>The provider exam opens after camera approval</span></div><label className="student-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I consent to webcam access for this session. The camera is used by ExamGuard; AI signals support human review.</span></label>{!started?<button className="primary wide" disabled={!consent} onClick={start}><Camera size={16}/>Allow camera & open exam</button>:!examOpened&&popupBlocked?<button className="primary wide" onClick={openExam}><ExternalLink size={16}/>Continue to {exam.name}</button>:<div className="camera-approved"><CheckCircle2 size={16}/> Camera approved. Keep this tab open while you take the exam.</div>}</div><p className="provider-note">Camera permission is granted to this ExamGuard page. The external exam page does not receive camera access unless its provider has separately authorized and integrated ExamGuard.</p></main></div>
}

createRoot(document.getElementById("root")).render(<ExamGuardApp/>);
