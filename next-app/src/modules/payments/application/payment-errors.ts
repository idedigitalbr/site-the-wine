export class PaymentGatewayNotConfiguredError extends Error {
  constructor() {
    super('Mercado Pago is not configured');
    this.name = 'PaymentGatewayNotConfiguredError';
  }
}

export class PaymentGatewayRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentGatewayRequestError';
  }
}

export class PaymentGatewayDisabledError extends Error {
  constructor() {
    super('Payment gateway integration is disabled while payments are in mock mode');
    this.name = 'PaymentGatewayDisabledError';
  }
}
