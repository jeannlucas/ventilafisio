# Fase 5 — TRE passo a passo

Data: 01/09/2026
Projeto: Ventila Fisio (POC)
Arquitetura que governa esta fase:
`2026-09-01-arquitetura-blocos-clinicos-design.md`

## 1. O que esta fase entrega

O teste de respiração espontânea, hoje um campo único `'pass' | 'fail'`, passa
a ser um procedimento acompanhado: começa, roda, é avaliado critério a critério
e termina com um desfecho registrado.

Foi o bloco que o cliente descreveu com mais detalhe:

> "é necessário também que haja de fato um passo a passo de um TRE, para ver se
> o paciente está apto ou não, nesse TRE deve-se conter os teste e se o paciente
> passou ou não em cada tópico citado, como se por exemplo a passagem dele de
> Ventilação assistida e controlada para Ventilação expontânea mesmo no
> ventilador"

É também o primeiro bloco clínico cujo conteúdo o mentor validou por completo,
o que o torna o de menor risco entre os quatro restantes.

## 2. O insumo clínico já validado

Respostas do mentor em 01/09/2026, e as fontes fechadas na mesma rodada.

### Critérios de falha durante o teste

Persistindo por **cinco minutos ou mais**:

| Critério | Valor |
|---|---|
| Saturação | SpO₂ ≤ 90%, ou PaO₂ ≤ 50 mmHg com FiO₂ ≥ 50% |
| Ventilação | PaCO₂ > 50 mmHg |
| Acidose | **pH < 7,35** |
| Frequência respiratória | > 35/min |
| Frequência cardíaca | > 140/min |
| Pressão arterial | PAS > 180 ou < 90 mmHg |
| Esforço | musculatura acessória, respiração paradoxal, agitação, sudorese |

O pH é **7,35**, por escolha explícita do mentor, seguindo as Orientações
Práticas AMIB/SBPT 2024. O consenso de Boles 2007 usa 7,32. A divergência é
real e a decisão foi dele.

### Pré-requisito

O paciente precisa estar **desperto** para iniciar. É por isso que o RASS entrou
na triagem na Fase 4: a resposta verbal do Glasgow não é avaliável em paciente
intubado.

## 3. Decisões tomadas

| Decisão | Escolha | Quem decidiu |
|---|---|---|
| Acompanhamento | ao vivo, com sessão retomável | Jeann, 01/09/2026 |
| Aptidão para iniciar | reaproveita a triagem, menos o próprio critério de TRE | Jeann, 01/09/2026 |
| Estrutura de dados | tabela `tre_sessions` | spec de arquitetura §6 |
| pH de falha | 7,35 | mentor, 01/09/2026 |

## 4. Cinco estados, e um deles não é desfecho

O ponto central do modelo, e vem da armadilha nº 5 do projeto.

| Estado | Significado |
|---|---|
| **sem sessão** | nunca foi tentado — ausência, não desfecho |
| **em andamento** | começou, ainda rodando |
| **aprovado** | o terapeuta encerrou como aprovado, sem critério atingido |
| **falhou** | atingiu critério de falha e foi interrompido |
| **interrompido** | parou por outro motivo: exame, transporte, visita |

**O aplicativo não impõe duração mínima.** A literatura fala em 30 a 120
minutos, mas o mentor não definiu um corte, e exigir um significaria o app
afirmar um limiar que ninguém assinou — recusando um TRE de 25 minutos que o
terapeuta considerou suficiente, ou marcando como incompleto o que ele deu por
encerrado. Quem encerra é ele; o app registra quanto durou e mostra o tempo na
tela, para que a duração fique visível a quem depois ler o registro.

**"Interrompido" não é "falhou".** O paciente não reprovou — o teste não
aconteceu. Na triagem de extubação, `interrompido` cai em **não medido**, nunca
em reprovado.

