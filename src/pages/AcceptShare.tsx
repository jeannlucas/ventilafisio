import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { T } from "../lib/theme";
import { Panel, Btn } from "../components/ui";

export default function AcceptShare() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("accept_patient_share", { share_token: token });
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Não foi possível aceitar este compartilhamento.");
      return;
    }
    navigate(`/paciente/${data as string}`);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <Panel
        title="Paciente compartilhado"
        accent={T.accent}
        sub="Passagem de plantão — alguém compartilhou um paciente com você"
      >
        <p style={{ fontSize: 14, color: T.txt, lineHeight: 1.6, margin: "0 0 16px" }}>
          Ao aceitar, este paciente entra no seu monitoramento: você passa a ver e
          registrar a evolução, as assincronias e os indicadores dele.
        </p>

        {error && (
          <div style={{ fontSize: 13, color: T.danger, background: `${T.danger}14`, border: `1px solid ${T.danger}40`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn onClick={accept} disabled={busy}>
            {busy ? "Aceitando…" : "Aceitar paciente no meu monitoramento"}
          </Btn>
          <Link to="/" style={{ textDecoration: "none" }}>
            <Btn variant="ghost">Agora não</Btn>
          </Link>
        </div>
      </Panel>
    </div>
  );
}
