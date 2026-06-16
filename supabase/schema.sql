-- ============================================================
-- VENTILA FISIO — Schema Supabase (POC)
-- Desenvolvido por BigDev.Z — IT Consulting
-- ============================================================
-- Execute no SQL Editor do Supabase.
-- Requer extensão pgcrypto (gen_random_uuid) — já habilitada no Supabase.
-- ============================================================

-- ---------- PROFILES (espelha auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'fisio', -- 'fisio' | 'mentor' | 'admin'
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada usuário lê/edita o próprio profile
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: cria profile ao registrar novo usuário
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- VENTILATORS (biblioteca, conteúdo curado) ----------
-- Conteúdo compartilhado entre todos os usuários (leitura).
create table if not exists public.ventilators (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  modes text[] not null default '{}',
  -- mapa de nomenclatura: nome padrão -> rótulo do aparelho
  param_labels jsonb not null default '{}',
  -- dicas de manuseio por parâmetro / passo a passo
  handling jsonb not null default '{}',
  notes text,
  verified boolean not null default false, -- vocês validam o conteúdo
  created_at timestamptz not null default now()
);

alter table public.ventilators enable row level security;

create policy "ventilators_read_all"
  on public.ventilators for select
  using (auth.role() = 'authenticated');

-- ---------- PATIENTS ----------
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  age int,
  sex text check (sex in ('M','F')),
  diagnosis text,
  admission_date date,
  intubation_date date,
  height_cm numeric,
  weight_kg numeric,
  comorbidities text[] not null default '{}',
  ventilator_id uuid references public.ventilators (id),
  current_mode text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.patients enable row level security;

-- Isolamento por usuário: cada um só vê seus pacientes.
-- (Para compartilhar entre fisio e mentor numa fase futura, troca-se por team_id.)
create policy "patients_select_own"
  on public.patients for select using (auth.uid() = owner_id);
create policy "patients_insert_own"
  on public.patients for insert with check (auth.uid() = owner_id);
create policy "patients_update_own"
  on public.patients for update using (auth.uid() = owner_id);
create policy "patients_delete_own"
  on public.patients for delete using (auth.uid() = owner_id);

-- ---------- DAILY EVOLUTIONS (registro diário) ----------
create table if not exists public.daily_evolutions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  mode text,
  -- ventilação
  fr numeric, vc numeric, peep numeric, fio2 numeric,
  ppico numeric, pplat numeric, flow numeric,
  -- gasometria
  ph numeric, pao2 numeric, paco2 numeric, hco3 numeric, be numeric, spo2 numeric,
  -- desmame
  pimax numeric, peak_cough_flow numeric, glasgow int,
  tre_result text, -- 'pass' | 'fail' | null
  -- hemodinâmica
  hr numeric, sbp numeric, dbp numeric, lactate numeric, vasopressor boolean,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.daily_evolutions enable row level security;

create policy "evolutions_select_own"
  on public.daily_evolutions for select using (auth.uid() = owner_id);
create policy "evolutions_insert_own"
  on public.daily_evolutions for insert with check (auth.uid() = owner_id);
create policy "evolutions_update_own"
  on public.daily_evolutions for update using (auth.uid() = owner_id);
create policy "evolutions_delete_own"
  on public.daily_evolutions for delete using (auth.uid() = owner_id);

create index if not exists idx_evolutions_patient on public.daily_evolutions (patient_id, recorded_at desc);

-- ---------- ASYNCHRONIES (registro de assincronias) ----------
create table if not exists public.asynchronies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  evolution_id uuid references public.daily_evolutions (id) on delete set null,
  type text not null, -- chave do catálogo (ex: 'double_trigger')
  severity text,      -- 'mild' | 'moderate' | 'severe'
  recorded_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.asynchronies enable row level security;

create policy "asynchronies_select_own"
  on public.asynchronies for select using (auth.uid() = owner_id);
create policy "asynchronies_insert_own"
  on public.asynchronies for insert with check (auth.uid() = owner_id);
create policy "asynchronies_delete_own"
  on public.asynchronies for delete using (auth.uid() = owner_id);

-- ============================================================
-- SEED: ventiladores (estrutura inicial — CONTEÚDO A VALIDAR)
-- ATENÇÃO: marcados verified=false. Você e seu mentor devem
-- revisar nomenclatura e manuseio antes de uso clínico real.
-- ============================================================
insert into public.ventilators (brand, model, modes, param_labels, handling, notes, verified)
values
(
  'Magnamed', 'Oxymag',
  array['VCV','PCV','PSV','SIMV','CPAP'],
  '{"vc":"Volume","fr":"f","peep":"PEEP","fio2":"FiO2","ps":"Pressão de Suporte","sens":"Sensibilidade"}'::jsonb,
  '{"iniciar":["Ligar e selecionar tipo de paciente","Escolher modo no menu principal","Ajustar VC ou pressão conforme o modo","Definir PEEP e FiO2","Conferir alarmes de pressão e volume"],"ajuste_vc":"VCV: ajuste o Volume diretamente no encoder principal.","ajuste_pressao":"PCV/PSV: ajuste a pressão de controle/suporte acima da PEEP."}'::jsonb,
  'Conteúdo inicial — confirmar nomenclatura na tela do aparelho em uso.', false
),
(
  'Intermed', 'iX5',
  array['VCV','PCV','PSV','SIMV','CPAP','APRV'],
  '{"vc":"VT","fr":"FR","peep":"PEEP","fio2":"FiO2","ps":"PS","sens":"Trigger"}'::jsonb,
  '{"iniciar":["Selecionar paciente adulto","Escolher modo ventilatório","Programar parâmetros do modo","Ajustar PEEP/FiO2","Validar alarmes"],"ajuste_fr":"Ajuste a FR no painel; observe o tempo expiratório para evitar auto-PEEP.","ajuste_trigger":"Trigger a fluxo costuma reduzir esforço inefetivo."}'::jsonb,
  'Conteúdo inicial — validar.', false
),
(
  'Dräger', 'Savina 300',
  array['VCV','PCV','PSV','SIMV','CPAP'],
  '{"vc":"VT","fr":"RR","peep":"PEEP","fio2":"FiO2","ps":"ΔPsupp","sens":"Trigger"}'::jsonb,
  '{"iniciar":["Selecionar terapia","Escolher modo","Ajustar VT/pressão","Definir PEEP e FiO2","Configurar limites de alarme"],"ajuste_vc":"Em VC-CMV ajuste o VT; observe Pplatô.","ajuste_ps":"Em PSV ajuste ΔPsupp acima da PEEP para alcançar o VT alvo."}'::jsonb,
  'Conteúdo inicial — validar.', false
);
