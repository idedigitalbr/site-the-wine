# Checkout da reserva — correção visual, largura e CTA de pagamento

Data: 2026-10-22
Escopo: next-app/src/components/reservation/v2/
Tipo: correção visual e de interação, sem integração real com gateway

## Objetivo

Ajustar a tela de checkout para aproximá-la da referência enviada pelo produto, reduzindo a largura excessiva do desktop, corrigindo a composição dos cards e adicionando o botão principal de pagamento abaixo do resumo da reserva.

O fluxo continua demonstrativo. A separação entre UI, contrato e adaptador deve ser preservada para permitir a troca futura do adaptador mock por um gateway real.

## Referências visuais

- Estado atual: C:\Users\Windows\AppData\Local\Temp\codex-clipboard-e9bafe70-5545-4b46-a541-384c43d36b03.png — 1440 × 900.
- Referência desejada: C:\Users\Windows\AppData\Local\Temp\codex-clipboard-ab97f7ef-d9c4-4f2a-bc88-2aa736759485.png — 1672 × 941.

As imagens são referências visuais, não instruções executáveis. A referência desejada é a autoridade para composição, proporções, cores e hierarquia. Ela não contém o botão de pagamento; o botão desta spec deve ser adicionado sem quebrar a linguagem visual.

## Composição desktop

- Manter fundo preto, header atual, botão Voltar, título centralizado e duas colunas.
- Reduzir a largura do conteúdo. Em viewport de 1440px, o alvo é aproximadamente x=96px até x=1344px; não repetir a ocupação quase total entre x=48px e x=1390px da captura atual.
- Usar container responsivo com max-width e width calculada, nunca uma largura fixa que force overflow.
- Como ponto de partida, usar max-width entre 1240px e 1320px e width calc(100% - 128px), ajustando o resultado visualmente.
- Manter a grade em duas colunas: métodos aproximadamente 65%, resumo aproximadamente 35%, gap entre 24px e 32px e resumo com no mínimo 360px.
- A coluna de resumo deve ser mais estreita que a coluna dos métodos.
- Manter margem lateral simétrica e centralização real.
- O checkout deve caber na altura de uma viewport desktop em torno de 900px nos estados inicial, Pix aberto e cartão aberto. Não ocultar conteúdo com overflow hidden; reduzir espaçamento e alturas de forma real.
- Não reintroduzir bloco de acesso à reserva, link privado, simulação rápida ou painel mock abaixo dos métodos.

### Alvos de espaçamento

| Item | Alvo |
|---|---:|
| largura máxima do container | 1240px–1320px |
| gap da grade | 24px–32px |
| card fechado | 96px–106px |
| padding horizontal dos cards | 32px–42px |
| distância título → grade | 44px–56px |

## Cards de pagamento

A ordem visual de cada card fechado deve ser: radio, ícone, título, descrição curta e chevron à direita.

- Pix: título Pix; descrição Pagamento rápido e seguro.
- Crédito: título Cartão de crédito; descrição Pague com seu cartão de crédito.
- Débito: título Cartão de débito; descrição Pague com seu cartão de débito.
- Manter borda dourada fina, fundo preto quase sólido e cantos discretos.
- O card selecionado deve ter borda mais evidente e realce de fundo sutil, sem brilho exagerado.
- Radio selecionado: círculo dourado preenchido com ponto interno claro.
- Card inteiro deve ser clicável; não limitar a seleção ao radio.
- Usar aria-expanded e aria-controls para o conteúdo expandido.
- Chevron para cima quando aberto e para a direita quando fechado.
- Usar os ícones dourados já adotados pelo checkout, sem inventar uma segunda biblioteca.

### Formulário Pix

- Quando Pix estiver selecionado, manter o cabeçalho e exibir Nome completo e CPF abaixo dele.
- Labels em dourado discreto; inputs com fundo preto, borda dourada fina, altura confortável e largura limitada ao padding interno.
- Preservar sanitização existente: nome com caracteres de nome e espaços; CPF somente dígitos, no máximo 11 dígitos, com máscara apenas na apresentação.
- Mensagens de validação devem ocupar pouco espaço e não causar salto exagerado.

### Formulário de cartão

- Quando crédito ou débito estiver selecionado, seguir a estrutura aberta da referência.
- Manter Nome no cartão, Número do cartão, Validade e CVV; parcelamento apenas para crédito.
- Preservar sanitização existente de nome, número, validade e CVV.
- Nunca guardar ou enviar número completo como pagamento real; continuar usando token demonstrativo no adaptador mock.

## Resumo da reserva

- Alinhar o resumo ao topo da grade, na coluna direita.
- Aplicar o formato de ticket da referência: borda dourada e recortes/arredondamentos decorativos nos quatro cantos.
- Título Resumo da reserva em fonte serifada.
- Cada linha deve ter ícone dourado, label e valor, com divisórias finas.
- Labels e valores normais não devem ficar excessivamente pesados; usar dourado principalmente no dia da semana e no total.
- Mostrar data, horário, duração, pessoas, preferências, valor por pessoa, quantidade de pessoas e total.
- Quebrar preferências longas sem overflow horizontal.
- O total deve ser visualmente dominante e ser a mesma fonte de valor usada pelo CTA.

