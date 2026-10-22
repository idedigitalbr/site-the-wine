export const demoCheckoutPolicy = {
  mode: 'demo' as const,
  unitAmountCents: 5000,
  currency: 'BRL' as const,
  pricingVersion: 'demo-person-v1',
  installments: [1],
  pixTtlSeconds: 1800,
  canCharge: false,
};
