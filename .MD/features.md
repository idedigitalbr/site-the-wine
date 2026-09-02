# Features e Módulos do Projeto

atualizado: 2026-09-02

## 📋 DOCUMENTAÇÃO E CONTEXTO [Ativo]
- [x] Mapeamento de escopo e briefing
- [x] Arquitetura técnica documentada (Next.js + MySQL)
- [x] Stack tecnológica atualizada
- [x] Processo de deploy CI/CD documentado
- [x] Changelog técnico detalhado

## 🍷 SITE INSTITUCIONAL / HOME [Implementado & Paridade 1:1]
- [x] Header desktop com links e CTAs
- [x] Menu mobile / drawer responsivo
- [x] Hero com vídeo em loop e parallax
- [x] Seção institucional THE WINE EXPERIENCE
- [x] Seções de gastronomia, carta de vinhos e ambiente
- [x] Seção de harmonizações com botões de ação
- [x] Cardápio split com vídeo e mockup
- [x] Modal e flipbook interativo do cardápio (PageFlip)
- [x] Nossos Eventos & Experiências em accordion interativo
- [x] CTAs de reserva direcionados para wizard web e WhatsApp
- [x] Galeria contínua de fotos com visualizador Lightbox
- [x] Rodapé completo com horários, mapa interativo e contatos
- [x] SEO otimizado, Open Graph, Twitter Cards e Schema.org Restaurant
- [x] Gestão de Cookies e Consentimento LGPD via Cookiebot CMP (auto-blocking ativo) [ver .MD/cookiebot.md]

## 📅 SISTEMA DE RESERVAS PÚBLICO (/reservas) [Implementado]
- [x] Wizard interativo passo a passo (Passos 1 a 4)
- [x] Seleção de data, horário/turno e número de pessoas
- [x] Motor de disponibilidade em tempo real
- [x] Travas transacionais para prevenção de overbooking
- [x] Formulário de dados de contato e preferências do cliente
- [x] Tela de confirmação e resumo da reserva
- [x] Disparo automático de e-mail de confirmação

## 🏢 PAINEL ADMINISTRATIVO OPERACIONAL (/admin) [Implementado]
- [x] Dashboard de gestão de reservas por data e turno
- [x] Planta física de mesas interativa (layout do salão)
- [x] Status de mesas em tempo real (livre, reservada, ocupada, bloqueada)
- [x] Bloqueio manual de mesas e exceções de calendário
- [x] Gestão de turnos e janelas de atendimento
- [x] Configurações de sistema e servidor SMTP de e-mails
- [x] Seeds automáticos para ambiente de testes e desenvolvimento

## 🧪 QUALIDADE & TESTES [Implementado]
- [x] Testes de paridade visual e funcional via Playwright
- [x] Testes unitários e de integração com `node:test`
- [x] Testes do motor de disponibilidade de reservas
- [x] Quality gates de complexidade e fronteiras de arquitetura
- [x] Pipeline automatizado no GitHub Actions

## 🚀 INFRAESTRUTURA & PRODUÇÃO [Implementado]
- [x] Docker Compose com Next.js Standalone e MySQL 8.0
- [x] Proxy Reverso Traefik com SSL/TLS Let's Encrypt
- [x] CI/CD automático no GitHub Actions com chave SSH na VPS
- [x] Sistema de migração automática do banco no deploy
- [x] Deploy em produção: `https://thewine.suporteide.digital`

