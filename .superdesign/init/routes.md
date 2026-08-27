# Rotas Next.js

## Público

- `/` — `next-app/src/app/page.tsx`, home migrada do site estático.
- `/reservas` — `next-app/src/app/reservas/page.tsx`, wizard público de reserva.
- `/minha-reserva` — `next-app/src/app/minha-reserva/page.tsx`, consulta por código/link.
- `/minha-reserva/[secureToken]` — portal privado da reserva.

## Administrativo

- `/admin/login` — login operacional.
- `/admin` — dashboard, usando `AdminDashboardView`.
- `/admin/reservas` — agenda, atendimento presencial, timeline e lista de espera, usando `AdminReservationsView`.
- `/admin/clientes` — diretório de clientes.
- `/admin/clientes/[id]` — perfil e auditoria do cliente.
- `/admin/salao` — mapa operacional, combinações e bloqueios, usando `AdminFloorMapView`.
- `/admin/configuracao` — cadastro da estrutura do salão, usando `AdminConfigurationView`.
- `/admin/notificacoes` — outbox de notificações.

As rotas administrativas protegidas usam `src/app/admin/(protected)/layout.tsx` e `AdminShell`.

