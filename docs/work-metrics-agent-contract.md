# Work Metrics — External Agent Contract

How a detached Claude CLI (or any script) writes weekly work metrics into Daily Work.

Everything here is one endpoint: **`PUT /api/work-metrics/entries`**. It is an idempotent
upsert keyed on `(weekOf, title)` — safe to re-run as many times as you like.

## Base URL

The API runs under Aspire; the port is in the Aspire dashboard. Locally it is typically:

```
http://localhost:5224
```

There is **no authentication** — this is a single-user, local-first tool and the API is
intentionally open (see `.claude/rules/api.md`). Do not expose it beyond localhost.

The port is **not stable across the stack**: `5224` is what `api/src/Properties/launchSettings.json`
uses when the API is run directly, but under Aspire the AppHost assigns it. Read the real port
off the Aspire dashboard once and pin it in your script's config rather than trusting a default.

## Is it up? (check this first)

The API is only running when the developer has Aspire running — assume it is down.

| Endpoint | Checks | Meaning |
|---|---|---|
| `GET /health` | all checks — `self` **plus Postgres** | the API can actually read and write data |
| `GET /alive` | only `live`-tagged checks — just `self` | the process is up; says nothing about the database |

**Use `/health`.** `/alive` returns 200 even when Postgres is unreachable, so a write would
still fail with a 500. Both return plain text (`Healthy` / `Unhealthy`), 200 or 503, no auth.

```bash
curl -sf http://localhost:5224/health || { echo "daily-work API is down — start Aspire"; exit 1; }
```

```bash
# wait for it instead of failing outright
until curl -sf -o /dev/null http://localhost:5224/health; do sleep 2; done
```

```powershell
try { Invoke-RestMethod http://localhost:5224/health | Out-Null }
catch { throw 'daily-work API is down — start Aspire' }
```

These come from `MapDefaultEndpoints()` in `aspire/DailyWork.ServiceDefaults/Extensions.cs`
and are mapped in every environment (this project does not gate them behind Development, unlike
the stock Aspire template).

## The upsert

```
PUT /api/work-metrics/entries
Content-Type: application/json

{
  "weekOf": "2026-07-27",
  "title": "Bugs completed this week",
  "value": "5 — VP-1188 list-race, VP-1192 null payload, VP-1205 tz drift"
}
```

Returns `200` with the stored entry on both create and update.

### Rules that will bite you

| Rule | Detail |
|---|---|
| **`weekOf` must be a Monday** | `yyyy-MM-dd`, and `DayOfWeek == Monday`. Anything else is a `400` — the API never snaps your date to the nearest Monday, because silently writing to a different week is worse than failing. |
| **`title` must match exactly** | Trimmed, case-sensitive. `"Bugs completed this week"` and `"Bugs Completed This Week"` are two different entries. Copy titles from `GET /api/work-metrics/definitions`. |
| **`value` is replaced, not appended** | That is what makes a re-run idempotent. If you want to accumulate, read the entry first and write the combined text. |
| **`value` is freeform text** | No numeric field. `"7 (VP-1201, VP-1214)"` and a three-line paragraph are both fine. `null` means the entry is pending. |
| **Writes are marked `Agent`** | `source` is set to `Agent` and `updatedAt` is stamped. The UI renders these with an `[agent]` marker. A hand edit in the app flips `source` back to `App`. |
| **Definitions are linked by title** | If a definition with the same title exists, the new entry links to it. Otherwise the entry is ad-hoc. Either way the write succeeds. |

## Computing `weekOf`

```bash
# GNU date (Linux, git-bash)
date -d "last monday" +%Y-%m-%d   # careful: on a Monday this returns *last* week
```

```powershell
# PowerShell — Monday of the current week, works on any day
$today = Get-Date
$offset = ([int]$today.DayOfWeek + 6) % 7   # Sunday=6, Monday=0, ... Saturday=5
$weekOf = $today.AddDays(-$offset).ToString('yyyy-MM-dd')
```

## Examples

```bash
curl -X PUT http://localhost:5224/api/work-metrics/entries \
  -H "Content-Type: application/json" \
  -d '{"weekOf":"2026-07-27","title":"Bugs completed this week","value":"5 — VP-1188, VP-1192"}'
```

```powershell
Invoke-RestMethod -Method Put -Uri http://localhost:5224/api/work-metrics/entries `
  -ContentType 'application/json' `
  -Body (@{
    weekOf = $weekOf
    title  = 'PRs involved in this week'
    value  = "7 — VP-1201, VP-1214, VP-1230`nreviewed: VP-1199, VP-1207"
  } | ConvertTo-Json)
```

## Discovering what to write

```
GET /api/work-metrics/definitions          # active checks — write to these titles
GET /api/work-metrics/definitions/all      # includes retired ones
GET /api/work-metrics/entries?weekOf=…     # what's already recorded for a week
GET /api/work-metrics/weeks                # [{ weekOf, entryCount, filledCount }], newest first
```

`GET /entries` for the **current** week also seeds a pending entry per active definition —
so hitting it first is a cheap way to see the exact titles you should be filling in. Past
weeks are never back-filled.

`api/src/Playground/WorkMetrics.http` has runnable examples of every route, including the
failure cases.