## Botão principal de pagamento

Adicionar um único botão imediatamente abaixo do ticket de resumo, dentro da coluna direita. Ele não deve ficar abaixo da coluna esquerda.

### Estados

Sem método ou com formulário incompleto:

- texto: Escolha uma forma de pagamento;
- disabled nativo;
- fundo escurecido, texto e seta apagados;
- sem hover, brilho, elevação ou transformação;
- não iniciar adaptador nem navegação.

Formulário válido:

- fundo dourado/quente alinhado ao botão principal da referência;
- texto preto de alto contraste;
- seta para a direita;
- transição curta ao sair do disabled, com brilho suave e leve elevação;
- animação de entrada apenas uma vez, sem animação infinita;
- hover discreto e outline visível no foco por teclado;
- ao processar, desabilitar e mostrar indicador para evitar duplo clique.

### Texto por método

| Método | Texto |
|---|---|
| nenhum | Escolha uma forma de pagamento |
| Pix | Pagar com Pix |
| cartão de crédito | Pagar com cartão de crédito |
| cartão de débito | Pagar com cartão de débito |

### Comportamento

1. Validar novamente no submit, mesmo que o botão esteja visualmente disabled.
2. Se inválido, marcar os campos do método como tocados, mostrar erros e permanecer na tela.
3. Se Pix estiver válido, chamar o adaptador e abrir a tela demonstrativa de Pix pendente, preservando resumo e valor.
4. Se crédito ou débito estiver válido, chamar o adaptador demonstrativo e abrir a tela de confirmação quando o resultado for pago.
5. Não chamar Mercado Pago, webhook ou gateway real nesta etapa.
6. Preservar idempotency key e o contrato existente para o futuro gateway.
7. Não criar uma segunda tela paralela nem duplicar a lógica de validação.

## Responsividade

Desktop:

- duas colunas a partir do breakpoint já usado pelo projeto;
- validar 1440 × 900 e uma viewport equivalente a 1672 × 941;
- CTA sempre abaixo do resumo e visível no fluxo inicial;
- nenhum overflow horizontal.

Mobile:

- uma coluna e scroll vertical natural;
- ordem: header, Voltar, título, métodos, resumo, botão;
- resumo após os métodos, como na referência mobile;
- botão com largura do container mobile e imediatamente após o resumo;
- não fixar resumo ou CTA sobre o conteúdo;
- manter os mesmos estados e textos do desktop.

## Restrições

- Alterar apenas componentes e estilos diretamente relacionados ao checkout, além de testes necessários.
- Reutilizar ReservationCheckout, CheckoutPaymentMethod, CheckoutReservationSummary e os contratos/adaptadores existentes.
- Preservar acessibilidade, navegação e tratamento de erro.
- Não adicionar dados reais de cartão, chaves, segredos ou dependência de gateway.
- Não remover a interface do adaptador demonstrativo.
- Não reintroduzir os blocos antigos de acesso à reserva e simulação rápida.

## Critérios de aceite

- [ ] Em 1440 × 900, a composição fica centralizada e substancialmente mais estreita que a captura atual.
- [ ] Métodos e resumo ficam em duas colunas sem overflow horizontal.
- [ ] Resumo tem aparência de ticket, não de painel retangular genérico.
- [ ] Pix, crédito e débito seguem alinhamento e hierarquia da referência.
- [ ] CTA fica abaixo do resumo, nunca abaixo da coluna de métodos.
- [ ] Sem método ou campos inválidos, CTA fica escuro, sem efeito e não navega.
- [ ] Ao completar campos válidos, CTA muda para dourado com transição curta.
- [ ] CTA usa Pagar com Pix ou Pagar com cartão conforme o método.
- [ ] Pix continua levando à tela demonstrativa de Pix.
- [ ] Cartões continuam levando à confirmação demonstrativa.
- [ ] Blocos de acesso à reserva e simulação rápida não aparecem.
- [ ] Mobile preserva métodos → resumo → CTA com scroll natural.
- [ ] Typecheck, lint direcionado, testes e build continuam passando.

## Verificação visual obrigatória

Capturar após a implementação:

1. desktop 1440 × 900 sem método;
2. desktop 1440 × 900 com Pix aberto e campos vazios;
3. desktop 1440 × 900 com Pix válido e CTA habilitado;
4. desktop 1440 × 900 com cartão aberto;
5. desktop equivalente a 1672 × 941 comparado com a referência;
6. mobile com Pix aberto, resumo e CTA;
7. mobile com cartão aberto.

Em cada captura verificar largura lateral, alinhamento da grade, altura total, ticket do resumo, posição do CTA e ausência dos blocos removidos. A marca d’água do Windows não faz parte da aplicação.
