# Dossiê clínico — Ventila Fisio, Fase 7

Para: mentor clínico
De: equipe de desenvolvimento
Data: 02/09/2026
Assunto: P0.1, ΔPocc, Pmus e recrutabilidade (razão R/I)

## Como usar este documento

Este documento é pesquisa bibliográfica. **Ele não decide nada.** Cada item
traz, separados de propósito e nunca misturados:

1. **O que a fonte realmente diz** (citação ou paráfrase próxima).
2. **Se a fonte diz isso para este uso**, ou se aplicar aqui é inferência
   nossa.
3. **Quão forte é a fonte** (estudo fisiológico, coorte de validação com o
   seu *n*, recomendação de sociedade com a sua graduação, revisão,
   convenção de livro-texto).

Onde um dado bibliográfico **não** pôde ser confirmado numa fonte
efetivamente acessada, o campo diz isso com todas as letras. O repositório é
público e cada número na tela leva uma citação que o usuário pode abrir: uma
citação inventada que se revele errada é pior do que uma lacuna declarada.

### Convenção de tipos deste projeto

O código distingue `Publicacao` (citação real e verificável) de `Parecer`
(juízo de profissional). Onde este documento diz **"convenção"** ou
**"prática"**, o número **não** deve entrar como `Publicacao`.

### O que já está decidido e não se reabre aqui

Registrado a pedido, e nada do que foi lido nesta rodada contradiz:

- O mentor usa **P0.1 e a pressão de oclusão, os dois, de rotina**.
- Para **ΔPocc ele usa os limites 10 e 15**. É prática dele, gravada como
  `Parecer`. Bertoni 2019 valida o **método de detecção**, não a origem
  desses números.
- **P0.1 igual a zero significa ausência de drive** — medida real e grave,
  nunca "sem dado".

Uma observação que **não** reabre a decisão, mas que o mentor precisa ver
antes de o número ir para a tela: os valores **10 e 15 aparecem na
literatura como limites de Pmus**, não de ΔPocc (Bertoni 2019 usa Pmus > 10
como limiar primário e Pmus > 15 como secundário). Como Pmus ≈ 0,75 × |ΔPocc|,
os dois usos **não** são o mesmo número: |ΔPocc| = 10 corresponde a
Pmus ≈ 7,5, e Pmus = 10 corresponde a |ΔPocc| ≈ 13,3. Está na seção de
perguntas finais apenas para o mentor dizer a qual grandeza os limites dele
se aplicam. Não é sugestão de trocar nada.

---

## Pergunta 1 — P0.1: completar a citação e a faixa

### A pergunta

Qual é a publicação real por trás da faixa 1,5 a 3,5 cmH₂O e da
sensibilidade 80% / especificidade 77%, e contra que desfecho essas
características operacionais foram medidas?

### O que eu proponho

Duas mudanças no que o projeto tem hoje, e uma lacuna declarada:

1. **Trocar a atribuição.** Os números 3,5 cmH₂O, sensibilidade 80% e
   especificidade 77% **não** vêm do artigo de Telias, Damiani e Brochard de
   2018. Vêm de **Telias e cols., AJRCCM 2020** (Damiani não é autor deste).
   O artigo de 2018 existe, é dos três, e é sobre P0.1 — mas é uma peça curta
   de revisão, e **não foi possível acessar o seu texto integral** para
   confirmar que ele contenha esses números.

2. **O limite inferior confirmado é 1,0 cmH₂O, não 1,5.** O que Telias 2020
   publica é: **P0.1 ≤ 1,0 cmH₂O foi 100% sensível e 92% específico para
   esforço baixo**. O valor **1,5** aparece em material secundário do próprio
   grupo de Toronto como limite superior do normal em pessoas saudáveis
   (P0.1 ≈ 1 cmH₂O, faixa 0,5–1,5), e como alvo em protocolo de ensaio
   clínico — **não** como ponto de corte validado.

3. **Regra proposta para o aplicativo**, se o mentor confirmar:

   - **P0.1 > 3,5 cmH₂O** → drive/esforço elevado. `Publicacao` (Telias 2020).
   - **P0.1 ≤ 1,0 cmH₂O** → esforço baixo, suspeitar de excesso de assistência
     ou de drive suprimido. `Publicacao` (Telias 2020).
   - **P0.1 = 0** → ausência de drive. Já decidido, `Parecer` do mentor.
   - A faixa "1,5 a 3,5" como **alvo** deve entrar como **`Parecer`/convenção**,
     não como `Publicacao`, enquanto não houver fonte primária que a publique
     como alvo.

### A fonte

**Confirmada (rota: página do artigo no Oxford Academic, que hospeda o
AJRCCM):**

> Telias I, Junhasavasdikul D, Rittayamai N, Piquilloud L, Chen L,
> Ferguson ND, Goligher EC, Brochard L. **Airway Occlusion Pressure As an
> Estimate of Respiratory Drive and Inspiratory Effort during Assisted
> Ventilation.** *Am J Respir Crit Care Med.* 2020;201(9):1086–1098.
> DOI: 10.1164/rccm.201907-1425OC. PMID: 32097569.

**Confirmada (rota: API bibliográfica do Semantic Scholar, registro
completo):**

> Telias I, Damiani F, Brochard L. **The airway occlusion pressure (P0.1) to
> monitor respiratory drive during mechanical ventilation: increasing
> awareness of a not-so-new problem.** *Intensive Care Med.*
> 2018;44(9):1532–1535. DOI: 10.1007/s00134-018-5045-8. PMID: 29350241.

**Não confirmado, explicitamente:**

- O **texto integral do artigo de 2018** não foi acessado. Springer devolveu
  redirecionamento para autenticação e o repositório institucional que o
  hospeda devolveu HTTP 403. **Não posso afirmar** que ele traga a faixa
  1,5–3,5 nem as características operacionais. O que posso afirmar é que
  autores, título, revista, ano, volume, páginas, DOI e PMID conferem.
- O número **do fascículo (9)** de 2018 veio da busca, não da página do
  artigo; volume e páginas vieram do registro bibliográfico.
- **Nenhuma fonte primária lida publica "1,5–3,5" como faixa-alvo validada.**
  A faixa aparece em (a) página educativa do Toronto Centre of Excellence in
  Mechanical Ventilation, assinada por Irene Telias — fonte secundária, do
  grupo autor — e (b) protocolo de ensaio clínico registrado
  (NCT06203405, sedação guiada por P0.1), cujo registro não pôde ser lido.

**Fonte adicional relevante, confirmada:**

> Yang Y, Liu Y, Gao R, Song D, Zhou YM, Miao MY, Chen W, Wang SP, Wang YF,
> Zhang L, Zhou JX. **Use of airway pressure-based indices to detect high and
> low inspiratory effort during pressure support ventilation: a diagnostic
> accuracy study.** *Ann Intensive Care.* 2023;13:111.
> DOI: 10.1186/s13613-023-01209-7. PMID: 37955842.

