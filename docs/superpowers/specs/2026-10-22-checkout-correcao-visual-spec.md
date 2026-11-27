# Correção do checkout da reserva — spec de execução

Data: 2026-10-22. Solicitante: Renan Pagamentos. Rota: `/reservas`.

## Objetivo e limite desta entrega

Esta spec corrige a composição visual do checkout implementado. Não autoriza implementar gateway, mudar cobrança, criar reservas adicionais, alterar preços ou refatorar autenticação. O fluxo demo e as conexões existentes devem ser preservados. Executar futuramente no checkout local existente, na `main`, preservando alterações paralelas. Este documento sozinho não autoriza commit/push/PR.

Prioridades obrigatórias: remover o bloco marcado pelo usuário; checkout desktop inteiro sem rolagem; recuperar a aparência das referências originais. Não considerar a implementação concluída só porque compila.

## Evidências e diagnóstico confirmado no código

1. `next-app/src/components/reservation/v2/ReservationWizard.tsx`, função `Confirmation`: renderiza `ReservationCheckout`, depois uma seção “Acesso à reserva”, um link “Acessar minha reserva” e um `details` “Abrir simulação rápida de pagamento” com `MockPaymentDemo`. Esse é exatamente o bloco marcado. Remover sua renderização, não apenas esconder com CSS.
2. `ReservationWizardContent` coloca a confirmação dentro de `main.reservation-page-wrapper > .reservation-page-content`. Em `globals.css`, esse conteúdo tem limite de 1080px e padding de 68px no topo e 88px no rodapé, com regras repetidas. O checkout possui outra largura interna, padding superior e `min-height:100svh`. A composição acumula restrições e altura.
3. `.methodHeader` define título e descrição em colunas distintas. Nas referências, a descrição fica ABAIXO do título; nos métodos recolhidos quando outro método está aberto, ela desaparece.
4. `.summary` usa cantos arredondados comuns; as referências usam um ticket com recortes côncavos dourados. O sucesso também está fragmentado em vez de ficar contido em um ticket único.
5. A captura do problema tem 1440x900 pixels incluindo Chrome/Windows. A área da página visível é aproximadamente 1440x735; não confundir resolução da tela com viewport CSS. A captura está rolada e o header sobrepõe o conteúdo.
6. As referências originais e a spec antiga citadas em notas do Obsidian não estão nos caminhos esperados deste checkout. Usar os anexos desta conversa como fonte visual. Não afirmar que arquivos ausentes foram preservados.

## Fontes visuais e precedência

- A captura atual `C:/Users/Windows/Pictures/Screenshots/Captura de Tela (297).png` é evidência de defeitos, não o desenho a reproduzir.
- Anexo original 2: seleção inicial desktop (três métodos fechados e resumo à direita).
- Anexo 3: Pix expandido.
- Anexo 4: crédito expandido.
- Anexo 5: tela Pix.
- Anexo 6: débito expandido.
- Anexo 7: mobile empilhado com CTA após o resumo. Apesar da menção antiga a “último anexo”, o anexo 8 é a confirmação; a referência mobile é a imagem vertical do anexo 7.
- Anexo 8: confirmação de compra dentro de um ticket central e duas ações abaixo.
- A exigência de caber no desktop e o CTA adicional prevalecem sobre copiar alturas absolutas dos mockups maiores. Preservar proporções e composição; usar densidade compacta no desktop baixo.

## UI Spec

### 1. Overall layout

- Header global existente, seguido de um único `main` de checkout independente do shell do wizard.
- Desktop >=1024px: container central largo; topo com Voltar, eyebrow, título e subtítulo; grid com métodos à esquerda e resumo + CTA à direita.
- Grid desktop: `minmax(0, 1.95fr) minmax(360px, 1fr)` com gap 28px em >=1366px; em 1024–1365px usar coluna direita de 330px e gap de 20px.
- Container: `width: min(1440px, calc(100% - 96px))`; <=1365px usar margens de 32px. Não pode herdar 1080px do wizard. Em 1440px, largura útil alvo 1344px, aproximadamente 870px/446px com gap de 28px.
- Mobile/tablet <1024px: coluna única. Ordem: header, Voltar, cabeçalho, métodos, resumo, CTA, nota demo discreta. Scroll vertical natural permitido.
- Checkout, Pix e sucesso compartilham o shell; loading/erro também não podem herdar o wrapper do wizard.

