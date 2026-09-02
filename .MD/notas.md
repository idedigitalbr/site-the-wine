# Notas

atualizado: 2026-09-02

## 🍪 Cookiebot CMP / LGPD & Gestão de Cookies
- **Contexto Central**: Consulte o arquivo `.MD/cookiebot.md` para todos os detalhes técnicos e operacionais.
- **CBID Atual**: `b812919e-de18-41f1-824c-bb88bba1a892`
- **Ambiente Vigente**: `https://thewine.suporteide.digital` (subdomínio temporário na VPS).
- **Ação Imediata Pós-Deploy**: Acessar `thewine.suporteide.digital` em aba anônima e validar banner; no painel Cookiebot Admin > Implementation > CMP Banner, clicar em "Verify again" para passar de "Not live" para "Live".
- **Mudança de Domínio Futura**: Quando sair do subdomínio `thewine.suporteide.digital` para o domínio oficial definitivo da THE WINE:
  1. No Cookiebot Admin: cadastrar o novo domínio oficial no Domain Group (se mantiver o grupo, o CBID segue o mesmo; se criar outro grupo, trocar o CBID no `layout.tsx`) e rodar novo scan / "Verify again".
  2. No Next.js: atualizar canonical/OG em `src/config/site.ts`.
  3. No Traefik/Docker/DNS: apontar novo domínio e emitir certificado SSL.

## Aprendizados

- No Next.js 15+/16 App Router, o Cookiebot com `strategy="beforeInteractive"` deve ficar no `<body>` do `src/app/layout.tsx` (não em `<head>` manual) para compatibilidade perfeita com hidratação e SSR.

## Observacoes soltas

- Projeto mapeado a partir de: G:\Meu Drive\.PROJETOS\Projetos JR Lopes 2026\Projeto THE WINE Experience