### O que a fonte realmente diz

**Telias 2020, literal:** P0.1_ref > 3,5 cmH₂O foi *"80% sensitive and 77%
specific for detecting high effort (≥200 cm H₂O · s · min⁻¹)"*. E:
P0.1_ref ≤ 1,0 cmH₂O foi *"100% sensitive and 92% specific for low effort
(≤50 cm H₂O · s · min⁻¹)"*.

**Contra que desfecho:** contra o **produto pressão-tempo esofágico por
minuto (PTPmus/min)**, medido por balão esofágico. Não é desfecho clínico —
não é mortalidade, não é falha de extubação, não é lesão diafragmática. É um
marcador fisiológico de esforço. Esforço alto = PTPmus/min ≥ 200
cmH₂O·s·min⁻¹; esforço baixo = ≤ 50 cmH₂O·s·min⁻¹.

Ainda de Telias 2020: para o **P0.1 exibido pelo ventilador** (P0.1_vent), a
área sob a curva ROC foi **0,81** para esforço alto e **0,92** para esforço
baixo; a correlação intra-sujeito com o PTP esofágico teve **R² = 0,8**. O
artigo avisa que *"ventilators estimating P0.1_vent without occlusions could
underestimate P0.1_ref"* e que, na bancada, o viés médio foi baixo mas **a
precisão variou entre ventiladores**, sendo pior nos pacientes do que na
bancada.

**Sobre o limite inferior — a resposta direta à pergunta:** sim, há apoio
publicado para tratar P0.1 baixo como acionável, e ele é **mais forte** do
que o do limite superior. P0.1 ≤ 1,0 identificou esforço baixo com
sensibilidade 100% e especificidade 92%, e a AUROC do P0.1 do ventilador foi
**maior para esforço baixo (0,92) do que para esforço alto (0,81)**. Yang 2023
chega a conclusão convergente e a declara na própria conclusão: os índices
baseados em pressão de vias aéreas *"could be reliably used to detect low
inspiratory efforts"*, com apoio explícito ao uso à beira do leito **para
evitar a hiperassistência** — enquanto para esforço alto o valor preditivo
positivo foi baixo (0,23 a 0,64) e os autores pedem mais avaliação.

Em termos de decisão clínica, portanto: **P0.1 baixo distingue melhor do que
P0.1 alto.** Se o esforço é baixo, o exame é bom para dizer isso. Se é alto,
o exame levanta a suspeita mas erra muito para o lado positivo.

**Sobre "sobre-assistência ou drive suprimido":** as fontes lidas
**não separam as duas causas**. Elas medem esforço, não a razão do esforço
baixo. Yang 2023 nomeia o uso como *"avoiding over-assistance"*; sedação,
lesão neurológica e alcalose não são distinguidas pelo número. **Atribuir a
causa é inferência clínica, não achado da fonte.** Se o aplicativo escrever
"excesso de assistência" ao lado de um P0.1 ≤ 1,0, isso é `Parecer`, não
`Publicacao`.

**O que aplicar aqui infere:** Telias 2020 mediu em pacientes adultos sob
ventilação assistida, com P0.1 obtido por oclusão de referência. Usar o
número que o ventilador mostra, sem oclusão dedicada, **é uma extrapolação
que o próprio artigo qualifica** (subestimação possível, precisão pior).

### Força da evidência

- **Telias 2020**: estudo fisiológico de acurácia diagnóstica, com padrão de
  referência esofágico. Reúne *"three studies in patients, one in healthy
  subjects, under assisted ventilation, and a bench study with six
  ventilators"*. **O número exato de pacientes não pôde ser confirmado** no
  resumo acessado — declaro isso em vez de estimar. É a melhor fonte
  disponível para P0.1, e é do grupo que criou o campo, não uma coorte
  independente.
- **Yang 2023**: acurácia diagnóstica prospectiva, **28 pacientes adultos**,
  **246 níveis de pressão de suporte testados**, 4 UTIs em 2 hospitais
  acadêmicos, padrão de referência esofágico (Pmus e PTPmus/min). Pequena em
  pacientes, densa em medidas.
- **Telias 2018**: peça curta de revisão/editorial. **Não é estudo primário.**
  Serve para contexto, não para sustentar ponto de corte.

### Divergências

**Há divergência real e recente, e ela precisa aparecer para o mentor.**

> Smits FE, Rietveld PJ, Snoep JWM, van der Velde-Quist F, de Jonge E,
> Schoe A. **P0.1 is an unreliable measure of effort in support mechanical
> ventilation in comparison with esophageal-derived measures of effort: A
> comparison study.** *Crit Care Med.* 2025;53(8):e1650–e1658.
> DOI: 10.1097/CCM.0000000000006745.

Estudo observacional retrospectivo, UTI clínico-cirúrgica mista,
**30 pacientes**, 39 casos, 117 janelas de 5 minutos. Encontrou correlação
fraca do P0.1 com todas as medidas esofágicas de esforço:
**R² = 0,111** contra trabalho respiratório, **R² = 0,113** contra PTP,
**R² = 0,034** contra a variação de pressão esofágica — enquanto as medidas
esofágicas entre si tiveram R² de 0,848 a 0,886. Conclusão dos autores:
*"These findings underscore the importance of being cautious when using P0.1
as a surrogate of respiratory effort."*

Como conciliar: P0.1 mede **drive**, não esforço; esforço é drive filtrado
pela capacidade do músculo e pela mecânica. Telias 2020 já mostrava R² 0,8
apenas **intra-sujeito** — isto é, o P0.1 acompanha bem a mudança **no mesmo
paciente**, e mal a comparação **entre pacientes**. Smits 2025 mede o
agregado e acha pouco. Isso favorece usar P0.1 como **tendência do mesmo
paciente ao longo dos dias**, que é justamente o que este aplicativo faz, e
desfavorece tratá-lo como valor absoluto com veredito.

Segunda divergência, menor: o artigo pediátrico de Rudolph 2025 (adiante)
cita como limiar adulto *"P0.1 greater than 5 cm H₂O"*, atribuindo-o a
Telias 2020 — número que **não** encontrei no resumo de Telias 2020, que traz
3,5. Registro como discrepância de citação secundária, não como alternativa
a adotar.

---

## Pergunta 2 — ΔPocc: o método, e o que ele estima

### A pergunta

Qual é a citação completa de Bertoni 2019, como se mede ΔPocc, que conversão
o artigo sustenta e que limiar ele próprio propõe?

### O que eu proponho

O aplicativo registra ΔPocc como **valor negativo** (deflexão a partir da
PEEP) e, se o mentor quiser o cálculo derivado, aplica **exatamente** as duas
equações publicadas, com os coeficientes simplificados que o próprio artigo
usou na validação externa:

- **Pmus estimada = −3/4 × ΔPocc**
- **ΔP_L,dyn estimada = ΔPaw − 2/3 × ΔPocc**, onde ΔPaw é
  (pressão de pico − PEEP)

