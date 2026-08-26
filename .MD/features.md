# Features e Módulos do Projeto

atualizado: 2026-08-25

## 📋 DOCUMENTAÇÃO E CONTEXTO [Ativo]
- [x] Mapeamento de escopo e briefing
- [x] Arquitetura técnica documentada
- [x] Stack documentada
- [x] Processo de deploy documentado
- [x] Changelog técnico mantido

## 💻 SITE INSTITUCIONAL / HOME [Implementado]
- [x] Header desktop
- [x] Menu mobile / drawer responsivo
- [x] Hero com vídeo
- [x] Seção institucional THE WINE EXPERIENCE
- [x] Seções de gastronomia, vinhos e harmonizações
- [x] Cardápio com experiência interativa/modal
- [x] Eventos & Experiências em accordion
- [x] CTAs de reserva direcionados para WhatsApp
- [x] Galeria de imagens / lightbox
- [x] Localização, horários e contato
- [x] Rodapé responsivo
- [x] SEO, Open Graph, Twitter Cards e Schema.org

## 🧪 QUALIDADE [Implementado]
- [x] Testes automatizados com `node:test`
- [x] Testes de menu/cardápio
- [x] Testes de hero, rodapé, copy e reservas
- [x] Teste de hardening do deploy
- [x] Execução dos testes no GitHub Actions
- [x] Validação do build Docker antes do deploy

## 🛠️ INFRAESTRUTURA & VPS [Implementado]
- [x] Docker Compose + Nginx
- [x] Traefik / TLS
- [x] DNS / Cloudflare
- [x] Deploy automático via GitHub Actions
- [x] Deploy restrito à branch `main`
- [x] Build Docker com allowlist de arquivos públicos
- [x] Exclusão de materiais internos do contexto de publicação

## 🔐 PENDÊNCIAS DE GOVERNANÇA
- [ ] Ativar proteção da branch `main` no GitHub
- [ ] Exigir o workflow de validação antes de permitir merge
- [ ] Adotar branch + Pull Request como fluxo padrão de alterações
