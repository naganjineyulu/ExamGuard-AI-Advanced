(() => {
  let lastHidden = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      lastHidden = Date.now();
      chrome.runtime.sendMessage({
        type:"EXAMGUARD_EVENT",
        event:{sessionId:"extension-session", type:"TAB_VISIBILITY", severity:"medium", confidence:100, metadata:{hidden:true}}
      });
    }
  });
  window.ExamGuardExtension = {
    status: "active",
    version: "1.0.0"
  };
})();
