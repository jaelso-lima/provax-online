// Device detection + per-device app behavior config.
// Used by the VSL/onboarding flow to adapt autoplay strategy per platform.

export type DeviceType = "ios" | "android" | "desktop";

export interface AppConfig {
  device: DeviceType;
  autoplay: boolean;
  requireUserInteraction: boolean;
  showPlayButton: boolean;
}

export function detectDevice(): DeviceType {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  // iPadOS 13+ reports as Mac — detect via touch points
  const isIPadOS =
    /Macintosh/.test(ua) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || isIPadOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function getAppConfig(): AppConfig {
  const device = detectDevice();
  if (device === "ios") {
    return { device, autoplay: false, requireUserInteraction: true, showPlayButton: true };
  }
  // Android & Desktop both support muted autoplay reliably.
  return { device, autoplay: true, requireUserInteraction: false, showPlayButton: false };
}
