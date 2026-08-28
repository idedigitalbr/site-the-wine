import {
  CalendarDays,
  ClipboardList,
  Mail,
  LayoutDashboard,
  Map,
  Server,
  Settings2,
  UsersRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdminLogoutButton } from './AdminLogoutButton';

const navigation = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/reservas', label: 'Reservas', icon: ClipboardList },
  { href: '/admin/clientes', label: 'Clientes', icon: UsersRound },
  { href: '/admin/salao', label: 'Mapa do salão', icon: Map },
  { href: '/admin/configuracao', label: 'Configuração', icon: Settings2 },
  { href: '/admin/notificacoes', label: 'Notificações', icon: Mail },
  { href: '/admin/sistema', label: 'Sistema', icon: Server },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="reservation-admin-theme min-h-screen bg-background font-sans text-foreground lg:flex">
      <aside className="flex w-full shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] lg:sticky lg:top-0 lg:h-screen lg:min-h-screen lg:w-64 lg:min-w-64 lg:max-w-64 lg:flex-none lg:overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 lg:block lg:px-6">
          <Link href="/admin" className="flex items-center gap-3 text-[var(--sidebar-accent)]">
            <Image
              src="/assets/Logos/logo_the_wine_branco_dourado_transparente.webp"
              alt="The Wine"
              width={190}
              height={62}
              priority
              className="h-auto w-[9.75rem] object-contain lg:w-[10.75rem]"
            />
          </Link>
          <span className="hidden text-[10px] uppercase tracking-[0.22em] text-[var(--sidebar-muted)] lg:mt-2 lg:block">Operations</span>
        </div>
        <nav aria-label="Administração" className="flex gap-1 overflow-x-auto px-3 py-3 lg:block lg:space-y-1 lg:px-3 lg:py-8">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="inline-flex items-center gap-3 whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-[var(--sidebar-muted)] transition hover:bg-white/10 hover:text-white lg:flex">
              <Icon aria-hidden="true" size={17} strokeWidth={1.7} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 p-5 lg:block">
          <Link href="/" className="mb-4 flex items-center gap-2 text-xs text-[var(--sidebar-muted)] transition hover:text-white">
            <CalendarDays aria-hidden="true" size={15} /> Ver site público
          </Link>
          <AdminLogoutButton />
        </div>
        <div className="flex items-center justify-end px-5 pb-3 lg:hidden">
          <AdminLogoutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
