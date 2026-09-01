# Dossiê clínico — Ventila Fisio, Fase 2

Para: mentor clínico
De: equipe de desenvolvimento
Data: 01/09/2026

## Como usar este documento

Este documento não afirma nada novo sobre o cuidado de nenhum paciente. Ele
reúne, de um lado, oito perguntas que ficaram em aberto na fase anterior do
projeto (embasamento do que o aplicativo já mostra hoje) e, de outro, um
levantamento de literatura para três dos quatro blocos novos que o cliente
pediu em seguida: gasometria interpretada, mecânica respiratória avançada e
teste de respiração espontânea (TRE) passo a passo. O quarto bloco, alvos
ventilatórios por patologia, ainda não teve sua própria busca de fontes e
fica para uma rodada seguinte deste mesmo dossiê. Nenhum dos quatro blocos
entra no aplicativo antes de revisão do mentor. Onde uma fonte foi
encontrada e conferida, ela está registrada com o que sustenta e,
igualmente importante, com o que **não** sustenta — a coluna que existe
porque, na fase anterior, foi exatamente essa checagem que evitou citar
errado um corte numérico duas vezes. Onde não foi possível confirmar um
dado bibliográfico (volume, página ou ano) com segurança, o campo diz
"a confirmar" em vez de trazer um número que pode estar errado. O papel do
leitor é validar, corrigir ou completar cada item; nada aqui deve ser lido
como decisão já tomada.

## Parte 1 — As oito perguntas em aberto

Estas pendências vêm da fase anterior (catálogo de fontes, contexto do
paciente, escores de força/sedação/mobilidade e bundle de cuidados), que já
está implementada e em uso. Nenhuma delas bloqueou aquela entrega — todas
aparecem na tela do aplicativo marcadas como não revisadas — mas nenhuma foi
respondida ainda.

**1. Faixa da driving pressure.** O aplicativo classifica hoje a driving
pressure (pressão de platô menos PEEP) como ideal abaixo de 13 cmH₂O, atenção
entre 13 e 15, e alto risco acima de 15. A referência citada no rodapé
(Amato e cols., 2015) demonstra que essa variável é a mais associada à
sobrevida em SDRA, mas não estabelece o corte de 13 — o estudo mostra o
efeito por incremento contínuo, não um ponto de corte fixo. Nesta revisão
encontramos que a diretriz brasileira já catalogada no aplicativo
(Orientações Práticas em Ventilação Mecânica, AMIB/SBPT, edição 2024) usa
repetidamente o limite de 15 cmH₂O como teto recomendado em diferentes
contextos de ventilação — o que é compatível com o segundo degrau da faixa
do aplicativo, mas não confirma nem sustenta isoladamente o primeiro corte,
em 13. Pergunta: qual é a fonte correta para o corte de 13, ou a faixa deve
ser reformulada (por exemplo, unificando o alerta em ≤15 cmH₂O)?

**2. Grupos musculares do MRC.** O somatório de força muscular (escore MRC)
usado no aplicativo tem seis grupos por lado, e a literatura diverge sobre se
o cotovelo deve entrar por flexão ou por extensão. O rótulo ficou
propositalmente neutro no catálogo interno até esta decisão. Pergunta: qual
lista de doze movimentos adotar?

**3. RASS e o critério de extubação por Glasgow.** O critério de prontidão
para extubação usa hoje Glasgow ≥ 8. Um paciente intubado não tem resposta
verbal avaliável, e por isso a escala usada rotineiramente durante a
ventilação mecânica é o RASS (nível de sedação/agitação), não o Glasgow.
Pergunta: o RASS deve substituir o Glasgow nesse critério, acompanhá-lo, ou o
Glasgow permanece como está?

