import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { restaurantJsonLd, siteConfig } from '@/config/site';
import { AppProviders } from '@/providers/AppProviders';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.canonical),
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: {
    canonical: siteConfig.canonical,
  },
  openGraph: {
    type: 'website',
    title: siteConfig.title,
    description:
      'Uma jornada sensorial por rótulos selecionados, gastronomia autoral contemporânea e momentos memoráveis no mezanino do +B Supermercados em Belém.',
    url: siteConfig.canonical,
    images: [siteConfig.socialImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: 'Uma jornada sensorial por rótulos selecionados, gastronomia autoral em Belém.',
    images: [siteConfig.socialImage],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: siteConfig.themeColor,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Pinyon+Script&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd) }}
        />
      </head>
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
