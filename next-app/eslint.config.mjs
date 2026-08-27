import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import sonarjs from 'eslint-plugin-sonarjs';

const maintainabilityRules = {
  complexity: ['error', 8],
  'max-depth': ['error', 3],
  'sonarjs/cognitive-complexity': ['error', 10],
};

export default defineConfig([
  ...nextVitals,
  {
    plugins: {
      sonarjs,
    },
    rules: maintainabilityRules,
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'public/**',
    'legacy/**',
  ]),
]);
