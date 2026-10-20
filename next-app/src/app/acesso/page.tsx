import type { Metadata } from 'next';
import '../../../public/style.css';
import { CustomerAccessScreen } from '@/components/account/auth/CustomerAccessScreen';
import { resolveCustomerAuthDestination } from '@/lib/customer-auth-destination';

export const metadata: Metadata = {
  title: 'Acesso | The Wine Experience',
  description: 'Entre ou crie sua conta no The Wine Experience.',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export default async function AccessPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const mode = single(params.modo) === 'cadastro' ? 'signup' : 'login';
  const destination = resolveCustomerAuthDestination(single(params.returnTo));
  const auth = single(params.auth);
  const reason = auth === 'expired' || auth === 'changed' ? auth : undefined;
  return <CustomerAccessScreen initialMode={mode} destination={destination} reason={reason} />;
}
