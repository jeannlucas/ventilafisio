import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { Hospital } from "../types";

const LS_KEY = "ventila.activeHospitalId";

interface HospitalCtx {
  hospitals: Hospital[];
  activeHospitalId: string | null;
  activeHospital: Hospital | null;
  loading: boolean;
  setActiveHospital: (id: string) => void;
  createHospital: (name: string) => Promise<Hospital | null>;
  addMember: (email: string) => Promise<{ error: string | null }>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<HospitalCtx | undefined>(undefined);

export function HospitalProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [activeHospitalId, setActiveId] = useState<string | null>(
    () => localStorage.getItem(LS_KEY)
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setHospitals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("hospitals")
      .select("*")
      .order("created_at", { ascending: true });
    const list = (data as Hospital[]) ?? [];
    setHospitals(list);
    setLoading(false);
    // Garante um hospital ativo válido.
    setActiveId((cur) => {
      if (cur && list.some((h) => h.id === cur)) return cur;
      return list[0]?.id ?? null;
    });
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (activeHospitalId) localStorage.setItem(LS_KEY, activeHospitalId);
    else localStorage.removeItem(LS_KEY);
  }, [activeHospitalId]);

  const setActiveHospital = (id: string) => setActiveId(id);

  const createHospital = async (name: string): Promise<Hospital | null> => {
    if (!session?.user || !name.trim()) return null;
    const { data, error } = await supabase
      .from("hospitals")
      .insert({ name: name.trim(), created_by: session.user.id })
      .select()
      .single();
    if (error || !data) {
      alert("Erro ao criar hospital: " + (error?.message ?? "desconhecido"));
      return null;
    }
    const hospital = data as Hospital;
    // O criador entra como membro (a policy de insert permite o criador).
    await supabase
      .from("hospital_members")
      .insert({ hospital_id: hospital.id, user_id: session.user.id, role: "member" });
    await refresh();
    setActiveId(hospital.id);
    return hospital;
  };

  const addMember = async (email: string): Promise<{ error: string | null }> => {
    if (!activeHospitalId) return { error: "Selecione um hospital primeiro" };
    const { error } = await supabase.rpc("add_hospital_member_by_email", {
      h: activeHospitalId,
      member_email: email.trim(),
    });
    return { error: error?.message ?? null };
  };

  const activeHospital = hospitals.find((h) => h.id === activeHospitalId) ?? null;

  return (
    <Ctx.Provider
      value={{
        hospitals,
        activeHospitalId,
        activeHospital,
        loading,
        setActiveHospital,
        createHospital,
        addMember,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useHospital() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useHospital deve ser usado dentro de HospitalProvider");
  return c;
}
