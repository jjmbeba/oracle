import { h, render, type VNode } from "vue";
import maplibregl from "maplibre-gl";
import type { Map } from "maplibre-gl";
import SignalTooltip from "../components/signal-tooltip.vue";

export type SignalTooltipContent = {
  readonly title: string;
  readonly severityLabel: string;
  readonly severityColor: string;
  readonly provider: string;
  readonly effectiveAtLabel: string;
};

export function renderSignalTooltip(
  map: Map,
  lngLat: [number, number],
  content: SignalTooltipContent,
): maplibregl.Popup {
  const host = document.createElement("div");
  const vnode: VNode = h(SignalTooltip, content);
  render(vnode, host);
  const html = host.innerHTML;
  render(null, host);

  return new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 14,
    maxWidth: "260px",
    className: "oracle-signal-tooltip",
  })
    .setLngLat(lngLat)
    .setHTML(html)
    .addTo(map);
}
