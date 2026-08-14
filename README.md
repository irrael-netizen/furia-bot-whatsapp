# Bot WhatsApp Financiero de Furia

Un bot inteligente de WhatsApp que permite al equipo directivo de Furia hacer consultas financieras en lenguaje natural y recibir reportes automáticos.

## Descripción

El **Bot WhatsApp Financiero de Furia** es una solución de inteligencia financiera automatizada que integra:

- **Consultas en lenguaje natural**: El CEO, CFO, COO y ERC pueden preguntar sobre métricas financieras sin conocer SQL
- **Inteligencia con Claude AI**: Análisis inteligente de datos financieros
- **Reportes diarios automáticos**: Informes configurables por división y rol
- **Seguridad empresarial**: Autenticación por rol, rate limiting, auditoría completa
- **Integración Twilio**: WhatsApp directo sin apps adicionales

## Características

- **🤖 Procesamiento de lenguaje natural**: Convierte preguntas en SQL automáticamente
- **📊 Reportes inteligentes**: Resúmenes diarios personalizados por rol
- **📈 Análisis de datos**: Acceso a métricas de bebidas, gear y reestructuración
- **🔐 Control de acceso**: Autenticación y autorización por rol
- **📝 Auditoría completa**: Registro de todas las consultas y cambios
- **⏱️ Rate limiting**: Protección contra abuso de API

## Setup

### Paso 1: Instalación de dependencias
```bash
npm install
```

### Paso 2: Configurar variables de entorno
Copia el archivo `.env.example` a `.env` y completa los valores:
```bash
cp .env.example .env
```

Variables requeridas:
- `TWILIO_ACCOUNT_SID`: SID de tu cuenta Twilio
- `TWILIO_AUTH_TOKEN`: Token de autenticación
- `TWILIO_PHONE_NUMBER`: Número de teléfono Twilio
- `TWILIO_WHATSAPP_NUMBER`: Número WhatsApp Business
- `ANTHROPIC_API_KEY`: API key de Anthropic/Claude
- `SUPABASE_URL`: URL del proyecto Supabase
- `SUPABASE_ANON_KEY`: Clave anónima Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de rol de servicio

### Paso 3: Configurar base de datos
```bash
npm run setup:db
```

Esto ejecuta las migraciones de Prisma y prepara la base de datos.

### Paso 4: Iniciar el bot
```bash
# Desarrollo (con hot-reload)
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

## Uso

### Ejemplos de consultas

#### CEO - Consultas de ingresos
```
¿Cuál fue el revenue total del mes pasado?
Muéstrame las ventas por división en los últimos 30 días
¿Cuál es el CAGR de bebidas?
```

#### CFO - Análisis financiero
```
¿Cuáles son los costos operacionales por área?
Necesito un desglose de márgenes por producto
¿Cuál es el estado de la tesorería?
```

#### COO - Métricas operacionales
```
¿Qué división está más cerca del target?
Muéstrame los KPIs de este trimestre
¿Cómo va el proyecto de reestructuración?
```

#### ERC - Información estratégica
```
¿Qué oportunidades tenemos en el mercado?
Análisis de la competencia en bebidas
Proyección de crecimiento para el próximo año
```

### Responder al bot
El bot responde en WhatsApp con:
1. **Contexto**: Explica qué entiendió
2. **Datos**: Presenta los números solicitados
3. **Análisis**: Interpretación de la información
4. **Acción**: Recomendaciones o próximos pasos

## API

### POST /webhook
Endpoint que recibe mensajes de Twilio. Twilio debe configurar este webhook en:
```
https://{tu-dominio}/webhook
```

**Headers requeridos:**
```
Authorization: Bearer {TWILIO_WEBHOOK_SECRET}
```

**Payload (ejemplo):**
```json
{
  "From": "whatsapp:+584241234567",
  "Body": "¿Cuál fue el revenue del mes pasado?",
  "MessageSid": "SM1234567890abcdef"
}
```

### GET /health
Verifica que el bot esté en línea:
```
GET /health

Respuesta:
{
  "status": "ok",
  "timestamp": "2026-08-14T14:30:00Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0"
}
```

### GET /
Información del bot:
```
GET /