Hoje o campo tem dois valores e essa distinção não existe: um teste abortado
porque o paciente foi para a tomografia contaria como paciente que falhou no
TRE, e um TRE falhado é **bloqueador absoluto** da triagem
(`clinical.ts:226`). É o mesmo formato do defeito que a auditoria original do
projeto encontrou, onde um vasopressor nunca avaliado contava como critério
atendido.

## 5. A tabela

`public.tre_sessions` — mesma natureza do `care_actions` da Fase 1: evento com
hora e autor, não atributo do dia.

```
id           uuid primary key
patient_id   uuid not null  -> patients (cascade)
owner_id     uuid not null  -> auth.users (cascade)
iniciado_em  timestamptz not null default now()
encerrado_em timestamptz            -- null enquanto em andamento
modo_antes   text                   -- ventilação antes do teste
modo_durante text                   -- modo espontâneo do teste
desfecho     text                   -- 'aprovado' | 'falhou' | 'interrompido'
                                    -- null = em andamento
motivo_interrupcao text             -- só quando desfecho = 'interrompido'
criterios    jsonb not null default '{}'   -- ver forma abaixo
created_at   timestamptz not null default now()
```

### A forma de `criterios`

Uma chave por critério do catálogo, com três estados possíveis — e a ausência
da chave é o terceiro:

```json
{
  "saturacao":  { "atingido": false },
  "frequencia": { "atingido": true, "observacao": "FR 38 sustentada" }
}
```

Chave presente com `atingido: false` significa **avaliado e não atingido**.
Chave **ausente** significa **não avaliado**. São coisas diferentes, e a
distinção é a mesma que o resto do projeto faz entre medida e ausência de
medida. `observacao` é opcional e livre.

RLS espelhando `care_actions` e `daily_evolutions`: acesso por
`public.can_access_patient(patient_id)`, e o insert exigindo também
`auth.uid() = owner_id`.

`modo_antes` e `modo_durante` atendem literalmente o pedido do cliente: a
passagem de ventilação assistida ou controlada para espontânea no ventilador
fica registrada, e não apenas implícita.

**De onde vêm os dois valores:** `modo_antes` é pré-preenchido com o
`patients.current_mode` que já existe, e permanece editável — o modo pode ter
mudado sem que o cadastro do paciente fosse atualizado. `modo_durante` vem de
um catálogo curto em `src/data/tre.ts` com as modalidades de teste (PSV, CPAP,
tubo T). Como todo catálogo clínico deste projeto, ele nasce marcado a validar
e a lista definitiva é pergunta para o mentor — mas nenhum limiar depende dela,
então não bloqueia a fase.

**Este SQL não é executado por teste nenhum** (armadilha 6). Sai revisado, não
verificado, e quem aplica é o Jeann.

## 6. Uma simplificação honesta, que precisa aparecer na tela

Os critérios valem "persistindo por cinco minutos ou mais". **O aplicativo não
cronometra cada critério individualmente.** O terapeuta marca o critério quando
observou a persistência — ele está ao lado do paciente e é ele quem julga.

O app cronometra a **sessão**, não cada sinal.

Isso precisa estar visível na tela, não apenas neste documento. Sem isso alguém
assume que o app está medindo os cinco minutos, e passa a confiar numa medição
que não existe.

## 7. Módulos

| Arquivo | Responsabilidade |
|---|---|
| `src/data/tre.ts` | catálogo dos sete critérios de falha, com rótulo e valor |
| `src/lib/tre.ts` | avaliação dos critérios, aptidão para iniciar, desfecho |
| `src/components/patient/TrePanel.tsx` | a tela do teste |

`src/lib/tre.ts` é puro: sem React, sem Supabase, como manda a arquitetura.

### Aptidão para iniciar

Derivada dos **oito critérios que a triagem já avalia**, excluindo o próprio
"TRE aprovado" — que só existe depois do teste. Isso resolve a circularidade
sem afirmar nada clinicamente novo: são os mesmos valores que o mentor já
validou, reagrupados para responder outra pergunta.

