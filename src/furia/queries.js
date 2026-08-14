const mirror = require('./mirror');
const { CON_PL, SIN_PL, TODAS, resolverEmpresa } = require('./empresas');
const { getUserByPhone } = require('../supabase/auth');
const logger = require('../logger');

/**
 * Financial queries against the Furia accounting mirror.
 *
 * Every figure leaves this module with the caveat that qualifies it. The views
 * carry `limite` and `advertencia` per row; those fields are passed through
 * untouched so the reply can state what the number excludes.
 */

/**
 * Turn pg's numeric strings into numbers, leaving everything else alone.
 * @param {object} row - Row from the mirror
 * @param {Array<string>} campos - Numeric column names
 * @returns {object} Row with those columns as numbers
 */
function aNumeros(row, campos) {
  const salida = { ...row };
  for (const campo of campos) {
    if (salida[campo] !== null && salida[campo] !== undefined) {
      salida[campo] = Number(salida[campo]);
    }
  }
  return salida;
}

/**
 * Which companies this user may ask about.
 * A user assigned to 'All' sees the six; anyone else sees only their own.
 *
 * @param {string} empresaAsignada - User's `divisionAssigned` value
 * @returns {Array<string>} Company names the user may read
 */
function empresasPermitidas(empresaAsignada) {
  if (empresaAsignada === 'All') return TODAS;
  return TODAS.includes(empresaAsignada) ? [empresaAsignada] : [];
}

/**
 * Period totals per company, each with its limit.
 * @param {Array<string>} permitidas - Companies the user may read
 * @param {string|null} empresa - Single company, or null for all allowed ones
 * @returns {Promise<object>} Rows plus the no-consolidation warning
 */
async function resumenEmpresa(permitidas, empresa) {
  const objetivo = empresa ? [empresa] : permitidas.filter((e) => CON_PL.includes(e));

  const rows = await mirror.query(
    `select empresa, razon_social, rif, desde_mes, hasta_mes,
            ventas_usd, costo_usd, gastos_usd, ebitda_usd,
            tiene_costeo_inventario, limite
       from furia.v_resumen_empresa
      where empresa = any($1)
      order by ebitda_usd desc`,
    [objetivo]
  );

  return {
    tipo: 'resumen_empresa',
    empresas: rows.map((r) =>
      aNumeros(r, ['ventas_usd', 'costo_usd', 'gastos_usd', 'ebitda_usd'])
    ),
    // The periods differ per company and intercompany is not eliminated.
    no_consolidable:
      rows.length > 1
        ? 'Los periodos de cada empresa son distintos y hay operacion intercompania sin eliminar: estas cifras NO se suman.'
        : null,
  };
}

/**
 * Month-by-month P&L for one company.
 * @param {string} empresa - Canonical company name
 * @param {number|null} mes - Month number, or null for the whole period
 * @returns {Promise<object>} Monthly rows with their per-month warning
 */
async function plMensual(empresa, mes) {
  const rows = await mirror.query(
    `select empresa, anio, mes, tasa_real_mes,
            ventas_usd, costo_usd, gastos_usd, margen_usd, ebitda_usd,
            margen_pct, pct_costeado, advertencia, limite
       from furia.v_pl_mensual
      where empresa = $1
        and ($2::int is null or mes = $2::int)
      order by mes`,
    [empresa, mes ?? null]
  );

  return {
    tipo: 'pl_mensual',
    empresa,
    meses: rows.map((r) =>
      aNumeros(r, [
        'tasa_real_mes',
        'ventas_usd',
        'costo_usd',
        'gastos_usd',
        'margen_usd',
        'ebitda_usd',
        'margen_pct',
        'pct_costeado',
      ])
    ),
    limite: rows[0]?.limite || null,
  };
}

/**
 * Official report against the reconstructed figures.
 * @param {string} empresa - Canonical company name
 * @returns {Promise<object>} Concept-by-concept comparison
 */
