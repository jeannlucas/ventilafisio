import { T, font } from "../lib/theme";

const codeStyle = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  background: T.panel2,
  border: `1px solid ${T.line}`,
  borderRadius: 6,
  padding: "2px 6px",
  color: T.accent,
} as const;

/**
 * Tela de configuração ausente. Sem isto, faltar .env.local resultava em
 * página em branco: a única pista ficava no console do navegador.
 */
export default function ConfigMissing() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: T.bg,
        color: T.txt,
        fontFamily: font,
      }}
    >
      <div
        style={{
          maxWidth: 560,
          background: T.panel,
          border: `1px solid ${T.warn}55`,
          borderRadius: 14,
          padding: 24,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.warn }}>
          Configuração do Supabase ausente
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: T.txt }}>
          O app não tem como falar com o banco. Crie um arquivo{" "}
          <span style={codeStyle}>.env.local</span> na raiz do projeto com estas
          duas variáveis:
        </p>
        <div style={{ display: "grid", gap: 8, margin: "16px 0" }}>
          <span style={codeStyle}>VITE_SUPABASE_URL</span>
          <span style={codeStyle}>VITE_SUPABASE_ANON_KEY</span>
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: T.dim, margin: 0 }}>
          Os dois valores estão no painel do Supabase, em Project Settings, API.
          Depois de salvar o arquivo, reinicie o servidor de desenvolvimento.
        </p>
      </div>
    </div>
  );
}
