# Dossiê clínico — Ventila Fisio, Fase 8

Para: mentor clínico
De: equipe de desenvolvimento
Data: 02/09/2026
Assunto: qual alvo ventilatório muda por patologia, e por quê

## Como usar este documento

A Fase 8 responde a uma pergunta só: **dos alvos que o aplicativo já
sugere, quais devem mudar quando o paciente tem uma patologia específica,
quanto, e com que fonte.**

O motor de alvos (`src/lib/alvos.ts`) já tem a máquina pronta. Todo valor
sugerido carrega três coisas: o valor, a **base** que ele teria sem
modulação, e a lista de `Modulacao` — cada uma obrigada pelo tipo a declarar
**motivo** e **fonte**. Então:

- "esta patologia move este alvo para X, por causa de Y" entra direto;
- "não há base publicada para mover nada" é resposta igualmente útil, e
  significa que o aplicativo deixa a base em paz.

Cada item abaixo separa, de propósito e sem misturar:

1. **O que a fonte realmente diz** (citação ou paráfrase próxima).
2. **Se a fonte diz isso para este uso**, ou se aplicar aqui é inferência
   nossa.
3. **Quão forte é a fonte** — ensaio randomizado com o n, diretriz com a
   força e a certeza que ela própria declara, revisão narrativa, convenção.

### A regra que governa este documento

**Nenhuma citação foi inventada.** Onde um dado bibliográfico não pôde ser
confirmado numa fonte efetivamente acessada, o texto diz isso com todas as
letras em vez de trazer um número plausível. O repositório é público e cada
número na tela leva uma citação que o usuário pode abrir: uma citação errada
é pior do que uma lacuna declarada.

### Convenção de tipos deste projeto

O código distingue `Publicacao` (citação real e verificável) de `Parecer`
(juízo de profissional). Parte do que segue é **prática de especialista sem
estudo primário que sustente o número**. Onde este documento diz "isto é
prática, não literatura", o número **não** pode entrar como `Publicacao`: ou
entra como `Parecer` com o nome do mentor, ou não entra.

### Onde os textos foram lidos

- **PubMed/eutils** (`efetch`) para dado bibliográfico e resumo: Ranieri
  1993, Caramez 2005, Tuxen & Lane 1987, Tuxen 1989, Tuxen 1992, Williams
  1992, Darioli & Perret 1984, Demoule 2020, De Jong 2020, Robba 2020,
  PROBESE 2019, Fernández-Pérez 2008, Tonelli 2023.
- **Texto completo lido**: Demoule 2020 (PMC7652057), De Jong 2020
  (PMC7582031), Raghu 2011 (PMC5450933), Luo & Xiang 2024 (PMC11320219),
  Robba 2020 (**cópia do repositório institucional IRIS/UNIL**, não do site
  da editora — a Springer recusa acesso), ACS *Best Practices Guidelines:
  The Management of Traumatic Brain Injury* (PDF público em facs.org).

### O que NÃO foi consultado nesta rodada

Declarado para não virar buraco silencioso:

- **GOLD** (relatório vigente) — não acessado. Nenhuma afirmação abaixo se
  apoia no GOLD.
- **AMIB/SBPT, *Orientações Práticas em Ventilação Mecânica*, 2024** — não
  acessado nesta rodada. Já está em `references.ts` com `verificada: false`.
  **Se o mentor tiver o documento, ele é a fonte preferencial** para DPOC e
  asma no contexto brasileiro, e pode confirmar ou corrigir os números
  abaixo com autoridade local que a literatura internacional não dá.
- **GINA** — não acessado.
- **Achados de imagem** (infiltrado bilateral, atelectasia, pneumotórax,
  hiperinsuflação) — pesquisa própria não feita, por orçamento. O que há
  sobre eles adiante é derivado das seções de patologia, e está marcado
  como tal.

---

## Os alvos que existem hoje, para ficar claro o que se propõe mover

Do `src/lib/alvos.ts`:

| Alvo | Base atual | Onde é calculado |
|---|---|---|
| Volume corrente | 4–6 ml/kg de peso predito, alvo 6; **6–8, alvo 7, se IMC ≥ 30** | `sugerirVc` |
| PEEP / FiO₂ | tabela **low PEEP** do ARDSnet | `sugerirPeepFio2` |
| Frequência respiratória | derivada de VE = 100 ml/kg/min ÷ VC, **limitada entre 12 e 35** | `sugerirVentilacao` |
| Pressão de platô, driving pressure | classificados em `clinical.ts` | — |

Nenhum deles é modulado por patologia hoje. `sugerirPeepFio2` e
`sugerirVentilacao` têm inclusive o comentário "Sem modulação nesta fase —
Fase 8". É esta fase.

---

# 1. DPOC

A metade da oxigenação já está fechada em fases anteriores (SpO₂ 88–92%,
BTS 2017 com **grau A** para DPOC, mais Austin 2010, ensaio randomizado com
405 pacientes). **Aqui trato só da metade ventilatória**: tempo expiratório,
auto-PEEP, PEEP aplicada, volume corrente e frequência.

## 1.1 PEEP aplicada em obstrução: teto no auto-PEEP, por teste, não por regra

### O que eu proponho

Que o aplicativo **não gere um número de PEEP pela tabela ARDSnet quando a
patologia é DPOC**. Em vez disso:

1. exibe a base ARDSnet como referência, mas **marcada como não aplicável
   sem medir auto-PEEP**;
2. instrui um **teste empírico**: subir a PEEP em degraus e observar a
   **pressão de platô** — se o platô sobe junto, houve hiperinsuflação e a
   PEEP voltou a ser deletéria;
3. traz um **teto**: PEEP aplicada acima de ~80–85% do auto-PEEP medido
   causa hiperinsuflação adicional.

### Qual alvo muda

`sugerirPeepFio2` — o valor de PEEP. A FiO₂ não muda por este item.

### A fonte

**Ranieri VM, Giuliani R, Cinnella G, Pesce C, Brienza N, Ippolito EL, Pomo
V, Fiore T, Gottfried SB, Brienza A.** *Physiologic effects of positive
end-expiratory pressure in patients with chronic obstructive pulmonary
disease during acute ventilatory failure and controlled mechanical
ventilation.* **Am Rev Respir Dis 1993;147(1):5-13. PMID 8420430.**
Confirmado por `efetch` do PubMed: autores, título, veículo, ano, volume,
número, páginas.

**Caramez MP, Borges JB, Tucci MR, Okamoto VN, Carvalho CR, Kacmarek RM,
Malhotra A, Velasco IT, Amato MB.** *Paradoxical responses to positive
end-expiratory pressure in patients with airway obstruction during
controlled ventilation.* **Crit Care Med 2005;33(7):1519-28. PMID
16003057.** Confirmado por `efetch`. (Grupo brasileiro, Amato como sênior.)

**Demoule A, Brochard L, Dres M, Heunks L, Jubran A, Laghi F,
Mekontso-Dessap A, Nava S, Ouanes-Besbes L, Peñuelas O, Piquilloud L,
Vassilakopoulos T, Mancebo J.** *How to ventilate obstructive and asthmatic
patients.* **Intensive Care Med 2020;46(12):2436-2449. PMID 33169215. DOI
10.1007/s00134-020-06291-0.** Texto completo lido em PMC7652057.

**Tuxen DV.** *Detrimental effects of positive end-expiratory pressure during
controlled mechanical ventilation of patients with severe airflow
obstruction.* **Am Rev Respir Dis 1989;140(1):5-9. PMID 2665589.**

