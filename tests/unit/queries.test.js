/**
 * Unit tests for Safe Financial Query Builder
 * Tests buildDivisionFilter and executeFinancialQuery functions
 * Uses mocks for Prisma database calls
 */

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

jest.mock('../../src/supabase/auth', () => ({
  getUserByPhone: jest.fn(),
}));

const {
  buildDivisionFilter,
  executeFinancialQuery,
  calculateMargin,
  listSales,
  getBalance,
  getTopProducts,
  getAlerts,
} = require('../../src/supabase/queries');
const { getUserByPhone } = require('../../src/supabase/auth');

describe('Safe Financial Query Builder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildDivisionFilter', () => {
    test('CEO should have no division filter (empty object)', () => {
      const filter = buildDivisionFilter('CEO', 'All');

      expect(filter).toEqual({});
      expect(Object.keys(filter).length).toBe(0);
    });

    test('CFO should filter by assigned division', () => {
      const filter = buildDivisionFilter('CFO', 'Bebidas');

      expect(filter).toEqual({ division: 'Bebidas' });
      expect(filter.division).toBe('Bebidas');
    });

    test('COO should filter by assigned division', () => {
      const filter = buildDivisionFilter('COO', 'Gear');

      expect(filter).toEqual({ division: 'Gear' });
      expect(filter.division).toBe('Gear');
    });

    test('ERC should filter by assigned division', () => {
      const filter = buildDivisionFilter('ERC', 'Reestructuración');

      expect(filter).toEqual({ division: 'Reestructuración' });
      expect(filter.division).toBe('Reestructuración');
    });
  });

  describe('executeFinancialQuery', () => {
    test('should throw error if user not found', async () => {
      getUserByPhone.mockResolvedValue(null);

      await expect(
        executeFinancialQuery('+58XXXXXXXXX1', 'calcular_margen', { periodo: 'mes_actual' })
      ).rejects.toThrow('User not found');
    });

    test('should calculate margin for Bebidas division', async () => {
      // Mock user lookup
      getUserByPhone.mockResolvedValue({
        id: 'user-123',
        phoneNumber: '+58XXXXXXXXX2',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
      });

      const result = await executeFinancialQuery('+58XXXXXXXXX2', 'calcular_margen', {
        periodo: 'mes_actual',
      });

      expect(result).toBeDefined();
      expect(result.division).toBe('Bebidas');
      expect(result.margen_porcentaje).toBe(35);
      expect(result.ingresos).toBe(1000000);
      expect(result.gastos).toBe(650000);
    });

    test('should calculate margin for Gear division', async () => {
      getUserByPhone.mockResolvedValue({
        id: 'user-456',
        phoneNumber: '+58XXXXXXXXX3',
        role: 'COO',
        divisionAssigned: 'Gear',
      });

      const result = await executeFinancialQuery('+58XXXXXXXXX3', 'calcular_margen', {
        periodo: 'mes_actual',
      });

      expect(result.division).toBe('Gear');
      expect(result.margen_porcentaje).toBe(40);
    });

    test('CEO should see all divisions when querying', async () => {
      getUserByPhone.mockResolvedValue({
        id: 'user-ceo',
        phoneNumber: '+58XXXXXXXXX1',
        role: 'CEO',
        divisionAssigned: 'All',
      });

      // CEO can access any division data
      const result = await executeFinancialQuery('+58XXXXXXXXX1', 'calcular_margen', {
        division: 'Gear',
        periodo: 'mes_actual',
      });

      expect(result).toBeDefined();
      expect(result.margen_porcentaje).toBeGreaterThan(0);
    });

    test('should list sales for assigned division', async () => {
      getUserByPhone.mockResolvedValue({
        id: 'user-123',
        phoneNumber: '+58XXXXXXXXX2',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
      });

      const result = await executeFinancialQuery('+58XXXXXXXXX2', 'listar_ventas', {
        periodo: 'mes_actual',
      });

      expect(result).toBeDefined();
      expect(result.division).toBe('Bebidas');
      expect(result.total_ventas).toBe(1000000);
      expect(result.numero_transacciones).toBe(245);
    });

    test('should get balance sheet for division', async () => {
      getUserByPhone.mockResolvedValue({
        id: 'user-456',
        phoneNumber: '+58XXXXXXXXX3',
        role: 'COO',
        divisionAssigned: 'Gear',
      });

      const result = await executeFinancialQuery('+58XXXXXXXXX3', 'obtener_balance', {});

      expect(result).toBeDefined();
      expect(result.division).toBe('Gear');
      expect(result.activos).toBe(2500000);
      expect(result.pasivos).toBe(1000000);
      expect(result.patrimonio).toBe(1500000);
    });

    test('should get top products for division', async () => {
      getUserByPhone.mockResolvedValue({
        id: 'user-123',
        phoneNumber: '+58XXXXXXXXX2',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
      });

      const result = await executeFinancialQuery('+58XXXXXXXXX2', 'top_productos', {
        periodo: 'mes_actual',
        top_n: 2,
      });

      expect(result).toBeDefined();
      expect(result.division).toBe('Bebidas');
      expect(result.top_n).toBe(2);
      expect(result.productos).toHaveLength(2);
      expect(result.productos[0].nombre).toBeDefined();
      expect(result.productos[0].ventas).toBeGreaterThan(0);
    });

    test('should get alerts for division', async () => {
      getUserByPhone.mockResolvedValue({
        id: 'user-123',
        phoneNumber: '+58XXXXXXXXX2',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
      });

      const result = await executeFinancialQuery('+58XXXXXXXXX2', 'alertas', {});

      expect(result).toBeDefined();
      expect(result.division).toBe('Bebidas');
      expect(Array.isArray(result.alerts)).toBe(true);
      expect(result.alerts.length).toBeGreaterThan(0);
    });

    test('should throw error for unknown intention', async () => {
      getUserByPhone.mockResolvedValue({
        id: 'user-123',
        phoneNumber: '+58XXXXXXXXX2',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
      });

      await expect(
        executeFinancialQuery('+58XXXXXXXXX2', 'unknown_intention', {})
      ).rejects.toThrow('Unknown intention');
    });

    test('should enforce division filter for non-CEO users', async () => {
      getUserByPhone.mockResolvedValue({
        id: 'user-123',
        phoneNumber: '+58XXXXXXXXX2',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
      });

      const result = await executeFinancialQuery('+58XXXXXXXXX2', 'calcular_margen', {
        periodo: 'mes_actual',
      });

      // Even if we pass Gear, the filter should enforce Bebidas
      expect(result.division).toBe('Bebidas');
    });
  });

  describe('Query Functions', () => {
    test('calculateMargin should return required fields', async () => {
      const result = await calculateMargin({ division: 'Bebidas', periodo: 'mes_actual' }, {});

      expect(result).toHaveProperty('division');
      expect(result).toHaveProperty('periodo');
      expect(result).toHaveProperty('ingresos');
      expect(result).toHaveProperty('gastos');
      expect(result).toHaveProperty('margen_porcentaje');
    });

    test('listSales should return required fields', async () => {
      const result = await listSales({ division: 'Gear', periodo: 'mes_actual' }, {});

      expect(result).toHaveProperty('division');
      expect(result).toHaveProperty('periodo');
      expect(result).toHaveProperty('total_ventas');
      expect(result).toHaveProperty('numero_transacciones');
    });

    test('getBalance should return required fields', async () => {
      const result = await getBalance({ division: 'Reestructuración' }, {});

      expect(result).toHaveProperty('division');
      expect(result).toHaveProperty('activos');
      expect(result).toHaveProperty('pasivos');
      expect(result).toHaveProperty('patrimonio');
    });

    test('getTopProducts should return required fields', async () => {
      const result = await getTopProducts(
        { division: 'Bebidas', periodo: 'mes_actual', top_n: 3 },
        {}
      );

      expect(result).toHaveProperty('division');
      expect(result).toHaveProperty('periodo');
      expect(result).toHaveProperty('top_n');
      expect(result).toHaveProperty('productos');
      expect(Array.isArray(result.productos)).toBe(true);
    });

    test('getAlerts should return required fields', async () => {
      const result = await getAlerts({ division: 'Bebidas' }, {});

      expect(result).toHaveProperty('division');
      expect(result).toHaveProperty('alerts');
      expect(Array.isArray(result.alerts)).toBe(true);
    });
  });
});
