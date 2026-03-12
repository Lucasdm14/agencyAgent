# AutoCM — Agency Copilot v1

> Herramienta interna para agencias de marketing digital. Automatiza la creación y calendarización de posteos en redes sociales con triple control anti-alucinación.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (PostgreSQL + Storage)
- **Claude 3.5 Sonnet** (`@anthropic-ai/sdk`) — reemplaza OpenAI en v0
- **Webhooks** → Zapier/Make para publicación automática

## Regla de Oro

> La IA **nunca** publica directamente. Todo contenido pasa por el botón "Aprobar" del PM.

## Triple control anti-alucinación

1. **Brandbook estructurado (JSONB)**: reglas explícitas de tono, emojis, hashtags y contenido por cliente
2. **Supervisor IA** (Claude, temperatura 0.2): audita el copy generado cláusula por cláusula
3. **Dashboard PM**: el PM ve el score, las cláusulas violadas y el rationale antes de aprobar

## Setup local

```bash
# 1. Clonar e instalar
git clone <repo>
cd autocm
pnpm install

# 2. Variables de entorno
cp .env.example .env.local
# Completar ANTHROPIC_API_KEY, Supabase keys

# 3. Migraciones Supabase (en orden)
# Ejecutar en Supabase Dashboard → SQL Editor:
# scripts/001_create_tables.sql
# scripts/002_enable_rls.sql
# scripts/003_profile_trigger.sql
# scripts/005_update_content_table.sql
# scripts/006_v1_migration.sql  ← NEW: posts table + brandbook_rules

# 4. Crear bucket en Supabase Storage: "posts" (privado está bien)

# 5. Levantar dev
pnpm dev
```

## Deploy en Vercel

1. Push a GitHub
2. Importar repo en [vercel.com](https://vercel.com)
3. Agregar variables de entorno en Settings → Environment Variables
4. El deploy es automático en cada push a `main`

## Flujo principal

```
PM sube imagen
  → /api/upload → Supabase Storage (retorna storage_path)
  → /api/generate-post
      → Claude Creator (vision, temp 0.8) → proposed_copy + rationale
      → Claude Supervisor (temp 0.2)      → clause_validations + score
      → Guarda Post con status: pm_review
  → Dashboard /inbox → PM edita/aprueba
  → /api/approve-post
      → Guarda final_copy + scheduled_date
      → POST webhook → brands.webhook_url
      → Status: webhook_sent
```

## Estructura de carpetas nueva (v1)

```
app/
  (dashboard)/dashboard/
    inbox/          ← NEW: bandeja de aprobación PM
    brands/         ← UPDATED: brandbook JSON editor + webhook
    generate/       ← subir imágenes + trigger generación
    calendar/       ← vista mensual
api/
  generate-post/    ← NEW: Claude Creator + Supervisor
  approve-post/     ← NEW: aprobación + webhook dispatch
  upload/           ← UPDATED: Supabase Storage
lib/
  anthropic.ts      ← NEW: reemplaza openai.ts
  prompts/
    creator.ts      ← NEW
    supervisor.ts   ← NEW
scripts/
  006_v1_migration.sql  ← NEW: posts table + brandbook_rules en brands
```

## Cambios respecto al v0

| Qué | v0 | v1 |
|-----|----|----|
| Motor IA | OpenAI GPT-4o-mini | Claude 3.5 Sonnet (Anthropic) |
| Brandbook | Campo texto libre | JSONB estructurado con reglas explícitas |
| Validación IA | Score 1-10 global | Validación por cláusula individual |
| Webhook | No implementado | `approve-post` dispara POST automático |
| Historial ediciones | Sin trazabilidad | `post_edit_log` registra cada cambio |
| Imágenes | URL externa (puede ser privada) | Signed URL server-side (siempre accesible) |
| Status FSM | 2 estados | 7 estados con transiciones estrictas |
