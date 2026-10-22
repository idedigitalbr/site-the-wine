import type { CustomerReservationsResponse } from '@/types/customer-reservations';

type HandlerDependencies = {
  getSession: (request: Request) => Promise<{ user: { id: string } } | null>;
  list: (userId: string, offset: number) => Promise<CustomerReservationsResponse>;
  json: (body: unknown, status?: number) => Response;
  reportError: (error: unknown) => void;
};

const unauthorized = {
  error: 'unauthorized',
  message: 'Acesse sua conta para consultar suas reservas.',
};
const invalidPagination = {
  error: 'invalid_pagination',
  message: 'Não foi possível ler esta página de reservas.',
};

function readOffset(url: URL): number | null {
  const keys = [...url.searchParams.keys()];
  if (keys.some((key) => key !== 'offset')) return null;
  const values = url.searchParams.getAll('offset');
  if (values.length === 0) return 0;
  if (values.length !== 1 || !/^\d+$/.test(values[0])) return null;
  const offset = Number(values[0]);
  return Number.isSafeInteger(offset) ? offset : null;
}

export function createCustomerReservationsHandler(dependencies: HandlerDependencies) {
  return async function GET(request: Request): Promise<Response> {
    try {
      const session = await dependencies.getSession(request);
      const userId = typeof session?.user.id === 'string' ? session.user.id.trim() : '';
      if (!userId) return dependencies.json(unauthorized, 401);

      const offset = readOffset(new URL(request.url));
      if (offset === null) return dependencies.json(invalidPagination, 400);

      const payload = await dependencies.list(userId, offset);
      return dependencies.json(payload, 200);
    } catch (error) {
      dependencies.reportError(error);
      return dependencies.json({
        error: 'reservations_unavailable',
        message: 'Não foi possível carregar suas reservas agora.',
      }, 503);
    }
  };
}