Respuesta:
{
  "name": "Furia Bot WhatsApp",
  "description": "Financial intelligence bot for WhatsApp messaging",
  "version": "1.0.0",
  "status": "running"
}
```

## Testing

### Ejecutar todos los tests
```bash
npm test
```

### Con cobertura
```bash
npm test -- --coverage
```

### Watch mode (reinicia al cambiar archivos)
```bash
npm test -- --watch
```

### Tests específicos
```bash
npm test -- tests/unit/claude.test.js
npm test -- tests/integration/webhook.test.js
```

## Estructura del Proyecto

```
furia-bot-whatsapp/
├── src/
│   ├── index.js                  # Punto de entrada Express
│   ├── config.js                 # Carga de configuración
│   ├── logger.js                 # Sistema de logging
│   ├── middleware/
│   │   └── auth.js               # Validación de webhooks
│   ├── whatsapp/
│   │   ├── webhook.js            # Manejador de webhooks
│   │   ├── sender.js             # Envío de mensajes
│   │   └── signature.js          # Validación de firma Twilio
│   ├── claude/
│   │   ├── client.js             # Cliente de API Anthropic
│   │   └── nlu.js                # Extracción de intención
│   ├── supabase/
│   │   ├── client.js             # Cliente Supabase
│   │   ├── auth.js               # Autenticación de usuarios
│   │   ├── queries.js            # Queries financieras
│   │   └── audit.js              # Registro de auditoría
│   ├── scheduler/
│   │   └── reporter.js           # Reportes diarios automáticos
│   └── utils/
│       ├── formatter.js          # Formatos de respuesta
│       └── rateLimit.js          # Control de rate limiting
├── prisma/
│   ├── schema.prisma             # Modelo de base de datos
│   └── migrations/               # Migraciones SQL
├── tests/
│   ├── unit/                     # Tests unitarios
│   ├── integration/              # Tests de integración
│   └── fixtures/                 # Datos de prueba
├── scripts/
│   └── seed-users.js             # Script para cargar usuarios
├── .env.example                  # Variables de entorno
├── jest.config.js                # Configuración Jest
└── package.json
```

## Variables de Entorno Detalladas

```bash
# Servidor
NODE_ENV=production                           # development | production | test
PORT=3000

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890
TWILIO_WEBHOOK_SECRET=webhook_secret_key

# Anthropic/Claude
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxx

# Supabase
SUPABASE_PROJECT_ID=abcdefghijklmnop
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxxxx
DATABASE_URL=postgresql://user:password@host/db

# Logging
LOG_LEVEL=info                                # debug | info | warn | error
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_QUERIES_PER_HOUR=30
RATE_LIMIT_WINDOW_MS=3600000

# Roles y Divisiones
SUPPORTED_ROLES=CEO,CFO,COO,ERC
DIVISIONS=Bebidas,Gear,Reestructuración

# Reportes Diarios
DAILY_REPORT_HOUR=7
DAILY_REPORT_MINUTE=0
DAILY_REPORT_TIMEZONE=America/Caracas
DAILY_REPORT_EMAIL=irrael@me.com

# Seguridad
ENABLE_AUDIT_LOGGING=true
ENCRYPTION_KEY=your_encryption_key_here
```

## Monitoreo

El bot incluye logging estructurado que captura:

- **Webhook logs**: Cada mensaje entrante y saliente
- **Tiempos de respuesta**: Latencia de Claude API
- **Rate limiting**: Usuarios limitados y intentos bloqueados
- **Audit logs**: Todas las consultas y resultados

Visualiza los logs:
```bash
# Última hora
tail -f logs/combined.log

# Solo errores
grep ERROR logs/combined.log

# Por usuario (phone number)
grep "+584241234567" logs/combined.log
```

## Solución de problemas

### El webhook no recibe mensajes
1. Verifica que Twilio esté configurado con la URL correcta
2. Verifica `TWILIO_WEBHOOK_SECRET` en .env coincida en Twilio
3. Revisa los logs de webhook fallidos en Twilio Console

### Rate limiting activo
- Usuarios pueden hacer máximo 30 consultas por hora
- Cambia `RATE_LIMIT_QUERIES_PER_HOUR` en .env

### Errores de base de datos
```bash
# Reinicia migraciones
npm run setup:db

# Verifica conexión Supabase
npx prisma db execute --stdin < sanity-check.sql
```

## Contribuir

1. Crea una rama: `git checkout -b feature/mi-feature`
2. Haz commit: `git commit -m "feat: descripción"`
3. Push: `git push origin feature/mi-feature`
4. Crea un Pull Request

## Licencia

ISC - © 2026 Furia Holdings

## Soporte

Para soporte técnico, contacta a:
- **Israel Gómez**: irrael@me.com
- **Dargelis**: (asistente ejecutiva)
- **Slack**: #furia-bot-whatsapp