**Não confirmado:** as referências internas que a revisão de Demoule cita
para cada número (marcadas [46], [47], [50], [53], [54] no texto) **não
foram resolvidas**. Os números abaixo atribuídos a Demoule 2020 são os da
revisão, não de um estudo primário que eu tenha lido.

### O que a fonte realmente diz

Ranieri 1993, do resumo: nove pacientes com DPOC em ventilação controlada,
PEEP testada de 0 a 15 cmH₂O, PEEPi médio 9,8 ± 0,5 cmH₂O. *"PEEP levels of
5 and 10 cm H2O did not change lung volume and PEEPi"* nem a hemodinâmica.
Quando a PEEP aplicada excedeu a PEEPi, apareceram mudanças no volume
pulmonar e na relação fluxo/volume expiratório, com aumento de elastância e
queda do índice cardíaco. A conclusão, textual: *"PEEP levels exceeding the
85% of PEEPi caused further hyperinflation and compromised hemodynamics and
gas exchange."*

Demoule 2020, textual: *"the addition of external PEEP does not change either
the degree of hyperinflation or the total PEEP until it approximates 80% of
the original PEEPi"* — para pacientes **passivamente ventilados**.

**Registro de divergência, porque importa:** Ranieri diz **85%**, Demoule diz
**80%**. Não são o mesmo número e não vou fundi-los num só. Se o aplicativo
exibir um número, ele precisa dizer qual dos dois está usando e por quê.
Minha sugestão é exibir a **faixa "80 a 85% do auto-PEEP"** e citar as duas
fontes, em vez de escolher um valor e esconder a divergência.

Caramez 2005: oito pacientes, PEEP externa aplicada em degraus de 2 cmH₂O de
5 em 5 minutos, de ZEEP até 150% da PEEPi. Três padrões de resposta
diferentes, e a resposta **paradoxal** (queda da CRF com PEEP externa)
apareceu em **cinco dos oito** pacientes (três asmáticos, dois DPOC) em pelo
menos um padrão ventilatório. Textual: *"no a priori information about
disease, mechanics, or ventilatory settings was predictive of the response"*,
e por isso os autores sugerem *"an empirical PEEP trial investigating plateau
pressure response"*.

Tuxen 1989: seis pacientes com obstrução grave, PEEP de 5, 10 e 15 cmH₂O. A
PEEP aumentou progressivamente a CRF, *"up to 1.42 ± 0.43 L at 15 cm H2O
PEEP (n = 4)"*, e **dois dos seis não toleraram 15 cmH₂O por hipotensão**.

### O que é inferência nossa

- Que o aplicativo deva **suprimir** a sugestão da tabela ARDSnet em DPOC é
  inferência. Nenhuma das fontes fala de tabela ARDSnet nem de aplicativo. O
  que elas sustentam é que a PEEP em obstrução tem teto individual, medido, e
  que a resposta não é previsível a priori — o que é incompatível com uma
  tabela que devolve PEEP a partir de FiO₂.
- Que o **critério de segurança na tela seja a pressão de platô** vem
  literalmente de Caramez ("plateau pressure response"), então isso **não** é
  inferência.
- Que o teto seja "80 a 85%" é fiel às fontes; a escolha de exibir a faixa
  em vez de um número é decisão editorial nossa.

### Força da evidência

Fraca em desenho, forte em consistência. **São estudos fisiológicos com n
entre 6 e 9**, sem desfecho clínico, sem randomização, sem cegamento. Nenhum
mediu mortalidade. O que eles medem — volume pulmonar, fluxo expiratório,
índice cardíaco — é medido bem e aponta na mesma direção há trinta anos. A
revisão de Demoule 2020 é **narrativa, não graduada**: não tem GRADE, não
declara força nem certeza.

---

## 1.2 Volume corrente, frequência e tempo expiratório em DPOC

### O que eu proponho

| Alvo | Base do app hoje | Proposta em DPOC |
|---|---|---|
| Volume corrente | 4–6 ml/kg PP, alvo 6 | **6–8 ml/kg PP** |
| Frequência | derivada, piso 12 | **~12/min**, e o critério passa a ser tempo expiratório, não volume-minuto |
| Relação I:E | não existe no app | **1:4** |
| Fluxo inspiratório | não existe no app | **60–90 L/min, constante** |
| Pressão de platô | limiar geral | **< 28 cmH₂O** como gatilho para reduzir volume-minuto |
| pH | — | **manter em torno de 7,25–7,30**, não normalizar gasometria |

### Qual alvo muda

`sugerirVc` (faixa), `sugerirVentilacao` (frequência) e a lógica de platô.
I:E e fluxo inspiratório **não existem hoje** no motor: entrariam como campos
novos ou como texto de orientação.

### A fonte

Demoule 2020 (citação completa em 1.1), texto completo em PMC7652057.
Textualmente, para DPOC: *"use of a moderate tidal volume, of around 6–8
ml/Kg, and a respiratory rate of 12/min"*; *"constant inspiratory flow
delivered at 60–90 l/min"*; *"keep the inspiration-to-expiration ratio low,
e.g. 1:4"*; *"If Pplat is high (e.g. > 28 cmH2O), minute ventilation could be
reduced"*; e o objetivo primário *"is not to normalize blood gases, but to
prevent complications due to hyperinflation while maintaining a pH of around
7.25–7.30"*.

**Tuxen DV, Lane S.** *The effects of ventilatory pattern on hyperinflation,
airway pressures, and circulation in mechanical ventilation of patients with
severe air-flow obstruction.* **Am Rev Respir Dis 1987;136(4):872-879. PMID
3662241.** Confirmado por `efetch`.

**Não confirmado:** de novo, as referências internas de Demoule para cada um
desses números. Eles são **da revisão**, não de estudo primário lido por mim.
A revisão usa "e.g." e "around" — a própria fonte não os apresenta como
limiares rígidos, e o aplicativo não deve endurecê-los.

### O que a fonte realmente diz

Tuxen & Lane 1987: nove pacientes (cinco asma, quatro obstrução crônica),
sedados e paralisados, com medida do volume pulmonar ao fim da inspiração
(VEI) em apneias de 20 a 40 segundos. Testaram três volumes-minuto (10, 16,
26 L/min), três volumes correntes (0,6, 1,0 e 1,6 L) e três fluxos
inspiratórios (40, 70 e 100 L/min). O VEI subiu progressivamente com volume
corrente maior **ou com tempo expiratório menor**, chegando a *"lung volumes
as high as 3.6 ± 0.4 L above FRC"*, com hipotensão nos volumes mais altos.
E — este ponto vale para a tela — a **pressão de pico** se relacionou
principalmente ao **fluxo inspiratório**, não ao volume pulmonar.

### O que é inferência nossa

Três coisas, e são importantes:

1. **A fórmula de frequência do aplicativo é o problema, não o número 12.**
   Hoje `sugerirVentilacao` deriva a frequência de VE = 100 ml/kg/min ÷ VC.
   Para um peso predito de 70 kg e VC de 420 ml, isso dá **17/min**. Demoule
   sugere **12**. E o `Math.max(12, ...)` do código é um **piso**, não um
   teto: nada no motor atual impede uma frequência alta em obstrução. Que o
   aplicativo deva **inverter isso em DPOC** — tratar 12 como alvo e não como
   piso — é inferência nossa a partir de Demoule + Tuxen 1987. Nenhuma fonte
   discute a fórmula do aplicativo.
2. **Tuxen 1987 sustenta o princípio, não o número.** Ele mostra que reduzir
   tempo expiratório aumenta hiperinsuflação, o que é a razão física de baixar
   a frequência. Ele **não** publica "use 12/min".