E **o artigo não propõe limiar de ΔPocc.** Os limiares dele são de Pmus e de
ΔP_L,dyn, a jusante da conversão. Isso é a resposta direta à pergunta do
mentor: **o artigo não diz nem 10 nem 15 para ΔPocc; ele diz 10 e 15 para
Pmus, e 15 e 20 para ΔP_L,dyn.**

### A fonte

**Confirmada (rotas: PubMed Central, texto integral; repositório
institucional da Universidade de Toronto; registro bibliográfico):**

> Bertoni M, Telias I, Urner M, Long M, Del Sorbo L, Fan E, Sinderby C,
> Beck J, Liu L, Qiu H, Wong J, Slutsky AS, Ferguson ND, Brochard L,
> Goligher EC. **A novel non-invasive method to detect excessively high
> respiratory effort and dynamic transpulmonary driving pressure during
> mechanical ventilation.** *Critical Care.* 2019;23:346.
> DOI: 10.1186/s13054-019-2617-0. PMID: 31694692. PMCID: PMC6836358.

**Não confirmado:** o número de artigo **346** veio da página de sumário do
periódico e da busca, não do PDF paginado; o registro bibliográfico devolveu
volume 23 sem páginas. Considero-o provável, não verificado no artigo.

### O que a fonte realmente diz

**Coorte.** *"Fifty-two daily recordings were collected in 16 patients"*, em
**duas UTIs de Toronto, Canadá**. Validação externa em **coorte independente
de 12 pacientes (46 medidas), em Nanquim, China**.

Pacientes: mediana de idade 63 anos, 7/16 mulheres; diagnósticos de admissão
pneumonia (10), hemorragia intracraniana (3), sepse não pulmonar (2), AVC
isquêmico (1). Modo ventilatório nos dias de estudo: pressão de suporte em
39 dias (75%), pressão assistido-controlada em 9 (17%), volume
assistido-controlado em 1 (2%). Escala de sedação-agitação mediana 2
(IIQ 2–3). **Todos respirando espontaneamente, disparando o ventilador** —
não é manobra de paciente passivo.

**Como se mede ΔPocc, literal:** *"15–20 expiratory airway occlusions were
applied on the Servo-I ventilator (Getinge, Solna, Sweden) at random
intervals. Each occlusion was maintained for the duration of a single breath
(confirmed by the return of Paw and Edi to baseline)."* E: *"The maximal
deflection in Paw from PEEP during each occlusion was recorded as a
measurement of occlusion pressure (ΔPocc)."*

Em português operacional: ocluir a via aérea **no fim da expiração**, deixar
o paciente puxar contra a oclusão por **um ciclo inteiro**, e registrar a
**maior queda da pressão de vias aéreas abaixo da PEEP**. É de um ciclo só, e
o valor é negativo por construção.

**Quantas oclusões na prática:** para a validação interna os autores usaram
*"three randomly selected measurements of ΔPocc in each recording"*,
explicitamente *"to mimic the use of just three occlusion maneuvers for
prediction in clinical practice"*. Ou seja: **três oclusões é o que o artigo
sustenta como uso clínico**, não uma.

**As equações, literais:**

- Equação 1: `Pmus,predita = k1 × ΔPocc`, com **k1 = −0,74 (IC 95% −0,69 a
  −0,78)**.
- Equação 2: `ΔP_L,dyn,predita = ΔPaw − k2 × ΔPocc`, com **k2 = 0,66
  (IC 95% 0,61 a 0,70)**.
- Na validação externa os autores usaram os valores simplificados
  **k1 = −3/4** e **k2 = 2/3**.

**Direção e sinal, para não errar na implementação:** ΔPocc é negativo. k1 é
negativo. O produto é positivo, e Pmus sai positiva. Na equação 2, k2 é
positivo e ΔPocc é negativo, então `− k2 × ΔPocc` **soma** à ΔPaw: a pressão
de distensão transpulmonar dinâmica estimada é **maior** que a que o
ventilador mostra. Esse é o ponto clínico do artigo — o esforço do paciente
adiciona estresse que a pressão de vias aéreas não revela.

**Limiares que o artigo propõe.** Sobre **Pmus** e **ΔP_L,dyn**, não sobre
ΔPocc:

- Pmus excessiva: **> 10 cmH₂O** (primário) e **> 15 cmH₂O** (secundário).
- ΔP_L,dyn excessiva: **> 15 cmH₂O** (primário) e **> 20 cmH₂O** (secundário).

Desempenho: ΔPocc detectou **Pmus > 10 cmH₂O com AUROC 0,92 (IC 95%
0,83–0,97)** e **ΔP_L,dyn > 15 cmH₂O com AUROC 0,93 (IC 95% 0,86–0,99)**. Na
coorte externa, **AUROC ≥ 0,94** para os dois.

Contexto que o artigo dá e que vale para a tela: *"Pmus exceeded 10 cm H₂O on
84% of study days and ΔPL,dyn exceeded 15 cm H₂O on 53% of study days"*.
Esforço excessivo era a regra, não a exceção, nessa coorte.

**Não confirmado:** os valores exatos de **sensibilidade, especificidade e
pontos de corte de ΔPocc** estão em arquivos suplementares (Additional file
5: Table S2) que **não foram acessados**. O texto principal reporta AUROC, não
pares sensibilidade/especificidade.

**O que aplicar aqui infere:** o artigo não autoriza um limiar de ΔPocc lido
diretamente. Quem quiser um limiar de ΔPocc precisa ou derivá-lo das
equações (Pmus 10 → |ΔPocc| ≈ 13,3; Pmus 15 → |ΔPocc| ≈ 20) ou apoiá-lo em
outra fonte.

### Força da evidência

Estudo fisiológico de derivação e validação, **16 pacientes / 52 registros**
na derivação e **12 pacientes / 46 medidas** na validação externa, com padrão
de referência esofágico e Edi. É pequeno. É o estudo original do método e
continua sendo a referência canônica. Não há ensaio clínico mostrando que
guiar a ventilação por ΔPocc melhore desfecho.

### Divergências

**Existem, e são úteis, porque cercam os números 10 e 15 do mentor.**

**1) Yang 2023** (28 pacientes, 246 níveis de PS, padrão esofágico) publicou
pontos de corte de ΔPocc **medidos diretamente**, sem passar pela conversão.
Pelo critério PTPmus/min > 200 (esforço alto), o corte foi **ΔPocc = −8,4
cmH₂O**; pelo critério de esforço baixo (PTPmus/min < 50), **−5,7 cmH₂O**.
Por critérios de Pmus, os cortes citados foram **6,2** (esforço baixo) e
**8,4** (esforço alto). **Ressalva importante:** estes valores numéricos
chegaram por rota secundária (revisão da Frontiers de 2025 que os cita, e
resumo de busca). O **resumo do próprio artigo** foi lido e confirmado, e ele
traz as AUROC (0,87–0,95 para esforço baixo; 0,93–0,95 para esforço alto),
a sensibilidade (0,80–1,00) e o **valor preditivo positivo baixo para esforço
alto (0,23–0,64)** — mas **não** enumera os cortes no resumo. Trate os cortes
como **não confirmados na fonte primária**.

