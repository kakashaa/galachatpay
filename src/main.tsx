import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const VAPID_PUBLIC_KEY = "BETvT-492lkzUXOQyxmQe07e8LmA7xsK_8cpzjkYqq2MMzHs5JMvUU2mZmQHk-LK3QNB1q6ZLlPG5GgXUkTNI4E";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Register push notification service worker
async function registerPushSW() {
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    
    // Request notification permission
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    if (Notification.permission === "granted") {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log("Push subscription:", JSON.stringify(subscription));
    }

    // Handle updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "activated") {
            window.location.reload();
          }
        });
      }
    });
  } catch (err) {
    console.warn("Push SW registration failed:", err);
  }
}

// Force service worker update & clear ALL old caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      reg.update();
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });

  // Register push SW
  registerPushSW();
}

// Clear ALL old caches on load to prevent stale content
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
