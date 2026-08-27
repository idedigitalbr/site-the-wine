import { paymentStatusFromGateway } from '../domain/gateway-status';
import { PaymentGatewayNotConfiguredError, PaymentGatewayRequestError } from '../application/payment-errors';
import type {
  CreateGatewayPaymentInput,
  CreateGatewayRefundInput,
  GatewayPayment,
  GatewayRefund,
  PaymentGateway,
} from '../application/ports';

type MercadoPagoPayment = {
  id?: string | number;
  status?: string;
  status_detail?: string;
  init_point?: string;
  transaction_details?: { external_resource_url?: string };
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
};

type MercadoPagoRefund = { id?: string | number; status?: string };

function configuredValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function accessToken(): string {
  const token = configuredValue('MERCADOPAGO_ACCESS_TOKEN');
  if (!token) throw new PaymentGatewayNotConfiguredError();
  return token;
}

function apiUrl(path: string): string {
  return `${configuredValue('MERCADOPAGO_API_URL') ?? 'https://api.mercadopago.com'}${path}`;
}

async function requestGateway<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken()}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  } catch {
    throw new PaymentGatewayRequestError('Mercado Pago is unreachable');
  }
  const payload = await response.json().catch(() => null) as T | { message?: string } | null;
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'message' in payload ? payload.message : undefined;
    throw new PaymentGatewayRequestError(`Mercado Pago rejected the request (${response.status}${message ? `: ${message}` : ''})`);
  }
  return payload as T;
}

function gatewayPayment(payload: MercadoPagoPayment): GatewayPayment {
  const externalId = paymentExternalId(payload);
  const providerStatus = paymentProviderStatus(payload);
  const pix = pixData(payload);
  return {
    externalId,
    status: paymentStatusFromGateway(payload.status ?? ''),
    providerStatus,
    checkoutUrl: checkoutUrl(payload),
    pixQrCode: pix.pixQrCode,
    pixCopyPaste: pix.pixCopyPaste,
  };
}

function paymentExternalId(payload: MercadoPagoPayment): string {
  if (payload.id === undefined || !payload.status) throw new PaymentGatewayRequestError('Mercado Pago returned an invalid payment');
  return String(payload.id);
}

function paymentProviderStatus(payload: MercadoPagoPayment): string {
  if (!payload.status) throw new PaymentGatewayRequestError('Mercado Pago returned an invalid payment');
  return payload.status_detail ? `${payload.status}:${payload.status_detail}` : payload.status;
}

function checkoutUrl(payload: MercadoPagoPayment): string | null {
  return payload.transaction_details?.external_resource_url ?? payload.init_point ?? null;
}

function pixData(payload: MercadoPagoPayment): { pixQrCode: string | null; pixCopyPaste: string | null } {
  const transactionData = payload.point_of_interaction?.transaction_data;
  return {
    pixQrCode: transactionData?.qr_code_base64 ?? transactionData?.qr_code ?? null,
    pixCopyPaste: transactionData?.qr_code ?? null,
  };
}

function refundStatus(status: string | undefined): GatewayRefund['status'] {
  if (status === 'approved') return 'processed';
  if (status === 'pending' || status === 'in_process') return 'pending';
  return 'failed';
}

export class MercadoPagoGateway implements PaymentGateway {
  readonly provider = 'mercadopago';

  async createPayment(input: CreateGatewayPaymentInput): Promise<GatewayPayment> {
    const payload = await requestGateway<MercadoPagoPayment>('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({
        transaction_amount: input.amount,
        description: input.description,
        external_reference: input.externalReference,
        notification_url: input.notificationUrl,
        payer: { email: input.payerEmail },
        payment_method_id: input.method === 'pix' ? 'pix' : input.cardPaymentMethodId,
        ...(input.method === 'card' ? { token: input.cardToken, installments: 1 } : {}),
      }),
    });
    return gatewayPayment(payload);
  }

  async fetchPayment(externalId: string): Promise<GatewayPayment> {
    const payload = await requestGateway<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(externalId)}`, { method: 'GET' });
    return gatewayPayment(payload);
  }

  async refundPayment(input: CreateGatewayRefundInput): Promise<GatewayRefund> {
    const payload = await requestGateway<MercadoPagoRefund>(`/v1/payments/${encodeURIComponent(input.externalId)}/refunds`, {
      method: 'POST',
      headers: { 'X-Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({ amount: input.amount }),
    });
    if (payload.id === undefined) throw new PaymentGatewayRequestError('Mercado Pago returned an invalid refund');
    return { externalId: String(payload.id), status: refundStatus(payload.status) };
  }
}