async function contraste(empresa) {
  const rows = await mirror.query(
    `select empresa, anio, concepto, oficial_usd, nuestro_usd, diferencia_usd, periodo
       from furia.v_contraste
      where empresa = $1
      order by concepto`,
    [empresa]
  );

  return {
    tipo: 'contraste',
    empresa,
    conceptos: rows.map((r) =>
      aNumeros(r, ['oficial_usd', 'nuestro_usd', 'diferencia_usd'])
    ),
  };
}

/**
 * Invoicing against bookkeeping, for the companies with no P&L.
 * @param {string} empresa - Canonical company name
 * @returns {Promise<object>} Monthly gap rows
 */
async function brechaRegistro(empresa) {
  const rows = await mirror.query(
    `select empresa, anio, mes, documentos, ventas_bs, tasa_ponderada,
            ventas_usd, renglones_contables, lectura, limite
       from furia.v_brecha_registro
      where empresa = $1
      order by mes`,
    [empresa]
  );

  return {
    tipo: 'brecha_registro',
    empresa,
    meses: rows.map((r) =>
      aNumeros(r, ['ventas_bs', 'tasa_ponderada', 'ventas_usd'])
    ),
    limite: rows[0]?.limite || null,
  };
}

/**
 * Resolve the user, enforce access, and run the requested query.
 *
 * @param {string} phoneNumber - Sender's phone number
 * @param {string} intention - Intent from the NLU step
 * @param {object} parameters - Parameters from the NLU step
 * @returns {Promise<object>} Query result, or an explanation of why there is none
 * @throws {Error} If the user is unknown or the intention is unsupported
 */
async function executeFinancialQuery(phoneNumber, intention, parameters = {}) {
  const user = await getUserByPhone(phoneNumber);
  if (!user) {
    throw new Error(`User not found: ${phoneNumber}`);
  }

  const permitidas = empresasPermitidas(user.divisionAssigned);
  const empresa = resolverEmpresa(parameters.empresa);

  // A name that is not one of the six has no data anywhere in the mirror.
  if (parameters.empresa && !empresa) {
    logger.info(`[Queries] Out of scope: ${parameters.empresa}`);
    return {
      tipo: 'fuera_de_alcance',
      solicitada: parameters.empresa,
      en_alcance: TODAS,
    };
  }

  if (empresa && !permitidas.includes(empresa)) {
    logger.warn(`[Queries] ${user.role} denied access to ${empresa}`);
    return {
      tipo: 'sin_permiso',
      empresa,
      asignada: user.divisionAssigned,
    };
  }

  // The two companies without a ledger have no result to report, whatever
  // was asked: the gap is the only honest answer.
  if (empresa && SIN_PL.includes(empresa) && intention !== 'brecha_registro') {
    logger.info(`[Queries] ${empresa} has no P&L, answering with the gap`);
    return brechaRegistro(empresa);
  }

  switch (intention) {
    case 'resumen_empresa':
      return resumenEmpresa(permitidas, empresa);

    case 'pl_mensual':
      if (!empresa) return resumenEmpresa(permitidas, null);
      return plMensual(empresa, parameters.mes ?? null);

    case 'contraste':
      if (!empresa) return resumenEmpresa(permitidas, null);
      return contraste(empresa);

    case 'brecha_registro':
      if (!empresa) {
        const sinPlPermitidas = permitidas.filter((e) => SIN_PL.includes(e));
        if (sinPlPermitidas.length === 0) {
          return { tipo: 'sin_permiso', empresa: SIN_PL.join(' y '), asignada: user.divisionAssigned };
        }
        return brechaRegistro(sinPlPermitidas[0]);
      }
      return brechaRegistro(empresa);

    default:
      throw new Error(`Unknown intention: ${intention}`);
  }
}

module.exports = {
  empresasPermitidas,
  executeFinancialQuery,
  // Exported for testing
  resumenEmpresa,
  plMensual,
  contraste,
  brechaRegistro,
};
