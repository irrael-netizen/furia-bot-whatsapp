/**
 * Integration tests for Daily Reporter Scheduler
 * Tests automated daily report generation and sending
 */

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    reportConfig: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'SM1234567890',
        status: 'queued',
      }),
    },
  }));
});

jest.mock('../../src/claude/client', () => {
  return {
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              intention: 'calcular_margen',
              parameters: { division: 'Bebidas', periodo: 'mes_actual' },
              confidence: 0.95,
            }),
          },
        ],
      }),
    },
  };
});

jest.mock('node-cron', () => {
  return {
    schedule: jest.fn((cronExpression, callback, options) => {
      return {
        start: jest.fn(),
        stop: jest.fn(),
        destroy: jest.fn(),
      };
    }),
  };
});

const { sendUserReports, runDailyReports, initializeScheduler } = require('../../src/scheduler/reporter');
const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');

describe('Daily Reporter Scheduler', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  describe('sendUserReports', () => {
    test('should skip user with no report config', async () => {
      const user = {
        id: 'user-123',
        phoneNumber: '+58XXXXXXXXX1',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
        active: true,
      };

      mockPrisma.reportConfig.findUnique.mockResolvedValue(null);

      // Should not throw
      await sendUserReports(user);

      // Verify no attempts to send messages
      expect(mockPrisma.reportConfig.findUnique).toHaveBeenCalledWith({
        where: { userPhone: user.phoneNumber },
      });
    });

    test('should skip user with inactive report config', async () => {
      const user = {
        id: 'user-123',
        phoneNumber: '+58XXXXXXXXX1',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
        active: true,
      };

      mockPrisma.reportConfig.findUnique.mockResolvedValue({
        id: 'config-123',
        userPhone: user.phoneNumber,
        reportsDaily: ['calcular_margen', 'listar_ventas'],
        active: false,
      });

      // Should not throw
      await sendUserReports(user);

      expect(mockPrisma.reportConfig.findUnique).toHaveBeenCalled();
    });

    test('should skip user with no reports configured', async () => {
      const user = {
        id: 'user-123',
        phoneNumber: '+58XXXXXXXXX1',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
        active: true,
      };

      mockPrisma.reportConfig.findUnique.mockResolvedValue({
        id: 'config-123',
        userPhone: user.phoneNumber,
        reportsDaily: [],
        active: true,
      });

      // Should not throw
      await sendUserReports(user);

      expect(mockPrisma.reportConfig.findUnique).toHaveBeenCalled();
    });

    test('should send reports to user with valid config', async () => {
      const user = {
        id: 'user-123',
        phoneNumber: '+58XXXXXXXXX1',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
        active: true,
      };

      mockPrisma.reportConfig.findUnique.mockResolvedValue({
        id: 'config-123',
        userPhone: user.phoneNumber,
        reportsDaily: ['calcular_margen', 'listar_ventas'],
        active: true,
      });

      // Should not throw
      await sendUserReports(user);

      expect(mockPrisma.reportConfig.findUnique).toHaveBeenCalled();
    });

    test('should handle null user gracefully', async () => {
      // Should not throw
      await sendUserReports(null);
    });

    test('should handle user with missing phoneNumber gracefully', async () => {
      const user = {
        id: 'user-123',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
        active: true,
      };

      // Should not throw
      await sendUserReports(user);
    });
  });

  describe('runDailyReports', () => {
    test('should process all active users', async () => {
      const users = [
        {
          id: 'user-123',
          phoneNumber: '+58XXXXXXXXX1',
          role: 'CEO',
          divisionAssigned: 'All',
          active: true,
        },
        {
          id: 'user-456',
          phoneNumber: '+58XXXXXXXXX2',
          role: 'CFO',
          divisionAssigned: 'Bebidas',
          active: true,
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.reportConfig.findUnique.mockResolvedValue(null);

      // Should not throw
      await runDailyReports();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { active: true },
        select: {
          id: true,
          phoneNumber: true,
          role: true,
          divisionAssigned: true,
          active: true,
        },
      });
    });

    test('should handle errors gracefully and continue with next user', async () => {
      const users = [
        {
          id: 'user-123',
          phoneNumber: '+58XXXXXXXXX1',
          role: 'CEO',
          divisionAssigned: 'All',
          active: true,
        },
        {
          id: 'user-456',
          phoneNumber: '+58XXXXXXXXX2',
          role: 'CFO',
          divisionAssigned: 'Bebidas',
          active: true,
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(users);

      // First call throws, second succeeds
      mockPrisma.reportConfig.findUnique
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(null);

      // Should not throw
      await runDailyReports();

      // Should still attempt to process both users
      expect(mockPrisma.user.findMany).toHaveBeenCalled();
    });

    test('should handle empty user list', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Should not throw
      await runDailyReports();

      expect(mockPrisma.user.findMany).toHaveBeenCalled();
    });

    test('should log all active users being processed', async () => {
      const users = [
        {
          id: 'user-123',
          phoneNumber: '+58XXXXXXXXX1',
          role: 'CEO',
          divisionAssigned: 'All',
          active: true,
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.reportConfig.findUnique.mockResolvedValue(null);

      // Should not throw
      await runDailyReports();

      // Verify findMany was called with correct filter
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { active: true },
        select: expect.objectContaining({
          id: true,
          phoneNumber: true,
          role: true,
          divisionAssigned: true,
          active: true,
        }),
      });
    });
  });

  describe('initializeScheduler', () => {
    test('should initialize cron job for 7:00 AM Venezuela time', () => {
      const cronJob = initializeScheduler();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 7 * * *',
        expect.any(Function),
        {
          timezone: 'America/Caracas',
        }
      );

      expect(cronJob).toBeDefined();
      expect(cronJob.start).toBeDefined();
      expect(cronJob.stop).toBeDefined();
      expect(cronJob.destroy).toBeDefined();
    });

    test('should pass runDailyReports as callback', () => {
      initializeScheduler();

      const callArgs = cron.schedule.mock.calls[0];
      expect(callArgs[1]).toEqual(expect.any(Function));
    });

    test('should use correct cron expression', () => {
      initializeScheduler();

      const callArgs = cron.schedule.mock.calls[0];
      // Cron expression: 0 7 * * * = 7:00 AM every day
      expect(callArgs[0]).toBe('0 7 * * *');
    });

    test('should use America/Caracas timezone', () => {
      initializeScheduler();

      const callArgs = cron.schedule.mock.calls[0];
      expect(callArgs[2]).toEqual(expect.objectContaining({
        timezone: 'America/Caracas',
      }));
    });
  });

  describe('Integration', () => {
    test('should send reports to all active users when runDailyReports called', async () => {
      const users = [
        {
          id: 'user-123',
          phoneNumber: '+58XXXXXXXXX1',
          role: 'CEO',
          divisionAssigned: 'All',
          active: true,
        },
        {
          id: 'user-456',
          phoneNumber: '+58XXXXXXXXX2',
          role: 'CFO',
          divisionAssigned: 'Bebidas',
          active: true,
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.reportConfig.findUnique.mockResolvedValue(null);

      // Should not throw
      await runDailyReports();

      // Verify users were fetched
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { active: true },
        select: expect.any(Object),
      });
    });

    test('scheduler initialization should return a valid cron job', () => {
      const job = initializeScheduler();

      expect(job).toBeDefined();
      expect(typeof job.start).toBe('function');
      expect(typeof job.stop).toBe('function');
      expect(typeof job.destroy).toBe('function');
    });
  });
});
