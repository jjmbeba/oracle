import { h, render, type VNode } from "vue";
import maplibregl from "maplibre-gl";
import type { Map } from "maplibre-gl";
import SignalPopup from "../components/signal-popup.vue";

export type SignalPopupContent = {
  readonly title: string;
  readonly severityColor: string;
  readonly severityLabel: string;
  readonly confidence: string;
  readonly provider: string;
  readonly effectiveAtLabel: string;
  readonly sourceLink: { readonly url: string; readonly label?: string } | null;
};

export function renderSignalPopup(
  map: Map,
  lngLat: [number, number],
  content: SignalPopupContent,
): maplibregl.Popup {
  const host = document.createElement("div");
  const vnode: VNode = h(SignalPopup, content);
  render(vnode, host);
  const html = host.innerHTML;
  render(null, host);

  return new maplibregl.Popup({
    closeButton: true,
    closeOnClick: false,
    maxWidth: "280px",
  })
    .setLngLat(lngLat)
    .setHTML(html)
    .addTo(map);
}
