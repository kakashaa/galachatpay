import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force service worker update
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
}

// Clear old caches on load
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      if (name.includes('workbox-precache')) {
        caches.delete(name);
      }
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
