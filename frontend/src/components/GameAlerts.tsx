import { useEffect, useState } from "react";
import type { Game } from "@/lib/nba-api";

const base = import.meta.env.VITE_NBA_API_BASE ?? "/api/nba";
const supported = () => window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
function deviceToken() {
  let token = localStorage.getItem("push-device-token");
  if (!token) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) => v.toString(16).padStart(2, "0")).join("");
    localStorage.setItem("push-device-token", token);
  }
  return token;
}
function applicationKey(key: string) {
  const bytes = atob(key.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bytes, (char) => char.charCodeAt(0));
}
async function request(id: string, method = "GET", subscription?: PushSubscription, suffix = "") {
  const response = await fetch(`${base}/push/games/${encodeURIComponent(id)}${suffix}`, {
    method,
    headers: { Authorization: `Bearer ${deviceToken()}`, "Content-Type": "application/json" },
    body: subscription ? JSON.stringify(subscription.toJSON()) : undefined,
  });
  if (!response.ok) {
    if (response.status === 409) throw new Error("This game is not available for alerts.");
    if (response.status === 410) throw new Error("This browser subscription expired. Disable alerts, then enable them again.");
    throw new Error(method === "POST" ? "The push provider did not accept the test alert. Please try again." : "Could not save alerts. Please try again.");
  }
  return response;
}
export default function GameAlerts({ game }: { game: Game }) {
  const [publicKey, setPublicKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      if (!supported()) return;
      const config = await fetch(`${base}/push/config`);
      if (!config.ok) return;
      const { publicKey: key } = await config.json();
      const state = await (await request(game.id)).json();
      if (active) { setPublicKey(key); setEnabled(state.enabled); setReady(true); }
    })().catch(() => { if (active) setMessage("Could not load game alerts. Reload to try again."); });
    return () => { active = false; };
  }, [game.id]);

  async function toggle() {
    setBusy(true);
    setMessage("");
    try {
      if (enabled) {
        await request(game.id, "DELETE");
        setEnabled(false);
        setMessage("Alerts disabled for this game on this device.");
      } else {
        // Request directly from the user gesture, as required by Safari.
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setMessage(permission === "denied" ? "Notifications are blocked. Allow them in your browser settings, then try again." : "Notification permission was not granted.");
          return;
        }
        await navigator.serviceWorker.register("/sw.js");
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
          userVisibleOnly: true, applicationServerKey: applicationKey(publicKey),
        });
        await request(game.id, "PUT", subscription);
        setEnabled(true);
        setMessage("Alerts enabled on this device. You can close the site.");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update alerts."); }
    finally { setBusy(false); }
  }

  async function testAlert() {
    setBusy(true);
    setMessage("");
    try {
      await request(game.id, "POST", undefined, "/test");
      setMessage("Test alert accepted by your device's push provider.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send the test alert.");
    } finally {
      setBusy(false);
    }
  }
  if (game.completed && !enabled) return null;
  return (
    <section className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold">Game alerts</h2>
          <p className="text-sm text-muted-foreground">Tipoff, halftime and final score for this game. Alerts expire after seven days.</p>
        </div>
        {ready && <div className="flex items-center gap-2">
          {enabled && <button type="button" disabled={busy} onClick={testAlert}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground disabled:opacity-50">
            Send test alert
          </button>}
          <button type="button" disabled={busy} onClick={toggle} aria-pressed={enabled}
            className="rounded-md border border-primary/50 bg-primary/10 text-primary px-4 py-2 text-sm disabled:opacity-50">
            {busy ? "Working…" : enabled ? "Disable alerts" : "Enable alerts"}
          </button>
        </div>}
      </div>
      {!supported() && <p className="text-sm text-muted-foreground">Use a browser that supports push notifications over HTTPS. On iPhone or iPad, add this site to your Home Screen and open it from there.</p>}
      {supported() && !ready && !message && <p className="text-sm text-muted-foreground">Game alerts are unavailable until enabled on the server.</p>}
      <p role="status" className="text-sm text-muted-foreground">{message}</p>
    </section>
  );
}