3. **Pressão de pico não é o guarda-corpo.** Que o app deva usar platô e não
   pico em obstrução é inferência direta do achado de Tuxen 1987, mas é
   inferência.

### Força da evidência

- Demoule 2020: **revisão narrativa** de especialistas de peso (Brochard,
  Mancebo, Nava, Heunks), publicada na Intensive Care Medicine. **Sem GRADE,
  sem força declarada, sem certeza declarada.** É opinião informada
  organizada, não diretriz.
- Tuxen & Lane 1987: **estudo fisiológico, n = 9**, medidas objetivas, sem
  desfecho clínico.
- **Não existe ensaio randomizado** comparando padrões ventilatórios em DPOC
  sob ventilação invasiva com desfecho de mortalidade. Se o mentor esperava
  um, a resposta honesta é que ele não existe.

---

# 2. Asma

## O que eu proponho

**Hipoventilação controlada com hipercapnia permissiva**, e explicitamente
diferente da DPOC no item da PEEP:

| Alvo | Proposta em asma |
|---|---|
| Volume corrente | baixo — **6 ml/kg PP**, com a faixa protetora intacta |
| Frequência | **baixa**; o piso de 12 do app precisa cair |
| Relação I:E | **1:4 a 1:6** |
| PEEP | **≤ 5 cmH₂O** |
| PaCO₂ | **não é alvo**; reduzi-la é objetivo secundário |
| Pressão de platô | teto, não a pressão de pico |

E a diferença que mais importa: **em asma a recomendação publicada é PEEP
baixa; em DPOC é PEEP até 80–85% do auto-PEEP.** As duas patologias são
"obstrução", e o alvo de PEEP vai em direções diferentes. Se o aplicativo
tratar as duas com a mesma regra, ele erra uma das duas.

## Qual alvo muda

`sugerirPeepFio2` (PEEP ≤ 5), `sugerirVentilacao` (frequência — e o piso de
12 vira obstáculo), e a leitura de gasometria (hipercapnia esperada não é
falha).

## A fonte

**Demoule 2020** (citação completa em 1.1), para asma, textual: *"high
inspiratory airflow rate with the objective of targeting an
inspiratory-to-expiratory time of 1:4 to 1:6"*; *"A low level of external
PEEP (≤ 5 cmH2O) is recommended"*; *"low tidal volume, low respiratory
rate"*; *"reduction of PaCO2 is very much a secondary goal"*.

**Darioli R, Perret C.** *Mechanical controlled hypoventilation in status
asthmaticus.* **Am Rev Respir Dis 1984;129(3):385-7. PMID 6703497.**
Confirmado por `efetch`.

**Tuxen DV, Williams TJ, Scheinkestel CD, Czarny D, Bowes G.** *Use of a
measurement of pulmonary hyperinflation to control the level of mechanical
ventilation in patients with acute severe asthma.* **Am Rev Respir Dis
1992;146(5 Pt 1):1136-1142. PMID 1443862.** Confirmado por `efetch`.

**Williams TJ, Tuxen DV, Scheinkestel CD, Czarny D, Bowes G.** *Risk factors
for morbidity in mechanically ventilated patients with acute severe asthma.*
**Am Rev Respir Dis 1992;146(3):607-615. PMID 1519836.** Confirmado por
`efetch`.

**Não confirmado:** **não encontrei, nesta rodada, um piso de pH publicado
especificamente para asma.** O 7,25–7,30 de Demoule está escrito na seção de
**DPOC**. Aplicá-lo à asma seria inferência minha, e prefiro deixar a lacuna
aberta — é pergunta para o mentor (seção final).

## O que a fonte realmente diz

Darioli & Perret 1984, de 159 pacientes admitidos, **26 precisaram de
ventilação em 34 episódios** de acidose respiratória aguda; 10 estavam
comatosos e 5 em parada na intubação. Duração média de ventilação 2,5 dias, e
**todos sobreviveram**. A abordagem, textual: *"correction of hypoxemia with
hyperoxic mixtures without attempting to restore an adequate alveolar
ventilation"*, evitando pressões altas por considerá-las mais nocivas do que
o CO₂ persistentemente elevado.

Tuxen 1992: dez pacientes com asma aguda grave, sedados e paralisados,
volume-minuto inicial de **200 ml/kg/min**, com o VEI medido em apneias de 40
a 60 segundos guiando o ajuste — *"reducing rate when VEI was > 20 ml/kg and
increasing it when VEI was < 20 ml/kg"*, **independentemente da PaCO₂**. Oito
pacientes hipoventilaram por 30 ± 29 horas.

Williams 1992: 88 admissões em UTI por asma grave ao longo de cinco anos (73
pacientes). Hipotensão (18/88, 20%), barotrauma (12/88, 14%) e arritmias
(9/88, 10%) ocorreram **exclusivamente em quem foi ventilado**. No braço
prospectivo de 22 pacientes, complicações em **0 de 5 (0%) com VEI < 1,4 L** e
em **11 de 17 (65%) com VEI ≥ 1,4 L**.

## O que é inferência nossa

- **O VEI não é usável no aplicativo.** É a medida mais preditiva desses
  estudos — 0% contra 65% de complicações — e depende de apneia de 40 a 60
  segundos com coleta do gás exalado, sob paralisia. Não é dado que o
  fisioterapeuta vá ter na beira do leito para digitar. **A recomendação
  honesta é não pedir VEI**, e usar platô e auto-PEEP como substitutos
  imperfeitos. Essa substituição é nossa e **não** está validada por essas
  fontes.
- Darioli & Perret **não publicaram números de ajuste** (nem VC, nem
  frequência, nem I:E) no resumo que li. Ele sustenta o **princípio** da
  hipoventilação controlada, com um resultado de sobrevida chamativo, não uma
  tabela de parâmetros.
- **O piso de frequência 12 do app é incompatível com "low respiratory
  rate".** Que ele precise cair em asma é inferência nossa; nenhuma fonte
  publica o piso.

## Força da evidência

- Darioli & Perret 1984: **série de casos, 26 pacientes, sem grupo controle
  concorrente.** A força retórica vem da mortalidade de zero contra o que se
  esperava na época — o que é **comparação histórica**, e comparação histórica
  superestima efeito. É um marco histórico, não um ensaio.
- Tuxen 1992: **série fisiológica prospectiva, n = 10.**
- Williams 1992: **coorte retrospectiva e prospectiva, 88 admissões**, com
  o braço prospectivo de 22 e o corte de VEI baseado em **5 e 17 pacientes**.
  Números pequenos: o intervalo de confiança em torno de "0%" com n = 5 é
  largo.
- Demoule 2020: revisão narrativa, sem graduação.
- **Também aqui não há ensaio randomizado** de estratégia ventilatória em
  asma quase fatal. Não vai haver: a população é pequena e o desenho seria
  difícil de aprovar.

---

# 3. Obesidade

O aplicativo já faz duas coisas aqui: avisa que a driving pressure de via
aérea não é confiável (De Jong 2018) e **desloca a faixa de volume corrente
de 4–6 para 6–8 ml/kg, com alvo 7**.

## 3.1 O achado mais desconfortável desta rodada: a modulação de volume corrente que já existe

### O que eu proponho

**Levar ao mentor a possibilidade de que a modulação atual esteja errada de
direção**, e não acrescentar nada até ele decidir.

A revisão que li recomenda o contrário do que o app faz.

### Qual alvo muda

`sugerirVc` — potencialmente para **voltar à base de 6 ml/kg**, revertendo a
modulação que hoje leva o alvo a 7 ml/kg.

### A fonte

