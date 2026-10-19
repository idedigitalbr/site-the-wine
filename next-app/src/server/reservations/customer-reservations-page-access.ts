export type CustomerReservationsPageAccess =
  | { status: 'authenticated'; userId: string }
  | { status: 'anonymous' }
  | { status: 'unavailable' };

type SessionReader = (
  request: Request,
) => Promise<{ user: { id: string } } | null>;

export async function getCustomerReservationsPageAccess(
  request: Request,
  getSession: SessionReader,
): Promise<CustomerReservationsPageAccess> {
  try {
    const session = await getSession(request);
    const userId = typeof session?.user.id === 'string' ? session.user.id.trim() : '';
    return userId
      ? { status: 'authenticated', userId }
      : { status: 'anonymous' };
  } catch {
    return { status: 'unavailable' };
  }
}