**2) Alvo do grupo de Toronto, mais recente e mais largo:**

> Bootjeamjai P, Dianti J, Goligher EC. **Noninvasive Longitudinal Monitoring
> of Respiratory Effort.** *Am J Respir Crit Care Med.* 2024;210(6):838–840.
> DOI: 10.1164/rccm.202401-0100RL.

Análise secundária do ensaio LANDMARK (NCT03612583), **30 pacientes com
insuficiência respiratória hipoxêmica aguda, 244 medidas** (mediana 8 por
paciente, IIQ 6–10). Usa a faixa-alvo **Pocc de −6 a −20 cmH₂O**. Dentro
dessa faixa, 77% de probabilidade de Pmus dentro do alvo (contra 33% fora), e
86% de probabilidade de ΔP_L,dyn ≤ 23 cmH₂O. AUROC **0,85** para discriminar
Pmus > 15 cmH₂O. Para **acompanhar mudança** de esforço, porém, o desempenho
cai: **R² = 0,31** e AUROC 0,75 para detectar variação de Pmus ≥ 3 cmH₂O.
Usa a equação `ΔP_L,dyn estimada = (pressão de pico − PEEP) − 2/3 × Pocc`,
idêntica à equação 2 de Bertoni.

**Como isso se relaciona com o 10 e o 15 do mentor:** a faixa −6 a −20 do
LANDMARK II **contém** os dois. Os limites 10 e 15 do mentor caem no interior
de uma faixa que a literatura mais recente trata como aceitável, e portanto
**são mais conservadores** do que o alvo publicado. Isso não é contradição.
É informação para ele decidir se quer manter a margem.

**3) Rudolph 2025** (pediátrico, adiante) mostra que **ΔPocc e P0.1 sobem
significativamente do primeiro para os ciclos ocluídos seguintes**. Se isso
valer em adultos, **qual ciclo se mede muda o número**. Bertoni mede um ciclo
por oclusão e recomenda três oclusões; o aplicativo precisa registrar qual
convenção o serviço usa.

---

## Pergunta 3 — Pmus: um número exibível é defensável?

### A pergunta

O aplicativo pode mostrar uma Pmus calculada a partir de ΔPocc como número?

### O que eu proponho

**Resposta honesta: sim, com rótulo de estimativa e sem veredito próprio; não
como valor de precisão.** Concretamente:

- Calcular e exibir **Pmus estimada = 0,75 × |ΔPocc|**, sempre rotulada
  "estimada", nunca "Pmus".
