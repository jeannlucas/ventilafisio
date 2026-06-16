// Design tokens — tema clínico escuro (monitor de UTI)
export const T = {
  bg: "#0B0F14",
  panel: "#121822",
  panel2: "#0E141C",
  line: "#1F2A38",
  txt: "#E6EDF3",
  dim: "#7C8A9C",
  ok: "#34D399",
  warn: "#FBBF24",
  danger: "#F87171",
  accent: "#38BDF8",
  accentDim: "#0EA5E9",
};

export const statusColor = (s?: "ok" | "warn" | "danger" | null) =>
  s === "ok" ? T.ok : s === "warn" ? T.warn : s === "danger" ? T.danger : T.dim;

export function fmt(v: number | null | undefined, d = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return Number(v).toFixed(d);
}

export const font =
  "'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
