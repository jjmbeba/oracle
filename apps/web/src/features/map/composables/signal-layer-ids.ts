import type { SignalCategory } from "../../signals/types";

export const SIGNAL_LAYER_PREFIX = "oracle-signals";
export const SIGNAL_HALO_LAYER_PREFIX = `${SIGNAL_LAYER_PREFIX}-halo`;

export const signalSourceId = (category: SignalCategory): string =>
  `${SIGNAL_LAYER_PREFIX}-${category}`;

export const signalLayerId = (category: SignalCategory): string =>
  `${SIGNAL_LAYER_PREFIX}-circle-${category}`;

export const signalHaloLayerId = (category: SignalCategory): string =>
  `${SIGNAL_HALO_LAYER_PREFIX}-${category}`;
