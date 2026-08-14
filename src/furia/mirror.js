const { Pool } = require('pg');
const config = require('../config');
const logger = require('../logger');

/**
 * Read-only connection to the Furia accounting mirror.
 *
 * The mirror exposes the `furia` schema, whose views carry the caveat that
 * applies to each row (`limite`, `advertencia`). Those columns are the whole
 * point: a figure from this source is only correct when it travels with them.
 */

let pool = null;

/**
 * Lazily build the connection pool.
 * @returns {Pool} Shared pg pool for the mirror
 */
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: config.furiaMirror.url,
      // Supabase's pooler presents a self-signed chain.
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (error) => {
      logger.error(`[Mirror] Idle client error: ${error.message}`);
    });
  }

  return pool;
}

/**
 * Run a read-only query against the mirror.
 * @param {string} sql - Parameterized SQL
 * @param {Array} params - Bound parameters
 * @returns {Promise<Array<object>>} Result rows
 */
async function query(sql, params = []) {
  const started = Date.now();

  try {
    const result = await getPool().query(sql, params);
    logger.debug(`[Mirror] ${result.rowCount} rows in ${Date.now() - started}ms`);
    return result.rows;
  } catch (error) {
    logger.error(`[Mirror] Query failed: ${error.message}`);
    throw new Error(`No pude consultar el espejo contable: ${error.message}`);
  }
}

/**
 * Close the pool. Used on shutdown and by tests.
 * @returns {Promise<void>}
 */
async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  query,
  close,
};
