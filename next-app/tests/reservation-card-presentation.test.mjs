import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCustomerReservationsModule } from './support/load-customer-reservations-module.mjs';

const presentation = loadCustomerReservationsModule(
  new URL('../src/components/account/reservations-list/reservationCardPresentation.ts', import.meta.url),
  {
    './reservationCardFormatters': {
      reservationStatusLabels: {
        draft: 'Pendente', hold: 'Pendente', payment_pending: 'Pendente', pending: 'Pendente',
        confirmed: 'Confirmada', seated: 'Em atendimento', completed: 'Concluída',
        cancelled: 'Cancelada', no_show: 'Não compareceu', expired: 'Expirada',
      },
    },
  },
);

function reservation(overrides = {}) {
  return {
    id: 1,
    publicCode: 'TW-1',
    reservationDate: '2026-10-14',
    startTime: '20:30',
    durationMinutes: 120,
    guestCount: 3,
    status: 'confirmed',
    paymentStatus: null,
    timeZone: 'America/Sao_Paulo',
    specialNeeds: [],
    notes: '',
    ...overrides,
  };
}

test('confirmed reservations print without claiming payment', () => {
  assert.deepEqual(presentation.getReservationCardPresentation(reservation()), {
    statusLabel: 'Confirmada',
    statusVariant: 'confirmed',
    paymentInProgress: false,
    action: 'print',
  });
});

test('pending payment takes precedence over confirmed reservation presentation', () => {
  const result = presentation.getReservationCardPresentation(reservation({ paymentStatus: 'processing' }));
  assert.equal(result.statusLabel, 'Em andamento');
  assert.equal(result.statusVariant, 'pending');
  assert.equal(result.paymentInProgress, true);
  assert.equal(result.action, 'purchase');
});

test('reservation payment pending without a payment row still offers inert purchase action', () => {
  const result = presentation.getReservationCardPresentation(reservation({ status: 'payment_pending' }));
  assert.equal(result.statusLabel, 'Em andamento');
  assert.equal(result.action, 'purchase');
});

test('terminal and historic reservations suppress new actions', () => {
  assert.equal(presentation.getReservationCardPresentation(reservation({ status: 'cancelled', paymentStatus: 'processing' })).action, 'none');
  assert.equal(presentation.getReservationCardPresentation(reservation(), 'historic').action, 'none');
  assert.equal(presentation.getReservationCardPresentation(reservation({ paymentStatus: 'failed' })).action, 'print');
  assert.equal(presentation.getReservationCardPresentation(reservation({ paymentStatus: 'refunded' })).action, 'print');
});
