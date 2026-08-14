/**
 * Unit tests for User Authentication
 * Tests getUserByPhone and verifyUserPermission functions
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

const { getUserByPhone, verifyUserPermission } = require('../../src/supabase/auth');
const { PrismaClient } = require('@prisma/client');

describe('User Authentication', () => {
  let mockPrisma;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  describe('getUserByPhone', () => {
    test('should return user if exists and active', async () => {
      // Mock Prisma response
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        phoneNumber: '+58XXXXXXXXX1',
        role: 'CEO',
        divisionAssigned: 'All',
        active: true,
      });

      const user = await getUserByPhone('+58XXXXXXXXX1');

      expect(user).not.toBeNull();
      expect(user.phoneNumber).toBe('+58XXXXXXXXX1');
      expect(user.role).toBe('CEO');
      expect(user.divisionAssigned).toBe('All');
      expect(user.id).toBe('user-123');
    });

    test('should return null if user does not exist', async () => {
      // Mock Prisma response - user not found
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const user = await getUserByPhone('+58INVALID');

      expect(user).toBeNull();
    });

    test('should return null if user is inactive', async () => {
      // Mock Prisma response - user exists but inactive
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-456',
        phoneNumber: '+58XXXXXXXXX9',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
        active: false,
      });

      const user = await getUserByPhone('+58XXXXXXXXX9');

      expect(user).toBeNull();
    });
  });

  describe('verifyUserPermission', () => {
    test('CEO should access all divisions', async () => {
      // Mock Prisma response for CEO user
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        phoneNumber: '+58XXXXXXXXX1',
        role: 'CEO',
        divisionAssigned: 'All',
        active: true,
      });

      // CEO trying to access Bebidas
      const hasAccessBebidas = await verifyUserPermission('+58XXXXXXXXX1', 'Bebidas');
      expect(hasAccessBebidas).toBe(true);

      // CEO trying to access Gear
      const hasAccessGear = await verifyUserPermission('+58XXXXXXXXX1', 'Gear');
      expect(hasAccessGear).toBe(true);

      // CEO trying to access Reestructuración
      const hasAccessReestructuracion = await verifyUserPermission(
        '+58XXXXXXXXX1',
        'Reestructuración'
      );
      expect(hasAccessReestructuracion).toBe(true);
    });

    test('CFO should access only assigned division', async () => {
      // Mock Prisma response for CFO user (assigned to Bebidas)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-456',
        phoneNumber: '+58XXXXXXXXX2',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
        active: true,
      });

      // CFO trying to access Bebidas (assigned)
      const hasAccessBebidas = await verifyUserPermission('+58XXXXXXXXX2', 'Bebidas');
      expect(hasAccessBebidas).toBe(true);

      // CFO trying to access Gear (not assigned)
      const hasAccessGear = await verifyUserPermission('+58XXXXXXXXX2', 'Gear');
      expect(hasAccessGear).toBe(false);

      // CFO trying to access Reestructuración (not assigned)
      const hasAccessReestructuracion = await verifyUserPermission(
        '+58XXXXXXXXX2',
        'Reestructuración'
      );
      expect(hasAccessReestructuracion).toBe(false);
    });

    test('COO should access only assigned division', async () => {
      // Mock Prisma response for COO user (assigned to Gear)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-789',
        phoneNumber: '+58XXXXXXXXX3',
        role: 'COO',
        divisionAssigned: 'Gear',
        active: true,
      });

      // COO trying to access Gear (assigned)
      const hasAccessGear = await verifyUserPermission('+58XXXXXXXXX3', 'Gear');
      expect(hasAccessGear).toBe(true);

      // COO trying to access Bebidas (not assigned)
      const hasAccessBebidas = await verifyUserPermission('+58XXXXXXXXX3', 'Bebidas');
      expect(hasAccessBebidas).toBe(false);

      // COO trying to access Reestructuración (not assigned)
      const hasAccessReestructuracion = await verifyUserPermission(
        '+58XXXXXXXXX3',
        'Reestructuración'
      );
      expect(hasAccessReestructuracion).toBe(false);
    });

    test('should return false if user does not exist', async () => {
      // Mock Prisma response - user not found
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const hasAccess = await verifyUserPermission('+58INVALID', 'Bebidas');
      expect(hasAccess).toBe(false);
    });

    test('should return false if missing parameters', async () => {
      const hasAccessNoPhone = await verifyUserPermission(null, 'Bebidas');
      expect(hasAccessNoPhone).toBe(false);

      const hasAccessNoDivision = await verifyUserPermission('+58XXXXXXXXX1', null);
      expect(hasAccessNoDivision).toBe(false);
    });
  });
});