### 2. Color palette

| Papel | Valor aproximado | Aplicação |
|---|---|---|
| Fundo | #000000 | página |
| Superfície | #0B0A08 | cards, degradê quase preto |
| Dourado | #F1C861 | bordas e ícones |
| Dourado vivo | #FFD66B | foco/ação |
| Texto | #F5F2EB | títulos e valores |
| Secundário | #B8B6B1 | descrições e rótulos |
| Divisória | #38352E | resumo |

Evitar manchas marrons fortes e gradientes que dominem os painéis. Borda 1px. Brilho suave apenas no selecionado/CTA ativo.

### 3. Typography scale

Usar as fontes existentes e confirmar `document.fonts.check`/fonte computada no navegador: Cormorant Garamond para títulos, Albert Sans para UI. Não usar serif nos placeholders, rótulos ou valores do resumo.

| Elemento | Desktop normal | Desktop compacto | Mobile |
|---|---:|---:|---:|
| H1 | 48/52px | 38/42px | 32/36px |
| Título método | 30/34px | 26/30px | 25/30px |
| Título resumo | 32/36px | 28/32px | 28/32px |
| Texto/inputs | 16/22px | 14/20px | 16/22px |
| Rótulos resumo | 13/18px | 12/17px | 13/18px |
| Valores resumo | 16/22px, peso 400–500 | 14/20px | 15/21px |
| Eyebrow | 13/18px, tracking .2em | 12/16px | 12/16px |

### 4. Spacing system e orçamento de altura

Unidade base de 4px. Gap entre métodos 12–16px; padding de cards 24–28px normal e 16–20px compacto. Desktop compacto é obrigatório em altura <=820px, não depende de a largura ser >=1200px.

Orçamento para viewport CSS 1440x735, zoom 100%:

| Região | Limite/alvo |
|---|---:|
| Header reservado | 76px |
| Topo incluindo Voltar e cabeçalho | 100px |
| Gap até grid | 12px |
| Métodos OU resumo+CTA+nota | <=515px |
| Margem inferior | >=16px |

A soma deve ser <=735px. O grid começa aproximadamente em y=188px e termina até y=719px. Esses valores são alvos de composição; conteúdo completo e ausência de sobreposição são mandatórios. Ajustar o padding/cabeçalho do próprio checkout, nunca reduzir a página por escala.

No desktop compacto, métodos fechados sem descrição: 64px por header. Método aberto: header 64px; inputs 40px de altura; labels 18px; stack com gap de 8–10px. Crédito aberto deve ocupar <=330px sem erros. As três opções juntas devem ocupar <=482px sem erros; reservar o restante para mensagens curtas. Resumo+CTA+nota <=515px, inclusive data e três preferências como na captura.

Em desktop alto, cabeçalho 120–150px e campos 48px; não expandir para ultrapassar a dobra. Em 1366x650 aplicar densidade adicional: header 68px, topo 88px, gaps 8px e padding vertical menor; manter controles >=40px e texto operacional >=12px. Não remover dados para caber.

### 5. Component inventory

1. Header existente, sem duplicar logo/navegação.
2. CheckoutTop: Voltar à esquerda e cabeçalho central. Voltar pode compartilhar a faixa do eyebrow no desktop compacto, sem sobreposição.
3. PaymentMethod: radio, ícone, grupo de texto, chevron; formulário somente no método escolhido.
4. ReservationSummary: ticket com recortes côncavos nos quatro cantos, título, cinco linhas, preços e total.
5. CheckoutSubmit: botão dourado abaixo do resumo, mesma largura, nota discreta abaixo.
6. PixPanel: topo com Pix e contador, QR demonstrativo à esquerda, código/valor à direita, informação e confirmação demo dentro do painel.
7. SuccessTicket: círculo de check, Parabéns!, mensagem, código e metadados dentro do mesmo ticket; ações fora, abaixo.

