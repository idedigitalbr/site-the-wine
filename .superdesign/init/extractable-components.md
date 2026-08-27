# Componentes extraíveis

## AdminShell

- Fonte: `next-app/src/components/admin/AdminShell.tsx`
- Categoria: layout
- Descrição: sidebar responsiva e área principal do painel operacional.
- Props: `children` (ReactNode).
- Elementos fixos: marca The Wine, ícones Lucide, links do painel, link do site público e sair.

## AdminLogoutButton

- Fonte: `next-app/src/components/admin/AdminLogoutButton.tsx`
- Categoria: basic
- Descrição: encerra a sessão administrativa e redireciona para o login.
- Props: nenhuma.

## AdminReservationTimeline

- Fonte: `next-app/src/components/admin/AdminReservationTimeline.tsx`
- Categoria: basic
- Descrição: abre e fecha eventos operacionais de uma reserva.
- Props: `id` (number).

## AdminReservationStatus

- Fonte: `next-app/src/components/admin/AdminReservationStatus.tsx`
- Categoria: basic
- Descrição: badges e controles de status de reserva e lista de espera.
- Props: `status`, `id`, `onChanged` conforme o subcomponente.

