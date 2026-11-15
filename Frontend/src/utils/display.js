// Till -> customer-facing screen in another window of the same browser.
// shortcut: BroadcastChannel only reaches windows in this browser; use a server channel (SSE + token) for a separate device.
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("restos-display") : null;

export const showOnDisplay = (message) => channel?.postMessage(message);
export const onDisplayMessage = (handler) => {
  if (!channel) return () => {};
  const listener = (e) => handler(e.data);
  channel.addEventListener("message", listener);
  return () => channel.removeEventListener("message", listener);
};
