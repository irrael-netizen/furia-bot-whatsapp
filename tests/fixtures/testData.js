/**
 * Test Data Fixtures
 * Provides consistent test data for unit and integration tests
 */

/**
 * Test users representing different roles in Furia holding
 */
const testUsers = [
  {
    id: 'user-ceo-001',
    phone: '+584241234561',
    name: 'Juan Pérez',
    role: 'CEO',
    division: 'All',
    email: 'juan@furia.com',
    active: true,
  },
  {
    id: 'user-cfo-002',
    phone: '+584241234562',
    name: 'María García',
    role: 'CFO',
    division: 'Bebidas',
    email: 'maria@furia.com',
    active: true,
  },
  {
    id: 'user-coo-003',
    phone: '+584241234563',
    name: 'Carlos López',
    role: 'COO',
    division: 'Gear',
    email: 'carlos@furia.com',
    active: true,
  },
];

/**
 * Test queries representing typical financial queries
 */
const testQueries = [
  {
    id: 'query-margin-001',
    text: '¿Cuál fue el margen de Bebidas este mes?',
    intention: 'calcular_margen',
    parameters: {
      division: 'Bebidas',
      periodo: 'mes_actual',
    },
    confidence: 0.95,
    userId: 'user-cfo-002',
    timestamp: new Date('2026-08-14T10:00:00Z'),
  },
  {
    id: 'query-sales-002',
    text: 'Muéstrame las ventas de Gear',
    intention: 'listar_ventas',
    parameters: {
      division: 'Gear',
      periodo: 'mes_actual',
    },
    confidence: 0.92,
    userId: 'user-coo-003',
    timestamp: new Date('2026-08-14T11:30:00Z'),
  },
];

/**
 * Test data for authentication
 */
const testAuthData = {
  validToken: 'test-token-valid-12345',
  invalidToken: 'test-token-invalid',
  expiredToken: 'test-token-expired',
};

/**
 * Test data for Supabase operations
 */
const testSupabaseData = {
  users: testUsers,
  queries: testQueries,
};

/**
 * Test data for NLU operations
 */
const testNLUData = {
  queries: [
    {
      text: '¿Cuál fue el margen de Bebidas este mes?',
      expectedIntent: 'calcular_margen',
      expectedDivision: 'Bebidas',
      expectedPeriodo: 'mes_actual',
    },
    {
      text: 'Muéstrame las ventas de Gear',
      expectedIntent: 'listar_ventas',
      expectedDivision: 'Gear',
      expectedPeriodo: 'mes_actual',
    },
    {
      text: '¿Cuáles son los productos top de Bebidas?',
      expectedIntent: 'top_productos',
      expectedDivision: 'Bebidas',
    },
  ],
};

module.exports = {
  testUsers,
  testQueries,
  testAuthData,
  testSupabaseData,
  testNLUData,
};