**De Jong A, Wrigge H, Hedenstierna G, Gattinoni L, Chiumello D, Frat JP,
Ball L, Schetz M, Pickkers P, Jaber S.** *How to ventilate obese patients in
the ICU.* **Intensive Care Med 2020;46(12):2423-2435. PMID 33095284. DOI
10.1007/s00134-020-06286-x.** Texto completo lido em PMC7582031.

### O que a fonte realmente diz

Do resumo, textual: para ventilação mecânica, *"low tidal volume (6 ml/kg of
predicted body weight) and moderate to high positive end-expiratory pressure
(PEEP)"*. Do texto completo, textual: *"Low VT according to PBW should be
used both in non-ARDS and ARDS patients."*

E um alerta que corre na direção oposta à do app, textual: *"If PBW is not
formally calculated but just estimated, there is a tendency to overestimate
PBW and, thus, VT in patients with obesity."* Ou seja: a fonte se preocupa
com o obeso receber volume **a mais**, não a menos.

### O que é inferência nossa — e onde ela pode ter falhado

A justificativa que está no comentário do código é: *"o peso predito não muda
com o peso real, então o alvo por quilo sobe para não subventilar"*. Esse
raciocínio é fisiologicamente compreensível — o obeso tem espaço morto e
demanda ventilatória maiores — **mas eu não encontrei fonte publicada que o
sustente**, e encontrei uma revisão que recomenda o oposto.

Duas ressalvas honestas, para não exagerar na acusação:

1. Uma busca ampla devolveu a frase "6 a 8 ml/kg de peso predito" como
   recomendação corrente em obesidade, mas **em fonte secundária que eu não
   consegui rastrear até um documento primário**. Não a cito como fonte, e
   não a uso para defender nem para condenar a modulação atual.
2. A faixa 6–8 e "6" não são incompatíveis em toda leitura: 6 é o piso da
   faixa proposta pelo app. O que **é** incompatível é o **alvo 7 ml/kg**,
   acima do que De Jong 2020 recomenda.

**Isto é registro para decisão do mentor, não uma correção que a equipe vá
aplicar sozinha.** O CLAUDE.md do projeto é explícito: número clínico não se
ajusta sem fonte e sem falar com o Jeann. Este item existe justamente para
cumprir isso.

### Força da evidência

De Jong 2020 é **revisão narrativa** da série "How to ventilate…" da
Intensive Care Medicine (mesma série e mesmo número que Demoule 2020). Sem
GRADE, sem força declarada. É opinião de especialistas de primeira linha —
que é exatamente o mesmo peso da revisão em que o resto deste dossiê se apoia
para DPOC e asma. Não posso tratá-la como forte aqui e fraca ali.

## 3.2 PEEP em obesidade

### O que eu proponho

Um **piso de PEEP** em vez de um valor: em IMC ≥ 30, não sugerir PEEP abaixo
de ~8 cmH₂O, com a faixa de referência 7 a 20. **Sem manobra de recrutamento
automática.**

### Qual alvo muda

`sugerirPeepFio2` — o valor de PEEP, com piso.

### A fonte

De Jong 2020 (citação em 3.1), textual: *"moderate to high PEEP (7–20
cmH2O)"*, sem algoritmo preciso. E sobre recrutamento, textual: manobras de
recrutamento *"not systematically recommended, and their use remains a
decision based on individual risk/benefit considerations"*.

**Writing Committee for the PROBESE Collaborative Group of the PROtective
VEntilation Network (PROVEnet) for the Clinical Trial Network of the European
Society of Anaesthesiology; Bluth T, Serpa Neto A, Schultz MJ, Pelosi P, Gama
de Abreu M.** *Effect of Intraoperative High Positive End-Expiratory Pressure
(PEEP) With Recruitment Maneuvers vs Low PEEP on Postoperative Pulmonary
Complications in Obese Patients: A Randomized Clinical Trial.* **JAMA
2019;321(23):2292-2305. PMID 31157366.** Confirmado por `efetch`.

### O que a fonte realmente diz

De Jong 2020 dá a faixa 7–20 e diz que **não** propõe algoritmo; e adverte
que *"it is difficult to propose any treatment if key variables such as
transpulmonary pressure and intra-abdominal pressure are not measured or
ignored"* — isto é, a própria revisão admite que sem pressão esofágica o
ajuste fica no escuro.

PROBESE: **2.013 adultos obesos (IMC ≥ 35), 77 centros, 23 países.** PEEP 12
cmH₂O com manobras de recrutamento (n = 989) contra PEEP 4 cmH₂O (n = 987).
Complicações pulmonares pós-operatórias em **21,3% contra 23,6%** (RR 0,93;
IC 95% 0,83–1,04; p = 0,23) — **sem diferença**. Hipoxemia foi menos
frequente com PEEP alta (**5,0% contra 13,6%**, p < 0,001).

### O que é inferência nossa

**PROBESE é intraoperatório, não UTI.** Aplicá-lo ao paciente de UTI é
inferência, e eu a uso **só na direção negativa**: ele **não** autoriza o
aplicativo a propor PEEP alta com recrutamento de rotina no obeso. Ele não
diz nada sobre o piso de 8. **O piso de 8 é inferência nossa** a partir do
extremo inferior da faixa 7–20 de De Jong, arredondado — e portanto o número
mais frágil deste documento inteiro. Se o mentor quiser um número, ele deve
ser dele, como `Parecer`.

O achado de hipoxemia (5,0% contra 13,6%) é o único resultado positivo do
ensaio e é **desfecho secundário** — não sustenta prática sozinho.

### Força da evidência

- PROBESE: **ensaio randomizado grande e multicêntrico, n = 2.013, negativo
  no desfecho primário.** Forte no que refuta; inaplicável de forma direta à
  UTI.
- De Jong 2020: revisão narrativa, sem graduação, e que declara a própria
  limitação.

## 3.3 Posicionamento

### O que eu proponho

Uma **conduta**, não um alvo numérico: em IMC ≥ 30, sugerir posição de
Trendelenburg reversa, "cadeira de praia" ou sentada.

### Qual alvo muda

**Nenhum.** Isto entra em `condutas.ts`, não no motor de alvos.

### A fonte e o que ela diz

De Jong 2020, textual: *"Non-invasive strategies should first optimize body
position with reverse Trendelenburg position, 'beach chair position' or
sitting position"*, e a posição deve ser *"individualized on the patient
anatomy"*.

**Não confirmado:** **nenhum ângulo em graus** aparece na fonte que li. Se o
aplicativo quiser mostrar "30°" ou "45°", esse número **não vem daqui** — é
`Parecer` do mentor, ou não entra.

### Força

Revisão narrativa. Sem graduação, sem número.

---

# 4. Doença neurológica

Aqui a precisão importa mais do que em qualquer outro item, e o achado
principal é meio inesperado: **a literatura sustenta um alvo de PaCO₂, e
sustenta explicitamente NÃO mexer em PEEP nem em volume corrente.**

## 4.1 O que a literatura sustenta

### O que eu proponho

1. **PaCO₂ alvo de 35 a 45 mmHg** na lesão cerebral aguda **sem** hipertensão
   intracraniana clinicamente significativa.
2. **PEEP e volume corrente ficam na base** — os mesmos do paciente sem lesão
   cerebral. Isto é uma "modulação" cujo conteúdo é *não modular*, e vale a
   pena o app dizer isso na tela em vez de ficar em silêncio.
3. **Alerta contra hiperventilação profilática**, e contra a hipercapnia
   permissiva silenciosa que a lógica de DPOC/asma poderia introduzir num
   paciente que também tem lesão cerebral aguda.
