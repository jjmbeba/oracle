import type { SignalCategory } from "../../signals/types";

export const SIGNAL_LAYER_PREFIX = "oracle-signals";

export const signalSourceId = (category: SignalCategory): string =>
  `${SIGNAL_LAYER_PREFIX}-${category}`;

export const signalLayerId = (category: SignalCategory): string =>
  `${SIGNAL_LAYER_PREFIX}-circle-${category}`;
