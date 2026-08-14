/**
 * Unit tests for the Furia mirror query module.
 * Covers company resolution, per-user access, and the cases where the honest
 * answer is that there is no figure to give.
 */

jest.mock('../../src/furia/mirror', () => ({
  query: jest.fn(),
  close: jest.fn(),
}));

jest.mock('../../src/supabase/auth', () => ({
  getUserByPhone: jest.fn(),
}));

const { resolverEmpresa, tienePL, TODAS } = require('../../src/furia/empresas');
const { empresasPermitidas, executeFinancialQuery } = require('../../src/furia/queries');
const mirror = require('../../src/furia/mirror');
const { getUserByPhone } = require('../../src/supabase/auth');

const CEO = { id: '1', phoneNumber: '+58001', role: 'CEO', divisionAssigned: 'All' };
const CFO_ENERGY = { id: '2', phoneNumber: '+58002', role: 'CFO', divisionAssigned: 'Furia Energy' };

describe('Furia queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mirror.query.mockResolvedValue([]);
  });

  describe('resolverEmpresa', () => {
    test('resolves the names people actually type', () => {
      expect(resolverEmpresa('energy')).toBe('Furia Energy');
      expect(resolverEmpresa('BGG')).toBe('Caracas Fly');
      expect(resolverEmpresa('  Tienda  ')).toBe('Furia Store');
      expect(resolverEmpresa('furia gear')).toBe('FuriaGear');
    });

    test('returns null for a company outside the six', () => {
      expect(resolverEmpresa('Polar')).toBeNull();
      expect(resolverEmpresa('')).toBeNull();
      expect(resolverEmpresa(undefined)).toBeNull();
    });
  });

  describe('tienePL', () => {
    test('separates the four with a P&L from the two without', () => {
      expect(tienePL('Furia Store')).toBe(true);
      expect(tienePL('Caracas Fly')).toBe(true);
      expect(tienePL('Vida By Furia')).toBe(false);
      expect(tienePL('FuriaGear')).toBe(false);
    });
  });

  describe('empresasPermitidas', () => {
    test('All grants the six companies', () => {
      expect(empresasPermitidas('All')).toEqual(TODAS);
    });

    test('a specific assignment grants only that company', () => {
      expect(empresasPermitidas('Furia Energy')).toEqual(['Furia Energy']);
    });

    test('an unrecognized assignment grants nothing', () => {
      expect(empresasPermitidas('Bebidas')).toEqual([]);
    });
  });

  describe('executeFinancialQuery', () => {
    test('rejects an unknown phone number', async () => {
      getUserByPhone.mockResolvedValue(null);

      await expect(
        executeFinancialQuery('+58999', 'resumen_empresa', {})
      ).rejects.toThrow('User not found');
    });

    test('reports out of scope instead of guessing', async () => {
      getUserByPhone.mockResolvedValue(CEO);

      const result = await executeFinancialQuery('+58001', 'resumen_empresa', {
        empresa: 'Polar',
      });

      expect(result.tipo).toBe('fuera_de_alcance');
      expect(result.solicitada).toBe('Polar');
      expect(mirror.query).not.toHaveBeenCalled();
    });

    test('denies a company the user is not assigned to', async () => {
      getUserByPhone.mockResolvedValue(CFO_ENERGY);

      const result = await executeFinancialQuery('+58002', 'resumen_empresa', {
        empresa: 'Furia Store',
      });

      expect(result.tipo).toBe('sin_permiso');
      expect(mirror.query).not.toHaveBeenCalled();
    });

    test('allows the user their own company', async () => {
      getUserByPhone.mockResolvedValue(CFO_ENERGY);

      const result = await executeFinancialQuery('+58002', 'resumen_empresa', {
        empresa: 'Furia Energy',
      });

      expect(result.tipo).toBe('resumen_empresa');
      expect(mirror.query).toHaveBeenCalledWith(expect.any(String), [['Furia Energy']]);
    });

    test('a CEO asking broadly only gets the companies that have a P&L', async () => {
      getUserByPhone.mockResolvedValue(CEO);

      await executeFinancialQuery('+58001', 'resumen_empresa', {});

      const [, params] = mirror.query.mock.calls[0];
      expect(params[0]).toEqual(['Furia Store', 'Furia Energy', 'Caracas Fly', 'Altitude']);
    });

    test('answers with the gap for a company that has no ledger', async () => {
      getUserByPhone.mockResolvedValue(CEO);

      const result = await executeFinancialQuery('+58001', 'resumen_empresa', {
        empresa: 'Vida By Furia',
      });

      // Asking for a summary of a company without bookkeeping must not
      // produce a result: the gap is the only honest answer.
      expect(result.tipo).toBe('brecha_registro');
    });

    test('rejects an intention the dispatcher does not implement', async () => {
      getUserByPhone.mockResolvedValue(CEO);

      await expect(
        executeFinancialQuery('+58001', 'top_productos', { empresa: 'Furia Store' })
      ).rejects.toThrow('Unknown intention');
    });
  });

  describe('figures carry their caveats', () => {
    test('several companies come back flagged as non-consolidable', async () => {
      getUserByPhone.mockResolvedValue(CEO);
      mirror.query.mockResolvedValue([
        { empresa: 'Furia Store', ventas_usd: '370184.09', ebitda_usd: '75791.79', limite: 'enero a junio' },
        { empresa: 'Furia Energy', ventas_usd: '170483.84', ebitda_usd: '-108512.89', limite: 'enero a julio' },
      ]);

      const result = await executeFinancialQuery('+58001', 'resumen_empresa', {});

      expect(result.no_consolidable).toContain('NO se suman');
      expect(result.empresas[0].limite).toBe('enero a junio');
      expect(result.empresas[0].ventas_usd).toBe(370184.09);
    });

    test('a single company carries no consolidation warning', async () => {
      getUserByPhone.mockResolvedValue(CEO);
      mirror.query.mockResolvedValue([
        { empresa: 'Furia Store', ventas_usd: '370184.09', ebitda_usd: '75791.79', limite: 'enero a junio' },
      ]);

      const result = await executeFinancialQuery('+58001', 'resumen_empresa', {
        empresa: 'Furia Store',
      });

      expect(result.no_consolidable).toBeNull();
    });
  });
});
