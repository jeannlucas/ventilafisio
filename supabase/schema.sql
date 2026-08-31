-- ============================================================
-- VENTILA FISIO :: Schema Supabase (POC)
-- Desenvolvido por BigDev.Z :: IT Consulting
-- ============================================================
-- Fonte fiel do banco. Reflete as migrations aplicadas:
--   ventila_fisio_initial_schema, add_ventilator_mindray_sv300,
--   hospitals_and_sharing, harden_hospital_functions, patient_archiving,
--   evolution_authors_fn, patient_sharing.
-- Idempotente: pode ser reaplicado sobre um banco existente.
-- Requer a extensão pgcrypto (gen_random_uuid), já habilitada no Supabase.
-- Acesso a paciente (e filhos) por MEMBERSHIP de hospital OU acesso direto
-- concedido via link de compartilhamento (patient_access).
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
create table if not exists public.ventilators (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  modes text[] not null default '{}',
  param_labels jsonb not null default '{}',
  handling jsonb not null default '{}',
  notes text,
  verified boolean not null default false, -- vocês validam o conteúdo
  created_at timestamptz not null default now()
);

alter table public.ventilators enable row level security;

drop policy if exists "ventilators_read_all" on public.ventilators;
-- `to authenticated` no lugar de auth.role(): o helper é legado no Supabase e
-- em projeto novo pode não resolver, o que deixaria a biblioteca vazia para
-- todo mundo. A cláusula TO é a forma nativa do Postgres.
create policy "ventilators_read_all"
  on public.ventilators for select
  to authenticated
  using (true);

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

-- Funções de apoio (security definer) para evitar recursão de RLS.
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

-- Fase 1 (31/08/2026): via aérea artificial. As colunas comorbidities e
-- intubation_date já existiam e estavam sem uso; passam a ser escritas.
alter table public.patients add column if not exists airway text;
alter table public.patients drop constraint if exists patients_airway_check;
alter table public.patients add constraint patients_airway_check
  check (airway is null or airway in ('tot','tqt'));

create index if not exists idx_patients_hospital on public.patients (hospital_id);
create index if not exists idx_patients_status on public.patients (hospital_id, status);

alter table public.patients enable row level security;