4. **PaO₂ 80 a 120 mmHg** (ESICM) — e o app já sinaliza hiperóxia? Se não,
   este é o gancho.

### Qual alvo muda

Nenhum alvo ventilatório muda. **O que entra é um alvo novo — PaCO₂ — na
leitura de gasometria**, e um bloqueio explícito sobre PEEP/VC. É a
modulação mais bem sustentada deste dossiê e ela quase não mexe em nada.

### A fonte

**Robba C, Poole D, McNett M, Asehnoune K, Bösel J, Bruder N, Chieregato A,
Cinotti R, Duranteau J, Einav S, Ercole A, Ferguson N, Guerin C, Siempos II,
Kurtz P, Juffermans NP, Mancebo J, Mascia L, McCredie V, Nin N, Oddo M,
Pelosi P, Rabinstein AA, Neto AS, Seder DB, Skrifvars MB, Suarez JI, Taccone
FS, van der Jagt M, Citerio G, Stevens RD.** *Mechanical ventilation in
patients with acute brain injury: recommendations of the European Society of
Intensive Care Medicine consensus.* **Intensive Care Med
2020;46(12):2397-2410. PMID 33175276. DOI 10.1007/s00134-020-06283-0.**
Bibliografia confirmada por `efetch`; **texto completo lido numa cópia do
repositório institucional IRIS/UNIL**, porque a Springer recusou o acesso
direto. As citações verbatim abaixo vêm dessa cópia.

**American College of Surgeons, Trauma Programs.** *Best Practices
Guidelines: The Management of Traumatic Brain Injury.* **Copyright © 2024
American College of Surgeons.** PDF público em facs.org, lido na íntegra na
seção "Goals of Directed Care" e "Airway and Ventilation".

**Não confirmado:** **não acessei o texto da Brain Trauma Foundation, 4ª
edição (Carney 2017, Neurosurgery)** — as duas rotas testadas devolveram 404
e um PDF protegido. A recomendação Nível IIB contra hiperventilação
profilática com PaCO₂ ≤ 25 mmHg aparece em buscas e em fontes secundárias,
mas **eu não a li no original e portanto ela não deve ser citada pelo
aplicativo com base neste documento.** As duas fontes acima cobrem o mesmo
terreno e foram lidas.

### O que a fonte realmente diz

**Robba 2020 / ESICM.** Metodologia: painel de **29 especialistas
internacionais**, revisões sistemáticas e GRADE, com Delphi modificado em
quatro rodadas. Recomendação forte exige **> 85% de concordância**, fraca
75–85%, e abaixo de 75% não há recomendação. Resultado: **36 declarações — 19
fortes, 6 fracas, 11 sem recomendação.** E a frase do próprio resumo, que o
aplicativo deveria reproduzir por honestidade: *"Evidence was generally
insufficient or lacking."*

As declarações que interessam, verbatim da tabela e do corpo:

- *"We recommend that the optimal target range of PaCO2 in patients with ABI
  who do not have clinically significant ICP elevation is 35–45 mmHg"* —
  **recomendação forte, evidência de baixa qualidade.**
- *"We recommend that the optimal target range of PaO2 in patients with ABI
  who do not have clinically significant ICP elevation is 80–120 mmHg"* —
  **forte, evidência de baixa qualidade e contraditória.**
- *"We recommend that in mechanically ventilated patients with ABI without
  ARDS who do not have clinically significant ICP elevation, the same level
  of PEEP should be used as in patients without brain injury"* — **forte,
  evidência muito baixa a favor.**
- Mesma recomendação de PEEP para quem **tem** hipertensão intracraniana
  PEEP-insensível — **forte, sem evidência.**
- *"in mechanically ventilated patients with concurrent ABI and ARDS who do
  not have clinically significant ICP elevation, a strategy of lung
  protective mechanical ventilation should be used"* — **forte, sem
  evidência.**
- Hiperventilação de curta duração na herniação cerebral — **recomendação
  fraca, sem evidência**; e para hipertensão intracraniana clinicamente
  significativa o painel **não conseguiu recomendar nada** ("no
  recommendation, no evidence").

**ACS 2024.** Tabela 4, "Goals of Treatment Recommended Parameters": PaCO₂
**35–45 mmHg**, PaO₂ **80–100 mmHg**, oximetria **≥ 94%**, pH **7,35–7,45**.
No corpo, textual: *"Prescribe ventilator settings to assure that arterial pH
remains 7.35–7.45, PaCO2 is 35–45 mm Hg (in the absence of intracranial
hypertension and/or severe metabolic acidosis), and oxygen saturation is at
least 94%."* Ao iniciar a ventilação, o texto é ainda mais estreito: *"PaCO2
35–40 mm Hg"*. Hiperventilação leve (**PaCO₂ 32–35 mmHg**) aparece como
tratamento de **Tier 2 do SIBICC** para HIC ou piora neurológica; redução
abaixo de **30 mmHg** só como **resgate**, pelo menor tempo possível, *"because
it can result in arterial spasm and decreased CBF"*. E sobre PEEP, textual:
*"In most instances, moderate levels of positive end-expiratory pressure
(PEEP) of < 10 cm H2O will not elevate ICP further in the presence of
intracranial hypertension."*

E — importante para o conflito com DPOC/asma — o ACS admite o conflito
explicitamente: *"Patients with significant pulmonary issues (e.g., acute
respiratory distress syndrome) may require lung-specific targets, such as
permissive hypercapnia, based on their clinical condition while controlling
ICP elevation using other interventions."*

### O que é inferência nossa — e é a parte mais delicada deste dossiê

**A checkbox do aplicativo diz "Doença neurológica". A literatura fala de
"acute brain injury".** Não é a mesma coisa, e a diferença não é acadêmica:

- "Doença neurológica" no aplicativo pode marcar sequela de AVC antiga,
  Parkinson, esclerose múltipla, doença neuromuscular crônica, epilepsia,
  demência.
- As recomendações acima valem para **lesão cerebral aguda** — TCE, AVC
  agudo, hemorragia subaracnóidea, pós-parada com lesão anóxica.

**Aplicar um alvo de PaCO₂ de 35–45 a todo paciente marcado como "doença
neurológica" é sobre-aplicar a fonte.** Pior: num paciente com doença
neuromuscular crônica e DPOC, isso empurraria contra a hipercapnia permissiva
que a própria condição exige, e a PaCO₂ basal desse paciente pode ser
cronicamente alta.

Duas saídas, e **a escolha é do mentor**:

1. **Campo novo**, "lesão cerebral aguda", separado da comorbidade crônica.
   É a saída correta e custa uma mudança de esquema.
2. **Não modular**, e exibir o alvo de PaCO₂ como **informação com
   condicional** ("se houver lesão cerebral aguda…"), sem que o motor mude
   número nenhum.

A segunda é a que respeita o dado que o app realmente tem hoje.

### Força da evidência

**A mais bem graduada deste dossiê, e ainda assim fraca em certeza.** O ESICM
declara a própria força: **recomendação forte** para PaCO₂ 35–45, mas
**qualidade de evidência baixa** — e as recomendações de PEEP são "forte, sem
evidência" ou "forte, evidência muito baixa a favor". Isso não é contradição:
no GRADE, a força reflete a confiança do painel de que o benefício supera o
dano, e a certeza reflete os estudos. **Aqui há consenso alto sobre dados
ruins.** O aplicativo deve mostrar as duas metades, nunca só "recomendação
forte".

O ACS 2024 é uma diretriz de boas práticas de sociedade cirúrgica, **sem
graduação GRADE por item** no formato lido — os números vêm em tabela de
metas, não em recomendações graduadas.

---

