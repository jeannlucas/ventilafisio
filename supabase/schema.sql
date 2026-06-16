-- ============================================================
-- VENTILA FISIO :: Schema Supabase (POC)
-- Desenvolvido por BigDev.Z :: IT Consulting
-- ============================================================
-- Fonte fiel do banco. Reflete as migrations aplicadas:
--   ventila_fisio_initial_schema, add_ventilator_mindray_sv300,
--   hospitals_and_sharing, harden_hospital_functions, patient_archiving.
-- Idempotente: pode ser reaplicado sobre um banco existente.
-- Requer a extensão pgcrypto (gen_random_uuid), já habilitada no Supabase.
-- Visibilidade de pacientes/evolucoes/assincronias por MEMBERSHIP de hospital.
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

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
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

drop policy if exists "ventilators_read_all" on public.ventilators;
create policy "ventilators_read_all"
  on public.ventilators for select
  using (auth.role() = 'authenticated');

-- ---------- HOSPITAIS (compartilhamento por hospital) ----------
create table if not exists public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.hospital_members (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (hospital_id, user_id)
);

alter table public.hospitals enable row level security;
alter table public.hospital_members enable row level security;

-- Funções de apoio (security definer) para evitar recursão de RLS
-- ao cruzar hospital_members dentro das próprias policies.
create or replace function public.is_hospital_member(h uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.hospital_members m
    where m.hospital_id = h and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_hospital_creator(h uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.hospitals x
    where x.id = h and x.created_by = auth.uid()
  );
$$;

drop policy if exists "hospitals_select_member" on public.hospitals;
create policy "hospitals_select_member"
  on public.hospitals for select using (public.is_hospital_member(id));

drop policy if exists "hospitals_insert_auth" on public.hospitals;
create policy "hospitals_insert_auth"
  on public.hospitals for insert with check (created_by = auth.uid());

drop policy if exists "members_select_member" on public.hospital_members;
create policy "members_select_member"
  on public.hospital_members for select using (public.is_hospital_member(hospital_id));

drop policy if exists "members_insert_creator" on public.hospital_members;
create policy "members_insert_creator"
  on public.hospital_members for insert with check (public.is_hospital_creator(hospital_id));

-- ---------- PATIENTS ----------
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  hospital_id uuid references public.hospitals (id),
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
  -- Arquivamento (alta): status + motivo + data.
  status text not null default 'active' check (status in ('active','archived')),
  discharge_reason text check (discharge_reason is null or discharge_reason in ('death','extubation')),
  discharge_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Garante colunas/constraints novas em bancos que já tinham patients.
alter table public.patients add column if not exists hospital_id uuid references public.hospitals (id);
alter table public.patients add column if not exists status text not null default 'active';
alter table public.patients add column if not exists discharge_reason text;
alter table public.patients add column if not exists discharge_date timestamptz;
alter table public.patients drop constraint if exists patients_status_check;
alter table public.patients add constraint patients_status_check
  check (status in ('active','archived'));
alter table public.patients drop constraint if exists patients_discharge_reason_check;
alter table public.patients add constraint patients_discharge_reason_check
  check (discharge_reason is null or discharge_reason in ('death','extubation'));

create index if not exists idx_patients_hospital on public.patients (hospital_id);
create index if not exists idx_patients_status on public.patients (hospital_id, status);

alter table public.patients enable row level security;

-- Acesso a um paciente (e seus filhos) por membership do hospital dele.
create or replace function public.can_access_patient(p uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_hospital_member((select hospital_id from public.patients where id = p));
$$;

-- Adiciona membro por email (contorna o RLS restritivo de profiles).
create or replace function public.add_hospital_member_by_email(h uuid, member_email text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_hospital_creator(h) then
    raise exception 'Apenas o criador do hospital pode adicionar membros';
  end if;
  select id into uid from auth.users where lower(email) = lower(member_email) limit 1;
  if uid is null then
    raise exception 'Usuário não encontrado para o email informado';
  end if;
  insert into public.hospital_members (hospital_id, user_id, role)
  values (h, uid, 'member')
  on conflict (hospital_id, user_id) do nothing;
end;
$$;

-- Restringe a execução das funções security definer ao papel authenticated
-- (as policies de RLS rodam no contexto do usuário autenticado).
revoke execute on function public.is_hospital_member(uuid) from anon, public;
revoke execute on function public.is_hospital_creator(uuid) from anon, public;
revoke execute on function public.can_access_patient(uuid) from anon, public;
revoke execute on function public.add_hospital_member_by_email(uuid, text) from anon, public;
grant execute on function public.is_hospital_member(uuid) to authenticated;
grant execute on function public.is_hospital_creator(uuid) to authenticated;
grant execute on function public.can_access_patient(uuid) to authenticated;
grant execute on function public.add_hospital_member_by_email(uuid, text) to authenticated;

-- RLS de patients por membership. owner_id permanece como registro de quem criou.
drop policy if exists "patients_select_own" on public.patients;
drop policy if exists "patients_insert_own" on public.patients;
drop policy if exists "patients_update_own" on public.patients;
drop policy if exists "patients_delete_own" on public.patients;

drop policy if exists "patients_select_member" on public.patients;
create policy "patients_select_member"
  on public.patients for select using (public.is_hospital_member(hospital_id));
drop policy if exists "patients_insert_member" on public.patients;
create policy "patients_insert_member"
  on public.patients for insert with check (public.is_hospital_member(hospital_id) and auth.uid() = owner_id);
drop policy if exists "patients_update_member" on public.patients;
create policy "patients_update_member"
  on public.patients for update using (public.is_hospital_member(hospital_id));
drop policy if exists "patients_delete_member" on public.patients;
create policy "patients_delete_member"
  on public.patients for delete using (public.is_hospital_member(hospital_id));

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

drop policy if exists "evolutions_select_own" on public.daily_evolutions;
drop policy if exists "evolutions_insert_own" on public.daily_evolutions;
drop policy if exists "evolutions_update_own" on public.daily_evolutions;
drop policy if exists "evolutions_delete_own" on public.daily_evolutions;

drop policy if exists "evolutions_select_member" on public.daily_evolutions;
create policy "evolutions_select_member"
  on public.daily_evolutions for select using (public.can_access_patient(patient_id));
drop policy if exists "evolutions_insert_member" on public.daily_evolutions;
create policy "evolutions_insert_member"
  on public.daily_evolutions for insert with check (public.can_access_patient(patient_id) and auth.uid() = owner_id);
drop policy if exists "evolutions_update_member" on public.daily_evolutions;
create policy "evolutions_update_member"
  on public.daily_evolutions for update using (public.can_access_patient(patient_id));
drop policy if exists "evolutions_delete_member" on public.daily_evolutions;
create policy "evolutions_delete_member"
  on public.daily_evolutions for delete using (public.can_access_patient(patient_id));

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

drop policy if exists "asynchronies_select_own" on public.asynchronies;
drop policy if exists "asynchronies_insert_own" on public.asynchronies;
drop policy if exists "asynchronies_delete_own" on public.asynchronies;

drop policy if exists "asynchronies_select_member" on public.asynchronies;
create policy "asynchronies_select_member"
  on public.asynchronies for select using (public.can_access_patient(patient_id));
drop policy if exists "asynchronies_insert_member" on public.asynchronies;
create policy "asynchronies_insert_member"
  on public.asynchronies for insert with check (public.can_access_patient(patient_id) and auth.uid() = owner_id);
drop policy if exists "asynchronies_delete_member" on public.asynchronies;
create policy "asynchronies_delete_member"
  on public.asynchronies for delete using (public.can_access_patient(patient_id));

-- ============================================================
-- SEED: ventiladores (estrutura inicial :: CONTEÚDO A VALIDAR)
-- ATENÇÃO: marcados verified=false. Você e seu mentor devem
-- revisar nomenclatura e manuseio antes de uso clínico real.
-- Inserts idempotentes (não duplicam por brand+model).
-- ============================================================
insert into public.ventilators (brand, model, modes, param_labels, handling, notes, verified)
select * from (values
(
  'Magnamed', 'Oxymag',
  array['VCV','PCV','PSV','SIMV','CPAP'],
  '{"vc":"Volume","fr":"f","peep":"PEEP","fio2":"FiO2","ps":"Pressão de Suporte","sens":"Sensibilidade"}'::jsonb,
  '{"iniciar":["Ligar e selecionar tipo de paciente","Escolher modo no menu principal","Ajustar VC ou pressão conforme o modo","Definir PEEP e FiO2","Conferir alarmes de pressão e volume"],"ajuste_vc":"VCV: ajuste o Volume diretamente no encoder principal.","ajuste_pressao":"PCV/PSV: ajuste a pressão de controle/suporte acima da PEEP."}'::jsonb,
  'Conteúdo inicial - confirmar nomenclatura na tela do aparelho em uso.', false
),
(
  'Intermed', 'iX5',
  array['VCV','PCV','PSV','SIMV','CPAP','APRV'],
  '{"vc":"VT","fr":"FR","peep":"PEEP","fio2":"FiO2","ps":"PS","sens":"Trigger"}'::jsonb,
  '{"iniciar":["Selecionar paciente adulto","Escolher modo ventilatório","Programar parâmetros do modo","Ajustar PEEP/FiO2","Validar alarmes"],"ajuste_fr":"Ajuste a FR no painel; observe o tempo expiratório para evitar auto-PEEP.","ajuste_trigger":"Trigger a fluxo costuma reduzir esforço inefetivo."}'::jsonb,
  'Conteúdo inicial - validar.', false
),
(
  'Dräger', 'Savina 300',
  array['VCV','PCV','PSV','SIMV','CPAP'],
  '{"vc":"VT","fr":"RR","peep":"PEEP","fio2":"FiO2","ps":"ΔPsupp","sens":"Trigger"}'::jsonb,
  '{"iniciar":["Selecionar terapia","Escolher modo","Ajustar VT/pressão","Definir PEEP e FiO2","Configurar limites de alarme"],"ajuste_vc":"Em VC-CMV ajuste o VT; observe Pplatô.","ajuste_ps":"Em PSV ajuste ΔPsupp acima da PEEP para alcançar o VT alvo."}'::jsonb,
  'Conteúdo inicial - validar.', false
),
(
  'Mindray', 'SV300',
  array['VCV','PCV','PSV','SIMV','CPAP'],
  '{"vc":"VT","fr":"f","peep":"PEEP","fio2":"O2%","ps":"PS","sens":"Trigger"}'::jsonb,
  '{"iniciar":["Selecionar categoria de paciente (adulto)","Escolher o modo ventilatório no menu","Programar VT ou pressão conforme o modo","Ajustar PEEP e O2%","Definir limites de alarme de pressão e volume"],"ajuste_vt":"Em VCV ajuste o VT pelo botão principal; observe a Pplatô.","ajuste_ps":"Em PSV/SIMV ajuste o PS acima da PEEP até alcançar o VT alvo.","ajuste_trigger":"Trigger a fluxo costuma reduzir esforço inefetivo."}'::jsonb,
  'Conteúdo inicial - confirmar nomenclatura na tela do aparelho em uso.', false
)
) as seed(brand, model, modes, param_labels, handling, notes, verified)
where not exists (
  select 1 from public.ventilators v where v.brand = seed.brand and v.model = seed.model
);
