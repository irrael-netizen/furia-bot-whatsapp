/**
 * The six companies in scope, and nothing else.
 *
 * Anything outside this list has no data in the mirror. The correct answer for
 * those is that they are out of scope: never estimate, never extrapolate from
 * the six that are here.
 */

// Reconstructed P&L available: sales, cost, expenses, EBITDA.
const CON_PL = ['Furia Store', 'Furia Energy', 'Caracas Fly', 'Altitude'];

// They invoice but do not post to the ledger, so there is no result to give.
// Only the gap between invoicing and bookkeeping can be reported.
const SIN_PL = ['Vida By Furia', 'FuriaGear'];

const TODAS = [...CON_PL, ...SIN_PL];

// Names people actually use in a WhatsApp message, lowercased.
const ALIAS = {
  'furia store': 'Furia Store',
  store: 'Furia Store',
  tienda: 'Furia Store',
  'furia energy': 'Furia Energy',
  energy: 'Furia Energy',
  energizante: 'Furia Energy',
  'furia energy drinks': 'Furia Energy',
  'caracas fly': 'Caracas Fly',
  bgg: 'Caracas Fly',
  bacalhau: 'Caracas Fly',
  altitude: 'Altitude',
  'ccs altitude': 'Altitude',
  'vida by furia': 'Vida By Furia',
  vidaby: 'Vida By Furia',
  vida: 'Vida By Furia',
  furiagear: 'FuriaGear',
  'furia gear': 'FuriaGear',
  gear: 'FuriaGear',
};

/**
 * Resolve a name written by a user to its canonical company name.
 * @param {string} nombre - Name as written
 * @returns {string|null} Canonical name, or null when it is not one of the six
 */
function resolverEmpresa(nombre) {
  if (!nombre || typeof nombre !== 'string') return null;

  const limpio = nombre.trim().toLowerCase();
  return ALIAS[limpio] || null;
}

/**
 * @param {string} empresa - Canonical company name
 * @returns {boolean} True when the company has a reconstructed P&L
 */
function tienePL(empresa) {
  return CON_PL.includes(empresa);
}

module.exports = {
  CON_PL,
  SIN_PL,
  TODAS,
  resolverEmpresa,
  tienePL,
};
