# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

**HWOM Studio** (a.k.a. **HumanSoft Atlas — Performance Intelligence**) is a
single-page web application for hospitality/operations performance management.
It lets a business owner upload operational data (Excel/CSV), map it to a
canonical data model, configure AI "agents", and drive a suite of dashboards
covering KPIs, OKRs, quality audits (ISO), work plans, and a strategic
intelligence layer. The UI language is **Turkish**.

There is no build system, no package manager, and no framework. The app is
hand-written HTML + inline CSS + vanilla JavaScript in a single large file, plus
one serverless function that proxies the Anthropic API.

## Repository layout

```
index.html            # The application (current version). ~4600 lines, self-contained.
hwom_studio_v3.html   # Earlier standalone prototype ("v2.0"). Reference only — NOT the live app.
api/chat.js           # Vercel serverless function: CORS-enabled proxy to api.anthropic.com.
```

There is no `package.json`, `vercel.json`, lockfile, README, or test suite.
Deployment is Vercel-style: static files served at the root, `api/chat.js`
exposed at `/api/chat`.

### `index.html` vs `hwom_studio_v3.html`

`index.html` is the one to edit unless told otherwise. Key differences:

| | `index.html` (live) | `hwom_studio_v3.html` (old) |
|---|---|---|
| Modules | M05–M13 (9 modules) | M05–M09 only |
| AI calls | via `/api/chat` proxy | direct to `api.anthropic.com` (exposes key — deprecated) |
| Backend | Supabase (live data) | none (in-memory demo only) |

When asked to change "the app", default to `index.html`. Only touch
`hwom_studio_v3.html` if the user explicitly names it.

## Architecture of `index.html`

The whole app is one file with two `<script>` blocks (top and bottom) wrapping
the HTML body. There is no module bundling — everything shares one global scope.

### Screens / navigation

The UI is a 14-step tab bar (`tab0`–`tab13`) across the top. Each tab maps to a
`<div class="screen" id="sN">`. Navigation is `goTo(n)` (defined ~line 627),
which toggles the `.active` class on `s0`–`s13` and lazy-initializes the target
screen via an `init*()` call:

| Step | Screen id | Module | Init fn | Purpose |
|------|-----------|--------|---------|---------|
| 0 | s0 | — | — | Splash / home |
| 1 | s1 | — | `initS1` | Veri Yükle (data upload + column mapping) |
| 2 | s2 | — | `addDefaultFlow`/`renderAll2` | Ajan Akışı (agent flow canvas) |
| 3 | s3 | — | `renderTmpl` | Sektör (sector template picker) |
| 4 | s4 | — | `autoGenDB` | Dashboard (auto-generated) |
| 5 | s5 | M05 | `initAF` | Agent Factory |
| 6 | s6 | M06 | `initAT` | Agent Training |
| 7 | s7 | M07 | `initDF` | Dashboard Factory |
| 8 | s8 | M08 | `initOKR` | OKR & QX Tracker |
| 9 | s9 | M09 | `initRE` | Report Engine |
| 10 | s10 | M10 | `initQualityOS` | Quality OS (ISO audits, CAPA) |
| 11 | s11 | M11 | `initIsPlani` | İş Planı Takip (work-plan tracking) |
| 12 | s12 | M12 | `initKPITakip` | KPI Canlı Takip (live KPI) |
| 13 | s13 | M13 | `initATLAS` | ATLAS SIA (BSC × OKR × X-Layer) |

Module sections are demarcated by `// ═══ M0X ... ═══` comment banners in the
JS and `<!-- ═══ M0X ... ═══ -->` in the HTML — grep these to jump around.

### Startup

The bottom IIFE `başlat()` runs on load: `init()` (wires S1/S2/S4 + clocks),
then `await isletmeYukle()` loads the active business from Supabase and hydrates
in-memory state (`AKTIF_ISLETME`, `AKTIF_QX`, `AKTIF_OKRLER`, `QX_LAYERS`,
`OKR_DATA`).

### Global state (module-scoped `let`s)

State lives in top-level globals, not a store. Notable ones:
`currentScreen`, `currentSectorTmpl`, `uploadData`, `colMappings`, `genFields`,
`nodes`/`connections`/`selNode` (flow canvas), `AKTIF_ISLETME`,
`AKTIF_DEPARTMANLAR`, `AKTIF_QX`, `AKTIF_OKRLER`. Demo data sits in const arrays
(`OKR_DATA`, `QX_LAYERS`, `SAMPLES`, `HT`, `SECTORS`, etc.) that may be partly
overwritten by live Supabase data at startup.

## Backend & data

### Supabase

Configured inline near the top of `index.html`:

```js
const SUPA_URL = 'https://cqdveiigszgabzmiwvaf.supabase.co';
const SUPA_KEY = 'sb_publishable_...';   // publishable (anon) key — client-side by design
const supa = supabase.createClient(SUPA_URL, SUPA_KEY);
```

