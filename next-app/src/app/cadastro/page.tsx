import { redirect } from 'next/navigation';
import { resolveCustomerAuthDestination } from '@/lib/customer-auth-destination';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export default async function SignupAliasPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const destination = resolveCustomerAuthDestination(single(params.returnTo));
  const query = destination === '/reservas' ? '?modo=cadastro&returnTo=%2Freservas' : '?modo=cadastro';
  redirect(`/acesso${query}`);
}
