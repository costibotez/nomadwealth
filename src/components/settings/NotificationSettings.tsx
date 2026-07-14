"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, CalendarClock, Mail, Check, ShieldAlert } from "lucide-react";

interface State {
  vapidPublicKey: string | null;
  emailConfigured: boolean;
  ownerEmail: string | null;
  webpush: { enabled: boolean };
  email: { enabled: boolean; address: string };
  digest: { enabled: boolean };
}

// VAPID public keys are base64url — convert to the Uint8Array the Push API wants.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  // Back with a concrete ArrayBuffer so the type is Uint8Array<ArrayBuffer>,
  // which the Push API's applicationServerKey (BufferSource) accepts.
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotificationSettings() {
  const [state, setState] = useState<State | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pushSupported, setPushSupported] = useState(true);

  async function load() {
    const res = await fetch("/api/notifications");
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      setState(data);
      setEmail(data.email.address ?? "");
    }
  }
  useEffect(() => {
    load();
    setPushSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window,
    );
  }, []);

  function flash(tone: "ok" | "err", text: string) {
    setMsg({ tone, text });
    // Errors carry recovery steps — give them longer to read.
    setTimeout(() => setMsg(null), tone === "err" ? 12000 : 5000);
  }

  async function enablePush() {
    if (!state?.vapidPublicKey) return flash("err", "Push keys unavailable — reload and retry.");
    // Already blocked for this site: requestPermission() would resolve to
    // "denied" without a prompt, so guide the user to reset it instead.
    if (Notification.permission === "denied") {
      flash(
        "err",
        "Notifications are blocked for this site. Click the site-info icon (lock/tune) left of the address bar → allow Notifications, then try again. On macOS also check System Settings → Notifications is on for your browser.",
      );
      return;
    }
    setBusy("push");
    try {
      const perm = await Notification.requestPermission();
      if (perm === "denied") {
        flash(
          "err",
          "You blocked notifications for this site. Allow them via the site-info icon in the address bar, then click Enable again.",
        );
        return;
      }
      if (perm !== "granted") {
        // "default" — the prompt was dismissed without choosing.
        flash("err", "The permission prompt was dismissed. Click Enable and choose Allow.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(state.vapidPublicKey),
      });
      const r1 = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!r1.ok) throw new Error("subscribe failed");
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "webpush", enabled: true }),
      });
      await load();
      flash("ok", "Browser notifications enabled.");
    } catch {
      flash("err", "Could not enable browser notifications.");
    } finally {
      setBusy(null);
    }
  }

  async function disablePush() {
    setBusy("push");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "webpush", enabled: false }),
      });
      await load();
      flash("ok", "Browser notifications disabled.");
    } finally {
      setBusy(null);
    }
  }

  async function saveEmail(enabled: boolean) {
    setBusy("email");
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "email", enabled, address: email || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        flash("err", data.error ?? "Could not save email settings.");
        return;
      }
      await load();
      flash("ok", enabled ? "Email alerts enabled." : "Email settings saved.");
    } finally {
      setBusy(null);
    }
  }

  async function sendTest(type: "webpush" | "email") {
    setBusy(`test-${type}`);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json().catch(() => ({}));
      flash(data.ok ? "ok" : "err", data.ok ? "Test sent — check your device." : data.error ?? "Test failed.");
    } finally {
      setBusy(null);
    }
  }

  const pushOn = Boolean(state?.webpush.enabled);
  const emailOn = Boolean(state?.email.enabled);
  const digestOn = Boolean(state?.digest?.enabled);

  async function toggleDigest(enabled: boolean) {
    setBusy("digest");
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "digest", enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        flash("err", data.error ?? "Could not save digest settings.");
        return;
      }
      await load();
      flash("ok", enabled ? "Weekly digest enabled." : "Weekly digest disabled.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card max-w-xl p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
          <Bell size={18} />
        </div>
        <div>
          <div className="font-semibold text-ink">Alert notifications</div>
          <p className="text-xs text-ink-muted">
            Choose how price alerts reach you. Alerts are checked on the server, so
            these fire even when the app is closed. Everything is stored only in your
            own database.
          </p>
        </div>
      </div>

      {/* ── Web Push ─────────────────────────────────────────────────────── */}
      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BellRing size={16} className={pushOn ? "text-accent" : "text-ink-faint"} />
            <div>
              <div className="text-sm font-medium text-ink">Browser push</div>
              <div className="text-xs text-ink-faint">
                {pushOn ? "On for this browser" : "Notifications on this device — no setup needed"}
              </div>
            </div>
          </div>
          {!pushSupported ? (
            <span className="text-xs text-ink-faint">Not supported here</span>
          ) : pushOn ? (
            <div className="flex gap-2">
              <button
                onClick={() => sendTest("webpush")}
                disabled={busy === "test-webpush"}
                className="focusring rounded-lg border border-border bg-panel px-3 py-1.5 text-xs font-medium text-ink hover:bg-hover disabled:opacity-50"
              >
                Send test
              </button>
              <button
                onClick={disablePush}
                disabled={busy === "push"}
                className="focusring rounded-lg border border-border bg-panel px-3 py-1.5 text-xs font-medium text-loss hover:bg-hover disabled:opacity-50"
              >
                Disable
              </button>
            </div>
          ) : (
            <button
              onClick={enablePush}
              disabled={busy === "push"}
              className="focusring rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-black hover:brightness-110 disabled:opacity-50"
            >
              {busy === "push" ? "Enabling…" : "Enable"}
            </button>
          )}
        </div>
      </div>

      {/* ── Email ────────────────────────────────────────────────────────── */}
      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Mail size={16} className={emailOn ? "text-accent" : "text-ink-faint"} />
          <div className="text-sm font-medium text-ink">Email</div>
          {emailOn && (
            <span className="flex items-center gap-1 rounded-full bg-gain/15 px-2 py-0.5 text-xs text-gain">
              <Check size={11} /> On
            </span>
          )}
        </div>
        {state && !state.emailConfigured && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-faint">
            <ShieldAlert size={13} className="mt-0.5 shrink-0" />
            Email delivery needs <code className="mono">RESEND_API_KEY</code> and a from-address
            set in your environment. You can save an address now; enable once that&apos;s configured.
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="focusring min-w-0 flex-1 rounded-xl border border-border bg-base px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
          />
          {emailOn ? (
            <>
              <button
                onClick={() => sendTest("email")}
                disabled={busy === "test-email"}
                className="focusring rounded-lg border border-border bg-panel px-3 py-2 text-xs font-medium text-ink hover:bg-hover disabled:opacity-50"
              >
                Send test
              </button>
              <button
                onClick={() => saveEmail(false)}
                disabled={busy === "email"}
                className="focusring rounded-lg border border-border bg-panel px-3 py-2 text-xs font-medium text-loss hover:bg-hover disabled:opacity-50"
              >
                Disable
              </button>
            </>
          ) : (
            <button
              onClick={() => saveEmail(true)}
              disabled={busy === "email" || !email}
              className="focusring rounded-lg bg-accent px-3 py-2 text-xs font-medium text-black hover:brightness-110 disabled:opacity-50"
            >
              {busy === "email" ? "Saving…" : "Enable"}
            </button>
          )}
        </div>
      </div>

      {/* ── Weekly digest ────────────────────────────────────────────────── */}
      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className={digestOn ? "text-accent" : "text-ink-faint"} />
            <div>
              <div className="text-sm font-medium text-ink">Weekly digest</div>
              <div className="text-xs text-ink-faint">
                A Monday-morning net-worth summary via the channels above.
              </div>
            </div>
          </div>
          <button
            onClick={() => toggleDigest(!digestOn)}
            disabled={busy === "digest" || (!digestOn && !pushOn && !emailOn)}
            className={
              "focusring rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 " +
              (digestOn
                ? "border border-border bg-panel text-loss hover:bg-hover"
                : "bg-accent text-black hover:brightness-110")
            }
          >
            {busy === "digest" ? "Saving…" : digestOn ? "Disable" : "Enable"}
          </button>
        </div>
        {!digestOn && !pushOn && !emailOn && (
          <p className="mt-2 text-xs text-ink-faint">
            Turn on browser push or email first — the digest needs a delivery
            channel.
          </p>
        )}
      </div>

      {msg && (
        <p role="alert" className={`mt-4 text-sm ${msg.tone === "ok" ? "text-gain" : "text-loss"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