**4. PImax e pico de fluxo de tosse (PCF) sem fonte atribuída.** O aplicativo
usa PImax ≤ -30 cmH₂O como "ideal" e ≤ -20 cmH₂O como critério de prontidão
para extubação, e pico de fluxo de tosse ≥ 60 L/min como "tosse eficaz",
ambos sem citação até hoje. Nesta revisão encontramos, na diretriz brasileira
já catalogada (Tema 26, tabela de índices preditores de desmame), a linha
exata "Pressão inspiratória máxima (PImax) < -30 cmH₂O" — o mesmo número que
o aplicativo já usa como ideal. A diretriz atribui essa tabela, em conjunto, a
três referências (uma delas uma revisão sistemática de fatores preditivos de
desmame de 2018); não foi possível, no tempo desta revisão, isolar qual das
três sustenta especificamente o número de PImax, então a citação exata "a
confirmar" antes de entrar no rodapé do aplicativo. Já o consenso
internacional de desmame também catalogado (Boles e cols., 2007) usa, para
prontidão, uma faixa um pouco diferente: PImax ≤ -20 a -25 cmH₂O. Nenhuma das
fontes revisadas nesta rodada — nem a diretriz brasileira, nem o consenso
internacional — traz um número equivalente para pico de fluxo de tosse
(60 L/min); essa citação continua sem fonte encontrada. Pergunta: o corte de
PImax pode se apoiar na diretriz brasileira (uma vez confirmada a referência
exata) ou deve seguir o consenso internacional; e existe fonte para o corte
de 60 L/min de PCF, ou ele precisa ser revisto?

**5. Catálogo do bundle de cuidados.** Quais ações entram na aba de
Cuidados (aspiração, cuffometria, higiene oral, mudança de decúbito etc.) e
qual nomenclatura usar. Não foi objeto de pesquisa bibliográfica nesta
rodada.

**6. Lista fechada de comorbidades.** Quais comorbidades pulmonares e não
pulmonares entram no catálogo de contexto do paciente. Também não foi objeto
desta rodada.

**7. Faixa intermediária do MRC (48 a 59, "Força reduzida").** De Jonghe e
cols. (2002) — já catalogada — estabelece o corte abaixo de 48 para fraqueza
muscular adquirida na UTI, mas não define a faixa intermediária entre 48 e
59, que hoje aparece no aplicativo com "Força reduzida" atribuída à mesma
fonte. Pergunta: essa faixa intermediária permanece, e sob qual fonte?

**8. Escores gravados mas nunca exibidos.** RASS, IMS e MRC já são
capturados e salvos, mas nenhuma tela hoje os traz de volta: não aparecem em
gráfico de tendência, no histórico de evolução, nem no cabeçalho do
paciente. Não é uma dúvida clínica — é uma lacuna de entrega. Registrada
aqui, como já estava no documento técnico da fase anterior, para que não
apareça como surpresa numa demonstração ao cliente: a leitura desses três
escores é trabalho desta fase em diante.

## Parte 2 — Fontes candidatas para os próximos blocos

Nesta parte, cada fonte é apresentada com o que ela sustenta e o que **não**
sustenta. Onde a diretriz brasileira de ventilação mecânica (AMIB/SBPT 2024,
já catalogada) trata diretamente do assunto, ela aparece primeiro, porque é
a espinha dorsal nacional adotada desde a fase anterior — mas mesmo ela é
conferida contra o texto e contra a literatura internacional que cita, não
tomada de memória.

### Gasometria

**Interpretação ácido-base — visão geral do método**

- **Yee J, Frinak S, Mohiuddin N, Uduman J. "Fundamentals of Arterial Blood
  Gas Interpretation." Kidney360. 2022;3(8):1458-1466.**
  Sustenta: revisão moderna do método passo a passo de interpretação de
  gasometria (validar a amostra, identificar o distúrbio primário, checar se
  a resposta compensatória está dentro do esperado, e só então falar em
  distúrbio misto). É a fonte que a própria diretriz brasileira (abaixo)
  declara ter adaptado para sua tabela de fórmulas de compensação. Não
  sustenta: é artigo de revisão, não estudo original — as fórmulas que
  reproduz vêm, em última instância, de estudos fisiológicos anteriores.
  Confirmado por busca direta (autores, periódico, volume, fascículo e
  páginas conferem). **A confirmar:** não foi possível verificar se o
  próprio artigo também trata ânion-gap — o acesso ao texto completo está
  bloqueado, e essa parte da checagem ficou pendente.

- **AMIB/SBPT. Orientações Práticas em Ventilação Mecânica, edição 2024**
  (já catalogada na página de fontes do aplicativo). Sustenta: dedica um tema inteiro
  (Tema 8, "Monitorização das trocas gasosas") à gasometria arterial,
  incluindo indicação, técnica de coleta e, principalmente, uma tabela
  própria com as fórmulas de compensação esperada para os quatro distúrbios
  primários (ver próximo bloco). Também descreve o método de interpretação
  em três etapas: validar a amostra, diagnosticar o distúrbio primário, e
  determinar qual distúrbio domina o quadro quando há mais de um. Não
  sustenta: não define nem usa o conceito de ânion-gap em nenhum ponto do
  documento (conferido por busca no texto completo) — se o aplicativo
  quiser calcular ânion-gap, a diretriz nacional não cobre esse ponto e é
  preciso citar literatura internacional à parte (abaixo). Também não usa
  explicitamente o termo "distúrbio misto", ainda que a lógica de "distúrbio
  dominante" cubra parte da mesma ideia.

