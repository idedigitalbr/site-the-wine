export const runtimeDependencies = Object.freeze([
  '@hookform/resolvers@^5',
  '@tanstack/react-query@^5',
  '@tanstack/react-table@^8',
  'class-variance-authority@^0.7',
  'clsx@^2',
  'motion@^12',
  'react-hook-form@^7',
  'recharts@^3',
  'tailwind-merge@^3',
  'tw-animate-css@^1',
  'zod@^4',
  'zustand@^5',
]);

export const developmentDependencies = Object.freeze([
  '@tailwindcss/postcss@^4',
  'eslint@^9',
  'eslint-config-next@16.3.3',
  'eslint-plugin-sonarjs@^3',
  'postcss@^8',
  'shadcn@latest',
  'tailwindcss@^4',
]);

export function buildInstallCommands() {
  return [
    {
      command: 'npm',
      args: ['install', ...runtimeDependencies],
    },
    {
      command: 'npm',
      args: ['install', '--save-dev', ...developmentDependencies],
    },
    {
      command: 'npm',
      args: ['run', 'verify:lockfile'],
    },
  ];
}
