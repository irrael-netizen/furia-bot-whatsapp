/**
 * Unit tests for NLU (Natural Language Understanding) Module
 * Tests intent extraction and response generation using Claude API
 */

jest.mock('../../src/claude/client', () => ({
  messages: {
    create: jest.fn(),
  },
}));

const { extractIntent, generateResponse } = require('../../src/claude/nlu');
const anthropic = require('../../src/claude/client');

describe('NLU Module', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('extractIntent', () => {
    test('should extract margen calculation intent', async () => {
      // Mock Claude response for margin calculation
      anthropic.messages.create.mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              intention: 'calcular_margen',
              parameters: {
                division: 'Bebidas',
                periodo: 'mes_actual',
              },
              confidence: 0.95,
            }),
          },
        ],
      });

      const result = await extractIntent('¿Cuál fue el margen de Bebidas este mes?', 'CFO', 'Bebidas');

      expect(result.intention).toBe('calcular_margen');
      expect(result.parameters.division).toBe('Bebidas');
      expect(result.parameters.periodo).toBe('mes_actual');
      expect(result.confidence).toBe(0.95);
    });

    test('should extract sales list intent', async () => {
      // Mock Claude response for sales listing
      anthropic.messages.create.mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              intention: 'listar_ventas',
              parameters: {
                division: 'Gear',
                periodo: 'semana_actual',
              },
              confidence: 0.92,
            }),
          },
        ],
      });

      const result = await extractIntent('Muéstrame las ventas de Gear esta semana', 'COO', 'Gear');

      expect(result.intention).toBe('listar_ventas');
      expect(result.parameters.division).toBe('Gear');
      expect(result.parameters.periodo).toBe('semana_actual');
      expect(result.confidence).toBe(0.92);
    });

    test('should extract top products intent', async () => {
      // Mock Claude response for top products
      anthropic.messages.create.mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              intention: 'top_productos',
              parameters: {
                division: 'Bebidas',
                periodo: 'mes_actual',
              },
              confidence: 0.88,
            }),
          },
        ],
      });

      const result = await extractIntent('¿Cuáles son los productos top de Bebidas?', 'CFO', 'Bebidas');

      expect(result.intention).toBe('top_productos');
      expect(result.parameters.division).toBe('Bebidas');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should throw error on invalid JSON response', async () => {
      // Mock Claude response with invalid JSON
      anthropic.messages.create.mockResolvedValue({
        content: [
          {
            text: 'This is not valid JSON',
          },
        ],
      });

      await expect(
        extractIntent('¿Cuál fue el margen?', 'CFO', 'Bebidas')
      ).rejects.toThrow('Failed to parse query');
    });

    test('should throw error on missing required fields', async () => {
      // Mock Claude response missing required fields
      anthropic.messages.create.mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              intention: 'calcular_margen',
              // missing parameters and confidence
            }),
          },
        ],
      });

      await expect(
        extractIntent('¿Cuál fue el margen?', 'CFO', 'Bebidas')
      ).rejects.toThrow('Failed to parse query');
    });

    test('should call Claude API with correct parameters', async () => {
      anthropic.messages.create.mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              intention: 'calcular_margen',
              parameters: { division: 'Bebidas', periodo: 'mes_actual' },
              confidence: 0.9,
            }),
          },
        ],
      });

      await extractIntent('¿Margen?', 'CFO', 'Bebidas');

      // Verify API call
      expect(anthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 256,
          system: expect.stringContaining('financial queries'),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('CFO'),
            }),
          ]),
        })
      );
    });
  });

  describe('generateResponse', () => {
    test('should generate conversational response for margen intent', async () => {
      // Mock Claude response for conversational answer
      anthropic.messages.create.mockResolvedValue({
        content: [
          {
            text: 'El margen de Bebidas este mes fue de 35%, un incremento del 2% respecto al mes anterior. Bien hecho! 📈',
          },
        ],
      });

      const response = await generateResponse('calcular_margen', {
        division: 'Bebidas',
        margen: 35,
        periodo: 'mes_actual',
      });

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(response).toContain('35');
    });

    test('should generate response for sales list intent', async () => {
      anthropic.messages.create.mockResolvedValue({
        content: [
          {
            text: 'Ventas de Gear esta semana: $45,000 totales. Los best-sellers son: Camiseta Pro (850 unidades) y Gorra Classic (420 unidades). 🎯',
          },
        ],
      });

      const response = await generateResponse('listar_ventas', {
        division: 'Gear',
        total: 45000,
        periodo: 'semana_actual',
      });

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    test('should throw error if response is empty', async () => {
      anthropic.messages.create.mockResolvedValue({
        content: [
          {
            text: '', // Empty response
          },
        ],
      });

      await expect(
        generateResponse('calcular_margen', { division: 'Bebidas', margen: 35 })
      ).rejects.toThrow('Failed to generate response');
    });

    test('should call Claude API with correct parameters', async () => {
      anthropic.messages.create.mockResolvedValue({
        content: [
          {
            text: 'Test response',
          },
        ],
      });

      await generateResponse('calcular_margen', { division: 'Bebidas', margen: 35 });

      expect(anthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 256,
          system: expect.stringContaining('friendly financial assistant'),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('calcular_margen'),
            }),
          ]),
        })
      );
    });

    test('should generate response with various data structures', async () => {
      anthropic.messages.create.mockResolvedValue({
        content: [
          {
            text: 'Flujo de caja disponible: $150,000. Recomendación: mantener reserva de 3 meses.',
          },
        ],
      });

      const response = await generateResponse('flujo_caja', {
        flujo: 150000,
        recomendacion: 'mantener_reserva',
      });

      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe('Integration scenarios', () => {
    test('should extract intent and generate response for complete flow', async () => {
      // First call: extract intent
      anthropic.messages.create.mockResolvedValueOnce({
        content: [
          {
            text: JSON.stringify({
              intention: 'calcular_margen',
              parameters: { division: 'Bebidas', periodo: 'mes_actual' },
              confidence: 0.95,
            }),
          },
        ],
      });

      // Second call: generate response
      anthropic.messages.create.mockResolvedValueOnce({
        content: [
          {
            text: 'El margen de Bebidas fue excelente este mes: 35%. 📊',
          },
        ],
      });

      // Execute intent extraction
      const intentResult = await extractIntent('¿Margen de Bebidas?', 'CFO', 'Bebidas');
      expect(intentResult.intention).toBe('calcular_margen');

      // Execute response generation
      const response = await generateResponse('calcular_margen', {
        division: 'Bebidas',
        margen: 35,
      });
      expect(response.length).toBeGreaterThan(0);
    });
  });
});
