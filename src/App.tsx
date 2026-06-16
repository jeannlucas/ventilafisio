import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { T, font } from "./lib/theme";
import Login from "./pages/Login";
import PatientList from "./pages/PatientList";
import PatientDetail from "./pages/PatientDetail";

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: T.dim,
          fontFamily: font,
        }}
      >
        Carregando…
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <div style={{ minHeight: "100vh", color: T.txt, fontFamily: font }}>
      <TopBar />
      <main style={{ padding: "20px 22px 60px", maxWidth: 1320, margin: "0 auto" }}>
        <Routes>
          <Route path="/" element={<PatientList />} />
          <Route path="/paciente/:id" element={<PatientDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer
        style={{
          textAlign: "center",
          padding: "20px",
          fontSize: 12,
          color: T.dim,
          borderTop: `1px solid ${T.line}`,
        }}
      >
        Desenvolvido por <strong style={{ color: T.txt }}>BigDev.Z</strong> — IT Consulting
      </footer>
    </div>
  );
}

function TopBar() {
  const { profile, signOut } = useAuth();
  const loc = useLocation();
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 22px",
        borderBottom: `1px solid ${T.line}`,
        position: "sticky",
        top: 0,
        background: `${T.bg}EE`,
        backdropFilter: "blur(8px)",
        zIndex: 10,
      }}
    >
      <Link to="/" style={{ textDecoration: "none", color: T.txt }}>
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.4 }}>
          Ventila<span style={{ color: T.accent }}>Fisio</span>
        </span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {loc.pathname !== "/" && (
          <Link to="/" style={{ fontSize: 13, color: T.dim, textDecoration: "none" }}>
            ← Pacientes
          </Link>
        )}
        <span style={{ fontSize: 12, color: T.dim, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {profile?.full_name ?? profile?.email ?? "Usuário"}
        </span>
        <button
          onClick={signOut}
          style={{
            background: "transparent",
            border: `1px solid ${T.line}`,
            color: T.dim,
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
