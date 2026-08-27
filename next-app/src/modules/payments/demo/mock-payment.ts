export const mockPaymentMethods = ['pix', 'card'] as const;
export type MockPaymentMethod = (typeof mockPaymentMethods)[number];

export const mockPaymentScenarios = ['approved', 'processing', 'failed'] as const;
export type MockPaymentScenario = (typeof mockPaymentScenarios)[number];

export type MockPayment = {
  id: string;
  method: MockPaymentMethod;
  status: 'paid' | 'processing' | 'failed';
  amount: number;
  pixCopyPaste: string | null;
  cardLastFour: string | null;
};

const mockPaymentAmount = 50;

function paymentStatus(scenario: MockPaymentScenario): MockPayment['status'] {
  const statuses: Record<MockPaymentScenario, MockPayment['status']> = {
    approved: 'paid',
    processing: 'processing',
    failed: 'failed',
  };
  return statuses[scenario];
}

export function simulateMockPayment(input: {
  reservationId: number;
  method: MockPaymentMethod;
  scenario: MockPaymentScenario;
}): MockPayment {
  return {
    id: `DEMO-${String(input.reservationId).padStart(6, '0')}`,
    method: input.method,
    status: paymentStatus(input.scenario),
    amount: mockPaymentAmount,
    pixCopyPaste: input.method === 'pix'
      ? `00020126580014BR.GOV.BCB.PIX0136demo.thewine/${input.reservationId}520400005303986540550.005802BR5913THE WINE DEMO6009BELEM61086600000062070503***6304DEMO`
      : null,
    cardLastFour: input.method === 'card' ? '4242' : null,
  };
}
