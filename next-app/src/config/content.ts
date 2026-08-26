export const galleryItems = [
  ['Vinhos/garrafas-vinho-cartuxa-tapada.webp', 'Garrafas de vinho selecionadas The Wine Experience'],
  ['Gastronomia/prato-carne-grelhada-gnocchi.webp', 'Prato de carne grelhada com gnocchi'],
  ['Vinhos/servindo-vinho-tinto.webp', 'Sommelier servindo vinho tinto'],
  ['Gastronomia/prato-salmao-legumes-grelhados.webp', 'Prato de salmão com legumes grelhados'],
  ['Experiencias/evento-degustacao-brindezada.jpg', 'Degustação de vinhos com brinde'],
  ['Gastronomia/drinks-coqueteis-bar.webp', 'Drinks e coquetéis no bar'],
  ['Ambiente/parede-vinhos-decoracao.webp', 'Parede de vinhos e decoração'],
  ['Gastronomia/prato-camarao-cremoso.webp', 'Prato de camarão cremoso'],
  ['Experiencias/evento-degustacao-noite.webp', 'Noite de degustação no The Wine Experience'],
  ['Gastronomia/chef-finalizando-prato.webp', 'Chef finalizando prato'],
  ['Vinhos/garrafas-vinho-branco-gelo.webp', 'Garrafas de vinho branco no gelo'],
  ['Gastronomia/preparo-drink-coquetel.webp', 'Preparo de drink e coquetel'],
].map(([src, alt]) => ({ src: `/assets/${src}`, alt })) as ReadonlyArray<{
  src: string;
  alt: string;
}>;

export const menuPages = {
  desktop: Array.from(
    { length: 12 },
    (_, index) => `/assets/CardapioMenu/pages/page-${String(index + 1).padStart(2, '0')}.png`,
  ),
  mobile: Array.from(
    { length: 12 },
    (_, index) => `/assets/CardapioMenu/pages/mobile/page-${String(index + 1).padStart(2, '0')}.webp`,
  ),
  pdf: '/assets/CardapioMenu/CARDAPIO_THE_WINE.pdf',
} as const;

export const experienceEvents = [
  {
    title: 'Jantar Harmonizado',
    subtitle: 'Uma vez ao mês',
    image: '/assets/Gastronomia/prato-carne-grelhada-gnocchi.webp',
  },
  {
    title: 'Evento Corporativo',
    subtitle: 'Sob consulta',
    image: '/assets/Ambiente/mesa-reservada-adega.webp',
  },
  {
    title: 'Máquinas de Vinho',
    subtitle: 'Escolha sua taça',
    image: '/assets/Experiencias/maquina-de-vinho.webp',
  },
] as const;