O app **não bloqueia** o início. Mostra o que está pendente e deixa o terapeuta
decidir, conforme o enquadramento do mentor: a sugestão não determina a
conduta.

## 8. A sessão esquecida

O terapeuta inicia e não volta. No dia seguinte a sessão continua "em
andamento".

**O aplicativo nunca encerra sozinho.** Inventar o desfecho de um teste clínico
é pior do que deixar a sessão aberta: um `aprovado` automático entraria na
triagem de extubação como critério atendido.

Em vez disso, ele mostra o tempo decorrido de forma que o absurdo salte — "em
andamento há 14 h" — e permite encerrar informando o que de fato aconteceu.

## 9. A coluna legada

`extubationReadiness` passa a ler a sessão mais recente:

- `aprovado` → critério atendido
- `falhou` → bloqueador, como hoje
- `interrompido` → **não medido**
- `em andamento` → **não medido**
- sem sessão → cai no `daily_evolutions.tre_result` antigo

O fallback existe para não apagar histórico: pacientes registrados antes desta
fase mantêm o que foi anotado. O campo **deixa de ser escrito** e continua sendo
lido. `tre_result` não é derrubada — derrubar coluna apaga dado e é decisão do
Jeann.

### Cinco fixtures a corrigir

`src/pages/PatientDetail.test.tsx` usa `tre_result: "success"` em cinco lugares.
O domínio é `'pass' | 'fail' | null`, e `extubationReadiness` compara com
`"pass"` — então `"success"` é lido hoje como critério **reprovado**. Nenhum
desses testes depende disso, o que é justamente por que ninguém notou. Corrigir
nesta fase, que é a que mexe no campo.

## 10. Ausência de dado

- Um critério **não avaliado** é diferente de um critério **não atingido**. O
  jsonb guarda os três estados: atingido, não atingido, não avaliado.
- Uma sessão **em andamento** não tem desfecho. `desfecho: null` é estado, não
  ausência de dado a preencher.
- `encerrado_em` nulo significa em andamento, e não erro de gravação.

## 11. Fontes

Os critérios citam `boles_2007` e `amib_sbpt_2024`, ambos já no catálogo. Chave
nova `treFalha` em `THRESHOLD_SOURCES`.

O painel usa o rodapé de fonte como todos os outros. Como a Fase 4 fez o rodapé
derivar as chaves das modulações do alvo, nada de novo é necessário aqui além
de declarar a chave.

## 12. Testes

Baseline: **289 testes em 21 arquivos**, verdes, build limpo.

| Arquivo | O que cobre |
|---|---|
| `src/lib/tre.test.ts` | avaliação de critérios; aptidão; os quatro desfechos |
| `src/components/patient/TrePanel.test.tsx` | iniciar, marcar critério, encerrar; sessão em andamento; tempo decorrido |
| `src/lib/clinical.test.ts` | `interrompido` cai em não medido, **nunca** em reprovado |

O teste que mais importa nesta fase é o último: um TRE interrompido não pode
reprovar o paciente. É a diferença entre um dado ausente e um resultado
negativo, e é o defeito que este projeto já embarcou uma vez.

Disciplina herdada: TDD com teste que falha antes; nada de `node:fs`, `path`
ou `__dirname`; e para cada limiar, um teste que falha se o valor mudar.

## 13. Riscos

| Risco | Mitigação |
|---|---|
| `interrompido` tratado como falha | teste dedicado; é o achado central da fase |
| App parecer cronometrar os 5 minutos | dito na tela, não só no spec |
| Sessão aberta esquecida virar desfecho | o app nunca encerra sozinho |
| SQL não verificado | revisado aqui, aplicado pelo Jeann |
| Perder histórico do `tre_result` | fallback de leitura, documentado |

## 14. O que esta fase não resolve

Gasometria interpretada, mecânica nova e alvo por patologia continuam para as
Fases 6, 7 e 8. Continuam abertos, do dossiê: a fonte primária de Winters, os
números do DPOC e se o mentor quer ânion-gap — nenhum deles bloqueia esta fase.