- **Berend K, de Vries APJ, Gans ROB. "Physiological Approach to Assessment
  of Acid-Base Disturbances." N Engl J Med. 2014;371(15):1434-1445.**
  Sustenta: revisão de referência sobre a mesma lógica passo a passo, com
  tabela de bolso e discussão de ânion-gap corrigido por albumina. Não
  sustenta: também é revisão, não estudo original. Citação confirmada por
  busca direta.

**Regras de compensação esperada**

- **AMIB/SBPT 2024, Tema 8, Tabela 1** ("Fórmulas de compensação para os
  quatro distúrbios ácido-base primários", adaptada de Yee e cols.).
  Sustenta, com as seis equações completas:
  - Acidose metabólica: PaCO2 = 1,54 × [HCO3⁻] + 8,36 (± 2,2)
  - Alcalose metabólica: PaCO2 = 0,7 × [HCO3⁻] + 20 (± 5)
  - Acidose respiratória aguda: ΔHCO3⁻ = 0,1 × ΔPaCO2
  - Acidose respiratória crônica: ΔHCO3⁻ = 0,35 × ΔPaCO2
  - Alcalose respiratória aguda: ΔHCO3⁻ = 0,2 × ΔPaCO2
  - Alcalose respiratória crônica: HCO3⁻ = 0,41 × PaCO2 + 9,1
  Isto é: a diretriz nacional já catalogada cobre as seis regras de
  compensação numa única tabela citável, o que resolve para o aplicativo a
  necessidade de garimpar cada fórmula em artigo separado. Não sustenta:
  como o próprio nome da tabela diz, ela é adaptada de outra fonte (Yee e
  cols. 2022, acima) — a diretriz não é o estudo original de nenhuma das
  seis equações, é quem as compila e assina.

- **Albert MS, Dell RB, Winters RW. "Quantitative displacement of acid-base
  equilibrium in metabolic acidosis." Ann Intern Med. 1967;66(2):312-322.**
  Sustenta: é o estudo fisiológico original da fórmula de compensação da
  acidose metabólica (regressão em pacientes com acidose metabólica de grau
  variado), reportada na literatura secundária como PaCO2 = 1,5 × [HCO3⁻] + 8
  — coeficiente um pouco diferente do de Yee/AMIB acima (1,54 × [HCO3⁻] +
  8,36). A diferença aparenta ser de casas decimais de reanálises
  posteriores, não duas regras distintas, mas registro a diferença para não
  escolher um número sem avisar que existe o outro. Não sustenta: cobre só a
  acidose metabólica; não é fonte das outras cinco regras. A citação em si
  (autores, periódico, volume, fascículo e páginas) foi confirmada de forma
  independente; o valor exato do coeficiente "1,5 × + 8" vem de literatura
  secundária que cita o estudo, não da leitura direta do texto original de
  1967 — **a confirmar** contra o artigo primário antes de citar o número
  no aplicativo.
  **A confirmar:** não foi possível, nesta rodada, localizar e confirmar os
  estudos fisiológicos originais de cada uma das outras cinco regras
  (alcalose metabólica; acidose e alcalose respiratória, agudas e
  crônicas) individualmente. A tabela da AMIB/SBPT 2024 (via Yee 2022) é
  citável para as seis em conjunto; a derivação histórica de cada uma
  isoladamente fica pendente.

**Ânion-gap**

- **Emmett M, Narins RG. "Clinical use of the anion gap." Medicine
  (Baltimore). 1977;56(1):38-54.**
  Sustenta: é a referência clássica que estabelece o uso do ânion-gap para
  diferenciar acidose metabólica com gap aumentado (acúmulo de ácido) de
  gap normal (perda de bicarbonato). Não sustenta: os valores de referência
  de "normal" citados datam de método analítico de 1977, hoje considerado
  desatualizado pela literatura mais recente (abaixo). Confirmado por busca
  direta.

- **Kraut JA, Madias NE. "Serum anion gap: its uses and limitations in
  clinical medicine." Clin J Am Soc Nephrol. 2007;2(1):162-174.**
  Sustenta: atualização do uso clínico do ânion-gap, incluindo correção por
  albumina sérica e o fato de que a faixa "normal" caiu com a instrumentação
  laboratorial moderna (os valores de 1977 estão superestimados para os
  métodos de hoje). Não sustenta: não é o conceito original, depende da
  referência de 1977 acima para a atribuição de autoria do conceito.
  Confirmado por busca direta.
  **Observação:** nenhuma das duas fontes de ânion-gap tem contrapartida na
  diretriz brasileira — como já registrado acima, a AMIB/SBPT 2024 não
  aborda ânion-gap. Se o aplicativo passar a calculá-lo, essa citação
  precisa vir só da literatura internacional.

### Mecânica respiratória

**P0.1 (pressão de oclusão em 0,1 segundo — indicador de drive
ventilatório)**

- **AMIB/SBPT 2024, Tema 7, seção C.1.** Sustenta: propõe faixa de
  1,5 a 3,5 cmH₂O para uso em modos espontâneos (abaixo de 1,5,
  hiperassistência; acima de 3,5, subassistência), citando dois artigos
  internacionais (abaixo). O próprio texto da diretriz avisa que essa
  recomendação tem "baixo grau de evidência" e pede cautela em pacientes
  com auto-PEEP, que pode subestimar o valor real. Não sustenta: não é
  estudo original — é recomendação de baixo grau de evidência,
  explicitamente qualificada como tal pelo próprio documento.

- **Telias I, Junhasavasdikul D, Rittayamai N, e cols. "Airway Occlusion
  Pressure As an Estimate of Respiratory Drive and Inspiratory Effort during
  Assisted Ventilation." Am J Respir Crit Care Med. 2020;201(9):1086-1098.**
  Sustenta: em pacientes ventilados (não voluntários saudáveis), valida que
  P0.1 acima de 3,5-4,0 cmH₂O identifica esforço inspiratório alto (boa
  sensibilidade e especificidade) e P0.1 igual ou abaixo de 1,0 cmH₂O
  identifica esforço baixo — esses números vêm deste mesmo estudo, não são
  emprestados. Não sustenta: mostra também que o valor de P0.1 mostrado por
  diferentes marcas de ventilador nem sempre bate com o valor de referência
  medido corretamente — ou seja, o número na tela do aparelho pode não ser
  confiável. **Nota para o mentor:** a faixa desta fonte (subassistência
  acima de 3,5-4,0; hiperassistência abaixo de 1,0) não é idêntica à faixa
  citada pela diretriz brasileira (1,5 a 3,5) — são recortes um pouco
  diferentes do mesmo fenômeno, e vale decidir qual adotar.

- **Whitelaw WA, Derenne JP, Milic-Emili J. "Occlusion pressure as a measure
  of respiratory center output in conscious man." Respiration Physiology.
  1975;23:181-199.**
  Sustenta: é o artigo que descreve o método originalmente, medido em
  voluntários saudáveis acordados, não em pacientes ventilados. Não
  sustenta: nenhum corte clínico — é fisiologia básica, útil para explicar o
  que a medida representa, não para justificar um número de decisão.
  Citação confirmada de forma independente (autores/periódico/volume/
  páginas), mas o texto completo não foi lido diretamente (acesso pago); o
  conteúdo relatado aqui vem de fontes secundárias convergentes.

**Pmus (pressão muscular respiratória) e ΔPocc (pressão de oclusão
expiratória)**

- **AMIB/SBPT 2024, Tema 7, seção C.2.** Sustenta: descreve a manobra de
  Pocc (oclusão ao final da expiração, até 5 segundos, medindo a maior
  deflexão de pressão negativa durante o esforço do paciente) como forma de
  estimar tanto a Pmus quanto a driving pressure transpulmonar dinâmica sem
  precisar de balão esofágico. Propõe Pmus estimada = -3/4 × Pocc (75% do
  valor de Pocc) e considera aceitável uma Pmus estimada entre 5 e
  10 cmH₂O. O próprio texto avisa que "esses valores ainda estão sob
  pesquisa e podem vir a sofrer alterações após esta publicação" — ou seja,
  a diretriz nacional já sinaliza que não é um número fechado. Não
  sustenta: como no P0.1, é recomendação prática, não o estudo original.

- **Bertoni M, Telias I, Urner M, e cols. "A novel non-invasive method to
  detect excessively high respiratory effort and dynamic transpulmonary
  driving pressure during mechanical ventilation." Critical Care.
  2019;23(1):346.** (é a referência que a própria diretriz brasileira cita
  para este ponto.) Sustenta: é o estudo original que valida a Pocc como
  estimativa não invasiva de esforço, mostrando boa capacidade de
  identificar quando a Pmus real ultrapassa 10 cmH₂O e quando a driving
  pressure transpulmonar dinâmica ultrapassa 15 cmH₂O. Não sustenta: o
  próprio artigo apresenta os cortes de 10 e 15 cmH₂O como limites de
  segurança já descritos em literatura fisiológica anterior — o estudo
  valida a capacidade da Pocc de detectar quando esses limites são
  cruzados, não é ele quem originalmente definiu "10" e "15" como seguros.
  **A confirmar:** não foi possível, nesta rodada, identificar com segurança
  qual é essa literatura fisiológica anterior que estabeleceu os números 10
  e 15 em si — o texto completo do artigo não pôde ser acessado diretamente
  (bloqueio de acesso), e o conteúdo relatado vem de fontes secundárias
  convergentes.

- **Dianti J, Bertoni M, Goligher E. "Monitoring patient-ventilator
  interaction by an end-expiratory occlusion maneuver." Intensive Care Med.
  2020;46:2338-2341.** Sustenta: descreve tecnicamente a manobra de oclusão
  expiratória usada para medir a Pocc (é a fonte da figura que a diretriz
  brasileira reproduz). Não sustenta: é descrição de técnica, não estudo de
  corte clínico. Confirmado por busca direta.

- **Akoumianaki E, Maggiore SM, Valenza F, e cols. "The Application of
  Esophageal Pressure Measurement in Patients with Respiratory Failure."
  Am J Respir Crit Care Med. 2014;189(5):520-531.** Sustenta: é o
  documento técnico de referência (grupo internacional PLUG/ESICM) para a
  medida padrão-ouro de Pmus por pressão esofágica, para quando o método
  não invasivo (Pocc) não for suficiente. Não sustenta: nenhum corte
  numérico de gravidade — é técnica de medição.

**Avaliação de recrutabilidade — recruitment-to-inflation ratio (R/I ratio)**

- **Chen L, Del Sorbo L, Grieco DL, e cols. "Potential for Lung Recruitment
  Estimated by the Recruitment-to-Inflation Ratio in Acute Respiratory
  Distress Syndrome. A Clinical Trial." Am J Respir Crit Care Med.
  2020;201(2):178-187.** Sustenta: define o método (uma manobra de
  respiração única, liberando a PEEP de um valor alto para um baixo e
  comparando o volume expirado com o previsto pela complacência) e mostra,
  em 45 pacientes com SDRA, que o R/I ratio se correlaciona com a resposta
  de oxigenação ao aumento de PEEP. É a métrica hoje considerada moderna
  para recrutabilidade, no lugar de fórmulas antigas soltas. Não sustenta:
  o corte de R/I ≤ 0,5 (baixo potencial) contra > 0,5 (alto potencial) **é
  a mediana da própria amostra de 45 pacientes deste estudo**, usada para
  dividir o grupo em dois para a análise — não é um ponto de corte validado
  de forma independente contra um desfecho clínico duro (mortalidade, dias
  de ventilação). **Atenção do mentor recomendada especificamente aqui:**
  antes de o aplicativo apresentar "0,5" como se fosse um limiar de decisão
  clínica validado, vale registrar que a origem desse número é
  estatística-descritiva de um estudo com uma amostra pequena, não um corte
  desenhado e testado como tal.
  **Observação:** a diretriz brasileira (AMIB/SBPT 2024) trata manobras de
  recrutamento alveolar como técnica terapêutica (Tema 24), mas não aborda o
  R/I ratio nem qualquer método equivalente de avaliar recrutabilidade antes
  de decidir a PEEP — este bloco não tem, hoje, apoio na diretriz nacional.

### Teste de respiração espontânea (TRE)

**Critérios de aptidão para iniciar o TRE**

Já catalogadas na fase anterior: o consenso internacional de desmame (Boles
2007) e a diretriz brasileira (AMIB/SBPT 2024). Ambas foram lidas
diretamente (não por resumo de terceiros) para esta seção.

- **Boles JM, Bion J, Connors A, e cols. "Weaning from mechanical
  ventilation." Eur Respir J. 2007;29(5):1033-1056.** Sustenta uma lista de
  critérios clínicos e objetivos de prontidão (Tabela 5 do documento):
  resolução da fase aguda da doença; tosse adequada; frequência cardíaca até
  140/min; pressão arterial sistólica entre 90 e 160 mmHg sem ou com mínimo
  de vasopressor; saturação acima de 90% com FiO2 até 0,4; PEEP até
  8 cmH₂O; frequência respiratória até 35/min; PImax entre -20 e
  -25 cmH₂O; volume corrente acima de 5 mL/kg; relação f/VC abaixo de 105;
  sem acidose respiratória significativa; mentação adequada. O próprio texto
  chama esses itens de "considerações", não de critérios rígidos que
  precisem estar todos presentes ao mesmo tempo. Não sustenta: não define um
  único número fechado por parâmetro nem exige simultaneidade.

- **AMIB/SBPT 2024, Tema 25, seção B.** Sustenta uma lista equivalente, mais
  enxuta: resolução/estabilidade da condição de base; PaO2 acima de
  60 mmHg; SpO2 acima de 90%; FiO2 até 40%; PEEP até 8 cmH₂O; capacidade de
  disparar o ventilador; frequência respiratória até 35/min; ausência de
  drogas vasoativas (ou doses baixas e estáveis) e de arritmia grave ou
  isquemia; nível de consciência adequado, sem sedação ou com sedação
  mínima; ausência de distúrbio metabólico grave. Não traz um número de
  PImax nesta lista específica de prontidão (o número de PImax que a mesma
  diretriz usa aparece só na tabela de índices preditores de desmame
  difícil, discutida na Parte 1, pendência 4). Também qualifica os itens
  como "indicadores de possibilidade", não critérios obrigatórios e
  simultâneos — mesma ressalva de Boles 2007, que a diretriz cita
  diretamente nesse trecho.

**Critérios de falha durante o TRE**

- **Boles 2007 (mesma referência acima), Tabela 6.** Sustenta critérios de
  falha combinando valor absoluto ou variação percentual em relação à
  basal: frequência respiratória acima de 35/min ou aumento de 50% ou mais;
  frequência cardíaca acima de 140 ou aumento de 20% ou mais; pressão
  sistólica acima de 180 (ou aumento de 20% ou mais) ou abaixo de 90; SpO2
  abaixo de 90% ou PaO2 abaixo de 50-60 mmHg com FiO2 de pelo menos 0,5;
  PaCO2 acima de 50 mmHg ou aumento de mais de 8 mmHg; pH abaixo de 7,32 ou
  queda de 0,07 ou mais; além de sinais clínicos (agitação, ansiedade,
  rebaixamento de consciência, sudorese, cianose, uso de musculatura
  acessória, sinais de esforço respiratório).

- **AMIB/SBPT 2024, Tema 25, seção C.1.** Sustenta uma lista com o mesmo
  núcleo qualitativo, mas com números absolutos fixos, sem a cláusula de
  variação percentual: frequência respiratória acima de 35/min; uso de
  musculatura acessória; sudorese; SpO2 persistentemente abaixo de 90% com
  FiO2 de pelo menos 40%; se houver gasometria ao final do teste, PaO2
  abaixo de 60 mmHg com FiO2 de pelo menos 40%, PaCO2 acima de 50 mmHg (ou
  aumento acima de 8 mmHg) e **pH abaixo de 7,35**; frequência cardíaca
  persistentemente acima de 140; pressão sistólica abaixo de 90 ou acima de
  180 mmHg; sinais de hipoperfusão, arritmia grave ou isquemia; rebaixamento
  de consciência; agitação ou ansiedade. A diretriz cita Boles 2007 para a
  classificação de estágios de desmame, mas usa bibliografia mais recente
  (ensaios de 2017, 2019 e 2022) especificamente para os critérios de
  falha. **Diferença relevante para o mentor decidir:** o corte de pH de
  falha é mais conservador na diretriz brasileira (abaixo de 7,35) do que em
  Boles 2007 (abaixo de 7,32, ou queda de 0,07) — dispara "falha" mais
  cedo. Os dois documentos convergem em tudo o mais: frequência
  respiratória acima de 35, frequência cardíaca acima de 140, pressão
  sistólica fora de 90-180, dessaturação, agitação, sudorese e uso de
  musculatura acessória.

- **MacIntyre NR, Cook DJ, Ely EW Jr, e cols. "Evidence-based guidelines for
  weaning and discontinuing ventilatory support." Chest. 2001;120(6
  Suppl):375S-395S.** Candidata nova, não catalogada ainda. Sustenta: uma
  compilação de faixas (não pontos fixos) usadas em vários ensaios clínicos
  para definir tolerância ao TRE — por exemplo, SpO2 entre 85 e 90%,
  frequência cardíaca entre 120 e 140 ou variação até 20%, pressão sistólica
  entre 90 e 200 com variação até 20%, frequência respiratória até 30-35 ou
  variação até 50%. Não sustenta: o próprio documento avisa que essas são
  faixas usadas por estudos diferentes, não uma recomendação numérica única
  e fechada da força-tarefa; também reconhece que os índices preditivos
  clássicos (como o próprio f/VC) têm baixa capacidade de prever o
  resultado individualmente. Citação de autores, periódico e ano confirmada
  de forma independente; a paginação exata do Chest (375S-395S) foi
  confirmada por indexação bibliográfica, não por leitura direta das
  páginas do Chest em si — o conteúdo relatado aqui vem da publicação
  simultânea idêntica em Respiratory Care (2002;47(1):69-90), que é o mesmo
  documento sob acordo de copublicação entre as duas revistas.