### 6. Interaction hints

- Método inteiro selecionável e acessível por teclado; somente um formulário aberto.
- CTA desativado escuro, sem animação. Ativação dispara sheen uma vez, 500–700ms; reduzir movimento respeitado.
- Validar/sanitizar pelos helpers atuais; não permitir `999.999.999-99`. O botão desabilitado nessa situação é comportamento correto.
- Exibir erro por blur/touched do campo, para o usuário entender por que está bloqueado. Atualmente `touched` global só é alterado no submit, que o botão desabilitado impede; substituir por touched por campo. Não criar chamadas de backend a cada digitação.
- Transições de wizard para checkout e de checkout para Pix/sucesso iniciam no topo; focar o H1 com `preventScroll`, após ajustar scroll uma única vez por mudança de tela. Nunca rolar ao topo durante digitação/contador.
- Não registrar dados de cartão; manter limpeza após submit. Não implementar cobrança real.

### 7. Uncertainties

- Cores e medidas foram estimadas dos anexos, não amostradas em pixels nesta etapa.
- Não houve captura da aplicação corrigida, porque esta entrega é somente a spec.
- Altura do header real deve ser medida durante execução. O responsável deve ajustar o offset pelo valor medido, sem somar duas reservas de espaço.

## Decisões de implementação por módulo

### Módulo A — remover resíduos e separar o shell

Arquivo: `next-app/src/components/reservation/v2/ReservationWizard.tsx`.

1. `Confirmation` deve retornar exclusivamente `ReservationCheckout` (ou ser removida e seu consumidor renderizar o checkout diretamente).
2. Remover desta composição a seção “Acesso à reserva”, seu link privado, o `details`, “Abrir simulação rápida de pagamento” e o consumidor de `MockPaymentDemo`. Remover import não usado. Não adicionar versão escondida em accordion, query param ou flag.
3. Em `ReservationWizardContent`, após tratar auth e ANTES de retornar o shell do formulário: se houver `confirmation`, retornar o checkout. Somente os passos do wizard continuam em `main.reservation-page-wrapper > .reservation-page-content`.
4. Garantir um único `main` na página; não aninhar main dentro de main. Não alterar as regras globais do wizard para acomodar checkout.
5. O link privado continua existindo no portal e nos fluxos que já o utilizam; não apagar APIs/token da reserva. A solicitação é remover o bloco desta tela.

### Módulo B — shell e header

Arquivos: `ReservationCheckout.tsx`, `ReservationCheckout.module.css`, `src/app/reservas/page.tsx`, ajustes locais em `globals.css` se necessários.

- Reutilizar `Header`. Medir se ele está fixed. Reservar sua altura uma única vez no checkout. Não alterar globalmente altura/estilo do header de outras rotas.
- `.root` fica em fluxo normal e cobre a altura útil; `.inner` não repete padding do wizard. Aplicar `box-sizing:border-box` ao módulo e descendentes para que padding/borda não aumentem as medidas previstas.
- Preservar remoção do footer somente enquanto checkout estiver montado. Não remover footer de etapas anteriores nem alterar a home.
- A marca `data-reservation-checkout` deve ser removida no cleanup. Pode controlar CSS de header/print estritamente scoped; não usar para ocultar conteúdo obrigatório.
- Proibido: `overflow:hidden` no body para disfarçar scroll; height fixa que corte conteúdo; `zoom`; `transform:scale`; margens negativas para fugir do wrapper; iframe; uma nova rota paralela só para screenshot.
- Em zoom 200% ou alturas extremas fora dos viewports de aceite, permitir scroll acessível. “Sem scroll desktop” aplica-se aos viewports normais definidos abaixo, sem prejudicar acessibilidade.

### Módulo C — métodos e campos

