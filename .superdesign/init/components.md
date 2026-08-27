# Componentes compartilhados

O projeto usa componentes locais com Tailwind CSS v4 e `lucide-react`; não há biblioteca visual compartilhada em `src/components/ui/`.

## AdminLogoutButton

- Fonte: `next-app/src/components/admin/AdminLogoutButton.tsx`
- Descrição: ação de encerramento da sessão administrativa.

```tsx
'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AdminLogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    setIsLoggingOut(true);
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <button type="button" onClick={logout} disabled={isLoggingOut} className="inline-flex items-center gap-2 text-xs text-[var(--sidebar-muted)] transition hover:text-white disabled:opacity-50">
      <LogOut aria-hidden="true" size={15} />
      {isLoggingOut ? 'Saindo...' : 'Sair'}
    </button>
  );
}
```