All DB access goes through four thin helpers (CDM = "common data model"):
`dbGet(table, filters={})`, `dbInsert(table, row)`, `dbUpdate(table, id, updates)`,
`dbDelete(table, id)`. They swallow errors (log + return `[]`/`null`/`false`).

Tables in use:
`isletme` (business), `departman`, `qx_skor`, `okr`, `kpi_tanim`,
`kpi_gerceklesen`, `denetim` (audit), `bulgu` (finding), `capa`
(corrective/preventive action), `iso_uyum` (ISO compliance), `is_plani`
(work plan).

### AI / Anthropic

The single AI entry point is `POST /api/chat` (the "tek beyin" / single brain).
`api/chat.js` injects `ANTHROPIC_API_KEY` from env and forwards the JSON body
verbatim to `https://api.anthropic.com/v1/messages`. The client passes the model
and messages:

```js
fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000,
    messages:[{role:'user', content:prompt}] }) })
```

Notes for changes here:
- The proxy keeps the API key server-side — never reintroduce a direct
  `api.anthropic.com` call from the browser (that was the v3 mistake).
- Several callers degrade gracefully to a deterministic template when the live
  call fails (look for `_fallback`); preserve that pattern.
- `anthropic-version` is pinned to `2023-06-01` in the proxy.

## Domain concepts

- **QX (Quality Experience)** — a weighted composite score over four
  "X-Layers": **CX** (guest/Misafir), **EX** (employee/Çalışan), **OX**
  (operational), **BX** (brand). Weights live in `QX_LAYERS[].agirlik`;
  `calcQX()` computes `Σ(skor × agirlik/100)`.
- **OKR** — Objectives + Key Results, each tied to a QX layer (`qxLayer`).
  Progress via `krProgress(kr)`. Turkish field names: `baslangic` (start),
  `hedef` (target), `gercek` (actual — note the recurring typo `gercak` that the
  code defensively reads with `kr.gercek||kr.gercak`).
- **HWOM types (`HT`)** — the canonical column taxonomy data is mapped to:
  `work_center`, `position`, `shift`, `date`, `kpi`, `status`, `risk`,
  `department`, `cost`, `text`, `ignore`. `autoMap()` + `MAP_RULES` guess a type
  from the Turkish/English header text.
- **Quality OS** — ISO audits (`denetim`) → findings (`bulgu`) → CAPA actions
  (`capa`), plus a live ISO compliance matrix (`iso_uyum`).
- **ATLAS SIA (M13)** — strategic alignment layer fusing BSC × OKR × X-Layers,
  with freshness/governance constants (`ATLAS_VTAM`, `ATLAS_STAVAN`, `ATLAS_TZ`).

### Governance principle (load-bearing)

A recurring product invariant, stated in the UI as **"AI önerir · insan
onaylar"** ("AI proposes, a human approves — this gate cannot be skipped").
There is also a **"gerçek ≠ vitrin"** ("real vs. showcase") distinction —
live Supabase-backed numbers are kept visually/semantically separate from
demo/template content. Respect both when adding AI-driven features: surface
proposals for human confirmation, and clearly mark fallback/demo output.

## Conventions

- **Language:** UI strings, comments, variable names, and DB columns are
  predominantly **Turkish**. Match the surrounding style; don't translate
  existing strings unless asked.
- **No framework / no build:** plain DOM APIs, template-literal HTML assembled
  into `innerHTML`, inline `onclick=` handlers, inline `style=`. New code should
  follow this idiom rather than introducing a framework, bundler, or `.js`
  modules.
- **Styling:** CSS custom properties in `:root` (e.g. `--bg`, `--ac`/`--ac2`
  accent, `--gn`/`--rd`/`--gold` status colors). Reuse these tokens.
- **Section banners:** keep the `═══` comment banners; they are the primary way
  to navigate this large file.
- **Notifications:** use `N('mesaj')` for transient toast messages (auto-hides
  after ~2.8s).
- **DB safety:** the `db*` helpers never throw — check for `null`/`[]` returns.
- **Secrets:** the Supabase publishable key is intentionally client-side; the
  Anthropic key must stay server-side in `api/chat.js`. Do not commit a real
  `ANTHROPIC_API_KEY` value.

## Running / testing

There is no test suite, linter, or dev server config in the repo. To exercise
the app locally you need the `/api/chat` function and the env var:

```sh
# Requires the Vercel CLI; serves index.html + the api/ function together.
ANTHROPIC_API_KEY=sk-ant-... vercel dev
```

Opening `index.html` directly as a `file://` works for most UI, but AI calls
(`/api/chat`) and same-origin behavior will fail without a server. Supabase
calls go to the live project and work from any origin (CORS-open anon key).

## Git workflow

- Active development branch for current work: `claude/claude-md-docs-w3ibw1`.
- Commit with clear messages; push with `git push -u origin <branch>`.
- Do **not** open a pull request unless explicitly asked.
- History shows the repo is largely "Add files via upload" snapshots of the big
  HTML files plus small refactors — expect large single-file diffs.