# 5. Fibrose pulmonar

## O que eu proponho

**Nenhum alvo numérico novo.** Duas coisas, e as duas são avisos, não
números:

1. **Não aplicar a tabela ARDSnet automaticamente.** PEEP alta em doença
   intersticial está associada a mortalidade, e o mecanismo é plausível
   (pulmão pouco recrutável, complacência que cai quando a PEEP sobe).
2. **Um aviso de prognóstico**, porque a diretriz da especialidade recomenda
   fracamente **contra ventilar** esses pacientes — o que é decisão de
   conduta, não de parâmetro, e é discussão que o fisioterapeuta deveria
   saber que existe.

## Qual alvo muda

`sugerirPeepFio2` — de "gera número" para "gera número com ressalva
explícita". Volume corrente e frequência **ficam na base protetora**.

## A fonte

**Raghu G, Collard HR, Egan JJ, et al.** *An Official ATS/ERS/JRS/ALAT
Statement: Idiopathic Pulmonary Fibrosis: Evidence-based Guidelines for
Diagnosis and Management.* **Am J Respir Crit Care Med
2011;183(6):788-824.** DOI 10.1164/rccm.2009-040GL. Lido em PMC5450933.

**Fernández-Pérez ER, Yilmaz M, Jenad H, Daniels CE, Ryu JH, Hubmayr RD,
Gajic O.** *Ventilator settings and outcome of respiratory failure in chronic
interstitial lung disease.* **Chest 2008;133(5):1113-9. PMID 17989156.**
Confirmado por `efetch`.

**Luo X, Xiang F.** *Acute exacerbation of idiopathic pulmonary fibrosis: a
narrative review, primary focus on treatments.* **J Thorac Dis
2024;16(7):4727-4741.** DOI 10.21037/jtd-23-1565. Lido em PMC11320219.

**Tonelli R, Castaniere I, Cortegiani A, et al.** *Inspiratory Effort and
Respiratory Mechanics in Patients with Acute Exacerbation of Idiopathic
Pulmonary Fibrosis: A Preliminary Matched Control Study.* **Pulmonology
2023;29(6):469-477. PMID 36180352.** Confirmado por `efetch`.

**Não confirmado:** **não existe, entre as fontes que li, nenhum alvo
ventilatório publicado específico para fibrose** — nem ml/kg, nem PEEP, nem
platô. A resposta honesta à pergunta "há alvo diferente da base protetora
genérica?" é **não**.

## O que a fonte realmente diz

Raghu 2011, textual: *"The recommendation against mechanical ventilation in
patients with respiratory failure due to IPF is weak; that is, mechanical
ventilation should not be used in the majority of patients with IPF, but may
be a reasonable choice in a minority (⊕⊕○○)."* Os quatro círculos, dois
cheios, são a notação GRADE da própria diretriz: **qualidade de evidência
baixa**.

Fernández-Pérez 2008: **94 pacientes** com doença intersticial ventilados.
Sobrevida até a alta 47% (n = 44), 41% vivos em um ano. **PEEP alta foi
preditor independente de mortalidade: hazard ratio 4,72 (IC 95% 2,06 a
11,15)**, ao lado de APACHE III, idade e relação de oxigenação baixa. Nos 20
pacientes em que a PEEP subiu mais de 10 cmH₂O, a pressão de platô subiu
**mediana de 16 cmH₂O** e a complacência caiu 0,28 ml/kg/cmH₂O.

Luo & Xiang 2024, textual: *"in-hospital mortality is higher with invasive
mechanical ventilation (IMV) compared to patients receiving non-IMV (NIMV)
(51.6% vs. 30.9%, P<0.001)"*.

Tonelli 2023: pacientes com exacerbação aguda de FPI têm **drive respiratório
altíssimo — ΔPes de 27 (21–34) cmH₂O** — e *"showed a different mechanical
behavior under spontaneous unassisted and assisted breathing compared with
ARDS patients of similar severity"*.

## O que é inferência nossa

**A associação entre PEEP alta e morte pode ser confusão por gravidade.** O
próprio estudo diz que gravidade **e** PEEP se associam a pior sobrevida: quem
recebe PEEP alta é quem está pior. O desenho é retrospectivo e não separa as
duas coisas. **Portanto o aplicativo não pode dizer "PEEP alta mata na
fibrose".** O que ele pode dizer é: existe associação relatada, o mecanismo é
plausível, e a PEEP nesses pacientes merece justificativa explícita.

O achado de Tonelli é o que dá conteúdo ao aviso: **fibrose não é SDRA
mecanicamente**, então importar a tabela da SDRA sem ressalva é o erro
específico a evitar. Essa conclusão prática é inferência nossa.

A mortalidade de Luo & Xiang é **de coorte, comparando quem foi intubado com
quem não foi** — grupos que diferem em tudo. Não sustenta "não intube"; ela
sustenta "o prognóstico é ruim e a decisão é séria".

## Força da evidência

- Raghu 2011: **diretriz internacional de quatro sociedades**, com força e
  certeza declaradas por ela mesma: **recomendação fraca, evidência de
  qualidade baixa (⊕⊕○○)**. E é sobre **ventilar ou não**, não sobre ajuste.
- Fernández-Pérez 2008: **coorte retrospectiva, n = 94**, com confusão por
  indicação não resolvida.
- Luo & Xiang 2024: revisão narrativa citando dados observacionais.
- Tonelli 2023: **estudo fisiológico preliminar, pareado**, n pequeno (o
  resumo não dá o número exato — **não confirmado**).

---

# 6. O restante — uma linha cada

Esta seção é curta de propósito. Para a maioria destas condições a resposta
honesta é "não há base publicada para modular alvo ventilatório", e dizê-lo
com clareza **é** a entrega. Nada aqui foi preenchido para não deixar linha
vazia.

- **Bronquiectasia** — **nenhuma modulação. Não pesquisei fonte primária** e
  não conheço alvo ventilatório publicado específico. Fisiologicamente há
  obstrução e secreção, mas a semelhança com DPOC é hipótese minha, não
  achado. O que ela sugere é conduta de higiene brônquica, que não é alvo do
  motor.
- **SAHOS** — **nenhuma modulação. Não pesquisado nesta rodada.** O ponto onde
  ela plausivelmente importa é o **pós-extubação** (retomada de CPAP), não o
  ajuste do ventilador. Isso é hipótese, não fonte.
- **Tabagismo** — **nenhuma modulação.** É fator de risco para desenvolver
  DPOC, não um estado que mude alvo ventilatório. Se o paciente tiver
  obstrução, quem modula é a DPOC marcada, não o tabagismo.
- **Insuficiência cardíaca** — **nenhuma modulação de alvo.** A PEEP tem
  efeito hemodinâmico conhecido (reduz pré-carga e pós-carga do VE), mas eu
  **não** encontrei — nem procurei nesta rodada — um alvo ventilatório
  publicado que mude por ICC. Se o mentor ajusta PEEP pensando em débito
  cardíaco, isso é **prática, não literatura**, e precisa entrar como
  `Parecer`.
- **Hipertensão** — **nenhuma modulação.** Nenhuma base, nem plausível.
- **Diabetes** — **nenhuma modulação.** A relevância é na cetoacidose, que é
  distúrbio ácido-base já tratado na Fase 6, e não é alvo ventilatório.
- **Doença renal crônica** — **nenhuma modulação de alvo ventilatório.** Há um
  ponto real e adjacente: a capacidade de compensação metabólica está
  reduzida, o que **estreitaria a margem para hipercapnia permissiva** em
  quem tem DPOC ou asma junto. Isso é raciocínio fisiológico meu, **sem fonte
  lida**, e por isso é pergunta ao mentor, não modulação.