-- ---------- COMPARTILHAMENTO DE PACIENTE POR LINK ----------
-- patient_shares: tokens gerados; patient_access: vínculo direto usuário<->paciente.
create table if not exists public.patient_shares (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Link de plantão passa a expirar. Antes não havia prazo nem forma de revogar,
-- e mesmo assim accept_patient_share dizia "Link inválido ou expirado":
-- prometia uma expiração que não existia. Prazo definido pelo Jeann.
-- ATENÇÃO ao reaplicar: linhas antigas recebem now() + 7 dias, ou seja, links
-- já emitidos ganham 7 dias novos a partir da aplicação.
alter table public.patient_shares
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days');

create table if not exists public.patient_access (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (patient_id, user_id)
);

alter table public.patient_shares enable row level security;
alter table public.patient_access enable row level security;

-- Acesso direto concedido via link aceito.
create or replace function public.has_patient_access(p uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.patient_access a
    where a.patient_id = p and a.user_id = auth.uid()
  );
$$;

-- Acesso a um paciente: membro do hospital dele OU acesso direto por link.
create or replace function public.can_access_patient(p uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_hospital_member((select hospital_id from public.patients where id = p))
      or public.has_patient_access(p);
$$;

-- RLS de patients. SELECT/UPDATE por membership OU acesso direto.
-- INSERT/DELETE permanecem só por membership (acesso por link não cria/apaga paciente).
drop policy if exists "patients_select_own" on public.patients;
drop policy if exists "patients_insert_own" on public.patients;
drop policy if exists "patients_update_own" on public.patients;
drop policy if exists "patients_delete_own" on public.patients;

drop policy if exists "patients_select_member" on public.patients;
create policy "patients_select_member"
  on public.patients for select
  using (public.is_hospital_member(hospital_id) or public.has_patient_access(id));
drop policy if exists "patients_insert_member" on public.patients;
create policy "patients_insert_member"
  on public.patients for insert with check (public.is_hospital_member(hospital_id) and auth.uid() = owner_id);
drop policy if exists "patients_update_member" on public.patients;
-- WITH CHECK explícito. Sem ele o Postgres reaproveita o USING para validar a
-- linha NOVA, e has_patient_access(id) continua verdadeiro qualquer que seja o
-- hospital_id gravado: quem recebeu um link de plantão conseguia mover o
-- paciente para um hospital do qual ele é membro, dando acesso a todo aquele
-- hospital.
create policy "patients_update_member"
  on public.patients for update
  using (public.is_hospital_member(hospital_id) or public.has_patient_access(id))
  with check (public.is_hospital_member(hospital_id) or public.has_patient_access(id));

-- Segunda barreira, no nível de coluna: o app nunca troca hospital nem dono de
-- um paciente, então a API não precisa poder escrever nessas colunas. Isto
-- fecha o caso que a policy sozinha não expressa (coluna que não pode mudar).
revoke update on public.patients from authenticated;
grant update (
  ventilator_id, current_mode, height_cm, weight_kg,
  name, age, sex, diagnosis, admission_date, intubation_date, comorbidities,
  status, discharge_reason, discharge_date, updated_at
) on public.patients to authenticated;
drop policy if exists "patients_delete_member" on public.patients;
create policy "patients_delete_member"
  on public.patients for delete using (public.is_hospital_member(hospital_id));

-- RLS de patient_shares: ver/criar exige poder acessar o paciente.
drop policy if exists "shares_select" on public.patient_shares;
create policy "shares_select"
  on public.patient_shares for select using (public.can_access_patient(patient_id));
drop policy if exists "shares_insert" on public.patient_shares;
create policy "shares_insert"
  on public.patient_shares for insert with check (public.can_access_patient(patient_id) and created_by = auth.uid());

-- Revogar um link ainda não usado. Antes não havia policy de DELETE, então
-- link emitido era permanente e nem o autor conseguia cancelar.
drop policy if exists "shares_delete" on public.patient_shares;
create policy "shares_delete"
  on public.patient_shares for delete using (public.can_access_patient(patient_id));

-- RLS de patient_access: sem policy de INSERT => deny.
-- A inserção só ocorre via accept_patient_share (security definer).
drop policy if exists "access_select" on public.patient_access;
create policy "access_select"
  on public.patient_access for select
  using (user_id = auth.uid() or public.can_access_patient(patient_id));

-- Revogar acesso já concedido: o próprio usuário sai da lista, ou um membro do
-- hospital do paciente retira alguém. Um convidado por link não revoga outro.
drop policy if exists "access_delete" on public.patient_access;
create policy "access_delete"
  on public.patient_access for delete
  using (
    user_id = auth.uid()
    or public.is_hospital_member((select hospital_id from public.patients where id = patient_id))
  );

-- Aceite de compartilhamento: usuário logado troca um token válido por acesso.
create or replace function public.accept_patient_share(share_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if auth.uid() is null then raise exception 'Necessário estar logado'; end if;
  -- A checagem de expiração faltava: a mensagem já falava em link expirado,
  -- mas nenhum link expirava de fato.
  select patient_id into pid
    from public.patient_shares
    where token = share_token and expires_at > now()
    limit 1;
  if pid is null then raise exception 'Link inválido ou expirado'; end if;
  insert into public.patient_access (patient_id, user_id)
  values (pid, auth.uid())
  on conflict (patient_id, user_id) do nothing;
  return pid;
end;
$$;

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

-- Quadro clínico expandido (Tema A): imagem, medicamentos venosos, sonda/dieta.
-- jsonb por flexibilidade; são campos de exibição e correlação, não de gráfico.
alter table public.daily_evolutions add column if not exists imaging jsonb not null default '{}';
alter table public.daily_evolutions add column if not exists iv_meds jsonb not null default '{}';
alter table public.daily_evolutions add column if not exists feeding jsonb not null default '{}';

-- Fase 1 (31/08/2026): escores de força e mobilidade.
-- rass e ims são escalares (entram nos gráficos); mrc é jsonb com os 6 grupos
-- em dois lados. O TOTAL do MRC não é coluna: é derivado, e dado derivado
-- guardado duas vezes diverge. Ver src/lib/scores.ts.
alter table public.daily_evolutions add column if not exists rass int;
alter table public.daily_evolutions add column if not exists ims int;
alter table public.daily_evolutions add column if not exists mrc jsonb not null default '{}';

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

-- Autores das evoluções de um paciente acessível (nomes de profiles, escopado).
create or replace function public.evolution_authors(p uuid)
returns table(owner_id uuid, full_name text)
language sql security definer stable set search_path = public as $$
  select distinct d.owner_id, pr.full_name
  from public.daily_evolutions d
  join public.profiles pr on pr.id = d.owner_id
  where d.patient_id = p and public.can_access_patient(p);
$$;

-- ---------- CARE ACTIONS (bundle de cuidados) ----------
-- Uma linha por execução, com hora e autor: aspiração acontece várias vezes
-- por plantão, e um checklist diário não registraria isso.
-- `action` guarda a CHAVE do catálogo (src/data/care-bundle.ts), nunca texto
-- livre: rótulo solto impede contagem por ação e quebra a tradução da tela.
-- Sem `check` no banco de propósito: engessaria uma migração a cada item novo
-- do bundle. A validação é da aplicação.
create table if not exists public.care_actions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

alter table public.care_actions enable row level security;

drop policy if exists "care_actions_select_member" on public.care_actions;
create policy "care_actions_select_member"
  on public.care_actions for select using (public.can_access_patient(patient_id));
drop policy if exists "care_actions_insert_member" on public.care_actions;
create policy "care_actions_insert_member"
  on public.care_actions for insert with check (public.can_access_patient(patient_id) and auth.uid() = owner_id);
drop policy if exists "care_actions_update_member" on public.care_actions;
create policy "care_actions_update_member"
  on public.care_actions for update using (public.can_access_patient(patient_id));
drop policy if exists "care_actions_delete_member" on public.care_actions;
create policy "care_actions_delete_member"
  on public.care_actions for delete using (public.can_access_patient(patient_id));

create index if not exists idx_care_actions_patient on public.care_actions (patient_id, at desc);

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

-- ---------- GRANTS das funções security definer ----------
-- Execução restrita a authenticated (as policies rodam no contexto do usuário).
revoke execute on function public.is_hospital_member(uuid) from anon, public;
revoke execute on function public.is_hospital_creator(uuid) from anon, public;
revoke execute on function public.can_access_patient(uuid) from anon, public;
revoke execute on function public.has_patient_access(uuid) from anon, public;
revoke execute on function public.accept_patient_share(text) from anon, public;
revoke execute on function public.evolution_authors(uuid) from anon, public;
grant execute on function public.is_hospital_member(uuid) to authenticated;
grant execute on function public.is_hospital_creator(uuid) to authenticated;
grant execute on function public.can_access_patient(uuid) to authenticated;
grant execute on function public.has_patient_access(uuid) to authenticated;
grant execute on function public.accept_patient_share(text) to authenticated;
grant execute on function public.evolution_authors(uuid) to authenticated;

-- ============================================================
-- COLUNAS SEM USO NO APP (auditoria de 26/07/2026)
-- ============================================================
-- Nenhuma delas é lida nem escrita por linha alguma de src/. Foram retiradas
-- dos tipos TypeScript, mas NÃO são derrubadas aqui: drop column apaga dado e
-- é decisão do Jeann, não minha.
--
--   patients.active            substituída por patients.status
--   patients.admission_date    nunca preenchida
--   daily_evolutions.hco3      não existe campo no formulário
--   daily_evolutions.be        não existe campo no formulário
--   asynchronies.evolution_id  nunca preenchida
--   asynchronies.notes         nunca preenchida
--   profiles.role              nenhuma regra de autorização a usa
--
-- Caso decida remover, confira antes que não há dado real gravado:
--   select count(*) from public.daily_evolutions where hco3 is not null or be is not null;
--
-- Saíram desta lista em 31/08/2026 (Fase 1), agora escritas pelo app:
--   patients.intubation_date, patients.comorbidities
--
-- ventilators.notes é caso diferente: TEM conteúdo curado (o seed abaixo
-- preenche), mas nenhuma tela mostra. Ou passa a ser exibida, ou sai. Decisão
-- de produto, ficou registrada no relatório.

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
