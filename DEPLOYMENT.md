# Deployment Guide - Bot WhatsApp Financiero de Furia

Guía completa para desplegar el Bot WhatsApp Financiero en producción.

## Production Setup

### Requisitos del Sistema

- **Node.js**: v18.x o superior
- **npm**: v9.x o superior
- **Base de datos**: PostgreSQL 13+ (via Supabase)
- **Cuenta Twilio**: Pro o superior
- **Credenciales Anthropic**: API key activa

### Paso 1: Preparar Servidor

#### Opción A: Railway (Recomendado - $10-20/mes)

Railway es la opción más simple para comenzar.

1. Crea cuenta en https://railway.app
2. Conecta tu repositorio GitHub
3. Railway detecta automáticamente `package.json`
4. Configura variables de entorno en el dashboard:

```bash
NODE_ENV=production
PORT=3000
# (Copia todas las variables de .env.example)
TWILIO_ACCOUNT_SID=...
ANTHROPIC_API_KEY=...
# etc.
```

5. Railway automáticamente:
   - Instala dependencias (`npm install`)
   - Ejecuta `npm start`
   - Asigna dominio público (ej: `bot-furia-prod.railway.app`)
   - Proporciona HTTPS automático

#### Opción B: Vercel (Alternativa - Gratis hasta $0.50/GB)

1. Sube código a GitHub
2. Importa en https://vercel.com/new
3. Vercel detecta el proyecto Node.js
4. Agrega variables de entorno
5. Deploy automático en cada push

**Nota**: Vercel usa funciones serverless, necesitas ajustar `src/index.js` para Vercel:

```javascript
// src/index.js
const { app, startServer } = require('./index');

if (process.env.VERCEL) {
  // Para Vercel
  module.exports = app;
} else {
  // Para servidores tradicionales
  startServer();
}
```

#### Opción C: DigitalOcean App Platform ($15-20/mes)

1. Crea cuenta en https://digitalocean.com
2. Crea nuevo App
3. Selecciona tu repositorio GitHub
4. Configura:
   - **Build command**: `npm install && npm run setup:db`
   - **Run command**: `npm start`
   - **Port**: 3000

5. Agrega variables de entorno
6. Deploy

### Paso 2: Configurar Base de Datos Supabase

1. Accede a https://supabase.com
2. Crea nuevo proyecto
3. Obtén credenciales:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (incluye puerto 5432)

4. Ejecuta migraciones:
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db" npm run setup:db
```

### Paso 3: Configurar Twilio Webhook

1. Accede a Twilio Console: https://console.twilio.com
2. Ve a Messaging > Whatsapp > Senders
3. Selecciona tu número WhatsApp Business
4. En "Webhook URL", configura:
   ```
   https://tu-dominio.com/webhook
   ```
5. En "Webhook Secret", genera una clave fuerte y cópiala a `TWILIO_WEBHOOK_SECRET`
6. Selecciona **POST** como método
7. Guarda cambios

**Verificación**:
```bash
curl https://tu-dominio.com/health
# Deberías ver: {"status":"ok",...}
```

### Paso 4: Variables de Entorno Finales

Verifica que TODAS estas variables estén configuradas:

```bash
# Servidor
NODE_ENV=production
PORT=3000

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+12223334444
TWILIO_WHATSAPP_NUMBER=+12223334444
TWILIO_WEBHOOK_SECRET=webhook_secret_v1_strong_key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx

# Supabase
SUPABASE_PROJECT_ID=abcdefghijklmnopqrst
SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_QUERIES_PER_HOUR=30
RATE_LIMIT_WINDOW_MS=3600000

# Configuración
SUPPORTED_ROLES=CEO,CFO,COO,ERC
DIVISIONS=Bebidas,Gear,Reestructuración

# Reportes
DAILY_REPORT_HOUR=7
DAILY_REPORT_MINUTE=0
DAILY_REPORT_TIMEZONE=America/Caracas
DAILY_REPORT_EMAIL=irrael@me.com