- **Neoplasia** — **nenhuma modulação.** Pesa em prognóstico e em decisão de
  cuidado, não em parâmetro de ventilador.

## Achados de imagem

- **Infiltrado bilateral** — **nenhuma modulação.** É o padrão de SDRA, e a
  base do aplicativo **já é** a estratégia da SDRA (ARDSnet, tabela low). Ele
  confirma a base em vez de mudá-la. A pergunta de trocar para a tabela
  **high** existe na literatura e **não foi pesquisada nesta rodada** —
  não afirme nada sobre ela com base neste documento.
- **Atelectasia** — **não pesquisado.** Recrutamento e PEEP são o assunto
  óbvio; sem fonte lida, nenhuma modulação.
- **Pneumotórax** — **nenhuma modulação numérica, sem fonte lida.** A conduta
  é dreno, e o aviso plausível é sobre pressão. Qualquer número aqui seria
  invenção.
- **Hiperinsuflação** — **este é o achado que mais rende.** É o correlato
  radiológico do que a seção 1 descreve, e é o gatilho que faz sentido:
  **hiperinsuflação na imagem deveria acionar a lógica obstrutiva (tempo
  expiratório, teste de PEEP, platô) mesmo sem a comorbidade marcada.**
  Ressalva: nenhuma das fontes desta rodada estuda o **achado de imagem**
  como gatilho — elas estudam a **medida de auto-PEEP e VEI**. Ligar imagem a
  conduta é inferência nossa.

---

# Resumo: o que muda e o que não muda

| Patologia / achado | Alvo modulado | O que muda | Força |
|---|---|---|---|
| **DPOC** | PEEP | Suprime tabela ARDSnet; teto em 80–85% do auto-PEEP; teste empírico com resposta do platô | Fisiológico, n = 6 a 9 (Ranieri 1993; Caramez 2005; Tuxen 1989) + revisão narrativa (Demoule 2020) |
| **DPOC** | Volume corrente | 4–6 → **6–8 ml/kg PP** | Revisão narrativa sem graduação (Demoule 2020) |
| **DPOC** | Frequência | derivada (≈17) → **~12/min**, priorizando tempo expiratório | Revisão narrativa + fisiologia (Tuxen & Lane 1987, n = 9) |
| **DPOC** | I:E e fluxo (campos novos) | 1:4; fluxo constante 60–90 L/min | Revisão narrativa |
| **DPOC** | pH / platô | pH ~7,25–7,30; reduzir VE se platô > 28 | Revisão narrativa |
| **Asma** | PEEP | **≤ 5 cmH₂O** — direção oposta à da DPOC | Revisão narrativa (Demoule 2020) |
| **Asma** | Frequência e I:E | baixa; I:E **1:4 a 1:6**; o piso de 12 do app atrapalha | Revisão narrativa + séries n = 10 e n = 88 |
| **Asma** | PaCO₂ | deixa de ser alvo; hipercapnia permissiva | Série de casos n = 26 com controle histórico (Darioli 1984) |
| **Obesidade** | Volume corrente | **possível reversão**: fonte lida recomenda 6 ml/kg, o app usa alvo 7 | Revisão narrativa (De Jong 2020) — **conflito a decidir** |
| **Obesidade** | PEEP | piso ~8, faixa 7–20; **sem recrutamento de rotina** | Faixa: revisão narrativa. Contra recrutamento: ECR n = 2.013, negativo (PROBESE), mas intraoperatório |
| **Obesidade** | Posição (conduta) | Trendelenburg reversa / cadeira de praia / sentada; **sem graus publicados** | Revisão narrativa |
| **Obesidade** | Driving pressure | já implementado | — |
| **Doença neurológica** | PaCO₂ (alvo novo) | **35–45 mmHg** se não houver HIC | **Recomendação forte, evidência de qualidade baixa** (ESICM/Robba 2020) + ACS 2024 |
| **Doença neurológica** | PEEP e VC | **nada — e dizer que é nada**: mesma PEEP do paciente sem lesão cerebral | Recomendação forte, evidência muito baixa a favor (ESICM) |
| **Doença neurológica** | Hiperventilação | alerta contra profilaxia; 32–35 mmHg só como Tier 2; < 30 só resgate | ACS 2024; ESICM (fraca / sem recomendação) |
| **Fibrose pulmonar** | PEEP | **nenhum número novo**; ressalva contra aplicar ARDSnet automaticamente | Coorte retrospectiva n = 94, HR 4,72, com confusão por gravidade |
| **Fibrose pulmonar** | VC, FR | **nada** — a base protetora fica | Nenhuma fonte publica alvo específico |
| **Bronquiectasia** | **nada** | — | Não pesquisado |
| **SAHOS** | **nada** | — | Não pesquisado |
| **Tabagismo** | **nada** | — | Sem base; é fator de risco, não estado ventilatório |
| **Insuficiência cardíaca** | **nada** | — | Sem fonte; se o mentor ajusta PEEP por hemodinâmica, é `Parecer` |
| **Hipertensão** | **nada** | — | Sem base |
| **Diabetes** | **nada** | — | Sem base (relevância é ácido-base, Fase 6) |
| **Doença renal crônica** | **nada** | — | Sem fonte; margem de hipercapnia é raciocínio, não literatura |
| **Neoplasia** | **nada** | — | Sem base |
| **Infiltrado bilateral** | **nada** | confirma a base ARDSnet | Tabela high não pesquisada |
| **Atelectasia** | **nada** | — | Não pesquisado |
| **Pneumotórax** | **nada** | — | Não pesquisado; qualquer número seria invenção |
| **Hiperinsuflação** | (gatilho) | deveria acionar a lógica obstrutiva mesmo sem comorbidade marcada | Inferência nossa a partir da seção 1 |

**Leitura em uma frase:** de treze comorbidades e quatro achados de imagem,
**quatro condições têm modulação com fonte** (DPOC, asma, obesidade, doença
neurológica), **uma tem ressalva sem número** (fibrose), e **as doze restantes
não têm base publicada para mexer em nada** — e é assim que devem aparecer.

---

# Perguntas que restam para o mentor

## As que precisam do julgamento dele, porque não há literatura

1. **Volume corrente na obesidade — o app está errado?** Hoje ele desloca a
   faixa para 6–8 com alvo **7 ml/kg**. A revisão que li (De Jong 2020) diz
   *"low tidal volume (6 ml/kg of predicted body weight)"* e alerta que o
   peso predito **estimado** tende a ser superestimado no obeso. **Mantemos
   7, voltamos para 6, ou fica 6–8 sem alvo no meio?** Esta é a decisão mais
   consequente do dossiê.

2. **80% ou 85% do auto-PEEP?** Ranieri 1993 diz que acima de **85%** da
   PEEPi há hiperinsuflação; Demoule 2020 diz que a PEEP externa não muda a
   hiperinsuflação até aproximar **80%** da PEEPi. Exibimos a faixa "80 a
   85%", ou o senhor prefere um número único — e qual?

3. **Qual é o piso de pH na asma?** O 7,25–7,30 que tenho está escrito para
   **DPOC**, não para asma. **Não achei piso publicado para asma.** Qual é o
   seu? Ele entraria como `Parecer`, com o nome dele, como já foi feito com
   `parecer_tre_ph`.

4. **Qual é o piso de PEEP na obesidade?** O "8" que propus é meu
   arredondamento do extremo inferior da faixa 7–20 de uma revisão narrativa.
   **É o número mais frágil deste documento.** Qual o senhor usa?

