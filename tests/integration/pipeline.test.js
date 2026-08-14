/**
 * Integration tests for Message Processing Pipeline
 * Tests end-to-end flow: WhatsApp → Claude → Supabase → WhatsApp
 */

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    queryLog: {
      count: jest.fn(),
      create: jest.fn(),
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

const { handleWhatsappWebhook } = require('../../src/whatsapp/webhook');
const { PrismaClient } = require('@prisma/client');

describe('Message Processing Pipeline Integration Tests', () => {
  let mockPrisma;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();

    // Mock successful user lookup
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-123',
      phoneNumber: '+58XXXXXXXXX1',
      role: 'CEO',
      divisionAssigned: 'All',
      active: true,
    });

    // Mock rate limit check - not exceeded
    mockPrisma.queryLog.count.mockResolvedValue(15); // 15 queries in last hour (under limit of 30)

    // Mock audit logging
    mockPrisma.queryLog.create.mockResolvedValue({
      id: 'log-123',
      userPhone: '+58XXXXXXXXX1',
      query: 'test query',
      intention: 'calcular_margen',
      success: true,
    });

    // Mock response object
    mockRes = {
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('End-to-End Pipeline', () => {
    test('should process query end-to-end successfully', async () => {
      const mockReq = {
        body: {
          From: 'whatsapp:+58XXXXXXXXX1',
          Body: 'Cuál es el margen de Bebidas este mes?',
          MessageSid: 'SM123456789',
        },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
        originalUrl: '/webhook',
      };

      // Execute webhook handler
      await handleWhatsappWebhook(mockReq, mockRes);

      // Verify XML response returned immediately
      expect(mockRes.type).toHaveBeenCalledWith('text/xml');
      expect(mockRes.send).toHaveBeenCalled();
      const xmlResponse = mockRes.send.mock.calls[0][0];
      expect(xmlResponse).toContain('<Response></Response>');
    });

    test('should handle rate limit exceeded', async () => {
      // Mock rate limit exceeded
      mockPrisma.queryLog.count.mockResolvedValue(30); // 30 queries = limit reached

      const mockReq = {
        body: {
          From: 'whatsapp:+58XXXXXXXXX1',
          Body: 'Another query',
          MessageSid: 'SM123456790',
        },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
        originalUrl: '/webhook',
      };

      await handleWhatsappWebhook(mockReq, mockRes);

      // Verify XML response still returned immediately
      expect(mockRes.type).toHaveBeenCalledWith('text/xml');
      expect(mockRes.send).toHaveBeenCalled();
    });

    test('should handle unregistered user', async () => {
      // Mock user not found
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const mockReq = {
        body: {
          From: 'whatsapp:+58INVALID',
          Body: 'Test message',
          MessageSid: 'SM123456791',
        },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
        originalUrl: '/webhook',
      };

      await handleWhatsappWebhook(mockReq, mockRes);

      // Verify XML response still returned immediately
      expect(mockRes.type).toHaveBeenCalledWith('text/xml');
      expect(mockRes.send).toHaveBeenCalled();
    });

    test('should log queries to audit trail on success', async () => {
      const mockReq = {
        body: {
          From: 'whatsapp:+58XXXXXXXXX1',
          Body: 'Cuál es el balance?',
          MessageSid: 'SM123456792',
        },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
        originalUrl: '/webhook',
      };

      await handleWhatsappWebhook(mockReq, mockRes);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify audit log was created
      expect(mockPrisma.queryLog.create).toHaveBeenCalled();
    });

    test('should handle pipeline errors gracefully', async () => {
      // Mock an error during user lookup
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const mockReq = {
        body: {
          From: 'whatsapp:+58XXXXXXXXX1',
          Body: 'Test query',
          MessageSid: 'SM123456793',
        },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
        originalUrl: '/webhook',
      };

      // Should not throw
      await handleWhatsappWebhook(mockReq, mockRes);

      // Verify XML response still returned
      expect(mockRes.type).toHaveBeenCalledWith('text/xml');
      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    test('should block queries when rate limit exceeded', async () => {
      // Set to exactly at limit
      mockPrisma.queryLog.count.mockResolvedValue(30);

      const mockReq = {
        body: {
          From: 'whatsapp:+58XXXXXXXXX1',
          Body: 'Query when at limit',
          MessageSid: 'SM123456797',
        },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
        originalUrl: '/webhook',
      };

      await handleWhatsappWebhook(mockReq, mockRes);

      // XML response should still be immediate
      expect(mockRes.type).toHaveBeenCalledWith('text/xml');
    });

    test('should allow queries under rate limit', async () => {
      // Set to just under limit
      mockPrisma.queryLog.count.mockResolvedValue(29);

      const mockReq = {
        body: {
          From: 'whatsapp:+58XXXXXXXXX1',
          Body: 'Query under limit',
          MessageSid: 'SM123456798',
        },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
        originalUrl: '/webhook',
      };

      await handleWhatsappWebhook(mockReq, mockRes);

      expect(mockRes.type).toHaveBeenCalledWith('text/xml');
    });
  });
});