- Reestruturar `.methodHeader` em quatro colunas: radio, ícone, grupo textual flexível, chevron. O grupo textual contém título e descrição em duas linhas.
- Sem método: três descrições visíveis abaixo dos títulos. Com método: esconder descrições dos três cards, mantendo títulos; formulário aparece só no selecionado, como anexos 3/4/6.
- `min-width:0` nos grupos. Títulos cabem em uma linha no desktop normal; nunca forçar título e descrição a competir lado a lado.
- Campos Pix ocupam a largura interna, com alinhamento do anexo 3. Crédito: nome e número em linhas completas; última linha validade/CVV/parcelamento. Débito: última linha validade/CVV com DUAS colunas iguais, não deixar terceira coluna vazia.
- No mobile, validade/CVV em duas colunas e parcelamento abaixo com largura total. Sem seletor `:last-child` que faça o CVV do débito ocupar uma linha inteira por acidente.
- Parcelamento deve exibir `1x de <total formatado>` em vez de “1x no cartão”. Não criar mais parcelas do que a política atual permite.
- Substituir texto “VISA · MC · AMEX · ELO” por marcas SVG/assets existentes do projeto. Reaproveitar o sistema de badges se oferecer a marca correta; não usar logo gerado ou marca falsa. Em mobile estreito, colocar grupo sob o campo se necessário, sem cobrir os dígitos.
- Pix: usar SVG com geometria coerente com a referência, não quatro quadrados aproximados se o resultado não corresponder ao símbolo.

### Módulo D — resumo, CTA e ticket

- `.summaryRow`: ícone 24px, label 76–84px, valor com `minmax(0,1fr)`. Labels alinhadas à esquerda; valores peso máximo 500.
- Data em duas linhas quando necessário e dia da semana dourado. Preferências com altura natural até três linhas no cenário da captura (7 pessoas; Acessibilidade, Restrição alimentar, Cadeira infantil). Não usar ellipsis ou ocultar preferências.
- Separadores finos, preços com valores claros e total dourado. Não usar todos os valores financeiros dourados como no defeito.
- Ticket: desenhar borda/recortes com SVG decorativo absoluto `aria-hidden` em volta da área, sem posicionar texto absolutamente. Recortes entre 16–20px; superfície quase preta; interior com padding real. Reutilizar a mesma decoração no sucesso.
- CTA continua abaixo e fora do ticket, com gap 12px; não fixá-lo ao rodapé ou flutuar sobre conteúdo. Nota demo em uma linha no desktop largo, até duas no compacto. Manter a indicação de simulação.

### Módulo E — Pix e sucesso

- Pix mantém resumo à direita; no painel esquerdo QR, valor, copiar e contador devem caber com a mesma reserva de header/topo. Confirmar demo somente por botão local explícito, nunca pelo tempo decorrido.
- QR/código permanecem identificados como demonstrativos; sem payload de pagamento real. A melhoria de fidelidade não pode sugerir cobrança executada.
- No sucesso, mover check, título e mensagem para DENTRO do ticket central, conforme anexo 8. Remover o eyebrow extra “COMPRA CONCLUÍDA” se não existir no desenho. Código e metadados permanecem no ticket.
- Abaixo do ticket: “Imprimir recibo” outline e “Ver lista de reservas” dourado, lado a lado desktop e empilhados mobile. Recibo explicitamente demonstrativo. Não prometer e-mail enviado pelo pagamento simulado.
- Success também precisa caber em 1440x735 e 1366x650. Não conservar o padding superior fixo de 175px somado aos wrappers.

## Ordem de execução e arquivos

