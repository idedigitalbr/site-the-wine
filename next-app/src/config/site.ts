export const siteConfig = {
  name: 'The Wine Experience',
  title: 'The Wine Experience | Experiência Enogastronômica em Belém',
  description:
    'The Wine Experience - Uma jornada sensorial por rótulos selecionados, gastronomia autoral contemporânea e momentos memoráveis no mezanino do +B Supermercados em Belém.',
  shortDescription:
    'Uma jornada sensorial por rótulos selecionados, gastronomia autoral contemporânea e momentos memoráveis em Belém.',
  canonical: 'https://thewineexperience.com.br/',
  themeColor: '#050505',
  phoneDisplay: '(91) 98404-0710',
  phoneE164: '+5591984040710',
  whatsappPhone: '5591984040710',
  address: {
    street: 'Av. Alcindo Cacela, 1848',
    complement: 'Mezanino do +B Supermercados - Unidade Alcindo Cacela',
    neighborhood: 'Nazaré',
    city: 'Belém',
    region: 'PA',
    postalCode: '66060-000',
    country: 'BR',
  },
  geo: {
    latitude: -1.4557003,
    longitude: -48.4773089,
  },
  openingHours: {
    mondayToSaturday: '12h às 15h / 19h às 23h',
    sunday: '12h às 15h',
  },
  logo: '/assets/Logos/logo_the_wine_branco_dourado_transparente.webp',
  socialImage: '/assets/Ambiente/parede-vinhos-decoracao.webp',
} as const;

export const restaurantJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: siteConfig.name,
  image: `${siteConfig.canonical.replace(/\/$/, '')}${siteConfig.logo}`,
  description: siteConfig.shortDescription,
  address: {
    '@type': 'PostalAddress',
    streetAddress: `${siteConfig.address.street} - ${siteConfig.address.complement}`,
    addressLocality: siteConfig.address.city,
    addressRegion: siteConfig.address.region,
    postalCode: siteConfig.address.postalCode,
    addressCountry: siteConfig.address.country,
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: siteConfig.geo.latitude,
    longitude: siteConfig.geo.longitude,
  },
  url: siteConfig.canonical,
  telephone: siteConfig.phoneE164,
  servesCuisine: 'Contemporânea, Enogastronômica, Vinhos',
  priceRange: '$$$',
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '12:00',
      closes: '15:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '19:00',
      closes: '23:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Sunday',
      opens: '12:00',
      closes: '15:00',
    },
  ],
  sameAs: [
    'https://www.instagram.com/thewinebelem/',
    'https://www.facebook.com/thewinebelem/',
  ],
} as const;
