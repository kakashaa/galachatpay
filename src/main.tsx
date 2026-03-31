import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── Unregister ALL old service workers to fix cached blank screens ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
}

// ── Clear ALL old caches to prevent stale content ──
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
  });
}

// Version tracking (no auto-reload to prevent loops)

// ── Register push notification SW (only for push, no caching) ──
async function registerPushSW() {
  try {
    // Don't register in iframes or preview hosts
    const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
    const isPreviewHost = window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");
    if (isInIframe || isPreviewHost) return;

    if (!('Notification' in window)) return;

    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    if (Notification.permission === "granted") {
      const VAPID_PUBLIC_KEY = "BETvT-492lkzUXOQyxmQe07e8LmA7xsK_8cpzjkYqq2MMzHs5JMvUU2mZmQHk-LK3QNB1q6ZLlPG5GgXUkTNI4E";
      const padding = "=".repeat((4 - (VAPID_PUBLIC_KEY.length % 4)) % 4);
      const base64 = (VAPID_PUBLIC_KEY + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = window.atob(base64);
      const applicationServerKey = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) applicationServerKey[i] = rawData.charCodeAt(i);

      await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    }
  } catch (err) {
    console.warn("Push SW registration failed:", err);
  }
}

registerPushSW();

createRoot(document.getElementById("root")!).render(<App />);
