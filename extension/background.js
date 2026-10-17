chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXAMGUARD_EVENT") {
    fetch("http://localhost:5050/api/proctoring/events", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify(message.event)
    }).catch(()=>{});
  }
  sendResponse({ok:true});
});
