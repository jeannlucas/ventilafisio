# Ventila Fisio

Apoio à decisão em ventilação mecânica na UTI. POC.
**Desenvolvido por BigDev.Z — IT Consulting.**

> Ferramenta de apoio. Não substitui o julgamento clínico do profissional assistente.

## O que já está implementado

- **Login com Google** (Supabase Auth) e tela de login com a marca BigDev.Z.
- **Multiusuário** — cada usuário só enxerga seus pacientes (RLS no Postgres).
- **Pacientes** isolados por usuário, com seleção de **ventilador** e **modo** na tela.
- **Dashboard** com os 4 indicadores: Driving Pressure, Pressão de Platô, VC ml/kg (peso predito) e P/F.
- **Sugestão inicial** de VC, PEEP/FiO₂ (tabela ARDSnet low-PEEP), FR e volume-minuto (~100 ml/kg PBW/min), com ajuste para obeso (alvo 6–8 ml/kg sobre peso predito).
- **Cálculos**: PBW (ARDSnet), IMC, P/F, Driving Pressure, Mechanical Power (Gattinoni, VC em litros), complacências, resistência, Tobin.
- **Evolução diária** salva por paciente, com **gráficos de tendência** (DP/Platô, P/F, complacência, Tobin).
- **Predição de prontidão para extubação** a partir da última evolução (triagem objetiva, não indicação).
- **Assincronias**: registro manual + sugestão de ajuste por protocolo.
- **Biblioteca de ventiladores**: nomenclatura por aparelho e passo a passo de manuseio (conteúdo inicial **a validar** por você e seu mentor).
- **Responsivo** — desktop, celular e tablet.

## Pré-requisitos

- Node 18+ e **pnpm** (`corepack enable`).
- Uma conta no [Supabase](https://supabase.com) (plano free serve para a POC).

## 1. Banco de dados (Supabase)

1. Crie um projeto no Supabase.
2. Vá em **SQL Editor** e cole/execute todo o conteúdo de `supabase/schema.sql`.
   Isso cria as tabelas, as políticas de RLS, o gatilho que cria o `profile`
   no primeiro login e os 3 ventiladores de exemplo.

## 2. Login com Google

1. No Supabase: **Authentication → Providers → Google** → ative.
2. No [Google Cloud Console](https://console.cloud.google.com): crie um
   **OAuth Client ID** (tipo Web). Em *Authorized redirect URIs* coloque a URL
   que o Supabase mostra na tela do provider (algo como
   `https://SEU-PROJETO.supabase.co/auth/v1/callback`).
3. Cole **Client ID** e **Client Secret** no Supabase e salve.
4. Em **Authentication → URL Configuration**, adicione seu domínio local
   (`http://localhost:5173`) e o de produção em *Redirect URLs*.

> Os 2 usuários (você e seu mentor) entram só com a conta Google — não há
> cadastro manual. O `profile` é criado automaticamente no primeiro acesso.

## 3. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha com **Project URL** e **anon public key** (em *Project Settings → API*):

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

## 4. Rodar

```bash
pnpm install
pnpm dev      # http://localhost:5173
```

Build de produção:

```bash
pnpm build
pnpm preview
```

Deploy: qualquer host de site estático (Vercel, Netlify). Lembre de cadastrar a
URL de produção nas *Redirect URLs* do Supabase e nas *Authorized redirect URIs*
do Google.

## Estrutura

```
supabase/schema.sql        SQL completo (tabelas, RLS, seed)
src/lib/clinical.ts        Cálculos, classificações, sugestão e predição
src/lib/auth.tsx           Contexto de auth (Google)
src/lib/supabase.ts        Cliente Supabase
src/data/asynchronies.ts   Catálogo de assincronias + ajustes
src/pages/Login.tsx        Tela de login
src/pages/PatientList.tsx  Lista e cadastro de pacientes
src/pages/PatientDetail.tsx Dashboard, evolução, gráficos, extubação, assincronias, ventilador
src/components/ui.tsx       Componentes de UI
```

## Notas para a próxima fase (escala)

- **Compartilhar pacientes entre a equipe**: hoje o isolamento é por `owner_id`.
  Para fisio + mentor verem os mesmos pacientes, introduzir `team_id` e ajustar
  as políticas de RLS.
- **Ventiladores**: a tabela tem `verified=false`. Revisem nomenclatura e
  manuseio dos modelos que vocês usam antes de uso clínico; é só atualizar as
  linhas (`param_labels`, `handling`).
- **Tabela ARDSnet** é para SDRA; para pulmão normal ou DPOC/asma os alvos de
  PEEP e FR mudam. Quando definirem perfis de paciente, dá para ter motores de
  sugestão por perfil.
- **Assincronias**: detecção automática real depende das curvas do ventilador
  (fluxo/pressão-tempo); fica para uma integração futura com os dados do aparelho.
- **Validação clínica**: antes de uso assistencial, recomenda-se revisão por
  especialista e os devidos avisos de responsabilidade.
```
