# Blockinfo Post

`blockinfo post` is an internal tool that can run locally or from a deployed environment such as Vercel. It can render in two modes:

- `openai`
  - render a prompt template with `{{column_name}}` placeholders
  - load the active blockinfo template asset
  - send both into OpenAI image editing
- `deterministic`
  - load a repo-local background template
  - compute 1d / 7d / 30d deltas from `public.zebra_stats`
  - draw text directly onto the template using a checked-in JSON layout

Both modes then reuse the same downstream flow:

- save the generated image locally
- upload the file to Supabase Storage
- post the image to Telegram, X, or both

Routes:

- manual UI: `/internal/blockinfo-post`
- API/cron worker: `/api/blockinfo-post`
- deterministic background preview: `/api/blockinfo-post/background`

## Deployment Notes

For Vercel deployment:

- keep deterministic layout and caption-policy JSON checked into git
- do not rely on hosted layout/policy save actions for persistence
- use repo-relative paths for checked-in assets
- use a temp output directory such as `/tmp/blockinfo-post`

Recommended Vercel values:

```text
BLOCKINFO_POST_TEMPLATE_PATH=templates/blockinfo-post/sample-prompt.txt
BLOCKINFO_POST_OUTPUT_DIR=/tmp/blockinfo-post
```

Deterministic mode does not need these overrides unless you have a special reason:

- `BLOCKINFO_POST_DETERMINISTIC_BACKGROUND_PATH`
- `BLOCKINFO_POST_DETERMINISTIC_LAYOUT_PATH`
- `BLOCKINFO_POST_DETERMINISTIC_CAPTION_POLICY_PATH`

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BLOCKINFO_POST_TEMPLATE_PATH`
- `BLOCKINFO_POST_OUTPUT_DIR`
- `BLOCKINFO_POST_STORAGE_BUCKET`
- `BLOCKINFO_POST_STORAGE_PREFIX`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `X_API_KEY`
- `X_API_SECRET`
- `X_ACCESS_TOKEN`
- `X_ACCESS_TOKEN_SECRET`

OpenAI mode also requires:

- `OPENAI_API_KEY`
- `BLOCKINFO_POST_OPENAI_MODEL`

`CRON_SECRET` is required if you want bearer protection on `/api/blockinfo-post`.

## Optional Environment Variables

Deterministic mode uses repo defaults if these are omitted:

- `BLOCKINFO_POST_DETERMINISTIC_BACKGROUND_PATH`
  - default: the active template variant image
- `BLOCKINFO_POST_DETERMINISTIC_TEMPLATE_VARIANT`
  - default: `light`
  - allowed: `original`, `light`
  - `light` uses `templates/blockinfo-post/template-image-light.png` with black text and blue grid lines. A direct `BLOCKINFO_POST_DETERMINISTIC_BACKGROUND_PATH` override still takes precedence for renderer jobs.
- `BLOCKINFO_POST_DETERMINISTIC_LAYOUT_PATH`
  - default: `templates/blockinfo-post/layout.deterministic.json`

OpenAI-specific optional knobs:

- `BLOCKINFO_POST_OUTPUT_FORMAT`
  - default: `png`
  - allowed: `png`, `jpeg`, `webp`
- `BLOCKINFO_POST_OPENAI_SIZE`
  - default: `1024x1024`
  - allowed: `auto`, `1024x1024`, `1536x1024`, `1024x1536`
- `BLOCKINFO_POST_OPENAI_QUALITY`
  - default: `high`
  - allowed: `low`, `medium`, `high`, `auto`
- `BLOCKINFO_POST_OPENAI_BACKGROUND`
  - default: `auto`
  - allowed: `transparent`, `opaque`, `auto`
- `BLOCKINFO_POST_OPENAI_INPUT_FIDELITY`
  - default: `high`
  - allowed: `high`, `low`

## Template Contract

`BLOCKINFO_POST_TEMPLATE_PATH` points to a plain text prompt template.

Supported placeholders include:

- any top-level column from the latest `public.zebra_stats` row, for example `{{height}}`, `{{measured_at}}`, `{{best_block_hash}}`
- derived tokens:
  - `{{row_json}}`
  - `{{row_json_pretty}}`
  - `{{generated_at_iso}}`
  - `{{order_field}}`
  - `{{image_template_path}}`

If any placeholder is unresolved, the run fails fast.

## Deterministic Renderer

### Template Preview And Approval

The original lime/dark template is the default for deterministic and OpenAI blockinfo posts. Open `/internal/blockinfo-post`, then use **Preview template** to compare it with the light black/ivory composition using the same current `zebra_stats` data. **Download PNG** exports the selected preview without sending a post.

The selector is preview-only. Use the light template only as an opt-in override by explicitly setting:

```text
BLOCKINFO_POST_DETERMINISTIC_TEMPLATE_VARIANT=light
```

Keep `BLOCKINFO_POST_DETERMINISTIC_BACKGROUND_PATH` unset so all render modes use the original default.

The deterministic renderer:

- uses the latest `public.zebra_stats` row
- computes deltas for:
  - `height`
  - `verification_progress`
  - `chain_size_bytes`
  - `difficulty`
  - `transparent`
  - `sprout`
  - `sapling`
  - `orchard`
  - `lockbox`
  - `total_shielded`
- omits `headers` because it duplicates block progress
- compares against the newest row where `measured_at <= target_time` for:
  - `1d`
  - `7d`
  - `30d`
- renders absolute and percent change with stable formatting

The checked-in layout JSON is:

- `templates/blockinfo-post/layout.deterministic.json`

Use `/internal/blockinfo-post` to tune layout fields and lock the JSON in when running locally. In hosted environments with ephemeral filesystems, treat the hosted editor as preview-only and commit JSON changes from your local checkout.

## Destinations

Manual and scheduled runs support:

- `telegram`
- `x`
- `both`

The post text still reuses the rendered prompt, collapsed into one line and truncated deterministically to fit X.

## Scheduling

`vercel.json` runs `/api/blockinfo-post` every 5 minutes as a heartbeat.

Schedule state is stored in Supabase and managed from `/internal/blockinfo-post`. Apply:

```text
sql/2026-06-28-blockinfo-post-schedule.sql
sql/2026-06-28-blockinfo-post-render-mode.sql
sql/2026-06-30-blockinfo-post-daily-schedule.sql
```

The saved schedule controls:

- enabled / disabled
- destination default
- render mode default
- schedule mode: interval or daily time
- interval in whole hours
- daily hour / minute / timezone

If `CRON_SECRET` is set, send:

```text
Authorization: Bearer <CRON_SECRET>
```

## Smoke Tests

With the app running locally:

```powershell
pnpm typecheck
pnpm blockinfo-post:dry-run
pnpm blockinfo-post:run
powershell -ExecutionPolicy Bypass -File scripts/run-blockinfo-post.ps1 -DryRun -Destination both -RenderMode deterministic
```

Direct API calls:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/blockinfo-post?dryRun=1&destination=telegram&renderMode=deterministic"
```

If `CRON_SECRET` is set:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/blockinfo-post?destination=both&renderMode=openai" -Headers @{ Authorization = "Bearer $env:CRON_SECRET" }
```

## Notes

- Latest-row ordering still prefers `height`, then `measured_at`, then `measured_date`.
- Scheduled runs generate one image and reuse it for both destinations when destination is `both`.
- Deterministic preview uses the current checked-in layout file and current `zebra_stats` data.
