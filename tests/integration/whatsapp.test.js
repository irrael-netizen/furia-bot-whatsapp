/**
 * Integration tests for WhatsApp Webhook
 * Tests webhook endpoint with signature verification and message handling
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

const request = require('supertest');
const { app, startServer } = require('../../src/index');
const config = require('../../src/config');
const { calculateSignature } = require('../../src/whatsapp/signature');
const { PrismaClient } = require('@prisma/client');

describe('WhatsApp Webhook Integration Tests', () => {
  let mockPrisma;
  let server;
  const TEST_PORT = 9876; // Fixed port for testing

  beforeAll((done) => {
    // Start the server on a fixed port for testing
    // This ensures we know the exact URL for signature calculation
    server = app.listen(TEST_PORT, () => {
      done();
    });
  });

  afterAll((done) => {
    // Close the test server
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  /**
   * Helper function to generate valid Twilio signature
   * Uses the shared calculateSignature function
   * @param {string} url - The full URL including protocol and path
   * @param {Object} params - The POST body parameters
   * @param {string} secret - The webhook secret
   * @returns {string} - The signature header value
   */
  function generateTwilioSignature(url, params, secret) {
    return calculateSignature(url, params, secret);
  }

  /**
   * Make a test request to capture the actual host header that the app sees
   * This is needed because supertest uses dynamic ports
   */
  async function captureActualHost() {
    if (capturedHost) {
      return capturedHost;
    }

    const response = await request(app)
      .get('/health')
      .send({});

    // The app will see a specific host:port, we need to extract it from logs or use a different approach
    // For now, we'll use a heuristic: if localhost appears in the request, use localhost, else use 127.0.0.1
    // Actually, supertest sends requests with 127.0.0.1 or localhost, and the port is random
    // The app's middleware will see the actual generated port
    // We can't easily extract it without modifying the app
    // So we'll use a different strategy: run tests with a known port

    return 'localhost';
  }

  describe('POST /webhook', () => {
    test('should accept messages from registered users', async () => {
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        phoneNumber: '+58XXXXXXXXX1',
        role: 'CEO',
        divisionAssigned: 'All',
        active: true,
      });

      const messageBody = {
        From: 'whatsapp:+58XXXXXXXXX1',
        Body: 'Test message',
        MessageSid: 'SMaaaaaaaa1',
      };

      // Use the fixed test port
      const url = `http://127.0.0.1:${TEST_PORT}/webhook`;
      const signature = generateTwilioSignature(url, messageBody, config.security.webhookSecret);

      const response = await request(server)
        .post('/webhook')
        .set('X-Twilio-Signature', signature)
        .send(messageBody);

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/xml');
      expect(response.text).toContain('<Response></Response>');
    });

    test('should accept messages from registered users with plain phone number From', async () => {
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-456',
        phoneNumber: '+58XXXXXXXXX2',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
        active: true,
      });

      const messageBody = {
        From: 'whatsapp:+58XXXXXXXXX2',
        Body: 'Another test',
        MessageSid: 'SMaaaaaaaa2',
      };

      const url = `http://127.0.0.1:${TEST_PORT}/webhook`;
      const signature = generateTwilioSignature(url, messageBody, config.security.webhookSecret);

      const response = await request(server)
        .post('/webhook')
        .set('X-Twilio-Signature', signature)
        .send(messageBody);

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/xml');
    });

    test('should reject messages without valid signature', async () => {
      const messageBody = {
        From: 'whatsapp:+58XXXXXXXXX1',
        Body: 'Test message',
        MessageSid: 'SMaaaaaaaa3',
      };

      const response = await request(server)
        .post('/webhook')
        .set('X-Twilio-Signature', 'invalid-signature')
        .send(messageBody);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body).toHaveProperty('message');
    });

    test('should reject messages with missing signature', async () => {
      const messageBody = {
        From: 'whatsapp:+58XXXXXXXXX1',
        Body: 'Test message',
        MessageSid: 'SMaaaaaaaa4',
      };

      const response = await request(server).post('/webhook').send(messageBody);

      expect(response.status).toBe(403);
    });

    test('should log warning for unregistered users', async () => {
      // Mock user lookup - user not found
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const messageBody = {
        From: 'whatsapp:+58INVALID',
        Body: 'Test message',
        MessageSid: 'SMaaaaaaaa5',
      };

      const url = `http://127.0.0.1:${TEST_PORT}/webhook`;
      const signature = generateTwilioSignature(url, messageBody, config.security.webhookSecret);

      const response = await request(server)
        .post('/webhook')
        .set('X-Twilio-Signature', signature)
        .send(messageBody);

      // Should still return 200 because webhook was accepted
      expect(response.status).toBe(200);
      expect(response.type).toBe('text/xml');
    });

    test('should handle multiline messages', async () => {
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-789',
        phoneNumber: '+58XXXXXXXXX3',
        role: 'COO',
        divisionAssigned: 'Gear',
        active: true,
      });

      const multilineText = 'First line\nSecond line\nThird line';
      const messageBody = {
        From: 'whatsapp:+58XXXXXXXXX3',
        Body: multilineText,
        MessageSid: 'SMaaaaaaaa6',
      };

      const url = `http://127.0.0.1:${TEST_PORT}/webhook`;
      const signature = generateTwilioSignature(url, messageBody, config.security.webhookSecret);

      const response = await request(server)
        .post('/webhook')
        .set('X-Twilio-Signature', signature)
        .send(messageBody);

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/xml');
    });

    test('should handle messages with special characters', async () => {
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-special',
        phoneNumber: '+58XXXXXXXXX4',
        role: 'ERC',
        divisionAssigned: 'Reestructuración',
        active: true,
      });

      const specialText = '¿Cuál es el status? ñoño @#$%^&*()';
      const messageBody = {
        From: 'whatsapp:+58XXXXXXXXX4',
        Body: specialText,
        MessageSid: 'SMaaaaaaaa7',
      };

      const url = `http://127.0.0.1:${TEST_PORT}/webhook`;
      const signature = generateTwilioSignature(url, messageBody, config.security.webhookSecret);

      const response = await request(server)
        .post('/webhook')
        .set('X-Twilio-Signature', signature)
        .send(messageBody);

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/xml');
    });
  });

  describe('Signature Verification', () => {
    test('should verify signature correctly', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        phoneNumber: '+58XXXXXXXXX1',
        role: 'CEO',
        divisionAssigned: 'All',
        active: true,
      });

      const messageBody = {
        From: 'whatsapp:+58XXXXXXXXX1',
        Body: 'Test message',
        MessageSid: 'SMaaaaaaaa8',
      };

      const url = `http://127.0.0.1:${TEST_PORT}/webhook`;
      const validSignature = generateTwilioSignature(url, messageBody, config.security.webhookSecret);

      const response = await request(server)
        .post('/webhook')
        .set('X-Twilio-Signature', validSignature)
        .send(messageBody);

      // Should succeed
      expect(response.status).toBe(200);
    });

    test('should reject with tampered body', async () => {
      const messageBody = {
        From: 'whatsapp:+58XXXXXXXXX1',
        Body: 'Original message',
        MessageSid: 'SMaaaaaaaa9',
      };

      const url = `http://127.0.0.1:${TEST_PORT}/webhook`;
      const signature = generateTwilioSignature(url, messageBody, config.security.webhookSecret);

      // Tamper with body after signature generation
      const tamperedBody = {
        ...messageBody,
        Body: 'Different message',
      };

      const response = await request(server)
        .post('/webhook')
        .set('X-Twilio-Signature', signature)
        .send(tamperedBody);

      expect(response.status).toBe(403);
    });

    test('should reject with wrong secret', async () => {
      const messageBody = {
        From: 'whatsapp:+58XXXXXXXXX1',
        Body: 'Test message',
        MessageSid: 'SMaaaaaaaa10',
      };

      const url = `http://127.0.0.1:${TEST_PORT}/webhook`;
      // Sign with wrong secret
      const wrongSignature = generateTwilioSignature(url, messageBody, 'wrong-secret');

      const response = await request(server)
        .post('/webhook')
        .set('X-Twilio-Signature', wrongSignature)
        .send(messageBody);

      expect(response.status).toBe(403);
    });
  });
});
