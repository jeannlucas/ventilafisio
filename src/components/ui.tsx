import { ReactNode, CSSProperties } from "react";
import { T, statusColor, fmt } from "../lib/theme";
import { Classified } from "../lib/clinical";

export function Panel({
  title,
  sub,
  children,
  accent,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <section
      style={{
        background: T.panel,
        border: `1px solid ${accent ? accent + "55" : T.line}`,
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: T.accent,
          }}
        >
          {title}
        </h2>
        {sub && <p style={{ margin: "3px 0 0", fontSize: 11, color: T.dim }}>{sub}</p>}
      </div>
      {children}
    </section>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: T.panel2,
  border: `1px solid ${T.line}`,
  borderRadius: 8,
  padding: "9px 11px",
  color: T.txt,
  fontSize: 14,
  fontVariantNumeric: "tabular-nums",
  outline: "none",
  fontFamily: "inherit",
};

export function Field({
  label,
  value,
  onChange,
  unit,
  type = "number",
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  type?: string;
  options?: { v: string; t: string }[];
  placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: T.dim, letterSpacing: 0.3 }}>{label}</span>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
          {options.map((o) => (
            <option key={o.v} value={o.v}>
              {o.t}
            </option>
          ))}
        </select>
      ) : (
        <div style={{ position: "relative" }}>
          <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
          />
          {unit && (
            <span
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 11,
                color: T.dim,
                pointerEvents: "none",
              }}
            >
              {unit}
            </span>
          )}
        </div>
      )}
    </label>
  );
}

export function HeroCard({
  label,
  value,
  unit,
  st,
  formula,
}: {
  label: string;
  value: string;
  unit: string;
  st: Classified | null;
  formula: string;
}) {
  const color = st ? statusColor(st.s) : T.dim;
  return (
    <div
      style={{
        background: T.panel,
        border: `1px solid ${T.line}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 11, color: T.dim, letterSpacing: 0.4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1,
            color,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
        <span style={{ fontSize: 13, color: T.dim }}>{unit}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: T.dim }}>{formula}</span>
        {st && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color,
              background: `${color}1A`,
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            {st.t}
          </span>
        )}
      </div>
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const styles: Record<string, CSSProperties> = {
    primary: { background: T.accent, color: "#06121C", border: "none" },
    ghost: { background: "transparent", color: T.txt, border: `1px solid ${T.line}` },
    danger: { background: "transparent", color: T.danger, border: `1px solid ${T.danger}55` },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        borderRadius: 8,
        padding: "9px 16px",
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

export function Grid({ children, min = 320 }: { children: ReactNode; min?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
        gap: 16,
        alignItems: "start",
      }}
    >
      {children}
    </div>
  );
}

export function Row({ children, cols = 3 }: { children: ReactNode; cols?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 12 }}>
      {children}
    </div>
  );
}

export { fmt };
