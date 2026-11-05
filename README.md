# Vlipa

A generative media platform in the spirit of fal.ai: browse image and video models, run them in a playground, call them from code with API keys, or let an AI agent pick models and write prompts for you.

- **Models**: RunPod public endpoints (FLUX, Qwen Image, Seedream, Nano Banana, Z-Image, Pruna, Seedance, Veo, Hailuo, Vidu, Kling, Wan …) — see `lib/catalog.ts`
- **Agent LLMs**: Claude Opus 5.5 and GPT-6.1 Sol through OpenRouter (`lib/agent.ts`)
- **Auth**: Clerk (Google sign-in)
- **Data**: Supabase — generations, credits, hashed API keys (`supabase/migrations`)
- **Hosting**: Vercel (optional Vercel Blob for uploads and persisting outputs)

## Pages

| Route | What |
|---|---|
| `/` | Hero agent prompt, dashboard (credits, 7-day requests/errors), getting started, latest models |
| `/explore` | Search + filter models by type and lab |
| `/models/<lab>/<model>` | Playground (schema-driven form, result, history) and API tab with cURL / JS |
| `/agent` | Chat with the Vlipa Agent (Opus 5.5 / GPT-6.1 Sol, effort, approval mode) |
| `/assets` | Everything you generated |
| `/keys` | Create / revoke API keys |
| `/usage` | Credit balance and per-request costs |
| `/docs` | API quickstart |

## API

```bash
curl -X POST $SWELT/api/run -H "Authorization: Key $SWELT_KEY" -H "Content-Type: application/json" \
  -d '{"model":"black-forest-labs/flux-1-schnell","input":{"prompt":"a lemon cheesecake, watercolor"}}'
curl $SWELT/api/requests/<request_id> -H "Authorization: Key $SWELT_KEY"
```

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in.
3. Apply `supabase/migrations/0001_init.sql`, then set the server secret hash:
   `insert into private.app_config (id, secret_sha256) values (1, encode(extensions.digest('<SWELT_DB_SECRET>', 'sha256'), 'hex'));`
4. `npm run dev`

### How the database is secured

Tables have RLS on with no policies, so the public anon key can't read them. All access goes through `swelt_*` `SECURITY DEFINER` functions that check `SWELT_DB_SECRET`, which only the Next.js server knows.

### RunPod endpoint IDs

Each model lists candidate RunPod endpoint IDs; the first one RunPod accepts is used and cached. If RunPod renames an endpoint, set `RUNPOD_ENDPOINT_OVERRIDES='{"<model id>":"<endpoint id>"}'` without redeploying code. `GET /api/admin/probe?token=$ADMIN_TOKEN` checks every candidate.

### Credits

New users get `FREE_CREDITS` (USD). Each completed run is charged RunPod's reported `cost` (or the catalog estimate). Emails in `ADMIN_EMAILS` are unlimited.
