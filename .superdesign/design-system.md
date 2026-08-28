# The Wine Operations — Design System

## Produto e contexto

Painel administrativo operacional do restaurante The Wine Experience. O shell é uma sidebar escura fixa no desktop e uma navegação horizontal compacta no mobile. As superfícies de operação usam fundo marfim claro, cards brancos, bordas discretas e acentos dourados. A home pública mantém o tema preto editorial e não deve ser alterada por telas administrativas.

## Arquitetura e usuários

- Usuários: equipe de operação e administração do restaurante.
- Rotas existentes: dashboard, reservas, clientes, mapa do salão, configuração e notificações.
- Nova área: menu `Sistema`, com configurações de envio SMTP e templates de e-mail.
- A configuração SMTP é sensível: senha nunca aparece em texto aberto; a tela deve indicar quando o valor está salvo e permitir substituição segura.
- O modo atual de notificações é demonstrativo/mock; não sugerir envio real nem gateway de pagamento.

## Marca e identidade

- Logotipo oficial The Wine Experience no topo da sidebar; nunca substituir por emoji, iniciais ou símbolo genérico.
- Tipografia de interface: Albert Sans; títulos editoriais: Cormorant Garamond.
- Acento de marca: dourado suave, usado em links ativos, ações primárias, ícones e foco.
- Ícones de interface: Lucide, traço fino e consistente.

## Tokens

```css
--background: #F7F5F0;
--surface: #FFFFFF;
--surface-muted: #EFEAE0;
--foreground: #171512;
--muted: #686158;
--primary: #A98445;
--primary-hover: #876936;
--primary-foreground: #FFFFFF;
--border: rgba(11, 10, 8, 0.14);
--border-strong: rgba(11, 10, 8, 0.28);
--sidebar: #0B0A08;
--sidebar-foreground: #FFFFFF;
--sidebar-muted: rgba(255, 255, 255, 0.68);
--sidebar-accent: #D3B97B;
--success: #4F8A65;
--warning: #B9833C;
--danger: #9D524B;
```

- Raios: 0.5rem (small), 0.625rem (medium), 0.75rem (large), 1rem (extra large).
- Espaçamento: escala de 0.25rem a 4rem; conteúdo principal com largura confortável e gutters responsivos.
- Sombras: discretas, cinza quente, usadas somente para elevar cards e menus.
- Foco: anel dourado visível; todos os controles precisam manter rótulo e estado acessíveis.

## Padrões do módulo Sistema

- Cabeçalho editorial curto: eyebrow `SISTEMA`, título serifado e descrição operacional.
- Navegação secundária em abas/cartões: `SMTP` e `Templates de e-mail`, com estado ativo dourado.
- SMTP: card de status com indicador `Configurado`/`Não configurado`, formulário em duas colunas no desktop, campos agrupados por conexão, autenticação e remetente, botão primário `Salvar configuração` e ação secundária `Testar conexão (mock)`.
- Senha SMTP deve usar input password, texto mascarado e mensagem `Senha salva` quando existente. Não renderizar segredo retornado pela API.
- Templates: lista de tipos de mensagem com status e última atualização; editor com assunto, prévia de variáveis permitidas e área de corpo; ações `Salvar alterações`, `Restaurar padrão` e `Visualizar prévia`.
- Estados vazios, sucesso, erro e modo mock devem ser explícitos e localizados em português.
- Feedback de salvar/testar deve aparecer junto ao card afetado, sem toast intrusivo como única comunicação.

## Movimento e responsividade

- Transições curtas de 150–220ms para tabs, foco e hover.
- Sidebar permanece com largura fixa no desktop; em telas pequenas vira barra horizontal rolável sem quebrar o conteúdo.
- Cards e formulários colapsam para uma coluna abaixo de `lg`.
- Respeitar `prefers-reduced-motion`.

## Restrições

- Preservar o shell, o tema administrativo e a navegação existente.
- Não introduzir gradientes neon, fontes novas, ilustrações decorativas ou estilos de marketing na área administrativa.
- Não expor credenciais SMTP, tokens ou conteúdo sensível em preview, logs ou mensagens.
- Usar apenas os componentes e tokens existentes; o módulo pode adicionar componentes locais reutilizáveis para tabs, status, formulário e editor.
