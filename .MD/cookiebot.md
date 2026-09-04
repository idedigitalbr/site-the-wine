# Cookiebot CMP & Gestão de Cookies (LGPD)

> **Status Atual**: Ativo em Produção (Validado e Registrado no Painel)  
> **Data de Atualização**: 2026-09-03  
> **Ambiente Principal**: `https://thewineexperience.com.br` (Domínio Oficial Registrado)  
> **Ambiente Alternativo**: `https://thewine.suporteide.digital` (Subdomínio Provisório)  

---

## 1. Contexto & Dados Oficiais do Cookiebot

- **Domain Group ID / CBID**: `b812919e-de18-41f1-824c-bb88bba1a892`
- **Script Oficial**: `https://consent.cookiebot.com/uc.js`
- **Modo de Bloqueio**: Automático (`data-blockingmode="auto"`)
- **Tipo de Chave**: Chave pública de frontend (não requer e não deve ser colocada em `.env`)

---

## 2. Implementação Técnica no Next.js (App Router)

- **Arquivo**: `next-app/src/app/layout.tsx`
- **Estratégia de Injeção**: Componente nativo `next/script` com `strategy="beforeInteractive"` dentro do `<body>` do `RootLayout`.
- **Escopo**: Global. Carrega automaticamente em todas as páginas e rotas do site (`/`, `/reservas`, `/minha-reserva/*`, `/termos-e-privacidade`, `/admin/*`).

### Código no Layout:
```tsx
import Script from 'next/script';

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Fontes do Google e Schema.org Restaurant */}
      </head>
      <body>
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="b812919e-de18-41f1-824c-bb88bba1a892"
          data-blockingmode="auto"
          type="text/javascript"
          strategy="beforeInteractive"
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
```

---

## 3. Auditoria de Trackers & Cookies Não Essenciais

- **Status de Trackers**: Nenhum tracker ativo atualmente no repositório.
  - Varredura realizada por: Google Analytics (`gtag`), Google Tag Manager (`gtm`), Meta Pixel (`fbq`), TikTok Pixel, Clarity, Hotjar.
  - O único script local no frontend é `/assets/js/page-flip.browser.js`, que é funcional e estritamente necessário para abrir o cardápio interativo (não é cookie/tracker).
- **Bloqueio Automático Ativo**: Graças ao `data-blockingmode="auto"`, caso novos pixels ou scripts de marketing/analytics sejam inseridos futuramente, o Cookiebot interceptará e bloqueará a execução até que o visitante dê o consentimento na categoria correspondente.

---

## 4. Checklist Pós-Deploy no Subdomínio Atual (`thewine.suporteide.digital`)

1. **Deploy na VPS**:
   - Subir a versão com o `layout.tsx` atualizado.
2. **Teste em Navegador**:
   - Abrir `https://thewine.suporteide.digital` em aba anônima (sem cache).
   - Verificar se o modal/banner de cookies é exibido imediatamente no carregamento da página.
3. **Validação no Painel do Cookiebot**:
   - Acessar o dashboard do Cookiebot (manage.cookiebot.com).
   - Ir em **Implementation** > **CMP Banner**.
   - Clicar no botão **"Verify again"**.
   - Confirmar que o status do domínio mudou de **"Not live"** para **"Live"**.

---

## 5. Checklist para a MUDANÇA FUTURA DE DOMÍNIO (Quando sair do Subdomínio)

Quando o site for migrado do subdomínio temporário `thewine.suporteide.digital` para o **domínio final definitivo** da THE WINE:

### A. No Painel do Cookiebot:
1. **Configurar o Novo Domínio**:
   - Acessar o Cookiebot Admin > **Domains / Domain Groups**.
   - Adicionar o domínio definitivo (ex: `thewineexperience.com.br`).
   - Se for utilizado o **mesmo Domain Group**, o CBID permanecerá `b812919e-de18-41f1-824c-bb88bba1a892`.
   - Se for criado um **novo Domain Group**, pegar o novo CBID gerado.
2. **Scan do Novo Domínio**:
   - Solicitar um novo scan completo pelo Cookiebot para indexar todas as páginas do domínio final.
   - Clicar em **"Verify again"** no novo domínio.

### B. No Código do Projeto (`next-app`):
1. **Verificar CBID**:
   - Em `next-app/src/app/layout.tsx`, manter ou atualizar o `data-cbid` caso um novo Domain Group tenha sido criado no painel.
2. **Configurações de SEO & Canônico**:
   - Em `next-app/src/config/site.ts`, atualizar:
     - `canonical: 'https://seunovodominio.com.br'`
     - Imagens sociais / Open Graph.
3. **Página de Termos e Privacidade (`/termos-e-privacidade`)**:
   - Revisar se links ou textos citando o domínio precisam ser atualizados.
   - *(Opcional)* Inserir o script de declaração automática de cookies (`CookieDeclaration`) caso o cliente solicite listar a tabela detalhada de cookies escaneados na página de privacidade.

### C. Na Infraestrutura (VPS / DNS / Cloudflare):
1. Apontar os registros DNS (A / CNAME) do novo domínio para o IP da VPS.
2. Atualizar o `docker-compose.yml` / labels do Traefik para o novo domínio (geração do certificado SSL Let's Encrypt).