- **Não** exibir casas decimais. O erro do método não sustenta décimos.
- Preferir exibir **faixa ou categoria** ("compatível com esforço acima de
  10 cmH₂O") a exibir ponto.
- Se o mentor preferir, **não exibir Pmus** e mostrar apenas ΔPocc com a
  classificação dele. Isso é defensável e é o que a fonte primária
  literalmente recomenda.

### A fonte

Mesma de Bertoni 2019, acima. Mais Bootjeamjai 2024, acima.

### O que a fonte realmente diz

**Bertoni 2019 é explícito contra o uso como valor pontual.** Duas frases do
artigo, literais:

> *"Agreement between predicted and measured values of Pmus and ΔPL,dyn in
> the internal validation cohorts was marginally acceptable: bias (the
> magnitude of difference between predicted and measured values) varied
> between subjects and the within-subject limits of agreement were relatively
> wide."*

> *"Predicted Pmus and ΔPL,dyn values are not sufficiently accurate to
> replace direct clinical monitoring (i.e., esophageal pressure) if desired
> by clinicians."*

Os autores enquadram o método como *"a highly feasible, rapid, non-invasive
'screening test'"* — **teste de rastreio**, não de quantificação.

**Não confirmado, e isto é uma lacuna que importa:** os **números** do viés e
dos limites de concordância estão em *Additional file 3: Figure S2* e
*Additional file 4: Table S1*. Não consegui acessar os arquivos
suplementares. **Não posso quantificar a largura dos limites de concordância
a partir da fonte primária.** Reporto o adjetivo do artigo ("relatively
wide") e recuso o número que não li.

Uma segunda fonte de rota indireta traz viés −0,31 cmH₂O (IC 95% −0,59 a
−0,02) e limites de concordância de −2,91 a +2,30 cmH₂O para Pmus estimada a
partir de Pocc, mas o contexto é **ventilação não invasiva**, é análise
**preliminar** por declaração dos próprios autores, e chegou por resumo de
busca, não pelo artigo. **Não use este número.** Registro só para o mentor
saber que a ordem de grandeza do erro é de alguns cmH₂O, e não de décimos.

**A confirmação indireta mais forte de que o ponto não deve virar veredito**
vem de Bootjeamjai 2024: para **classificar** um estado (Pmus > 15), a AUROC
foi 0,85; para **medir a mudança** de Pmus entre dois momentos, o R² caiu para
**0,31**. Um aplicativo que desenha a série temporal de Pmus estimada está
desenhando exatamente a grandeza em que o método é mais fraco.

**O que aplicar aqui infere:** exibir um número calculado com 0,75 é
reproduzir fielmente a equação publicada. Interpretar esse número como se
fosse Pmus medida — traçar tendência, comparar dias, disparar alerta por
diferença pequena — **é inferência que as duas fontes desaconselham por
escrito**.

### Força da evidência

Derivação com **16 pacientes**, validação externa com **12**, confirmação em
coorte de **30** com 244 medidas. Concordância descrita pelos próprios autores
como "marginalmente aceitável". Discriminação boa (AUROC 0,85–0,94),
quantificação ruim. É um bom **detector**, um mau **medidor**.

### Divergências

Não há fonte lida defendendo Pmus estimada como valor de precisão. A
divergência é de grau: Bertoni recomenda rastreio; a prática divulgada
(inclusive por fabricante) já mostra o número calculado na tela do
ventilador. O aplicativo pode fazer o mesmo, desde que o rótulo diga o que a
fonte diz.

---

## Pergunta 4 — Recrutabilidade: a razão R/I e o problema do limiar

### A pergunta

Qual é a citação da razão R/I, como exatamente se mede, e o 0,5 é limiar
validado ou mediana da coorte de derivação?

### O que eu proponho

**Três propostas, e a terceira é a que decide arquitetura.**

1. **Fórmulas** (as do artigo original):
   - `V_inflado = C_baixa × ΔPEEP`
   - `V_recrutado = V_expirado_extra − V_inflado`
   - `C_rec = V_recrutado / ΔPEEP_efetiva`
   - `R/I = C_rec / C_baixa`
   onde ΔPEEP_efetiva usa a **pressão de abertura de via aérea** no lugar da
   PEEP baixa quando houver fechamento completo de via aérea acima dela.

2. **O 0,5 entra como `Parecer`/descrição, nunca como `Publicacao` de
   limiar.** A leitura do projeto está **correta**: 0,5 é a **mediana da
   coorte de derivação**, usada ali para dicotomizar a análise, não um ponto
   de corte validado contra desfecho.

3. **O aplicativo deve mostrar o número e a data, e não emitir veredito.**
   Se o mentor quiser um texto, que ele seja descritivo ("recrutabilidade
   estimada", com a faixa observada 0 a 2,0 como referência) e nunca
   prescritivo de PEEP.

### A fonte

**Confirmada (rotas: página do artigo no Oxford Academic com resumo
integral; registro bibliográfico):**

> Chen L, Del Sorbo L, Grieco DL, Junhasavasdikul D, Rittayamai N,
> Soliman I, Sklar MC, Rauseo M, Ferguson ND, Fan E, Richard JCM,
> Brochard L. **Potential for Lung Recruitment Estimated by the
> Recruitment-to-Inflation Ratio in Acute Respiratory Distress Syndrome. A
> Clinical Trial.** *Am J Respir Crit Care Med.* 2020;201(2):178–187.
> DOI: 10.1164/rccm.201902-0334OC. PMID: 31577153.

**Não confirmado:** o **texto integral da seção de Métodos** não foi acessado
(o site da ATS redireciona para o Oxford Academic e a versão integral ficou
fora de alcance; o artigo não está no PubMed Central). O resumo foi lido
**literalmente**. Os detalhes de bloqueio neuromuscular, modo e volume
corrente vêm de fontes secundárias, identificadas abaixo uma a uma.

**Validações posteriores, confirmadas:**

> Cour M, Biscarrat C, Stevic N, Degivry F, Argaud L, Guérin C.
> **Recruitment-to-inflation ratio measured with modern intensive care unit
> ventilators: How accurate is it?** *Critical Care.* 2022;26:85.
> DOI: 10.1186/s13054-022-03961-x. PMID: 35351182. PMCID: PMC8962219.

> Richard JC, Dhelft F, Deniel G, Roux E, Yonis H, Mezidi M, Chauvelot L,
> Gaillet M, Noirot I, Davila E, Schoux R, Rodriguez Y, Baudin F,
> Penarrubia L, Boussel L, Orkisz M, Bitker L. **Diagnostic performance of
> the recruitment-to-inflation ratio to assess lung recruitability by PEEP in
> ARDS: a computed tomography study.** *Critical Care.* 2025;29:220.
> DOI: 10.1186/s13054-025-05453-0. PMID: 40462166. PMCID: PMC12131414.

**Revisão sobre uso prático, parcialmente confirmada:**

> Rosà T e cols. **Recruitment-to-inflation ratio for bedside PEEP selection
> in acute respiratory distress syndrome.** *Minerva Anestesiol.*
> 2024;90(7–8). DOI não confirmado; **páginas não confirmadas** (o código do
> artigo no site do editor sugere início na p. 694, o que **não** verifiquei).
> A lista completa de autores **não** foi confirmada.

### O que a fonte realmente diz

**Coorte e desenho, do resumo literal de Chen 2020:** *"Forty-five patients
were enrolled. Four patients had airway closure higher than high PEEP, and
thus recruitment could not be assessed."* Portanto **45 incluídos, 41
avaliáveis**. Pacientes com SDRA, ventilados a **PEEP 15 e PEEP 5 cmH₂O**.

**O procedimento, do resumo literal:** *"Abruptly releasing PEEP (from 15 to
5 cm H₂O) increases expired volume: the difference between this volume and
the volume predicted by compliance at low PEEP (or above airway opening
pressure) estimated the recruited volume by PEEP. This recruited volume
divided by the effective pressure change gave the compliance of the recruited
lung; the ratio of this compliance to the compliance at low PEEP gave the
recruitment-to-inflation ratio."*

**Validação interna:** volume recrutado pelo método experimental contra o
método de referência (curvas pressão-volume múltiplas) — **R² = 0,798,
p < 0,0001, viés −21 mL**.

**O resultado sobre o 0,5, literal:** *"The recruitment-to-inflation ratio
(median, 0.5; range, 0–2.0) correlated with both oxygenation at low PEEP and
the oxygenation response; at PEEP 15, high recruiters had better oxygenation
(P = 0.004), whereas low recruiters experienced lower systolic arterial
pressure (P = 0.008)."*

E a conclusão, literal e deliberadamente fraca: *"A single-breath method
quantifies recruited volume. The recruitment-to-inflation ratio **might
help** to characterize lung recruitability at the bedside."*

**O 0,5 é mediana, e isto está confirmado.** O resumo publica 0,5 como
**mediana** da coorte e diz que os grupos foram comparados *"based on this
ratio"*, sem nomear no resumo um ponto de corte independente. Fontes
secundárias que descrevem o artigo dizem a mesma coisa com todas as letras:
o corte de 0,5 foi proposto **como o valor mediano da coorte** para separar
baixo (≤ 0,5) de alto (> 0,5) potencial de recrutamento. **A leitura do
projeto está correta e não precisa de correção.**

**Alguém validou um corte contra desfecho?** Pelo que li, **não contra
desfecho clínico**. O que existe é validação contra **imagem**:

- **Richard 2025**, tomografia como padrão de referência, **42 pacientes**
  (50 incluídos, 8 excluídos), PEEP 5 e 15, tomografia de baixa dose medindo
  tecido não aerado recrutado. **AUC da R/I para identificar alto recrutador
  = 0,70 (IC 95% 0,52–0,89)**. O **limiar ótimo encontrado foi 0,57**, com
  **sensibilidade 78% e especificidade 67%**. O intervalo de confiança da AUC
  **encosta em 0,5**: é discriminação modesta, com incerteza grande. Os
  autores concluem que o corte de 0,50 carece de precisão.
- **Cour 2022**, estudo de bancada com simulador ASL-5000 e **cinco
  ventiladores de UTI** (Carestation, Servo I, Hamilton C5, Infinity C500,
  Evita XL), modo volume controlado, Vt 400 mL, fluxo 60 L/min, FR 20/min,
  PEEP 5 e 15. **No valor de R/I = 0,5**, o erro passou de ±0,05 (>10%) em
  **4 dos 5 ventiladores** e de ±0,1 (>20%) em **3 dos 5**. Superestimação
  máxima **+0,17 (+34%)**; subestimação máxima **−0,24 (−48%)**. A maior
  diferença entre dois ventiladores medindo o mesmo pulmão foi **0,4**.
  Conclusão dos autores: *"using a single cut-off R/I value to individualize
  treatments of a given patient may be inappropriate and could even lead to
  opposite therapeutic strategies"*, e recomendam reconhecer **uma zona
  cinzenta** em torno de qualquer limiar.

**Traduzindo os dois juntos, e este é o achado mais importante do dossiê:**
a incerteza de medida do R/I em torno de 0,5 (até ±0,24, e 0,4 entre
aparelhos) é **da mesma ordem de grandeza que a distância entre os limiares
propostos** (0,3 a 0,7). Um aplicativo que exiba "R/I 0,52 → alto
recrutador" está afirmando uma distinção que o instrumento não consegue
sustentar.

**Há orientação publicada sobre o que fazer com o número?** Há **sugestão de
revisão, não recomendação de diretriz**. Rosà 2024 (Minerva Anestesiol)
sugere: com R/I modesto (**< 0,3–0,4**), PEEP baixa (**5–8 cmH₂O**) pode ser
aconselhável; com **R/I > 0,6–0,7**, PEEP alta pode ser considerada, *desde
que* a pressão de platô de via aérea e/ou transpulmonar não ultrapasse os
limites de segurança. **Divergência de número entre fontes secundárias:** o
resumo do editor diz PEEP **≥ 15 cmH₂O** para R/I alto; a página de base de
conhecimento de um fabricante (Hamilton Medical), que atribui os limiares ao
mesmo Rosà 2024, diz PEEP **de pelo menos 12 cmH₂O**. **Não consegui ler o
texto integral de Rosà para dizer qual está certo.** Registrado como
divergência aberta.

**Diretrizes:** as diretrizes de SDRA da ESICM de 2023 **não** foram lidas
nesta rodada (o PDF do resumo acessível não pôde ser extraído). Resumos de
busca indicam que elas recomendam **contra** manobras de recrutamento
(prolongadas e breves de alta pressão) e **não fazem recomendação** a favor
ou contra PEEP alta versus baixa de rotina, e **não** mencionam a razão R/I.
**Trate isso como não confirmado**: não posso citar a graduação GRADE nem a
redação exata, e portanto o aplicativo não deve citar diretriz aqui.

**Resposta direta à pergunta do projeto: não existe limiar validado contra
desfecho clínico.** O 0,5 é mediana de derivação. O 0,57 é o ótimo de uma
coorte de 42 pacientes contra tomografia, com AUC 0,70 e IC que encosta no
acaso. Os 0,3–0,4 e 0,6–0,7 são sugestão de revisão narrativa. E a medida
tem zona cinzenta grande o bastante para engolir a diferença entre eles.

### O procedimento, passo a passo, o mais concreto que a evidência permite

Reunido de Chen 2020 (resumo, confirmado), Cour 2022 (bancada, confirmado) e
da base de conhecimento da Hamilton Medical (**fonte secundária, de
fabricante** — identificada como tal em cada passo que só ela sustenta):

1. **Paciente passivo.** Chen 2020 estudou pacientes com SDRA sob
   ventilação controlada. **Fonte secundária** indica sedação profunda com
   midazolam ou propofol e bloqueio neuromuscular com cisatracúrio em
   estudos que usam a técnica. **Esforço espontâneo invalida a medida**, pois
   o volume expirado deixa de refletir só a mecânica. Isto **não** foi
   confirmado no texto de Métodos original.
2. **Modo volume controlado**, volume corrente e fluxo fixos (na bancada de
   Cour: Vt 400 mL, fluxo 60 L/min, FR 20/min).
3. **Verificar antes se há fechamento completo de via aérea** e, se houver,
   medir a **pressão de abertura** (P_abertura). Chen 2020 diz literalmente
   que o volume previsto é o dado pela complacência a PEEP baixa *"or above
   airway opening pressure"*. **Quatro dos 45 pacientes tinham fechamento
   acima da PEEP alta e não puderam ser avaliados** — ou seja, ~9% da coorte
   não tem R/I mensurável.
4. **Estabilizar em PEEP alta 15 cmH₂O.** (**Fonte secundária**: por 30
   minutos, com pausa inspiratória ≥ 5%.)
5. **Reduzir a frequência respiratória** para permitir ver o ciclo de
   transição isolado. (**Fonte secundária**: 6/min.)
6. **Baixar a PEEP para 5 cmH₂O e capturar o ciclo de transição**, congelando
   a tela. (**Fonte secundária**: já retornando os ajustes anteriores logo
   após a queda, para não deixar o paciente em PEEP baixa.)
7. **Ler três pontos na curva** (**fonte secundária** para o procedimento de
   cursor, mas as grandezas são as do artigo):
   - fim da última expiração em PEEP alta (linha de base);
   - fim da primeira expiração em PEEP baixa → **PEEP_baixa real** e
     **volume expirado extra** (VTe adicional);
   - fim do primeiro platô inspiratório em PEEP baixa → **P_platô_baixa** e
     **VTi_baixa**.
8. **Calcular**:
   - `ΔPEEP = PEEP_alta − PEEP_baixa`
   - `ΔP_baixa = P_platô_baixa − PEEP_baixa`
   - `C_baixa = VTi_baixa / ΔP_baixa`
   - `V_inflado = C_baixa × ΔPEEP`
   - `V_recrutado = V_expirado_extra − V_inflado`
   - `R/I = V_recrutado / V_inflado` (equivalente a `C_rec / C_baixa` quando
     não há fechamento de via aérea; havendo, a pressão efetiva usa a
     P_abertura no lugar da PEEP baixa)

**Isto não é um campo de formulário. É uma manobra com estado.**

### Força da evidência

- **Chen 2020**: ensaio clínico fisiológico, **45 pacientes**, validação
  interna forte contra método de referência (R² 0,798, viés −21 mL). É o
  artigo original. A conclusão dos próprios autores usa *"might help"*.
- **Richard 2025**: validação externa contra tomografia, **42 pacientes**,
  centro único. AUC 0,70, IC 0,52–0,89. Discriminação modesta.
- **Cour 2022**: bancada, 5 ventiladores. Não é evidência clínica, mas é a
  evidência mais dura de todas quanto ao **erro do instrumento**, porque o
  valor verdadeiro era conhecido.
- **Rosà 2024**: revisão narrativa. Sugestão de especialista, não
  recomendação graduada.
- **Diretrizes**: nenhuma recomendação sobre R/I confirmada por leitura
  direta.

### Divergências

Todas já nomeadas acima, resumidas: 0,50 (mediana de derivação) contra 0,57
(ótimo contra tomografia) contra 0,3–0,4 e 0,6–0,7 (sugestão de revisão);
PEEP ≥ 12 contra PEEP ≥ 15 para recrutador alto, entre duas fontes
secundárias que citam a mesma revisão; e o aviso de Cour 2022 de que
**qualquer** corte único pode levar a estratégias opostas conforme o
ventilador.

---

## O que a captura exige

Esta seção existe para decidir arquitetura. Para cada indicador: o que
precisa ser medido, e se cabe como campo de um registro diário ou se é
**manobra com passos**, como o TRE já é.

### 1. P0.1

**Valores a coletar:** um só — **P0.1, em cmH₂O**, positivo por convenção de
tela (o ventilador já entrega assim).

**Metadados que mudam a interpretação, e que deveriam ser capturados:**
- **Origem**: valor exibido pelo ventilador (P0.1_vent) ou medido em oclusão
  dedicada (P0.1_ref). Telias 2020 mostra que os dois não são intercambiáveis
  e que o do ventilador pode subestimar.
- **Modo ventilatório** no momento da medida.

**Forma:** **campo de registro diário.** Um valor por medida, com data/hora.
Zero é valor válido e grave (já decidido). Ausência de dado é distinta de
zero — armadilha 5 do CLAUDE.md se aplica inteira aqui.

### 2. ΔPocc

**Valores a coletar:**
- **ΔPocc, em cmH₂O, negativo** (deflexão máxima abaixo da PEEP). Se a
  interface preferir mostrar módulo, guarde o sinal no domínio.
- **Quantas oclusões** foram feitas e **qual valor foi registrado** (a menor?
  a mediana das três?). Bertoni usa três medidas para mimetizar a prática;
  Rudolph 2025 mostra que o valor **sobe** entre ciclos ocluídos sucessivos.
  Sem essa convenção registrada, dois serviços gravam coisas diferentes no
  mesmo campo.

**Forma:** **campo de registro diário**, com um campo auxiliar para a
convenção de contagem. Não precisa de máquina de estados: a manobra é curta e
o resultado é um número.

**Atenção:** ΔPocc só existe em paciente **disparando o ventilador**. Em
paciente passivo o campo não se aplica — e "não se aplica" não é zero.

### 3. Pmus estimada

**Valores a coletar: nenhum novo.** É derivada.

- `Pmus estimada = 0,75 × |ΔPocc|` — depende só do item 2.
- Se o mentor quiser também a **ΔP_L,dyn estimada**, aí sim entram **dois
  campos novos no registro diário**: **pressão de pico** e **PEEP**, para
  formar ΔPaw. Fórmula: `ΔP_L,dyn estimada = (P_pico − PEEP) + (2/3 × |ΔPocc|)`.

**Forma:** **cálculo derivado, exibido com rótulo de estimativa.** Nunca
armazenar como se fosse medida. Recomendação técnica: guardar apenas ΔPocc,
P_pico e PEEP; recalcular a estimativa na exibição. Assim, se o coeficiente
mudar por decisão do mentor, o histórico inteiro se corrige sozinho e nenhum
número velho fica cristalizado no banco.

### 4. Razão R/I

**Valores a coletar** (todos numa mesma manobra, na ordem):

| # | Valor | Unidade | Quando |
|---|---|---|---|
| 1 | Paciente passivo (sim/não) | booleano | pré-requisito |
| 2 | Há fechamento de via aérea? | booleano | pré-requisito |
| 3 | Pressão de abertura de via aérea | cmH₂O | só se o item 2 for sim |
| 4 | PEEP alta | cmH₂O | passo 1 da manobra |
| 5 | PEEP baixa real | cmH₂O | após a queda |
| 6 | Volume expirado extra no ciclo de transição | mL | após a queda |
| 7 | Pressão de platô em PEEP baixa | cmH₂O | primeiro ciclo em PEEP baixa |
| 8 | Volume corrente inspirado em PEEP baixa | mL | primeiro ciclo em PEEP baixa |

**Forma: manobra com passos, modelada como o TRE. Não cabe em campos soltos
de registro diário.** As razões são concretas, não estéticas:

1. **Há pré-requisitos que abortam a manobra.** Se o paciente não estiver
   passivo, ou se houver fechamento acima da PEEP alta, **não existe R/I** —
   foi o caso de 4 dos 45 pacientes de Chen 2020. Um formulário de campos
   soltos aceitaria os números e produziria um resultado falso.
2. **Os valores são medidos em momentos diferentes e em ordem obrigatória.**
   O item 6 só existe no ciclo imediatamente após a queda de PEEP; o item 7
   só no ciclo seguinte. Registrar fora de ordem não é erro de digitação, é
   medida diferente.
3. **A manobra altera o paciente.** Ela baixa a PEEP deliberadamente. Isso é
   intervenção, não observação, e merece registro de que foi feita, por quem
   e quando — igual ao TRE.
4. **O resultado precisa carregar as condições.** R/I 0,55 medido com PEEP
   15/5 num Servo não é o mesmo dado que 0,55 medido com outro par de PEEP
   noutro aparelho (Cour 2022: até 0,4 de diferença entre ventiladores).
   Guardar só o resultado joga fora o que permite comparar.
5. **Deve haver estado "tentada e não conclusiva"**, distinto de "não feita" e
   de "R/I = 0". Armadilha 5 do CLAUDE.md, de novo: ausência de dado não é
   resultado normal, e aqui ela tem duas causas clínicas diferentes
   (fechamento de via aérea e esforço espontâneo).

**Sobre exibir veredito:** a recomendação técnica deste dossiê é o
aplicativo **mostrar o número, as condições e a data, sem classificação
automática de "alto/baixo recrutador"** — porque nenhum limiar tem validação
contra desfecho e a zona cinzenta de medida cobre a distância entre os
limiares propostos. Se o mentor quiser uma classificação, ela precisa entrar
como `Parecer` dele, com o número dele, e a tela precisa dizer que é parecer.

---

## Perguntas que restam para o mentor

Nenhuma destas se resolve com citação. Todas precisam do juízo dele.

1. **Os limites 10 e 15 aplicam-se a |ΔPocc| ou a Pmus?** A literatura usa 10
   e 15 como limiares de **Pmus** (Bertoni 2019). Se os limites do mentor são
   de ΔPocc, o aplicativo classifica esforço mais cedo do que a literatura;
   se são de Pmus, o gatilho em ΔPocc seria 13,3 e 20. Os dois são
   defensáveis. **Só ele pode dizer qual quis.**

2. **A faixa-alvo de P0.1 fica 1,5–3,5 ou 1,0–3,5?** O limite inferior com
   apoio publicado é **1,0** (Telias 2020). O 1,5 não tem fonte primária que
   eu tenha confirmado. Manter 1,5 é legítimo como prática, mas então ele
   entra como `Parecer`, não como `Publicacao`.

3. **P0.1 alto: alerta ou observação?** O valor preditivo positivo do P0.1
   para esforço alto é fraco (Yang 2023: 0,23 a 0,64), e Smits 2025 encontrou
   correlação quase nula entre P0.1 e esforço esofágico. Um alerta de "drive
   elevado" vai disparar em paciente que não tem esforço elevado. Ele aceita
   essa taxa de falso positivo, ou prefere texto neutro?

4. **Exibir Pmus estimada, ou só ΔPocc classificado?** Bertoni desaconselha
   por escrito o uso como valor de precisão. Exibir com rótulo de estimativa
   é defensável; não exibir também é. **Decisão dele.**

5. **Qual valor de ΔPocc se registra quando há três oclusões?** A menor
   (mais negativa)? A mediana? A primeira? Rudolph 2025 mostra que a escolha
   muda o número sistematicamente. Sem convenção declarada, a série temporal
   do paciente mistura convenções.

6. **R/I: o aplicativo mostra número sem veredito, ou ele quer um corte?**
   Se quiser corte, **qual**: 0,5 (mediana de derivação), 0,57 (ótimo contra
   tomografia, AUC 0,70) ou a faixa 0,3–0,4 / 0,6–0,7 da revisão? E ele
   aceita que o corte entre como `Parecer`, dado que nenhum foi validado
   contra desfecho clínico?

7. **R/I é indicador que este serviço realmente mede?** A manobra exige
   paciente passivo, muitas vezes bloqueio neuromuscular, e alteração
   deliberada da PEEP. Antes de construir a máquina de estados, vale ele
   dizer se isso acontece na prática dele ou se é indicador aspiracional.

8. **A pressão de abertura de via aérea entra como indicador próprio?** Ela é
   pré-requisito do R/I, mas é achado clínico por si — e 4 de 45 pacientes de
   Chen 2020 tinham fechamento acima da PEEP alta. Pode valer um campo
   independente.

---

## Anexo — o que não consegui confirmar, em lista

Para o mentor conferir de uma olhada só. Nada disto deve virar `Publicacao`
na tela enquanto estiver nesta lista.

1. **Texto integral de Telias 2018 (ICM 44:1532–1535)** — não acessado
   (Springer exige autenticação; repositório institucional devolveu 403).
   Autores, título, revista, ano, volume, páginas, DOI e PMID **estão**
   confirmados por registro bibliográfico.
2. **Origem primária da faixa "1,5 a 3,5 cmH₂O"** como alvo de P0.1 — não
   encontrada em fonte primária.
3. **Número de pacientes de Telias 2020** — o resumo descreve "três estudos em
   pacientes, um em voluntários saudáveis e um de bancada com seis
   ventiladores", sem total.
4. **Número de artigo de Bertoni 2019 (346)** — vem do sumário do periódico,
   não do PDF paginado.
5. **Viés e limites de concordância numéricos de Bertoni 2019** — estão nos
   arquivos suplementares 3 e 4, não acessados.
6. **Sensibilidade, especificidade e cortes de ΔPocc de Bertoni 2019** — estão
   no arquivo suplementar 5, não acessado.
7. **Cortes numéricos de Yang 2023 (P0.1 2,2 / 1,1–1,2; ΔPocc 8,4 / 5,7–6,2)**
   — chegaram por rota secundária. O resumo primário foi lido e traz AUROC,
   sensibilidade e VPP, mas não enumera os cortes.
8. **Métodos de Chen 2020** (bloqueio neuromuscular, modo, volume corrente,
   tempo de estabilização) — não acessados na fonte primária; o que consta
   veio de fontes secundárias, incluindo material de fabricante.
9. **Tabela de alvos de Goligher 2020 (AJRCCM 202(7):950–961)** — a citação
   está confirmada, o **conteúdo da tabela de alvos não**. Três rotas
   devolveram 403 ou PDF ilegível.
10. **Rosà 2024 (Minerva Anestesiol 90(7–8))** — páginas, DOI e lista de
    autores não confirmados; e as duas fontes secundárias discordam entre si
    sobre a PEEP sugerida para recrutador alto (≥ 12 contra ≥ 15).
11. **Diretrizes ESICM 2023 de SDRA** — não lidas. Nenhuma graduação GRADE
    pode ser citada por este dossiê.
12. **Protocolo do LANDMARK II** — os alvos (Pocc −6 a −20; P0.1 > 1;
    ΔP_L,dyn estimada ≤ 23) foram lidos na carta de Bootjeamjai 2024, que é
    fonte primária e **está confirmada**; o registro do ensaio em si não foi
    acessado.

---

## Decisões do mentor clínico, 02/09/2026

### 1. Os limites são de **Pmus estimada**, não de ΔPocc — e viraram uma escala

Perguntado a qual grandeza os "limites 10 e 15" se aplicavam, ele respondeu
**"Pmus estimada"** e substituiu os dois números por uma escala de quatro faixas:

| Pmus estimada | Interpretação |
|---|---|
| < 3-4 cmH₂O | esforço muito baixo → pensar em fraqueza ou sedação |
| ~4-8 cmH₂O | esforço geralmente adequado |
| ~8-12 cmH₂O | esforço aumentado, acompanhar |
| > 12-15 cmH₂O | esforço elevado → preocupação com sobrecarga e P-SILI |

**Isto SUBSTITUI** o registro anterior do spec de arquitetura
(`2026-09-01-arquitetura-blocos-clinicos-design.md`, linha 40 e seção 8), que
dizia "ΔPocc: usa os limites 10 e 15". Aquela linha está desatualizada: os
números eram de Pmus, como a pesquisa desta fase levantou, e agora são quatro
faixas em vez de dois cortes.

**As bordas que ele escreveu são difusas** ("< 3-4", "> 12-15") e código precisa
de número. Decisão de implementação, registrada aqui para poder ser contestada:
as fronteiras são **4, 8 e 12**, produzindo quatro faixas contíguas sem buraco.
O 15 do texto dele não vira quarta fronteira — ele aparece na frase como o ponto
onde a preocupação fica mais forte, dentro da faixa "> 12", e é isso que o texto
da tela diz.

A escala é **`Parecer`**, não publicação. Bertoni 2019 valida a conversão
`Pmus = 0,74 × ΔPocc`; a interpretação por faixas é prática dele.

### 2. P0.1: a faixa é **1,5 a 3,5**, e ele reafirmou depois de ver o publicado

Apresentado o achado de que o limite inferior publicado em Telias 2020 é **1,0**
(sensibilidade 100%, especificidade 92% para esforço baixo) e de que o 1,5 não
foi encontrado em fonte nenhuma, ele respondeu: *"esta fonte está correta
análise em 1,5 a 3,5"*.

Reafirmação vale como decisão. O **3,5 é publicado** (Telias 2020) e entra como
`Publicacao`; o **1,5 é prática dele** e entra como `Parecer`, com a divergência
declarada na nota — mesmo tratamento do pH 7,35 contra o 7,32 do Boles na
Fase 6.

### 3. Recrutabilidade: **é feita, e entra**

Resposta direta: *"sim, realização da recrutabilidade é feita sim"*.

Isso decide a arquitetura da fase. Conforme a seção "O que a captura exige"
deste dossiê, a manobra tem 8 valores medidos em ordem obrigatória, pré-requisito
de paciente passivo, possibilidade de fechamento de via aérea que aborta o
cálculo, e precisa do estado "tentada e não conclusiva". É manobra registrada,
da mesma natureza do TRE da Fase 5 — não campo de evolução diária.

**O que NÃO muda com essa resposta:** o aplicativo continua sem emitir veredito
de recrutável ou não recrutável. O 0,5 é mediana da coorte de Chen 2020 (n=45),
o erro de medida em torno dele é da ordem da distância entre os limiares
propostos, e a validação por tomografia mais recente deu AUC 0,70 com IC de 0,52
a 0,89. Mostra o número, a proveniência e o que ele não sustenta.
