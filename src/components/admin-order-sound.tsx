"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

const CHECK_INTERVAL_MS = 10_000;
const ALERT_DURATION_MS = 5_000;
const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const SOUND_PREFERENCE_KEY = "perty-admin-order-sound";

type SoundContextValue = {
  enabled: boolean;
  starting: boolean;
  alerting: boolean;
  error: string;
  toggle: () => Promise<void>;
};

const SoundContext = createContext<SoundContextValue | null>(null);

async function latestOrderId(): Promise<string | null> {
  const response = await fetch("/api/admin/orders/latest", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not check for new orders.");
  const result = await response.json() as { latestOrderId?: unknown };
  if (result.latestOrderId !== null && typeof result.latestOrderId !== "string") throw new Error("Invalid order response.");
  return result.latestOrderId;
}

export function AdminOrderSoundProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const [enabled, setEnabled] = useState(false);
  const [starting, setStarting] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef<AudioContext | null>(null);
  const latestIdRef = useRef<string | null>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);

  const stopAlert = useCallback(() => {
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = null;
    for (const oscillator of oscillatorsRef.current) {
      try { oscillator.stop(); } catch { /* The tone already finished. */ }
    }
    oscillatorsRef.current = [];
    setAlerting(false);
  }, []);

  const playAlert = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.state !== "running") return;
    stopAlert();
    const firstTone = audio.currentTime + 0.05;
    for (let index = 0; index < 5; index++) {
      const start = firstTone + index;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(660, start);
      oscillator.frequency.linearRampToValueAtTime(880, start + 0.25);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.14, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.7);
      oscillatorsRef.current.push(oscillator);
    }
    setAlerting(true);
    alertTimerRef.current = setTimeout(() => {
      oscillatorsRef.current = [];
      setAlerting(false);
      alertTimerRef.current = null;
    }, ALERT_DURATION_MS);
  }, [stopAlert]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let checking = false;
    async function check() {
      if (checking) return;
      checking = true;
      try {
        const id = await latestOrderId();
        if (!active) return;
        if (id !== latestIdRef.current) {
          latestIdRef.current = id;
          if (id) {
            playAlert();
            router.refresh();
          }
        }
        setError("");
      } catch {
        if (active) setError("Order alerts could not connect. Retrying.");
      } finally {
        checking = false;
      }
    }
    const interval = setInterval(() => void check(), CHECK_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, playAlert, router]);

  useEffect(() => () => {
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    for (const oscillator of oscillatorsRef.current) {
      try { oscillator.stop(); } catch { /* The tone already finished. */ }
    }
    void audioRef.current?.close();
  }, []);

  const enable = useCallback(async (restoring = false) => {
    setStarting(true);
    setError("");
    try {
      if (!window.AudioContext) throw new Error("Sound is unavailable in this browser.");
      const audio = audioRef.current ?? new AudioContext();
      audioRef.current = audio;
      if (restoring) void audio.resume().catch(() => undefined);
      else await audio.resume();
      latestIdRef.current = await latestOrderId();
      setEnabled(true);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sound could not be enabled.");
      return false;
    } finally {
      setStarting(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (localStorage.getItem(SOUND_PREFERENCE_KEY) === "on") void enable(true);
      } catch { /* Storage can be unavailable in private browsing. */ }
    }, 0);
    return () => clearTimeout(timer);
  }, [enable]);

  useEffect(() => {
    if (!enabled) return;
    const resume = () => { if (audioRef.current?.state === "suspended") void audioRef.current.resume().catch(() => undefined); };
    document.addEventListener("pointerdown", resume);
    document.addEventListener("keydown", resume);
    return () => {
      document.removeEventListener("pointerdown", resume);
      document.removeEventListener("keydown", resume);
    };
  }, [enabled]);

  async function toggle() {
    if (enabled) {
      setEnabled(false);
      stopAlert();
      void audioRef.current?.suspend();
      try { localStorage.setItem(SOUND_PREFERENCE_KEY, "off"); } catch { /* Storage can be unavailable. */ }
      return;
    }
    if (await enable()) {
      try { localStorage.setItem(SOUND_PREFERENCE_KEY, "on"); } catch { /* Storage can be unavailable. */ }
    }
  }

  return <SoundContext.Provider value={{ enabled, starting: !ready || starting, alerting, error, toggle }}>
    {children}
    <span className="visually-hidden" role="status">{error || (alerting ? "New order received. Sounding for five seconds." : "")}</span>
  </SoundContext.Provider>;
}

export function AdminOrderSoundSettings() {
  const sound = useContext(SoundContext);
  if (!sound) throw new Error("Admin sound settings must be inside the admin layout.");

  return <section className="admin-panel admin-sound-panel">
    <div className="panel-title"><h2>New order sound</h2><span>{sound.enabled ? "On" : "Off"}</span></div>
    <div className="admin-sound-row">
      <div><strong>Play a sound for new orders</strong><p className="form-help">Alerts play while this admin panel is open. Your choice is saved in this browser.</p></div>
      <button type="button" role="switch" aria-label="New order sound" aria-checked={sound.enabled} disabled={sound.starting} onClick={() => void sound.toggle()} className="admin-sound-switch"><span /></button>
    </div>
    {sound.error && <p className="admin-sound-error" role="alert">{sound.error}</p>}
    {sound.alerting && <p className="form-help">New order received.</p>}
  </section>;
}