# Seguridad
ENABLE_AUDIT_LOGGING=true
ENCRYPTION_KEY=generate_strong_key_32_chars_min
```

## Servicios Requeridos

### Twilio
- **Costo**: ~$0.0075 USD por mensaje WhatsApp
- **Plan mínimo**: Trial (mensajes de prueba, sin costo)
- **Plan producción**: Twilio Pro ($25-50/mes + costo por mensaje)
- **URL Console**: https://console.twilio.com
- **Documentación**: https://www.twilio.com/docs/whatsapp

### Anthropic Claude API
- **Modelo**: `claude-3-5-sonnet-20241022` (mejor costo-rendimiento)
- **Costo**: ~$3 por millón de input tokens, ~$15 por millón de output tokens
- **Estimado**: $20-50/mes para uso moderado
- **URL Console**: https://console.anthropic.com
- **Documentación**: https://docs.anthropic.com

### Supabase PostgreSQL
- **Plan Free**: 500MB, 5 conexiones simultáneas
- **Plan Pro**: $25/mes, 8GB, 100 conexiones
- **Plan producción**: Recomendado Pro o superior
- **URL Console**: https://app.supabase.com
- **Documentación**: https://supabase.com/docs

### Hosting (Railway recomendado)
- **Railway Pro**: $5/mes por contenedor
- **Vercel**: Gratis hasta $0.50/GB
- **DigitalOcean**: $15-20/mes por app
- **AWS EC2**: $5-10/mes con tier free (primer año)

## Estimado de Costos

### Escenario: Uso moderado (100 consultas/día, 5 reportes/día)

| Servicio | Costo/Mes | Notas |
|----------|-----------|-------|
| Twilio | $23 | 100 msg/día × 30 × $0.0075 |
| Claude API | $40 | ~5 consultas/día × 500 tokens promedio |
| Supabase Pro | $25 | Base de datos + storage |
| Railway | $10 | 1 contenedor, bajo uso |
| **TOTAL** | **~$98** | Puede variar según uso real |

### Presupuesto recomendado: $100-150/mes

## Escalado

### Si el uso crece a 1000 consultas/día:

- **Twilio**: $230/mes (10x más mensajes)
- **Claude**: $400/mes (10x más tokens)
- **Supabase**: Considerar $50-100/mes (más conexiones)
- **Railway**: $15-30/mes (más contenedores)
- **TOTAL**: $695-760/mes

**Optimizaciones**:
- Implementar caché de queries frecuentes
- Usar rate limiting más agresivo
- Batch processing de reportes
- Considerar modelo `claude-3-haiku` para queries simples

## Monitoreo en Producción

### 1. Health Checks Automáticos

Railway/Vercel tienen health checks incorporados.

Configurar en tu plataforma para monitorear:
```
GET https://tu-dominio.com/health
```

### 2. Logs Estructurados

Todos los logs se escriben en JSON para fácil análisis:

```bash
# Ver logs en tiempo real (Railway)
railway logs -f

# O en Vercel
vercel logs

# O en tu servidor
tail -f /var/log/furia-bot/combined.log
```

### 3. Métricas Críticas

Monitorea estos valores:

```
POST /webhook latency
  - Objetivo: <500ms
  - Alerta: >2000ms

Claude API response time
  - Objetivo: <3s
  - Alerta: >10s

Supabase query time
  - Objetivo: <500ms
  - Alerta: >2000ms

Error rate
  - Objetivo: <0.1%
  - Alerta: >1%
```

### 4. Alertas Recomendadas

Configura alertas en Railway/Vercel para:

- **Crash loop**: Reinicio frecuente del servicio
- **High error rate**: >100 errores/hora
- **High latency**: Respuestas >5s
- **Webhook failures**: >10 webhooks rechazados consecutivos
- **Database connection errors**: Conexión perdida a Supabase

### 5. Monitoring Stack (Opcional - Producción avanzada)

Para monitoreo avanzado, integra:

#### Sentry (Error tracking)
```bash
npm install @sentry/node

# En src/index.js
const Sentry = require("@sentry/node");
Sentry.init({ dsn: process.env.SENTRY_DSN });
app.use(Sentry.Handlers.requestHandler());
```

#### New Relic (APM)
```bash
npm install newrelic

# En src/index.js (primera línea)
require('newrelic');
```

#### DataDog (Observability)
Configura en Railway/Vercel para logs automáticos a DataDog.

### 6. Audit Logs

Todos los accesos se registran:

```sql
-- Consultar intentos de acceso últimas 24h
SELECT * FROM audit_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Consultas por usuario
SELECT user_id, COUNT(*) as queries, SUM(response_time_ms) as total_time
FROM audit_logs
WHERE action = 'query'
GROUP BY user_id
ORDER BY queries DESC;

