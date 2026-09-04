import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['mysql2'],
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: '/reservas',
        destination:
          'https://api.whatsapp.com/send?phone=5591984040710&text=Ol%C3%A1%2C%20gostaria%20de%20fazer%20uma%20reserva%20no%20The%20Wine%20Experience.',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
