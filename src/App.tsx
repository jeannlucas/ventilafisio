import { useState } from "react";
import { Routes, Route, Navigate, Link, NavLink } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { useHospital } from "./lib/hospital";
import { T, font } from "./lib/theme";
import Login from "./pages/Login";
import PatientList from "./pages/PatientList";
import PatientDetail from "./pages/PatientDetail";
import AdmitPatient from "./pages/AdmitPatient";
import Archived from "./pages/Archived";
import VentilatorLibrary from "./pages/VentilatorLibrary";

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
      <HospitalBar />
      <GlobalTabs />
      <main style={{ padding: "20px 22px 60px", maxWidth: 1320, margin: "0 auto" }}>
        <Routes>
          <Route path="/" element={<PatientList />} />
          <Route path="/admitir" element={<AdmitPatient />} />
          <Route path="/arquivados" element={<Archived />} />
          <Route path="/biblioteca" element={<VentilatorLibrary />} />
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

// Abas globais de navegação.
function GlobalTabs() {
  const tabs = [
    { to: "/", label: "Pacientes", end: true },
    { to: "/admitir", label: "Admitir paciente", end: false },
    { to: "/arquivados", label: "Arquivados", end: false },
    { to: "/biblioteca", label: "Biblioteca de ventiladores", end: false },
  ];
  return (
    <nav style={{ borderBottom: `1px solid ${T.line}`, background: T.bg }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 22px", display: "flex", gap: 4, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            style={({ isActive }) => ({
              padding: "12px 14px",
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? T.txt : T.dim,
              textDecoration: "none",
              borderBottom: `2px solid ${isActive ? T.accent : "transparent"}`,
              marginBottom: -1,
            })}
          >
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// Seletor de hospital ativo — acima de tudo. Trocar de hospital recarrega as listas.
function HospitalBar() {
  const { hospitals, activeHospitalId, activeHospital, setActiveHospital, createHospital, addMember } = useHospital();
  const [mode, setMode] = useState<null | "new" | "member">(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const inputStyle = {
    background: T.panel2,
    border: `1px solid ${T.line}`,
    borderRadius: 8,
    padding: "7px 10px",
    color: T.txt,
    fontSize: 13,
    fontFamily: "inherit" as const,
    outline: "none",
  };
  const btn = (primary = false) => ({
    background: primary ? T.accent : "transparent",
    color: primary ? "#06121C" : T.dim,
    border: primary ? "none" : `1px solid ${T.line}`,
    borderRadius: 8,
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit" as const,
  });

  const submitNew = async () => {
    const h = await createHospital(name);
    if (h) { setName(""); setMode(null); }
  };
  const submitMember = async () => {
    const { error } = await addMember(email);
    if (error) alert("Erro: " + error);
    else { setEmail(""); setMode(null); alert("Membro adicionado."); }
  };

  return (
    <div style={{ borderBottom: `1px solid ${T.line}`, background: T.panel2 }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "10px 22px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: T.dim, letterSpacing: 0.3, textTransform: "uppercase" }}>Hospital</span>
        {hospitals.length > 0 ? (
          <select
            value={activeHospitalId ?? ""}
            onChange={(e) => setActiveHospital(e.target.value)}
            style={{ ...inputStyle, minWidth: 200 }}
          >
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: 13, color: T.dim }}>Nenhum hospital — crie o primeiro para ver pacientes.</span>
        )}

        {mode === null && (
          <>
            <button onClick={() => setMode("new")} style={btn(hospitals.length === 0)}>+ Novo hospital</button>
            {activeHospital && (
              <button onClick={() => setMode("member")} style={btn()}>Adicionar membro</button>
            )}
          </>
        )}

        {mode === "new" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input placeholder="Nome do hospital" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} autoFocus />
            <button onClick={submitNew} style={btn(true)} disabled={!name.trim()}>Criar</button>
            <button onClick={() => { setMode(null); setName(""); }} style={btn()}>Cancelar</button>
          </div>
        )}

        {mode === "member" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input placeholder="email do membro" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} autoFocus />
            <button onClick={submitMember} style={btn(true)} disabled={!email.trim()}>Adicionar</button>
            <button onClick={() => { setMode(null); setEmail(""); }} style={btn()}>Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}
