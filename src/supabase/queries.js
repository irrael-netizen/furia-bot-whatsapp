const { PrismaClient } = require('@prisma/client');
const { getUserByPhone } = require('./auth');
const logger = require('../logger');

const prisma = new PrismaClient();

/**
 * Safe Financial Query Builder Module
 * Executes financial queries with automatic division-based filtering
 * CEO sees ALL divisions; others see only assigned division
 */

/**
 * Build division filter based on user role
 * CEO (divisionAssigned='All') has no filter and sees everything
 * Others are restricted to their assigned division
 * @param {string} userRole - User's role (CEO, CFO, COO, ERC)
 * @param {string} userDivision - User's assigned division (All, Bebidas, Gear, Reestructuración)
 * @returns {object} Filter object for queries - empty {} for CEO, {division: userDivision} for others
 */
function buildDivisionFilter(userRole, userDivision) {
  try {
    // CEO with 'All' division assignment sees everything - no filter
    if (userDivision === 'All') {
      logger.debug(`[Queries] No filter for CEO: ${userRole}`);
      return {};
    }

    // All other roles are filtered by their assigned division
    const filter = { division: userDivision };
    logger.debug(`[Queries] Filter for ${userRole}: division = ${userDivision}`);
    return filter;
  } catch (error) {
    logger.error(`[Queries] Error building division filter:`, error);
    throw error;
  }
}

/**
 * Calculate profit margin for a division and period
 * Mock implementation - real DB queries to be added
 * @param {object} params - Query parameters {division, periodo}
 * @param {object} divisionFilter - Division filter from buildDivisionFilter
 * @returns {Promise<object>} {division, periodo, ingresos, gastos, margen_porcentaje}
 */
async function calculateMargin(params, divisionFilter) {
  try {
    logger.debug(`[Queries] Calculating margin for:`, { params, divisionFilter });

    // Mock implementation - in production, query real DB
    const mockData = {
      Bebidas: {
        ingresos: 1000000,
        gastos: 650000,
        margen_porcentaje: 35,
      },
      Gear: {
        ingresos: 500000,
        gastos: 300000,
        margen_porcentaje: 40,
      },
      Reestructuración: {
        ingresos: 200000,
        gastos: 100000,
        margen_porcentaje: 50,
      },
    };

    const division = params.division || divisionFilter.division || 'Bebidas';
    const data = mockData[division] || mockData.Bebidas;

    return {
      division,
      periodo: params.periodo || 'mes_actual',
      ingresos: data.ingresos,
      gastos: data.gastos,
      margen_porcentaje: data.margen_porcentaje,
    };
  } catch (error) {
    logger.error(`[Queries] Error calculating margin:`, error);
    throw error;
  }
}

/**
 * List sales for a division and period
 * Mock implementation - real DB queries to be added
 * @param {object} params - Query parameters {division, periodo}
 * @param {object} divisionFilter - Division filter from buildDivisionFilter
 * @returns {Promise<object>} {division, periodo, total_ventas, numero_transacciones}
 */
async function listSales(params, divisionFilter) {
  try {
    logger.debug(`[Queries] Listing sales for:`, { params, divisionFilter });

    // Mock implementation
    const mockData = {
      Bebidas: {
        total_ventas: 1000000,
        numero_transacciones: 245,
      },
      Gear: {
        total_ventas: 500000,
        numero_transacciones: 128,
      },
      Reestructuración: {
        total_ventas: 200000,
        numero_transacciones: 45,
      },
    };

    const division = params.division || divisionFilter.division || 'Bebidas';
    const data = mockData[division] || mockData.Bebidas;

    return {
      division,
      periodo: params.periodo || 'mes_actual',
      total_ventas: data.total_ventas,
      numero_transacciones: data.numero_transacciones,
    };
  } catch (error) {
    logger.error(`[Queries] Error listing sales:`, error);
    throw error;
  }
}

/**
 * Get balance sheet for a division
 * Mock implementation - real DB queries to be added
 * @param {object} params - Query parameters {division}
 * @param {object} divisionFilter - Division filter from buildDivisionFilter
 * @returns {Promise<object>} {division, activos, pasivos, patrimonio}
 */
async function getBalance(params, divisionFilter) {
  try {
    logger.debug(`[Queries] Getting balance for:`, { params, divisionFilter });

    // Mock implementation
    const mockData = {
      Bebidas: {
        activos: 5000000,
        pasivos: 2000000,
        patrimonio: 3000000,
      },
      Gear: {
        activos: 2500000,
        pasivos: 1000000,
        patrimonio: 1500000,
      },
      Reestructuración: {
        activos: 1000000,
        pasivos: 500000,
        patrimonio: 500000,
      },
    };

    const division = params.division || divisionFilter.division || 'Bebidas';
    const data = mockData[division] || mockData.Bebidas;

    return {
      division,
      activos: data.activos,
      pasivos: data.pasivos,
      patrimonio: data.patrimonio,
    };
  } catch (error) {
    logger.error(`[Queries] Error getting balance:`, error);
    throw error;
  }
}

/**
 * Get top products for a division
 * Mock implementation - real DB queries to be added
 * @param {object} params - Query parameters {division, periodo, top_n}
 * @param {object} divisionFilter - Division filter from buildDivisionFilter
 * @returns {Promise<object>} {division, periodo, top_n, productos: [...]}
 */