5. **Quantos graus de cabeceira na obesidade?** A fonte diz "Trendelenburg
   reversa, cadeira de praia ou sentada" e **nenhum ângulo**. Se o app for
   mostrar 30° ou 45°, o número tem que ser dele.

6. **O piso de frequência de 12/min do motor.** Hoje `sugerirVentilacao` tem
   `Math.max(12, …)`. Em asma a recomendação publicada é "low respiratory
   rate", e frequências de 10 ou menos aparecem na prática. **O piso deve
   cair em asma? Até quanto?**

   **A pergunta continua aberta, e ficou mais nítida.** A fase chegou a embarcar
   um piso obstrutivo de 10, e a onda de correção do fim dela o REMOVEU. Duas
   razões. A primeira é que ele nunca entrava em vigor: o peso predito se
   cancela na conta da frequência, então o valor bruto é sempre 17 ou 14 e
   nenhum piso é alcançado — a tela afirmava um rebaixamento que não acontecia.
   A segunda é esta pergunta aqui: **o 10 saiu de lugar nenhum**. Não é
   publicado, não é parecer do senhor, e as fontes citadas dizem só "frequência
   baixa". Era número clínico inventado, exibido sob fontes que não o sustentam.

   Hoje o aplicativo **não rebaixa** a frequência do paciente obstrutivo. A
   modulação continua na tela, dizendo o que é verdade: alvo de I:E de 1:4 a
   1:6, e quem regula a frequência é o terapeuta. O piso de 12 do clamp
   permanece no código e, pelo mesmo cancelamento, também não é alcançado por
   paciente nenhum.

   Então a pergunta ao senhor é a mesma de antes, e nenhum número entra na tela
   até ela ser respondida: **existe piso de frequência em obstrutivo, e qual
   é?**

7. **PEEP e insuficiência cardíaca.** O senhor ajusta PEEP pensando em
   pré-carga/pós-carga? Se sim, **isso é prática, não literatura**, e eu não
   tenho fonte para colocar na tela. Qual é a sua regra?

8. **Hipercapnia permissiva em doente renal crônico.** A compensação
   metabólica está reduzida. O senhor estreita a margem? **Sem fonte lida —
   seria `Parecer`.**

## As que são decisão de produto, e ele precisa opinar

9. **"Doença neurológica" não é "lesão cerebral aguda".** Toda a evidência de
   PaCO₂ 35–45 vale para lesão **aguda** (TCE, AVC agudo, HSA), e a checkbox
   do app marca também sequela antiga, doença neuromuscular e demência.
   **Criamos um campo novo "lesão cerebral aguda", ou deixamos o alvo como
   informação condicional sem modular nada?** Aplicar a fonte à checkbox
   atual seria sobre-aplicá-la, e num paciente neuromuscular com DPOC ela
   empurraria na direção errada.

10. **O conflito DPOC/asma × lesão cerebral aguda.** Um paciente pode ter os
    dois. A hipercapnia permissiva que a obstrução exige colide com o alvo de
    PaCO₂ 35–45. O ACS 2024 reconhece o conflito e manda priorizar o pulmão
    controlando a PIC por outros meios. **O app deve mostrar o conflito e
    parar, ou escolher um lado?** Minha recomendação é mostrar e parar — mas
    é escolha dele.

11. **Hiperinsuflação na imagem como gatilho.** Faz sentido que o achado
    radiológico acione a lógica obstrutiva mesmo sem DPOC ou asma marcada?
    Nenhuma fonte estuda isso; é inferência nossa.

12. **Fibrose: aviso de prognóstico na tela?** A diretriz ATS/ERS/JRS/ALAT
    2011 recomenda **fracamente contra ventilar** a maioria desses pacientes
    (⊕⊕○○). É informação relevante e é delicada. **Entra, e com que
    redação?**

## O que eu preciso dele para fechar buracos deste dossiê

13. **AMIB/SBPT 2024, *Orientações Práticas em Ventilação Mecânica*.** Está
    citado no app com `verificada: false` e **eu não consegui acessá-lo**. Se
    o senhor tiver o PDF, ele é a fonte preferencial para DPOC e asma no
    contexto brasileiro e pode **confirmar ou corrigir** os números das
    seções 1 e 2 com autoridade que Demoule 2020 não tem aqui.

14. **Brain Trauma Foundation, 4ª edição.** A recomendação Nível IIB contra
    hiperventilação profilática com PaCO₂ ≤ 25 mmHg aparece em toda fonte
    secundária, **mas eu não li o original** e por isso ela não está citada
    como `Publicacao` aqui. Se o senhor tiver o documento, ela fecha a seção
    4 com uma graduação a mais.

15. **Manobra de recrutamento e infiltrado bilateral.** Não pesquisei a
    tabela **high PEEP** do ARDSnet nem recrutamento em atelectasia. Vale uma
    Fase 9, ou o senhor já tem posição fechada sobre isso?

---

## Decisões do mentor clínico, 02/09/2026

### 1. Volume corrente no obeso: **até 8 ml/kg**, reafirmado

Apresentado o achado de que De Jong 2020 (ICM 46(12):2423-2435) afirma
textualmente *"Low VT according to PBW should be used both in non-ARDS and ARDS
patients"*, e o agravante de que o peso predito ESTIMADO tende a ser
superestimado no obeso, ele respondeu: *"vc no obeso pode considerar ate 8"*.

Reafirmação depois de ver a evidência contrária vale como decisão. O que muda é
a **procedência**, não o número: a faixa de 6 a 8 no obeso passa a ser
`Parecer`, com a nota declarando que De Jong 2020 recomenda 6 nos dois grupos.
Mesmo tratamento do pH 7,35 contra o 7,32 do Boles.

**Nada no código muda.** `sugerirVc` e `classify.vcKg` já fazem isso desde a
Fase 4; o que faltava era a fonte dizer a verdade sobre de onde o número vem.

### 2. Lesão cerebral aguda ganha caixa própria (opção c)

Ele escolheu criar um campo separado, em vez de aplicar o alvo de PaCO₂ à
caixinha genérica "Doença neurológica" ou de aplicá-lo com aviso.

É a resposta certa pelo motivo levantado na pergunta: "Doença neurológica" pega
desde TCE agudo até doença neuromuscular crônica, e num neuromuscular com DPOC
o alvo de 35-45 empurraria na direção errada.

Consequência: `COMORBIDITIES` em `src/data/comorbidities.ts` ganha uma entrada,
e só ela dispara o alvo de PaCO₂ de ESICM/Robba 2020 (recomendação forte,
evidência de qualidade baixa).

### 3. DPOC e asma: tratar **separadamente**, na direção oposta

*"sim são estimações diferentes de DPOC e Asma, considere as duas se quiser
separar a forma de pensar já que são divergentes"*.

Confirma o ponto que a pesquisa levantou e que era o risco de errar: as duas são
obstrutivas, e a PEEP vai em direções opostas — na DPOC com teto em 80-85% do
auto-PEEP, na asma baixa, até 5. O aplicativo trata as duas como patologias
distintas, nunca como "obstrutivo" genérico.

Ressalva mantida: a fonte principal desses conjuntos (Demoule 2020) é revisão
narrativa sem GRADE, e isso vai declarado na nota.

### 4. As doze sem base publicada: **não muda nada**

*"não precisa mudar nada não"*.

Fibrose, bronquiectasia, SAHOS, tabagismo, insuficiência cardíaca, hipertensão,
diabetes, doença renal crônica, neoplasia e os achados de imagem seguem sem
modulação. O aplicativo mantém o alvo base para esses pacientes, e isso é
decisão registrada, não lacuna a preencher depois.
