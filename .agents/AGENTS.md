# AGENTS.md - Regras do Projeto

## Contexto obrigatório

Antes de alterar frontend, arquitetura, CSS, JavaScript ou iniciar migração para Next.js, leia nesta ordem:

1. `NEXT_MIGRATION.md`
2. `docs/next-migration/01-static-audit.md`
3. `docs/next-migration/02-component-map.md`
4. `docs/next-migration/03-behavior-contract.md`
5. `docs/next-migration/04-design-system-and-assets.md`
6. `docs/next-migration/05-migration-plan.md`
7. `docs/next-migration/legacy-contract.json`

## Regra de paridade

A versão estática atual é a referência de verdade.

Durante a migração para Next.js:

- preservar visual 1:1;
- preservar recursos 1:1;
- preservar ordem das seções;
- preservar copy;
- preservar assets e enquadramentos;
- preservar breakpoints funcionais;
- preservar animações e comportamento percebido;
- preservar URLs e mensagens de WhatsApp;
- preservar SEO e structured data;
- não redesenhar componentes durante a fase de paridade;
- não trocar SVGs por bibliotecas de ícones durante a fase de paridade;
- não converter imagens para `next/image` até validar que o layout permanece equivalente;
- não reescrever todo o CSS junto com a mudança de framework.

## Arquitetura Next

Server Components devem ser o padrão.

Usar Client Components somente nas áreas que realmente precisam de browser/interação:

- navegação mobile;
- scroll spy;
- reveal/parallax;
- accordion de eventos;
- galeria/lightbox;
- modal/flipbook do cardápio.

Não transformar `page.tsx` inteiro em `use client`.

## Git e Deploy

- Esta branch de preparação não deve fazer deploy.
- Não executar GitHub Actions para validar esta branch.
- Não alterar `main` sem instrução explícita do responsável pelo projeto.
- Alterações arquiteturais devem permanecer isoladas em branch.
- Sempre inclua o link direto do commit do GitHub na resposta após realizar um commit solicitado.

## Segurança da migração

Antes de remover, renomear ou substituir qualquer classe, ID, asset ou script, verificar se ele aparece no contrato de comportamento ou nos testes existentes.

Quando houver dúvida entre melhorar e preservar, preservar primeiro.

## ⚡ REGRA DE OURO: AGILIDADE E VELOCIDADE EM AJUSTES DE FRONTEND (NEXT.JS / CSS / UI)

**Ajustes de layout, estilo, CSS, tipografia, espaçamento (px, rem, margin, padding, cores, tamanhos) devem ser resolvidos em SEGUNDOS, sem rebuliço.**

1. **Ajuste Direto e Imediato:**
   - Fazer a edição pontual direta no arquivo CSS ou componente JSX/TSX usando `replace_file_content`.
   - Responder imediatamente ao usuário após a alteração.

2. **🚫 PROIBIDO EM AJUSTES DE FRONTEND / CSS:**
   - **NÃO rodar `npm run typecheck` ou `tsc`** para checar mudanças cosméticas ou de pixels.
   - **NÃO rodar `npm run build`** para validar alterações simples de CSS/JSX.
   - **NÃO fazer requisições de rede (`read_url_content`)** para testar se a página carregou em ajustes de estilo.
   - **NÃO reiniciar servidores dev (`npm run dev`)** desnecessariamente. O Next.js possui **Fast Refresh nativo**, que reflete as alterações no navegador em milissegundos.

3. **Quando usar Typecheck / Build:**
   - **Apenas** quando houver alteração estrutural profunda de lógica/TypeScript, criação de novas rotas de API, refatoração de contratos de dados, instalação de novas dependências, ou quando o usuário **pedir expressamente** para validar a build ou fazer commit.