## Parte 3 — Uma decisão de escopo profissional

A interpretação de gasometria, quando aponta uma acidose metabólica, abre uma
pergunta que este documento não responde: sugerir uma dose de correção com
bicarbonato é conduta médica, não fisioterapêutica. O Ventila Fisio é hoje
usado por fisioterapeutas à beira do leito. O aplicativo pode, com base nas
fontes acima, identificar e classificar um distúrbio ácido-base — por
exemplo, "acidose metabólica com compensação respiratória adequada" ou
"abaixo do esperado" — sem indicar o que fazer a respeito do bicarbonato.
Essa fronteira entre **identificar** e **recomendar tratamento** é uma
decisão do mentor e do Jeann, não uma escolha técnica. Este documento se
limita a registrar a pergunta: até onde a interpretação ácido-base do
aplicativo deve ir, e onde termina o que é escopo de fisioterapia?

## Parte 4 — O que muda no aplicativo conforme a resposta

| Pergunta / bloco | Se resolvida, o efeito na tela |
|---|---|
| 1. Faixa da driving pressure | Rodapé do painel de driving pressure passa a citar a fonte correta (ou os números da faixa mudam, se for essa a decisão) |
| 2. Grupos musculares do MRC | O rótulo do grupo "cotovelo" no painel de escores passa a dizer flexão ou extensão |
| 3. RASS x Glasgow na extubação | O card de prontidão para extubação passa a checar RASS, Glasgow, ou os dois, conforme a decisão |
| 4. PImax e PCF | Os rodapés dos painéis de PImax e de tosse eficaz ganham citação (hoje não têm nenhuma) |
| 5. Catálogo do bundle | A aba "Cuidados" passa a listar as ações definitivas, com os nomes definitivos |
| 6. Comorbidades | O formulário de admissão e o cabeçalho do paciente passam a usar a lista fechada |
| 7. Faixa 48-59 do MRC | O rodapé do painel de MRC passa a citar corretamente a faixa intermediária, ou ela é removida |
| 8. Escores só de escrita | RASS, IMS e MRC passam a aparecer no gráfico de tendência, no histórico de evolução e no cabeçalho do paciente |
| Gasometria interpretada | Novo painel na aba de evolução mostra o distúrbio ácido-base identificado, com rodapé citando as fontes da Parte 2 |
| Mecânica nova (P0.1, Pmus, ΔPocc, R/I ratio) | Novos painéis na aba de mecânica/desmame, cada um citando sua fonte e, no caso do R/I ratio, com aviso explícito sobre a natureza do corte de 0,5 |
| TRE passo a passo | Novo checklist guiado na aba de desmame, com os critérios de aptidão e de falha da fonte escolhida (Boles, AMIB/SBPT ou uma combinação decidida pelo mentor) |
| Fronteira do bicarbonato (Parte 3) | Define se o painel de gasometria para na classificação do distúrbio ou também sinaliza necessidade de avaliação médica |