-- Errores últimas 2 horas
SELECT * FROM audit_logs
WHERE level = 'error'
AND created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;
```

## Backup & Recuperación

### Backups Automáticos

Supabase realiza automáticamente:
- Backups diarios por 7 días (plan Free)
- Backups diarios por 30 días (plan Pro)

### Recuperar de Backup

```bash
# En Supabase console
# Settings > Backups > Restore from backup > Selecciona fecha

# O vía SQL
# pg_restore -U postgres -d postgres backup.sql
```

### Exportar Datos

```bash
# Exportar todos los audit logs
npx prisma db execute --stdin < export-audit.sql > audit-backup.sql

# Backup de base de datos completa
pg_dump postgresql://user:pass@db.supabase.co:5432/postgres > full-backup.sql
```

## Seguridad en Producción

### 1. Protección de API

- ✅ Validación de webhook Twilio obligatoria
- ✅ Rate limiting: 30 consultas/hora/usuario
- ✅ HTTPS obligatorio (proporcionado por Railway/Vercel)
- ✅ CORS restringido

### 2. Variables de Entorno

NUNCA hagas push de `.env` a git:

```bash
# .gitignore
.env
.env.local
.env.*.local
```

Usa secrets de tu plataforma:
- Railway: Environment variables tab
- Vercel: Settings > Environment Variables
- DigitalOcean: App Spec > Variables

### 3. Autenticación por Rol

Verificación en cada consulta:
- Usuario debe estar registrado en Supabase
- Rol debe estar en `SUPPORTED_ROLES`
- División debe estar en `DIVISIONS`

### 4. Auditoría Completa

Cada acción se registra:
- Quién: phone number del usuario
- Qué: consulta exacta + respuesta
- Cuándo: timestamp exacto
- Resultado: éxito/error + detalles

## Rollback & Rollforward

### Rollback (Volver a versión anterior)

```bash
# Railway
railway up                    # Ver versiones
railway deploy <commit-hash>  # Desplegar versión anterior

# Vercel
vercel rollback               # Interfaz interactiva
vercel env pull               # Restaurar vars de entorno
```

### Rollforward (Avanzar de versión)

```bash
# Asegúrate de que el código esté en main
git push origin main

# Railway auto-deploya en 1-2 minutos
# Vercel auto-deploya en 1-2 minutos
```

### Migraciones de Base de Datos

```bash
# Antes de desplegar nueva versión
git pull origin main
npm run setup:db              # Ejecuta migraciones Prisma

# Si hay error de migración
npx prisma migrate resolve --rolled-back migration_name
npx prisma migrate deploy     # Reintentar
```

## CI/CD Pipeline (GitHub Actions)

Crear archivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run tests
      run: npm test
    
    - name: Deploy to Railway
      uses: railway-app/github-action@v1
      with:
        token: ${{ secrets.RAILWAY_TOKEN }}
        service: furia-bot-whatsapp
        
    - name: Notify Slack
      uses: slackapi/slack-github-action@v1
      with:
        payload: |
          {
            "text": "✅ Bot deployed to production successfully"
          }
```

## Troubleshooting

### El servidor no inicia
```bash
# Ver logs
railway logs -f                    # Railway
vercel logs                        # Vercel

# Verificar variables de entorno
echo $ANTHROPIC_API_KEY           # Debe estar presente

# Reintento manual
npm run setup:db                  # Reinicia BD
npm start
```

### Webhook no recibe mensajes
1. Verifica URL en Twilio Console
2. Asegúrate que sea HTTPS
3. Verifica `TWILIO_WEBHOOK_SECRET`
4. Revisa logs de Twilio

### Rate limiting muy agresivo
```bash
# En .env, aumenta limit
RATE_LIMIT_QUERIES_PER_HOUR=60    # de 30 a 60
# Redeploy automático en Railway/Vercel
```

### Errores de base de datos
```bash
# Verifica conexión
psql $DATABASE_URL -c "SELECT 1"  # Debe retornar 1

# Revisa migraciones
npx prisma migrate status

# Reintenta migración
npm run setup:db
```

## Support & Escalation

| Problema | Contacto | Urgencia |
|----------|----------|----------|
| Bot no responde | Israel Gómez | CRÍTICA |
| Mensajes no llegan | Dargelis (en Slack) | ALTA |
| Reportes fallando | Revisar logs de Cloud | MEDIA |
| Preguntas generales | Documentación + Slack | BAJA |

---

**Última actualización**: 2026-08-14
**Versión**: 1.0.0
