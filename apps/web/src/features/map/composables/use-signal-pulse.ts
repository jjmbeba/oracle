import { onBeforeUnmount, ref, watch, type Ref } from "vue";
import type { Map } from "maplibre-gl";
import { SEVERITY_STYLES, SIGNAL_HALO_BASE_OPACITY } from "../../signals/types";
import { signalHaloLayerId } from "./signal-layer-ids";
import type { SignalCategory, SignalSeverity } from "../../signals/types";

const PULSE_DURATION_MS = 2000;
const REDUCED_MOTION_HALO_OPACITY = 0.35;

const HALO_SEVERITIES: readonly SignalSeverity[] = (
  Object.entries(SEVERITY_STYLES) as [SignalSeverity, { pulse: boolean }][]
)
  .filter(([, s]) => s.pulse)
  .map(([k]) => k);

const haloRadiusExpression = (easedPhase: number) =>
  [
    "match",
    ["get", "severity"],
    ...HALO_SEVERITIES.flatMap((k) => {
      const style = SEVERITY_STYLES[k];
      const multiplier = 1 + (style.haloScale - 1) * easedPhase;
      return [k, style.radius * multiplier];
    }),
    0,
  ] as never;

const reducedMotionRadiusExpression = [
  "match",
  ["get", "severity"],
  ...HALO_SEVERITIES.flatMap((k) => [k, SEVERITY_STYLES[k].radius * SEVERITY_STYLES[k].haloScale]),
  0,
] as never;

const haloOpacityExpression = (opacity: number) =>
  ["match", ["get", "severity"], ...HALO_SEVERITIES.flatMap((k) => [k, opacity]), 0] as never;

const easeInOut = (t: number): number => {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export type SignalPulse = {
  readonly dispose: () => void;
};

export function useSignalPulse(
  map: Ref<Map | null>,
  isLoaded: Ref<boolean>,
  activeCategories: () => readonly SignalCategory[],
): SignalPulse {
  let rafId: number | null = null;
  let startTime = 0;
  let running = false;
  const reducedMotion = ref(prefersReducedMotion());

  const mediaQuery =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;

  const handleMediaChange = (event: MediaQueryListEvent): void => {
    reducedMotion.value = event.matches;
  };

  mediaQuery?.addEventListener("change", handleMediaChange);

  const activeHaloCategories = (): SignalCategory[] => {
    const m = map.value;
    if (!m) return [];
    return activeCategories().filter(
      (category) => m.getLayer(signalHaloLayerId(category)) !== undefined,
    );
  };

  const applyStaticHalo = (): void => {
    const m = map.value;
    if (!m) return;
    for (const category of activeHaloCategories()) {
      const lid = signalHaloLayerId(category);
      m.setPaintProperty(lid, "circle-radius", reducedMotionRadiusExpression);
      m.setPaintProperty(lid, "circle-opacity", haloOpacityExpression(REDUCED_MOTION_HALO_OPACITY));
    }
  };

  const clearHaloPaint = (): void => {
    const m = map.value;
    if (!m) return;
    for (const category of activeHaloCategories()) {
      const lid = signalHaloLayerId(category);
      m.setPaintProperty(lid, "circle-radius", 0);
      m.setPaintProperty(lid, "circle-opacity", 0);
    }
  };

  const tick = (now: number): void => {
    const m = map.value;
    if (!m || !running) return;
    const elapsed = (now - startTime) % PULSE_DURATION_MS;
    const phase = elapsed / PULSE_DURATION_MS;
    const radiusEased = easeInOut(phase);
    const opacityFade = phase * phase;
    const opacity = SIGNAL_HALO_BASE_OPACITY * (1 - opacityFade);

    for (const category of activeHaloCategories()) {
      const lid = signalHaloLayerId(category);
      m.setPaintProperty(lid, "circle-radius", haloRadiusExpression(radiusEased));
      m.setPaintProperty(lid, "circle-opacity", haloOpacityExpression(opacity));
    }
    rafId = requestAnimationFrame(tick);
  };

  const start = (): void => {
    if (running) return;
    running = true;
    if (reducedMotion.value) {
      applyStaticHalo();
      return;
    }
    startTime = performance.now();
    rafId = requestAnimationFrame(tick);
  };

  const stop = (): void => {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    clearHaloPaint();
  };

  watch(
    [
      isLoaded,
      reducedMotion,
      () =>
        activeHaloCategories()
          .map((c) => signalHaloLayerId(c))
          .sort()
          .join("|"),
    ],
    () => {
      const halos = activeHaloCategories();
      if (!isLoaded.value || halos.length === 0) {
        stop();
        return;
      }
      if (reducedMotion.value) {
        stop();
        applyStaticHalo();
        return;
      }
      if (!running) {
        start();
      }
    },
    { immediate: true, flush: "post" },
  );

  const dispose = (): void => {
    mediaQuery?.removeEventListener("change", handleMediaChange);
    stop();
  };

  onBeforeUnmount(dispose);

  return { dispose };
}
