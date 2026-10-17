/**
 * ExamGuard Provider SDK — reference integration.
 * Providers should only initialize this on approved exam pages
 * after obtaining the appropriate user consent.
 */
export const ExamGuard = {
  config: null,
  async init(config) {
    this.config = config;
    return { ok:true, version:"1.0.0" };
  },
  async startSession(data={}) {
    return post("/api/sdk/session/start", data);
  },
  async logEvent(event) {
    return post("/api/proctoring/events", event);
  },
  async getRiskScore(sessionId) {
    const r = await fetch(`${this.config?.apiBase || "http://localhost:5050"}/api/proctoring/risk/${sessionId}`);
    return r.json();
  },
  async endSession(data={}) {
    return post("/api/sdk/session/end", data);
  }
};
async function post(path,body){
  const base = window.ExamGuard?.config?.apiBase || "http://localhost:5050";
  const r=await fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  return r.json();
}