1. Remover resíduos e separar o checkout do wrapper em `ReservationWizard.tsx`.
2. Corrigir shell/offset/header/dimensões em `ReservationCheckout.module.css`; manter CSS formatado com regras legíveis, não blocos gigantes em uma linha.
3. Extrair componentes visuais atuais para arquivos irmãos, sem duplicar lógica: `CheckoutPaymentMethod.tsx`, `CheckoutReservationSummary.tsx`, `CheckoutPixPanel.tsx`, `CheckoutSuccess.tsx`. `ReservationCheckout.tsx` permanece controlador dos dados, adapter, método e transições. Imports de validação/adapter continuam vindo dos módulos existentes.
4. Corrigir título/descrição, grade crédito/débito, marcas, resumo e contorno ticket.
5. Aplicar densidade por altura a checkout, Pix e sucesso; derivar mobile do anexo 7.
6. Ajustar touched/foco e verificar CTA sem mexer no contrato das APIs.
7. Capturar a aplicação integrada e corrigir divergências. Não validar somente componentes isolados: o erro atual nasce também da composição da página.

Não modificar módulos de conta, recuperação, administração ou schema/banco para corrigir esta UI.

## Aceite e verificação obrigatória para a implementação futura

### Matriz de viewport CSS (zoom 100%)

- Desktop: 1440x735 (prioridade da máquina do usuário), 1366x650, 1536x864, 1920x1080.
- Desktop estreito: 1024x768, mantendo duas colunas e controles legíveis.
- Tablet: 768x1024, coluna única, scroll vertical permitido.
- Mobile: 390x844 e 360x800, scroll vertical permitido e sem overflow horizontal.

Nos desktops, verificar para cada estado: nenhum método, Pix aberto, crédito aberto, débito aberto, Pix pendente e sucesso. Incluir CTA ativo/inativo e dados da captura (7 pessoas, três preferências, data longa). No desktop compacto, verificar mensagens de erro também sem encobrir CTA.

### Critérios objetivos

- `document.scrollingElement.scrollHeight <= document.documentElement.clientHeight + 1` nos viewports desktop listados, para os cenários normais completos. Usar o scrollingElement real, não somente o body.
- `scrollWidth <= clientWidth + 1` no documento e nos painéis. Ausência de scroll interno usado para contornar a exigência desktop.
- Bounds de título, formulários, resumo, nota e CTA dentro do viewport; início do checkout abaixo do header, sem interseção entre seus retângulos.
- Não basta a ausência de scrollbar: validar que o conteúdo não foi cortado, escondido ou deslocado para fora da tela.
- No DOM visível do checkout não existem “Acesso à reserva”, “Acessar minha reserva”, “Abrir simulação rápida de pagamento” ou o simulador antigo.
- Formulário de reserva anterior mantém seu layout; home/header das demais rotas sem regressão.
- Pix inválido mantém CTA bloqueado e apresenta orientação após blur; dados fictícios válidos liberam CTA. Crédito/débito válidos alcançam sucesso demo. Pix demo respeita expiração, cópia e confirmação manual.

### Evidência visual exigida

- Capturar screenshots de viewport, sem fullPage, nos seis estados a 1440x735; repetir crédito/débito/Pix/sucesso em 1366x650; capturar desktop largo e mobile Pix/crédito/sucesso.
- Comparar lado a lado com os anexos equivalentes. A diferença de altura do mockup deve ser resolvida pela densidade definida, preservando a mesma composição.
- Inspecionar crops de: header/título, método aberto, bandeiras+número, resumo com preferências, junção resumo/CTA e ticket de sucesso.
- Registrar viewport, zoom, DPR, fonte computada, overflow medido e caminho de cada artefato. Não alegar fidelidade aprovada a partir de typecheck/build.
- Para verificar estados sem criar dados pessoais ou reservas reais, pode usar interceptação de rede/fixtures SOMENTE no navegador de teste. Nenhum endpoint de bypass de autenticação, rota demo pública ou mock de produção adicional.
- Rodar typecheck/lint e verificações existentes relevantes após o ajuste. Priorizar screenshot e fluxo real da rota; não criar testes que apenas procurem strings no código como prova de fidelidade.
- Se a captura não for possível, reportar motivo concreto e marcar aceite visual pendente, nunca “concluído”.

## Entrega esperada do executor

Informar arquivos alterados, blocos removidos, dimensões verificadas, screenshots/crops realmente inspecionados e limitações restantes. Sem screenshots corretas da rota completa, a correção visual permanece pendente.
