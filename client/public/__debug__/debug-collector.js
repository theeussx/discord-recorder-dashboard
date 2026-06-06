/* Debug Collector
 * Similar to previous collector but uses /__debug__/logs
 */
(function () {
  if (window.__DEBUG_COLLECTOR__) return;
  window.__DEBUG_COLLECTOR__ = true;

  var CONFIG = { reportEndpoint: "/__debug__/logs", reportInterval: 2000 };
  var buffer = { consoleLogs: [], networkRequests: [], uiEvents: [] };

  function send() {
    if (buffer.consoleLogs.length + buffer.networkRequests.length + buffer.uiEvents.length === 0) return;
    try {
      fetch(CONFIG.reportEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buffer),
      });
    } catch (e) {}
    buffer.consoleLogs = [];
    buffer.networkRequests = [];
    buffer.uiEvents = [];
  }

  setInterval(send, CONFIG.reportInterval);
})();
