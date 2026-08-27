'use client';

import type { ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return <QueryProvider>{children}</QueryProvider>;
}
