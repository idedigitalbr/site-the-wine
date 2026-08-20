import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const styles = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

const roundedButtonSelectors = [
  '.btn-gold-fill',
  '.btn-header-reserve',
  '.btn-gold-outline',
  '.cardapio-left-content .btn-cardapio',
  '.tw-acc__btn',
  '.reserva-center-box .btn-reserva-final',
  '.btn-instagram-profile',
  '.loc-col .btn-chegar-maps',
  '.cta-reservation__btn',
  '.btn-submit-booking',
  '.btn-whatsapp-booking',
  '.footer-whatsapp-btn',
];

test('arredonda os botões e CTAs retangulares do site', () => {
  for (const selector of roundedButtonSelectors) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rule = styles.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`));

    assert.ok(rule, `regra CSS não encontrada para ${selector}`);
    assert.match(rule[1], /border-radius:\s*8px\s*;/, `${selector} deve usar border-radius de 8px`);
  }

  assert.match(
    styles,
    /\.flipbook-error-actions button,\s*\.flipbook-error-actions a\s*\{[\s\S]*?border-radius:\s*8px\s*;/,
    'ações de erro do cardápio devem usar border-radius de 8px',
  );
  assert.match(
    styles,
    /\.flipbook-toolbar button,\s*\.flipbook-toolbar a\s*\{[\s\S]*?border-radius:\s*8px\s*;/,
    'ações da barra do cardápio devem usar border-radius de 8px',
  );
});