async function getTopProducts(params, divisionFilter) {
  try {
    logger.debug(`[Queries] Getting top products for:`, { params, divisionFilter });

    // Mock implementation
    const mockProducts = {
      Bebidas: [
        { nombre: 'FURIA ENERGY DRINK PRO', ventas: 450000, unidades: 150000 },
        { nombre: 'FURIA WATER', ventas: 350000, unidades: 200000 },
        { nombre: 'FURIA ISOTONIC', ventas: 200000, unidades: 80000 },
      ],
      Gear: [
        { nombre: 'FURIA T-SHIRT', ventas: 250000, unidades: 5000 },
        { nombre: 'FURIA HOODIE', ventas: 150000, unidades: 2000 },
        { nombre: 'FURIA CAP', ventas: 100000, unidades: 3000 },
      ],
      Reestructuración: [
        { nombre: 'Consultoría Estratégica', ventas: 100000, unidades: 10 },
        { nombre: 'Implementación IA', ventas: 80000, unidades: 8 },
        { nombre: 'Capacitación', ventas: 20000, unidades: 5 },
      ],
    };

    const division = params.division || divisionFilter.division || 'Bebidas';
    const topN = params.top_n || 3;
    const productos = mockProducts[division] || mockProducts.Bebidas;

    return {
      division,
      periodo: params.periodo || 'mes_actual',
      top_n: topN,
      productos: productos.slice(0, topN),
    };
  } catch (error) {
    logger.error(`[Queries] Error getting top products:`, error);
    throw error;
  }
}

/**
 * Get alerts for a division
 * Mock implementation - real DB queries to be added
 * @param {object} params - Query parameters {division}
 * @param {object} divisionFilter - Division filter from buildDivisionFilter
 * @returns {Promise<object>} {division, alerts: [...]}
 */
async function getAlerts(params, divisionFilter) {
  try {
    logger.debug(`[Queries] Getting alerts for:`, { params, divisionFilter });

    // Mock implementation
    const mockAlerts = {
      Bebidas: [
        { tipo: 'stock_bajo', mensaje: 'Stock bajo para FURIA ENERGY DRINK PRO', severidad: 'alta' },
        { tipo: 'margen_bajo', mensaje: 'Margen por debajo de 30%', severidad: 'media' },
      ],
      Gear: [
        { tipo: 'venta_lenta', mensaje: 'Venta lenta de FURIA HOODIE', severidad: 'baja' },
      ],
      Reestructuración: [],
    };

    const division = params.division || divisionFilter.division || 'Bebidas';
    const alerts = mockAlerts[division] || [];

    return {
      division,
      alerts,
    };
  } catch (error) {
    logger.error(`[Queries] Error getting alerts:`, error);
    throw error;
  }
}

/**
 * Execute financial query with automatic division-based filtering
 * Main entry point for all financial queries
 * @param {string} phoneNumber - User's phone number
 * @param {string} intention - Query type: 'calcular_margen', 'listar_ventas', 'obtener_balance', 'top_productos', 'alertas'
 * @param {object} parameters - Query parameters specific to intention
 * @returns {Promise<object>} Query result with automatic division filtering applied
 * @throws {Error} If user not found or intention unknown
 */
async function executeFinancialQuery(phoneNumber, intention, parameters = {}) {
  try {
    logger.info(`[Queries] Executing financial query:`, { phoneNumber, intention, parameters });

    // Step 1: Lookup user and verify exists
    const user = await getUserByPhone(phoneNumber);
    if (!user) {
      const error = `User not found: ${phoneNumber}`;
      logger.error(`[Queries] ${error}`);
      throw new Error(error);
    }

    logger.debug(`[Queries] User found: ${user.phoneNumber} (${user.role})`);

    // Step 2: Build division filter based on user role
    const divisionFilter = buildDivisionFilter(user.role, user.divisionAssigned);
    logger.debug(`[Queries] Division filter built:`, divisionFilter);

    // Step 3: Merge user's division filter with parameters
    const filteredParams = {
      ...parameters,
      ...divisionFilter, // Division filter takes precedence
    };

    // Step 4: Route to appropriate query function based on intention
    let result;
    switch (intention) {
      case 'calcular_margen':
        result = await calculateMargin(filteredParams, divisionFilter);
        break;

      case 'listar_ventas':
        result = await listSales(filteredParams, divisionFilter);
        break;

      case 'obtener_balance':
        result = await getBalance(filteredParams, divisionFilter);
        break;

      case 'top_productos':
        result = await getTopProducts(filteredParams, divisionFilter);
        break;

      case 'alertas':
        result = await getAlerts(filteredParams, divisionFilter);
        break;

      default:
        const unknownIntentionError = `Unknown intention: ${intention}`;
        logger.error(`[Queries] ${unknownIntentionError}`);
        throw new Error(unknownIntentionError);
    }

    logger.info(`[Queries] Query executed successfully:`, { intention, result });
    return result;
  } catch (error) {
    logger.error(`[Queries] Error executing financial query:`, error);
    throw error;
  }
}

module.exports = {
  buildDivisionFilter,
  executeFinancialQuery,
  // Internal functions exported for testing
  calculateMargin,
  listSales,
  getBalance,
  getTopProducts,
  getAlerts,
};
