# Dependências das páginas administrativas

## `/admin/reservas`

- `next-app/src/app/admin/(protected)/reservas/page.tsx`
  - `src/components/admin/AdminReservationsView.tsx`
    - `AdminWalkInForm.tsx`
    - `AdminReservationStatus.tsx`
    - `AdminReservationOperations.tsx`
    - `AdminReservationAssignment.tsx`
    - `AdminReservationSchedule.tsx`
    - `AdminReservationTimeline.tsx`
    - `src/lib/admin-labels.ts`
  - `src/server/admin/composition.ts`
  - `src/modules/admin/application/ports.ts`

## `/admin/configuracao`

- `next-app/src/app/admin/(protected)/configuracao/page.tsx`
  - `src/components/admin/AdminConfigurationView.tsx`
  - `src/server/admin/composition.ts`
  - `src/modules/admin/application/ports.ts`

## `/admin/salao`

- `next-app/src/app/admin/(protected)/salao/page.tsx`
  - `src/components/admin/AdminFloorMapView.tsx`
  - `src/server/admin/composition.ts`
  - `src/modules/admin/application/ports.ts`

## Shell comum

- `next-app/src/app/admin/(protected)/layout.tsx`
  - `src/components/admin/AdminShell.tsx`
    - `src/components/admin/AdminLogoutButton.tsx`

