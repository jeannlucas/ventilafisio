import { T, font } from "../lib/theme";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(1200px 600px at 50% -10%, #14202E 0%, ${T.bg} 55%)`,
        color: T.txt,
        fontFamily: font,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          textAlign: "center",
        }}
      >
        {/* Marca / sinal vital estilizado */}
        <div style={{ marginBottom: 28 }}>
          <svg width="120" height="44" viewBox="0 0 120 44" style={{ marginBottom: 18 }}>
            <polyline
              points="0,22 22,22 30,8 40,36 50,14 58,22 78,22 86,12 96,30 104,22 120,22"
              fill="none"
              stroke={T.accent}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>
            Ventila<span style={{ color: T.accent }}>Fisio</span>
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: T.dim, lineHeight: 1.5 }}>
            Apoio à decisão em ventilação mecânica na UTI.
            <br />
            Ventilação protetora, evolução diária e desmame.
          </p>
        </div>

        <div
          style={{
            background: T.panel,
            border: `1px solid ${T.line}`,
            borderRadius: 16,
            padding: 28,
          }}
        >
          <button
            onClick={signInWithGoogle}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: "#fff",
              color: "#1F2937",
              border: "none",
              borderRadius: 10,
              padding: "13px 16px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            <GoogleIcon />
            Entrar com Google
          </button>
          <p style={{ margin: "16px 0 0", fontSize: 11, color: T.dim, lineHeight: 1.5 }}>
            Ferramenta de apoio — não substitui o julgamento clínico do
            profissional assistente.
          </p>
        </div>

        <p style={{ margin: "24px 0 0", fontSize: 12, color: T.dim }}>
          Desenvolvido por{" "}
          <strong style={{ color: T.txt }}>BigDev.Z</strong> — IT Consulting
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C39.9 35.6 44 30.4 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
