import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { T } from "../lib/theme";
import { Grid } from "../components/ui";
import { VentilatorGuide } from "./PatientDetail";
import { Ventilator } from "../types";

export default function VentilatorLibrary() {
  const [ventilators, setVentilators] = useState<Ventilator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("ventilators")
      .select("*")
      .order("brand")
      .then(({ data }) => {
        setVentilators((data as Ventilator[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Biblioteca de ventiladores</h1>
        <p style={{ margin: "3px 0 0", fontSize: 12, color: T.dim }}>
          Nomenclatura e manuseio por aparelho · conteúdo a validar pela equipe
        </p>
      </div>

      {loading ? (
        <p style={{ color: T.dim }}>Carregando…</p>
      ) : ventilators.length === 0 ? (
        <p style={{ color: T.dim }}>Nenhum ventilador cadastrado.</p>
      ) : (
        <Grid min={340}>
          {ventilators.map((v) => (
            <VentilatorGuide key={v.id} vent={v} mode={null} />
          ))}
        </Grid>
      )}
    </div>
  );
}
