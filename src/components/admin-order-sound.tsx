"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

const CHECK_INTERVAL_MS = 10_000;
const ALERT_DURATION_MS = 5_000;
const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

async function latestOrderId(): Promise<string | null> {
  const response = await fetch("/api/admin/orders/latest", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not check for new orders.");
  const result = await response.json() as { latestOrderId?: unknown };
  if (result.latestOrderId !== null && typeof result.latestOrderId !== "string") throw new Error("Invalid order response.");
  return result.latestOrderId;
}

export function AdminOrderSound() {
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

  async function toggle() {
    if (enabled) {
      setEnabled(false);
      stopAlert();
      void audioRef.current?.suspend();
      return;
    }
    setStarting(true);
    setError("");
    try {
      if (!window.AudioContext) throw new Error("Sound is unavailable in this browser.");
      const audio = audioRef.current ?? new AudioContext();
      audioRef.current = audio;
      await audio.resume();
      latestIdRef.current = await latestOrderId();
      setEnabled(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sound could not be enabled.");
    } finally {
      setStarting(false);
    }
  }

  return <div className="admin-order-sound">
    <button type="button" className={alerting ? "is-alerting" : ""} aria-pressed={enabled} disabled={!ready || starting} onClick={() => void toggle()}>
      <span aria-hidden="true">{enabled ? "🔊" : "🔈"}</span> {starting ? "Enabling…" : alerting ? "New order!" : enabled ? "Sound on" : "Enable sound"}
    </button>
    {error && <span className="admin-order-sound-error">{error}</span>}
    <span className="visually-hidden" role="status">{error || (alerting ? "New order received. Sounding for five seconds." : "")}</span>
  </div>;
}
