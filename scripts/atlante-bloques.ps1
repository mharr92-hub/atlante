#Requires -Version 5.1
<#
=====================================================================================================
 Atlante del Pacífico — atlante-bloques.ps1
=====================================================================================================
 Ejecuta el plan del PRD v2 en bloques con Claude Code, conectado a Git:

   1. Verifica Git, Node, npm y Claude Code (instala Claude Code con npm si falta).
   2. Clona o actualiza el repo mharr92-hub/atlante y crea/actualiza la rama feature/atlante-broker.
   3. Escribe docs/ (PRD v2, TODO, reglas, 6 bloques, anexo PEX), hace commit y push.
   4. Corre Claude Code bloque por bloque (1 → 6). Al terminar cada bloque: commit de lo que quede,
      npm run build (si falla, pide a Claude Code que lo arregle, hasta 2 veces), push, y guarda el
      estado en logs/estado.json para poder reanudar.
   5. Si hay DATABASE_URL en .env.local/.env, aplica las migraciones de Prisma (migrate deploy).
   6. NUNCA hace merge a main ni despliega: al final imprime el enlace para abrir el Pull Request.

 USO (PowerShell normal, no como administrador):
   Set-ExecutionPolicy -Scope Process Bypass -Force
   .\atlante-bloques.ps1                    # preparar + bloques 1..6 sin pausas (dejarlo corriendo)
   .\atlante-bloques.ps1 -Desde 2 -Hasta 2  # solo el bloque 2
   .\atlante-bloques.ps1 -SoloPreparar      # clona, escribe docs, push; no corre Claude Code
   .\atlante-bloques.ps1 -Pausar            # pausa entre bloques para revisar
   .\atlante-bloques.ps1 -Peligroso         # Claude Code con --dangerously-skip-permissions
   .\atlante-bloques.ps1 -RepoDir D:\dev\atlante -Model opus

 Reanudar: si se corta, vuelve a ejecutarlo; salta los bloques marcados como completados en
 logs/estado.json (usa -Desde N para forzar).
 Parar con calma: crea el archivo logs\STOP dentro del repo; termina el bloque en curso y se detiene.
 Mientras Claude Code trabaja, imprime una línea de avance cada -Latido segundos (60 por defecto).
=====================================================================================================
#>
[CmdletBinding()]
param(
  [string]$RepoDir = (Join-Path $HOME "atlante"),
  [string]$RepoUrl = "https://github.com/mharr92-hub/atlante.git",
  [string]$Branch = "feature/atlante-broker",
  [int]$Desde = 0,
  [int]$Hasta = 6,
  [switch]$SoloPreparar,
  [switch]$Pausar,
  [switch]$Peligroso,
  [switch]$SinBuild,
  [string]$Model = "",
  [int]$MaxTurns = 500,
  [int]$Latido = 60
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}
try { $OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}
try { chcp 65001 | Out-Null } catch {}

$Script:Utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$Script:GitName = "Mark Marcel Harrick Atie"
$Script:GitEmail = "harrick007@gmail.com"
$Script:CompareUrl = "https://github.com/mharr92-hub/atlante/compare/main...${Branch}?expand=1"

function Write-Step([string]$Text) { Write-Host ""; Write-Host ("=" * 96) -ForegroundColor DarkCyan; Write-Host " $Text" -ForegroundColor Cyan; Write-Host ("=" * 96) -ForegroundColor DarkCyan }
function Write-Ok([string]$Text) { Write-Host " [OK] $Text" -ForegroundColor Green }
function Write-Warn2([string]$Text) { Write-Host " [!!] $Text" -ForegroundColor Yellow }
function Fail([string]$Text) { Write-Host " [ERROR] $Text" -ForegroundColor Red; exit 1 }

function Invoke-Native {
  # Ejecuta un comando nativo y devuelve la salida; lanza si el exit code != 0 (salvo -Ignore)
  param([string]$File, [string[]]$ArgList = @(), [switch]$Ignore, [string]$Cwd = "")
  $prev = Get-Location
  $eap = $ErrorActionPreference
  if ($Cwd) { Set-Location $Cwd }
  try {
    # PowerShell 5.1 convierte stderr en error terminal con 2>&1 si EAP=Stop: lo relajamos solo aquí
    $ErrorActionPreference = "Continue"
    $out = @(& $File @ArgList 2>&1 | ForEach-Object { "$_" })
    $code = $LASTEXITCODE
  } finally { $ErrorActionPreference = $eap; Set-Location $prev }
  if ($code -ne 0 -and -not $Ignore) { throw "'$File $($ArgList -join ' ')' terminó con código $code`n$($out -join "`n")" }
  return ,$out
}

function Test-Cmd([string]$Name) { return [bool](Get-Command $Name -ErrorAction SilentlyContinue) }

function Write-TextFile([string]$Path, [string]$Content) {
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $normalized = $Content -replace "`r`n", "`n"
  if (Test-Path $Path) {
    $existing = [System.IO.File]::ReadAllText($Path, $Script:Utf8NoBom) -replace "`r`n", "`n"
    if ($existing -eq $normalized) { return $false }
  }
  [System.IO.File]::WriteAllText($Path, $normalized, $Script:Utf8NoBom)
  return $true
}

function Import-DotEnv([string]$Dir) {
  # Carga .env y .env.local (sin sobrescribir variables ya presentes en el proceso)
  foreach ($name in @(".env", ".env.local")) {
    $p = Join-Path $Dir $name
    if (-not (Test-Path $p)) { continue }
    foreach ($line in Get-Content $p -Encoding UTF8) {
      $l = $line.Trim()
      if (-not $l -or $l.StartsWith("#")) { continue }
      $i = $l.IndexOf("=")
      if ($i -lt 1) { continue }
      $k = $l.Substring(0, $i).Trim()
      $v = $l.Substring($i + 1).Trim()
      if ($v.Length -ge 2 -and (($v[0] -eq '"' -and $v[-1] -eq '"') -or ($v[0] -eq "'" -and $v[-1] -eq "'"))) { $v = $v.Substring(1, $v.Length - 2) }
      if (-not [Environment]::GetEnvironmentVariable($k, "Process")) { [Environment]::SetEnvironmentVariable($k, $v, "Process") }
    }
  }
}

function Get-Estado {
  $p = Join-Path $RepoDir "logs/estado.json"
  if (Test-Path $p) { try { return (Get-Content $p -Raw -Encoding UTF8 | ConvertFrom-Json) } catch { } }
  return [pscustomobject]@{ completados = @(); actualizado = "" }
}
function Save-Estado($estado) {
  $p = Join-Path $RepoDir "logs/estado.json"
  $estado.actualizado = (Get-Date).ToString("s")
  Write-TextFile $p ($estado | ConvertTo-Json -Depth 5) | Out-Null
}

function Git-HasChanges { $s = Invoke-Native git @("status", "--porcelain") -Ignore; return [bool]($s | Where-Object { $_ -ne "" }) }
function Git-CommitAll([string]$Message) {
  if (-not (Git-HasChanges)) { return $false }
  Invoke-Native git @("add", "-A") | Out-Null
  Invoke-Native git @("commit", "-m", $Message) -Ignore | Out-Null
  return $true
}
function Git-Push {
  Write-Host " git push origin $Branch ..." -ForegroundColor DarkGray
  $out = Invoke-Native git @("push", "-u", "origin", $Branch) -Ignore
  if ($LASTEXITCODE -ne 0) { Write-Warn2 "El push falló (¿falta iniciar sesión en GitHub? Git Credential Manager abre el navegador la primera vez). Salida:`n$($out -join "`n")"; return $false }
  Write-Ok "push hecho"; return $true
}

# ----------------------------------------------------------------------------------------------------
# 0. Herramientas
# ----------------------------------------------------------------------------------------------------
Write-Step "0/6 · Herramientas"
if (-not (Test-Cmd git)) { Fail "Git no está instalado. Descárgalo de https://git-scm.com/download/win (marca 'Git Credential Manager') y vuelve a correr el script." }
if (-not (Test-Cmd node)) { Fail "Node.js no está instalado. Instala Node 20 LTS o superior desde https://nodejs.org y vuelve a correr el script." }
$nodeMajor = [int]((Invoke-Native node @("-v"))[0].TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 20) { Fail "Node $nodeMajor detectado; se necesita Node 20 o superior." }
if (-not (Test-Cmd npm)) { Fail "npm no está disponible en el PATH." }
Write-Ok ("git " + ((Invoke-Native git @("--version"))[0])); Write-Ok ("node " + ((Invoke-Native node @("-v"))[0]))
if (-not (Test-Cmd claude)) {
  Write-Warn2 "Claude Code no está instalado. Instalando con npm (gratuito): npm install -g @anthropic-ai/claude-code"
  Invoke-Native npm @("install", "-g", "@anthropic-ai/claude-code") | Out-Null
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not (Test-Cmd claude)) { Fail "No encuentro 'claude' después de instalarlo. Cierra y abre PowerShell y vuelve a correr el script." }
}
Write-Ok ("claude " + ((Invoke-Native claude @("--version") -Ignore) -join " "))

# Identidad de Git (sin 'Ing.' delante del nombre)
if (-not ((Invoke-Native git @("config", "--global", "user.name") -Ignore) -join "")) { Invoke-Native git @("config", "--global", "user.name", $Script:GitName) | Out-Null; Write-Ok "git user.name configurado" }
if (-not ((Invoke-Native git @("config", "--global", "user.email") -Ignore) -join "")) { Invoke-Native git @("config", "--global", "user.email", $Script:GitEmail) | Out-Null; Write-Ok "git user.email configurado" }
Invoke-Native git @("config", "--global", "core.autocrlf", "false") -Ignore | Out-Null
Invoke-Native git @("config", "--global", "credential.helper", "manager") -Ignore | Out-Null

# ----------------------------------------------------------------------------------------------------
# 1. Repo y rama
# ----------------------------------------------------------------------------------------------------
Write-Step "1/6 · Repo y rama ($RepoDir → $Branch)"
if (Test-Path (Join-Path $RepoDir ".git")) {
  Write-Host " Repo existente: actualizando origin..." -ForegroundColor DarkGray
  Invoke-Native git @("fetch", "origin", "--prune") -Cwd $RepoDir | Out-Null
} else {
  Write-Host " Clonando $RepoUrl en $RepoDir ..." -ForegroundColor DarkGray
  $parent = Split-Path -Parent $RepoDir
  if ($parent -and -not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  Invoke-Native git @("clone", $RepoUrl, $RepoDir) | Out-Null
}
Set-Location $RepoDir
if (Git-HasChanges) { Write-Warn2 "Hay cambios sin commit en el repo; los guardo en un commit WIP para no perderlos."; Git-CommitAll "WIP: cambios locales antes de ejecutar los bloques" | Out-Null }
Invoke-Native git @("checkout", "main") | Out-Null
Invoke-Native git @("pull", "--ff-only", "origin", "main") -Ignore | Out-Null
$remoteBranch = (Invoke-Native git @("ls-remote", "--heads", "origin", $Branch) -Ignore) -join ""
$localBranch = (Invoke-Native git @("branch", "--list", $Branch) -Ignore) -join ""
if ($localBranch) {
  Invoke-Native git @("checkout", $Branch) | Out-Null
  if ($remoteBranch) { Invoke-Native git @("pull", "--ff-only", "origin", $Branch) -Ignore | Out-Null }
} elseif ($remoteBranch) {
  Invoke-Native git @("checkout", "-b", $Branch, "origin/$Branch") | Out-Null
} else {
  Invoke-Native git @("checkout", "-b", $Branch) | Out-Null
}
Write-Ok ("rama actual: " + ((Invoke-Native git @("rev-parse", "--abbrev-ref", "HEAD"))[0]))

# logs/ fuera de git
$gi = Join-Path $RepoDir ".gitignore"
$giText = if (Test-Path $gi) { Get-Content $gi -Raw -Encoding UTF8 } else { "" }
if ($giText -notmatch "(?m)^/?logs/?\s*$") { Add-Content -Path $gi -Value "`n# logs del script de bloques`n/logs/`n" -Encoding UTF8 }
New-Item -ItemType Directory -Path (Join-Path $RepoDir "logs") -Force | Out-Null

# ----------------------------------------------------------------------------------------------------
# 2. Documentos del plan (PRD, TODO, reglas, bloques, anexo PEX)
# ----------------------------------------------------------------------------------------------------
Write-Step "2/6 · Escribiendo docs/ del plan"
$Docs = [ordered]@{}
$Docs["docs/README.md"] = @'
# docs/ — plan de trabajo de Atlante del Pacífico v2

| Archivo | Qué es |
|---|---|
| `PRD-atlante-v2.md` | Especificación del producto (broker de Pacific Experience + marketplace de charters) |
| `TODO-atlante-v2.md` | Lista de 62 tareas priorizadas (T01–T62) |
| `analisis-broker-2026-09-09.md` | Diagnóstico original del sitio y de PEX (recorrido en vivo del 09/09/2026) |
| `bloques/00-reglas.md` | Reglas comunes que Claude Code recibe antes de cada bloque |
| `bloques/01-R0-limpieza.md` … `06-R4-crecimiento.md` | Los 6 bloques de trabajo, en orden |
| `bloques/anexo-PEX.md` | Cambios que necesita PEX (X1–X9) — se implementan en el repo de PEX, no aquí |
| `reportes/bloque-XX.md` | Reporte que Claude Code escribe al terminar cada bloque (incluye `PENDIENTE MARK`) |

Cómo se ejecuta: `scripts/atlante-bloques.ps1` (PowerShell) corre Claude Code bloque por bloque en la rama `feature/atlante-broker`, con commit, build y push al final de cada uno. Nunca hace merge a `main` ni despliega.
'@
$Docs["docs/PRD-atlante-v2.md"] = @'
# PRD — Atlante del Pacífico v2 ("upgraded"): broker de Pacific Experience + marketplace de charters

Versión: 2.0 · Fecha: 2026-09-09 · Autor: Claude para Mark · Estado: borrador para aprobación
Fuentes: `01-analisis-broker-2026-09-09.md` (recorrido en vivo de ambos sitios) + auditoría del repo `github.com/mharr92-hub/atlante` (rama `main`, commit `aaa2303`) + proyecto Supabase "ATLANTE". Lo no verificado está marcado NO VERIFICADO; lo que decide Mark está marcado PENDIENTE MARK. Nada de este documento se inventa: los precios y textos de PEX son los publicados el 09/09/2026.

## 0. Objetivo en una frase

Que cada persona que entra a atlantedelpacifico.lat termine pagando en pacificexperience.lat con el código de Atlante (`ref=ATLANTE&ref_id=<lead>`), o cerrando un charter (PEX por deep-link, aliados por cotización) desde Atlante — y que Mark pueda ver en un tablero cuántas ventas y cuánta comisión generó Atlante.

| Métrica norte | Definición | Cómo se mide |
|---|---|---|
| Reservas PEX atribuidas | Reservas pagadas en PEX cuyo `referral_code` = ATLANTE | Export semanal de PEX (manual) → webhook (R1b) |
| Tasa de handoff | Leads que llegan al paso 3 y son redirigidos a PEX ÷ visitas a fichas | Evento `redirect_to_pex` / `view_product` |
| Charters cerrados | Cotizaciones de naves aliadas que terminan en "pagado" + charters PEX con `BROKER=ATLANTE` | Estado del lead en admin |
| Comisión del mes | Σ monto × % por operador | Reporte `/admin/comisiones` |

## 1. Auditoría del repo (lo nuevo respecto al análisis)

Stack real: Next.js 16.2.10 (App Router, TypeScript) + React 19 + Tailwind v4 + Prisma 6 sobre Postgres. 5 commits, una sola rama `main`, ~4.500 líneas en `src/`. Sin tests, sin CI, sin `.env.example` (el README lo cita pero no existe en el repo).

| Área | Estado hoy (archivo) | Implicación para el PRD |
|---|---|---|
| Catálogo | `src/content/tours.ts`: 3 tours ($850 / $1,450 / $2,800 por persona) + 3 charters ($1,200 / $1,800 / $3,200 por barco, +$60–110 por invitado extra), capacidad 12 y depósito 30 % en todos. Todo hardcodeado e inventado | D3 y D6 confirmados. El catálogo pasa a base de datos con `fuente_url` + `verificado_el`; los 6 productos actuales se eliminan |
| Configuración | `src/config/site.ts`: `url: https://atlantedelpacifico.com`, `email: concierge@atlantedelpacifico.com`, `trust: {4.9, 127, 200, 14}` | D1, D2 y D4 salen de un solo archivo: canonical, sitemap, robots, OG y JSON-LD derivan de `site.url`. Arreglo de 1 archivo + borrar `trust` |
| Reseñas | `src/content/reviews.ts`: 3 testimonios con nombre y fuente "Google"/"TripAdvisor" + `aggregateRating {4.9, 127}` inyectado como JSON-LD `TravelAgency.aggregateRating` en el home | D4 confirmado y agravado: rich results de Google con reseñas inventadas (riesgo de penalización manual). Se elimina el archivo y el JSON-LD de rating |
| Urgencia | `TourCard` prop `urgency` + `i18n.spots_left` = "Pocos cupos esta semana" | D5 confirmado. Se elimina la prop y la clave |
| `/api/lead` | Stub: valida el email, hace `console.log` y responde `{ok:true, code:"ATLANTE10"}`; el popup promete "10 % en tu primera reserva" | D8 confirmado + promesa falsa: el código ATLANTE10 no existe en ningún checkout (el pago es en PEX). El popup se apaga hasta que exista un beneficio real |
| `/api/bookings` | Exige `DATABASE_URL` (503 si falta); crea `Booking` vía Prisma con precio recalculado del catálogo inventado y abre WhatsApp | D7 confirmado. El proyecto Supabase "ATLANTE" (`odeivsrdtgernzndwnmm`, us-east-1) está **INACTIVE (pausado)**: hoy no puede persistir nada. `DATABASE_URL` en Vercel: NO VERIFICADO |
| Modelo de datos | `prisma/schema.prisma`: `Booking` ya tiene `referralCode`, `utmSource/Medium/Campaign`, `selectedAddons`; existen `Reseller` (código + % comisión), `Lead` (email único, newsletter), `Coupon`, `GiftCard`, `Review`, `AvailabilitySlot`, `Payment` | Buena base. Faltan `Product`, `ProductAddon`, `Vessel`, `Operator`, `Handoff`, `PexEvent` y un `Lead` de intención de compra (el actual es de newsletter) |
| Admin | `/admin` con contraseña única + cookie HMAC (`ADMIN_PASSWORD`, `AUTH_SECRET`); vistas resumen, reservas y calendario de cupos; acciones confirmar / marcar pagado / cancelar | Se reutiliza tal cual para leads, catálogo, naves y comisiones. No hace falta auth externo |
| Analítica | `Analytics.tsx` carga GA4 y Meta Pixel sólo si existen `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_META_PIXEL_ID` | D10 es configuración, no código. Faltan eventos por paso y el `linker` cross-domain hacia pacificexperience.lat |
| Idioma | ES/EN por cookie `locale`; sin `hreflang`. Copy EN usa "Sunset Voyage", "Private Sunset Charter", keyword "sunset cruise Panama City", filtro "Sunset" | D13 + violación de la regla "nunca Sunset" (10 apariciones en `tours.ts`, `reviews.ts`, `i18n.ts`, `layout.tsx` y `Destinations.tsx`) |
| Moneda | `lib/format.ts` con tasas fijas EUR 0.92 / COP 4050 / MXN 17.1 aplicadas en cliente | D12 confirmado. Se deja sólo USD (el pago en PEX es en USD) |
| SEO técnico | `sitemap.ts` y `robots.ts` construyen URLs con `site.url` (.com); JSON-LD `TouristTrip` con `Offer.price` inventado en cada ficha | D1 confirmado; el JSON-LD sólo se emite con precio real |
| Seed | `prisma/seed.ts`: 60 días de cupos para los 6 productos inventados + cupón WELCOME10 | Se reemplaza por un seed del catálogo PEX marcado `verificado_el` |
| Cierre actual | Todo termina en `wa.me/50768603623` con mensaje prearmado; `ContactSection` no guarda nada | El WhatsApp de Atlante se mantiene como canal de rescate; deja de ser el único cierre |

## 2. Principios de producto (no negociables)

| # | Principio | Consecuencia en el producto |
|---|---|---|
| 1 | Atlante nunca cobra al cliente final | Sin pasarela, sin formulario de tarjeta, sin SDK de pagos. El pago ocurre en PEX (tours, ferry, naves PEX) o con el operador aliado (naves de terceros) |
| 2 | Toda salida a PEX lleva nuestro código | `ref=ATLANTE&ref_id=<lead_id>` + UTM en el 100 % de los enlaces a pacificexperience.lat, generados por un único helper `buildPexUrl()`. Ningún `href` a PEX escrito a mano (lint + test lo verifican) |
| 3 | Lead antes de redirigir | Nombre + WhatsApp + producto + fecha se guardan en Atlante antes del handoff; si el cliente abandona en PEX, se rescata desde el WhatsApp de Atlante |
| 4 | Paridad con PEX | Mismo precio, mismas políticas (100 % al reservar tours; reembolso sólo hasta 24 h antes; charters 30 % de apartado y saldo 24 h antes). Cualquier diferencia rompe la confianza y la comisión no justifica el margen |
| 5 | Cero datos inventados en público | Un precio, cupo, reseña o métrica sólo se muestra si tiene `fuente_url` y `verificado_el`; si no, no se muestra |
| 6 | Sin datos personales en la URL | El prellenado en PEX viaja por token de un solo uso (`h=`), nunca nombre/correo/teléfono en query string |
| 7 | Transparencia | "Agente autorizado de Pacific Experience. La reserva y el pago se completan en pacificexperience.lat" visible en catálogo, paso 3 y footer |
| 8 | Marca propia | Atlante es un broker/concierge marítimo que compara y elige; WhatsApp y correo propios, distintos a los de PEX. Nunca la palabra "Sunset" |

## 3. Usuarios y trabajos por hacer

| Usuario | Qué busca | Cómo lo resuelve Atlante v2 | Cierre |
|---|---|---|---|
| Turista o local buscando "tour a Taboga", "ferry", "party en barco" | Comparar rápido y reservar sin fricción | Catálogo PEX con precio real, próxima salida y funnel de 3 clics | Paga en PEX con `ref=ATLANTE` |
| Grupo para cumpleaños, despedida, corporativo, propuesta | Ver opciones de yate, precio por persona y disponibilidad | `/charters` con filtros, comparador y precio por persona calculado | Nave PEX → checkout PEX; nave aliada → cotización |
| Operador de charter aliado | Leads calificados sin invertir en marketing | Ficha en el marketplace + formulario "publica tu embarcación" | Cobra al cliente y paga comisión a Atlante |
| Hotel, concierge, agencia | Recomendar con comisión y sin operar nada | Código de aliado (`Reseller.referralCode`) que viaja en el lead | Comisión repartida en el reporte mensual |
| Mark (admin) | Ver leads, atribución y comisión sin hojas sueltas | `/admin/leads`, `/admin/catalogo`, `/admin/naves`, `/admin/comisiones` + export CSV | — |

## 4. Alcance por release

| Release | Nombre | Contenido | Dónde | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| R0 | Limpieza y verdad | D1 dominio .lat en `site.ts`; D2 email; D4/D5 borrar reseñas, métricas, urgencia y JSON-LD de rating; D12 sólo USD; apagar popup ATLANTE10; quitar "Sunset"; disclosure PEX; páginas legales BORRADOR; `.env.example` | Atlante | 1–2 días | P0 |
| R1 | Ticketería PEX — modo puente | Catálogo PEX en DB con `verificado_el`; funnel `/reservar/[slug]` 3 pasos; `Lead` + `Handoff`; `buildPexUrl()`; pantalla "Te llevamos a Pacific Experience" + código visible para pegar; admin de leads; eventos de analítica | Atlante | 5–7 días | P0 |
| R1b | Cambios mínimos en PEX | Leer `ref`/`ref_id` por URL → prellenar y persistir `referral_code`; cookie 30 días; feed público `trips/slots`; prefill por token; webhook de confirmación; `addon=`; calendario en vez de píldoras | PEX (otro repo, otra sesión) | 3–4 días | P0 |
| R1c | Ticketería PEX — modo integrado | Sync del feed (cron) → fechas y cupos reales en el paso 2; deep-link directo al checkout con `slot_id`; estado `pagado` automático por webhook; reporte de comisiones | Atlante | 3–4 días | P0 (cuando exista R1b) |
| R2 | Marketplace de charters | `Vessel` + `Operator`; `/charters` con filtros y comparador; fichas Aura / Pacific Ferry 1 / Sirena del Mar (datos de PEX); modo `deeplink` vs `cotizacion`; `partner_applications`; admin de naves con `comision_pct` | Atlante | 4–6 días | P1 |
| R3 | Alianzas | Códigos de aliado (hoteles, agencias) que viajan en el lead; landing `/aliados`; contrato tipo; kit de operador | Atlante + comercial | 2–3 días + continuo | P1 |
| R4 | Crecimiento | `/destinos/*`, hreflang + EN completo, GA4 linker + Meta, guías comparativas, ads segmentados por marca, GBP (si aplica) | Atlante + PEX | Continuo | P2 |

Regla de trabajo (heredada de PEX): escritor único, rama `feature/atlante-broker` desde `origin/main`, commits en español, sin merge ni deploy sin aprobación de Mark, verificación en 3 niveles (SHA + build de Vercel + dominio en vivo).

## 5. Especificación funcional

### 5.1 Mapa de rutas

| Ruta | Qué muestra | Fuente de datos | CTA principal | Cambio vs hoy |
|---|---|---|---|---|
| `/` | Hero de broker ("comparamos ferry, tours y charters de operadores verificados y te llevamos al pago directo con el operador"), dos entradas: "Tickets y tours" y "Charters"; bloque "Agente autorizado de Pacific Experience"; destinos; cómo funciona; FAQ; contacto | Catálogo en DB | Ver tours / Ver charters | Quitar reseñas, métricas de confianza, urgencia y JSON-LD de rating; separar los dos portales |
| `/tours` | Catálogo PEX: Ferry Taboga, Tour por la Bahía, Party en la Bahía (+ Contadora oculto hasta que esté disponible) con precio real, duración, días de salida, próxima salida y cupos (modo integrado) | `Product` (`source=pex`) | Reservar → `/reservar/[slug]` | Nueva página (hoy es una sección del home con productos inventados) |
| `/tours/[slug]` | Ficha del producto PEX: fotos, itinerario, incluye, políticas de PEX, "quién opera / quién cobra" | `Product` | Reservar | Deja de mezclar charters; galería con fotos reales de PEX (mismo dueño) |
| `/reservar/[slug]` | Funnel de 3 pasos (5.2) | `Product`, `ProductAddon`, feed (R1c) | Continuar al pago en Pacific Experience | Nuevo; reemplaza `PriceCalculator` |
| `/reservar/[slug]/listo` | Pantalla de redirección: resumen + "Tu código: ATLANTE" + salto automático a PEX | `Lead`, `Handoff` | Automático (2 s) + botón manual | Nuevo |
| `/charters` | Listado de naves (PEX + aliadas) con filtros y comparador | `Vessel`, `Operator` | Reserva directa (PEX) / Cotizar (aliado) | Nuevo; hoy los charters viven bajo `/tours/` |
| `/charters/[slug]` | Ficha estándar de nave (5.7) | `Vessel` | Igual | Nuevo |
| `/charters/comparar` | Comparador real (hasta 4 naves, precio por hora y por persona) | `Vessel` | Ver ficha | Reemplaza `/compare` (301) |
| `/cotizar/[slug]` | Formulario de cotización de nave aliada | `Vessel` | Enviar → lead `charter_partner` + WhatsApp | Nuevo |
| `/aliados`, `/aliados/registro` | Propuesta para operadores, hoteles y agencias; alta self-service | `PartnerApplication` | Registrarme | Nuevo |
| `/como-funciona`, `/terminos`, `/privacidad`, `/cancelaciones` | Textos legales y explicación de los 3 clics | Estático (BORRADOR — revisar Mark) | — | Nuevo (D11) |
| `/destinos/[slug]` | Taboga, Las Perlas, Bahía: "todas las formas de ir" | `Product` + `Vessel` | Tour / ferry / charter | R4 |
| `/admin/leads`, `/admin/catalogo`, `/admin/naves`, `/admin/operadores`, `/admin/aliados`, `/admin/comisiones` | Gestión y reporte | Prisma | — | Extiende el admin existente (misma auth) |
| `POST /api/leads` | Crea `Lead` + `Handoff`, devuelve `destinationUrl` | — | — | Reemplaza `/api/bookings` |
| `GET /api/handoff/[token]` | Prellenado para PEX (servidor a servidor, con secreto) | `Handoff` | — | Nuevo |
| `POST /api/pex/booking-confirmed` | Webhook firmado de PEX | `PexEvent` → `Lead` | — | Nuevo (R1c) |
| `POST /api/partner-applications` | Alta de operador | `PartnerApplication` | — | Nuevo |
| `GET /api/cron/sync-pex` | Copia el feed de PEX a `Product`/`ProductSlot` | Feed PEX | — | R1c (Vercel Cron, cada 15 min) |
| Redirecciones 301 | `/compare` → `/charters/comparar`; `/tours/charter-*` y `/tours/yate-*` → `/charters`; `/tours/travesia-al-atardecer`, `/tours/escape-a-taboga`, `/tours/expedicion-a-las-perlas` → `/tours` | `next.config.ts` | — | Evita 404 en URLs ya indexadas |

`noindex` en `/reservar/*/listo`, `/cotizar/*` y `/admin/*`.

### 5.2 Funnel de 3 clics — `/reservar/[slug]`

| Paso | Pantalla | Campos | Validaciones | Estado en URL |
|---|---|---|---|---|
| 1 · Tour | Viene de la ficha o del catálogo; cabecera fija con nombre, precio real, duración y "Pago seguro en Pacific Experience" | `slug` | Producto `disponible = true` y con precio verificado; si no, 404 amigable con enlace al catálogo | `/reservar/tour-bahia` |
| 2 · Fecha y pasajeros | Calendario + selector de horario + cantidad por categoría + adicionales | `date`, `slot` (horario), `pax` por categoría (adulto / niño / jubilado según el producto), `addons[]` | Ver tabla "Modo puente vs integrado" | `?date=2026-09-18&slot=17:30&pax=2&addons=tour-islas` |
| 3 · Datos | Resumen (producto, fecha, horario, pax, adicionales, total estimado) + formulario | `nombre`, `whatsapp` (E.164, prefijo +507 por defecto), `email`, `partner_code` (opcional, prellenado desde `?partner=` o cookie), checkbox "Acepto las políticas de Pacific Experience y que Atlante transfiera mis datos a PEX para completar la reserva" | Nombre ≥ 2 palabras; WhatsApp válido; email válido; checkbox obligatorio | Igual que el paso 2 |
| → Redirección | "Te llevamos a Pacific Experience para completar tu pago" con resumen, cuenta regresiva de 2 s, botón "Ir ahora" y la línea "Tu código de referido es **ATLANTE** — si el checkout te lo pide, pégalo" con botón copiar | — | Si `POST /api/leads` falla, se redirige igual con `ref=ATLANTE` sin `ref_id` y se registra el error; el handoff nunca se bloquea | `/reservar/tour-bahia/listo?lead=…` |

| Aspecto | Modo puente (R1, sin feed de PEX) | Modo integrado (R1c, con feed + token + webhook) |
|---|---|---|
| Fechas | Calendario simple; sólo se habilitan los días de la semana publicados por PEX (Tour Bahía: vie · sáb · dom desde 18/09/2026; Party: vie · sáb; Ferry: diario) | Sólo días con salida real habilitados; el calendario abre en el mes de la próxima salida y la preselecciona |
| Horarios | Lista fija del producto (p. ej. 5:30–7:00 PM y 8:00–9:30 PM) | Horarios del día según feed, con cupos por salida |
| Cupos | No se muestran; aviso "La disponibilidad final se confirma en Pacific Experience" | Se muestran; si `pax` > cupo, se bloquea el paso 3 y se ofrecen las 3 próximas fechas con cupo |
| Destino del handoff | Página del producto en PEX (`/tours/<trip_id>`) o `/ferry/taboga`, con `ref`, `ref_id`, UTM. El cliente elige fecha en PEX | Checkout directo `/tours/checkout?trip_id&slot_id&date&tickets` + `h=<token>` |
| Prellenado en PEX | Ninguno (PEX aún no lee parámetros); el cliente pega ATLANTE en "Código de referido" (por eso se muestra y se copia en la pantalla de redirección) | PEX lee `ref`, `ref_id`, `tickets`, `addon` y resuelve `h` para nombre, correo y teléfono |
| Conversión | Mark la marca a mano en `/admin/leads` con el export de PEX (`referral_code = ATLANTE`) | Webhook `booking.paid` → `Lead.status = paid` + comisión calculada |

Rescate del abandono: si un lead queda en `redirected` sin `paid` (24 h en modo integrado; revisión manual en modo puente), el admin muestra un botón "WhatsApp" que abre `wa.me` desde el número de Atlante con plantilla: "Hola {nombre}, soy {concierge} de Atlante. Vi que empezaste tu reserva de {producto} para el {fecha}. ¿Te ayudo a completarla? Aquí tienes el enlace directo: {url con ref}".

### 5.3 `buildPexUrl()` — el único punto de salida a PEX

Archivo: `src/lib/pex.ts`. Base: `process.env.NEXT_PUBLIC_PEX_BASE_URL` (por defecto `https://www.pacificexperience.lat`). Firma:

```
buildPexUrl({
  target: "tour_checkout" | "tour_page" | "ferry_page" | "charter_checkout" | "charter_page" | "home",
  tripId?, slotId?, date?, tickets?, vessel?, addons?: string[],
  leadId?, handoffToken?, campaign?
}) => string
```

Siempre añade `ref=ATLANTE`, `ref_id=<leadId>` (si existe), `utm_source=atlante`, `utm_medium=referral`, `utm_campaign=<campaign | slug>`; añade `h=<token>` sólo en modo integrado y `addon=<slug>` por cada adicional. Nunca incluye nombre, correo ni teléfono.

| Caso | URL generada (ejemplo) | Verificación |
|---|---|---|
| Tour por la Bahía — puente | `https://www.pacificexperience.lat/tours/<trip_id>?ref=ATLANTE&ref_id=ld_8f3…&utm_source=atlante&utm_medium=referral&utm_campaign=tour-bahia` | Ruta de producto observada en PEX |
| Tour por la Bahía — integrado | `…/tours/checkout?trip_id=<id>&slot_id=<id>&date=2026-09-18&tickets=2&ref=ATLANTE&ref_id=ld_8f3…&h=<token>&utm_…` | `slot_id`, `trip_id`, `date` verificados el 09/09; `tickets`, `ref`, `h` requieren R1b |
| Party en la Bahía (Sirena del Mar) | `…/tours/c0d1a003-0000-4000-8000-000000000085?ref=ATLANTE&ref_id=…&utm_…` | ID de producto observado |
| Ferry Taboga | `…/ferry/taboga?ref=ATLANTE&ref_id=…&utm_…` | URL del checkout de ferry NO VERIFICADA → se enlaza la página del ferry |
| Chárter Aura | `…/charter/checkout?vessel=aura&ref=ATLANTE&ref_id=…&utm_…` | `vessel=aura` verificado; `pacific-ferry-1` y `sirena-del-mar` por analogía, NO VERIFICADO |
| Ferry Contadora + add-on | `…/ferry/contadora?addon=tour-islas&ref=ATLANTE&ref_id=…` | Producto `disponible=false` hasta que PEX lo active; ruta NO VERIFICADA |

Guardrails: test unitario "toda URL contiene `ref=ATLANTE`"; script `npm run check:pex-links` que falla si aparece el literal `pacificexperience.lat` fuera de `src/lib/pex.ts`; los enlaces del footer/header a PEX también pasan por el helper.

### 5.4 Handoff por token (prellenado sin datos personales en la URL)

| Elemento | Especificación |
|---|---|
| Modelo | `Handoff { token (32 bytes hex, único), leadId, expiresAt = creación + 30 min, usedAt }` |
| Creación | Al crear el lead en el paso 3; el token viaja en `h=` |
| Consulta | `GET /api/handoff/[token]` con cabecera `x-atlante-key: <PEX_HANDOFF_SECRET>`; responde `{ name, email, phone, tickets, addons, referral_code: "ATLANTE", ref_id }`; marca `usedAt`; 404 si usado o vencido; sin registro de PII en logs |
| Lado PEX | Si el checkout recibe `h`, lo resuelve en el servidor y prellena nombre, correo, teléfono y `referral_code`; si falla, el checkout funciona igual con `ref` |
| Seguridad | Token de un solo uso, secreto compartido en variables de entorno de ambos proyectos, rate-limit por IP, sin CORS abierto |

### 5.5 Webhook de confirmación PEX → Atlante (R1c)

| Elemento | Especificación |
|---|---|
| Endpoint | `POST /api/pex/booking-confirmed` |
| Cuerpo | `{ event: "booking.paid", pex_booking_id, ref, ref_id, product: { type: "tour"/"ferry"/"charter", id, name }, service_date, tickets, amount, currency: "USD", paid_at, customer_email_sha256 }` — sin datos de tarjeta, sin nombre |
| Firma | Cabecera `x-pex-signature = HMAC-SHA256(timestamp + "." + body, PEX_WEBHOOK_SECRET)` + `x-pex-timestamp` (rechazar > 5 min) |
| Idempotencia | `PexEvent.pexBookingId` único; reenvíos devuelven 200 sin duplicar |
| Efecto | Lead con `ref_id` → `status = paid`, `amount`, `commissionAmount = amount × pct` (pct del producto o global). Sin `ref_id` → intenta emparejar por `customer_email_sha256` + fecha; si no, crea lead `paid_unmatched` para revisión manual |
| Eventos | `booking.cancelled` y `booking.refunded` revierten la comisión |

### 5.6 Catálogo PEX en base de datos

| Campo de `Product` | Ejemplo (Tour por la Bahía, observado el 09/09/2026) |
|---|---|
| `slug`, `kind` (`tour` / `ferry` / `party`), `source` = `pex` | `tour-bahia`, `tour`, `pex` |
| `pexTripId`, `pexPath` | `<trip_id de PEX>`, `/tours/<trip_id>` |
| `name`, `summary`, `description` (ES/EN JSON) | "Tour por la Bahía" |
| `priceFrom`, `priceUnit` (`per_person` / `per_segment` / `per_boat`), `priceTable` (JSON por categoría) | $25 · `per_person` |
| `durationMin` | 90 |
| `schedule` (JSON: días de semana, horarios, `validFrom`) | vie · sáb · dom; 17:30–19:00 y 20:00–21:30; desde 2026-09-18 |
| `capacityMin`, `capacityMax` | — / según feed |
| `includes`, `policies` (JSON) | Fee de puerto incluido; 100 % al reservar; reembolso sólo hasta 24 h antes |
| `addons` → `ProductAddon[]` | — |
| `images` (JSON) | Fotos de PEX (mismo dueño) |
| `available`, `verifiedAt`, `sourceUrl` | `true`, `2026-09-09`, `https://www.pacificexperience.lat/tours/<trip_id>` |
| `commissionPct` | PENDIENTE MARK (propuesta: 20, igual a B2B) |

| Producto inicial | Datos observados en PEX el 09/09/2026 | `available` |
|---|---|---|
| Ferry a Isla Taboga (boleto abierto) | Adulto nacional desde $10 por tramo; turista $12 entre semana / $15 fin de semana; niño y jubilado $8; entrada al puerto $1; sin hora fija, válido 180 días; salidas 5:45 AM – 3:35 PM desde Isla Perico | PENDIENTE MARK (en agosto quedó "pausado hasta nuevo aviso"; la web lo muestra activo) |
| Tour por la Bahía (Pacific Ferry 1) | $25 por persona; 1 h 30; 5:30–7:00 PM y 8:00–9:30 PM; vie/sáb/dom desde 18/09/2026; fee de puerto incluido | `true` |
| Party en la Bahía (Sirena del Mar) | Desde $35 por persona; 2 h 30; vie · sáb 7:00–9:30 PM; 30 a 80 personas; DJ, bebida de bienvenida, barra de pago | `true` |
| Ferry a Contadora | $130 registrado; "no disponible por el momento" en PEX; add-on "Tour por las islas del archipiélago — 4 h — +$50" (unidad PENDIENTE MARK) | `false` |
| Naves PEX (Aura, Pacific Ferry 1, Sirena del Mar) | En R1 se muestran como tarjetas simples con deep-link `charter_checkout` para no perder atribución; la ficha completa llega en R2 | `true` |

Sincronización: en R1 el catálogo se edita en `/admin/catalogo` y el script `npm run check:pex` compara precio y disponibilidad contra las páginas públicas de PEX y lista diferencias (no corrige solo). En R1c, `GET /api/cron/sync-pex` copia el feed (`/api/public/trips`, `/api/public/slots`) a `Product` y `ProductSlot` cada 15 min, con fallback al último snapshot si PEX no responde.

### 5.7 Marketplace de charters

| Campo de `Vessel` | Ejemplo Aura (observado en PEX) | Obligatorio |
|---|---|---|
| `name`, `type`, `lengthFt` | Aura · catamarán · eslora NO ENCONTRADA | Sí (eslora no) |
| `operatorId` → `Operator` (`pex` o aliado) | pex | Sí |
| `capacityMax`, `marina` | 35 · Marina Flamenco, Amador | Sí |
| `pricing` (JSON: duraciones y precio por barco) | 4 h · 8 h · 12 h; barco completo desde $1,300; desde $55/persona | Sí |
| `routes` (JSON) | Taboga, Bahía, Las Perlas | Sí |
| `includes`, `onRequest` (JSON) | Combustible, capitán y marino, hielo, nevera, toallas, agua y sodas, BBQ, piscina de mar, A/C, camarotes, baños y duchas, agua caliente, sonido · Bajo solicitud: snorkel, kayaks, sillas flotantes, pesca | Sí / No |
| `depositPct`, `cancellationPolicy` | 30 % de apartado; saldo 24 h antes | Sí |
| `photos` (mín. 8), `video` | 23 fotos en PEX | Sí |
| `closeMode` (`deeplink` / `quote`), `pexVesselSlug` | `deeplink`, `aura` | Sí |
| `commissionPct`, `contractSignedAt` (internos, nunca públicos) | 20 % PEX; aliados según acuerdo | Sí |
| `verified` (licencia AMP + seguro + contrato) | Checklist interno | — |

| Función | Descripción | Release |
|---|---|---|
| Listado con filtros | Capacidad, presupuesto, duración, ruta, tipo de nave, marina de salida; orden por precio por persona | R2 |
| Precio por persona calculado | Barco completo ÷ pax elegido (como hace PEX: "desde $55/persona") | R2 |
| Comparador | Hasta 4 naves: precio por hora, por persona, incluye / no incluye, capacidad | R2 |
| Badges | "Reserva directa" (PEX → checkout con `ref`) vs "Cotizar" (aliado → `/cotizar/[slug]`) | R2 |
| Cotización de nave aliada | Lead `charter_partner` con fecha, horas, pax, ocasión y datos → WhatsApp del concierge (SLA 2 h) → propuesta PDF con precio del operador sin recargo visible → el operador cobra al cliente → comisión a fin de mes contra factura | R2 |
| Alta de operador | `/aliados/registro` → `PartnerApplication` en borrador para revisión de Mark | R2 |
| Ocasiones | Landings por ocasión (cumpleaños, despedida, corporativo, propuesta de matrimonio, atardecer) | R4 |
| Disponibilidad | PEX: del feed; aliados: "consultar" con tiempo de respuesta real; bloqueos por iCal cuando haya 3+ operadores | R4 |

Motivo de que cobre el operador: Atlante no maneja dinero de clientes, no necesita pasarela ni fianza y la responsabilidad del servicio (seguro, licencia AMP, tripulación) queda en quien opera la nave.

### 5.8 Leads y administración

| Estado del lead | Cuándo | Quién lo cambia |
|---|---|---|
| `created` | Se envía el paso 3 | Sistema |
| `redirected` | Se dispara la redirección a PEX | Sistema |
| `paid` | PEX confirma el pago (webhook) o Mark lo marca con el export de PEX | Sistema / Mark |
| `paid_unmatched` | Webhook sin `ref_id` que no empareja con ningún lead | Sistema → revisión |
| `lost` | 7 días sin pago, o el cliente lo dice | Mark / regla automática |
| `quote_requested` → `quoted` → `accepted` → `paid` / `lost` | Charters de aliados | Concierge |

Vistas de admin: `/admin/leads` (filtros por estado, tipo, fecha, producto, aliado; detalle; botón WhatsApp de rescate; marcar pagado con `pex_booking_id` y monto; export CSV), `/admin/catalogo` (CRUD de productos y adicionales con `verificado_el` visible y aviso cuando pasan 14 días sin verificar), `/admin/naves` y `/admin/operadores` (CRUD, `comision_pct`, estado), `/admin/aliados` (solicitudes y códigos), `/admin/comisiones` (mes, operador, reservas, monto, %, comisión; export CSV para Sheets).

### 5.9 Alianzas y códigos de aliado

Se reutiliza el modelo `Reseller` existente (nombre, email, `referralCode`, `commissionPercent`). Un enlace `atlantedelpacifico.lat/?partner=HOTELX` guarda una cookie de 30 días; el código viaja en `Lead.partnerCode`. PEX sigue recibiendo `ref=ATLANTE` (un solo código que PEX conoce); el reparto de comisión entre Atlante y el aliado se calcula en `/admin/comisiones`. Landing `/aliados` con tres propuestas: operadores de charter (ficha + leads, comisión 10–20 % PENDIENTE MARK), hoteles y concierges (código + parte de la comisión), agencias y DMC (tarifa neta = B2B de PEX 20 %). Los ~62 prospectos ya compilados para PEX se pueden trabajar desde la marca Atlante.

### 5.10 Confianza, marca y legal

| Tema | Especificación |
|---|---|
| Disclosure | ES: "Atlante del Pacífico es agente autorizado de Pacific Experience. La reserva y el pago se completan en pacificexperience.lat." EN: "Atlante del Pacífico is an authorized agent of Pacific Experience. Booking and payment are completed on pacificexperience.lat." — visible en `/tours`, paso 3, pantalla de redirección y footer. Logo de PEX sólo si Mark lo autoriza (PENDIENTE MARK) |
| Reseñas | Sólo reales y con fuente. Opción: incrustar el widget de Google de PEX en las fichas de productos PEX con el rótulo "Reseñas del operador (Google, 5.0 · 9)". Sin testimonios propios hasta tenerlos |
| Métricas de confianza | Se eliminan (4.9 / 127 / +200 / 14 min). Se pueden mostrar hechos verificables: "Pago directo con el operador", "Precio igual al del operador", "Respuesta por WhatsApp en horario X" (X PENDIENTE MARK) |
| Popup de descuento | Se apaga: no existe cupón canjeable en PEX. Se reactiva sólo si PEX crea un beneficio real por `ref=ATLANTE` |
| Textos legales | `/terminos` (rol de intermediario; quién opera; quién cobra; responsabilidad del operador), `/privacidad` (datos del lead, transferencia a PEX, cookies, analítica), `/cancelaciones` (espejo de PEX + regla por operador aliado), `/como-funciona` (los 3 clics). Todos marcados BORRADOR — revisar Mark |
| Identidad del negocio | Razón social y RUC de la entidad que factura comisiones en footer y términos (PENDIENTE MARK) |
| Contacto | WhatsApp de Atlante +507 6860 3623 (distinto al de PEX); email real PENDIENTE MARK (hoy apunta a un dominio inexistente) |
| Palabra prohibida | "Sunset" no aparece en ningún texto público (ES ni EN) |

### 5.11 SEO e idiomas

| Elemento | Especificación |
|---|---|
| Canonical / sitemap / robots | `site.url = https://www.atlantedelpacifico.lat`; sitemap con `/tours/*`, `/charters/*`, `/destinos/*`, legales; robots con `Disallow: /admin`, `/reservar/*/listo`, `/cotizar` |
| Redirecciones | Las 301 de 5.1 en `next.config.ts` |
| hreflang | `<link rel="alternate" hreflang="es|en">` con rutas `/en/*` cuando el EN esté completo (R4); mientras tanto, `x-default = es` |
| JSON-LD | `Organization` (Atlante, contacto real), `TouristTrip` + `Offer` sólo con precio verificado; `Product` para naves; nunca `aggregateRating` sin reseñas reales |
| Palabras clave de broker | "alquiler de yate en Panamá precios", "mejores charters Panamá", "comparar tours a Taboga", "cómo llegar a Taboga", "yate para cumpleaños Panamá", "charter Las Perlas" — PEX se queda con marca + producto |
| Search Console | Alta del dominio .lat y envío del sitemap tras el deploy de R0 |
| Dominio .com | Comprar y redirigir 301 al .lat, o eliminar toda referencia (PENDIENTE MARK). Hoy el .com no resuelve |

### 5.12 Analítica y atribución

| Evento | Cuándo | Parámetros |
|---|---|---|
| `view_catalog` | Carga de `/tours` o `/charters` | `portal` |
| `view_product` | Ficha de producto o nave | `slug`, `source` |
| `funnel_step` | Cada paso del funnel | `slug`, `step` (1–3) |
| `lead_created` | `POST /api/leads` ok | `lead_id`, `slug`, `pax`, `value` (total estimado) |
| `redirect_to_pex` | Salto a PEX | `lead_id`, `target`, `mode` (puente / integrado) |
| `quote_requested` | Cotización de nave aliada | `vessel`, `pax`, `hours` |
| `whatsapp_click` | Cualquier `wa.me` | `context` |
| `purchase` (en PEX) | Página de éxito de PEX con `ref=ATLANTE` | `transaction_id`, `value` — requiere linker cross-domain (R1b) |

GA4 con `linker: { domains: ["pacificexperience.lat"] }`; Meta Pixel con evento `Lead` en el paso 3; UTM fijas (`utm_source=atlante`, `utm_medium=referral`, `utm_campaign=<slug>`); en Google Ads, Atlante puja por términos de comparación/charter y PEX por marca/producto (nunca los dos por lo mismo); remarketing de Meta a quienes hicieron `redirect_to_pex` sin `purchase`.

## 6. Modelo de datos (Prisma, Postgres en Supabase "ATLANTE")

| Modelo | Campos clave | Nota |
|---|---|---|
| `Product` (nuevo) | `slug`, `kind`, `source`, `pexTripId`, `pexPath`, `name/summary/description` (JSON ES/EN), `priceFrom`, `priceUnit`, `priceTable` (JSON), `durationMin`, `schedule` (JSON), `capacityMin/Max`, `includes` (JSON), `policies` (JSON), `images` (JSON), `available`, `verifiedAt`, `sourceUrl`, `commissionPct`, `order` | Reemplaza `src/content/tours.ts` |
| `ProductAddon` (nuevo) | `productId`, `slug`, `name` (JSON), `description`, `price`, `unit` (`per_person` / `per_booking`), `durationMin`, `active`, `order` | Primer registro: tour por las islas (Contadora) +$50 |
| `ProductSlot` (nuevo, R1c) | `productId`, `pexSlotId`, `date`, `startTime`, `endTime`, `capacityRemaining`, `price`, `syncedAt` | Copia del feed; sustituye `AvailabilitySlot` para productos PEX |
| `Vessel` (nuevo) | Ver 5.7 | — |
| `Operator` (nuevo) | `name`, `slug`, `whatsapp`, `email`, `commissionPct`, `contractSignedAt`, `ampLicense`, `insuranceUntil`, `verified`, `active` | `pex` es el primer registro |
| `PartnerApplication` (nuevo) | `name`, `vesselName`, `capacity`, `zone`, `whatsapp`, `photos` (JSON), `status` (`new` / `reviewing` / `approved` / `rejected`) | — |
| `Lead` (rediseñado) | `type` (`tour` / `ferry` / `party` / `charter_pex` / `charter_partner`), `productId?`, `vesselId?`, `serviceDate`, `timeSlot`, `pax` (JSON por categoría), `addons` (JSON), `name`, `email`, `phone`, `partnerCode?`, `utmSource/Medium/Campaign`, `landingPath`, `destinationUrl`, `status`, `pexBookingId?`, `amount?`, `commissionAmount?`, `createdAt`, `redirectedAt`, `paidAt` | El `Lead` actual (email único de newsletter) pasa a llamarse `Subscriber` |
| `Handoff` (nuevo) | `token` (único), `leadId`, `expiresAt`, `usedAt` | Ver 5.4 |
| `PexEvent` (nuevo) | `pexBookingId` (único), `eventType`, `payload` (JSON), `signatureOk`, `leadId?`, `createdAt` | Log del webhook |
| `Reseller` (existente) | Sin cambios | Códigos de hoteles / agencias |
| `Booking`, `Payment`, `AvailabilitySlot`, `Coupon`, `GiftCard`, `Review` (existentes) | Se conservan pero dejan de usarse en el flujo público | Se pueden retirar en una limpieza posterior; no bloquean |

Migraciones: `prisma migrate dev --name broker_v2` en local contra una rama de Supabase o la DB restaurada; `prisma migrate deploy` en Vercel (`DATABASE_URL` = pooler 6543, `DIRECT_URL` = 5432). Verificar el número máximo de migración contra `origin/main` antes de crear una nueva; nunca re-ejecutar seeds no idempotentes contra producción.

## 7. Requiere cambio en PEX (anexo para la sesión de código de PEX)

| # | Cambio en PEX | Especificación mínima | Prioridad |
|---|---|---|---|
| X1 | Leer `ref` y `ref_id` por URL en `/tours/checkout`, `/charter/checkout` y la compra de ferry | Prellenar el campo existente `referral_code` con `ref`; guardar `ref`, `ref_id` y `utm_*` en la orden; cookie `pex_ref` de 30 días para que la atribución sobreviva si el cliente vuelve directo | P0 |
| X2 | Aceptar `tickets` (y categorías) en el checkout de tours | Prellenar la cantidad; validar contra cupo | P0 |
| X3 | Prellenado por token `h` | Si llega `h`, `GET https://www.atlantedelpacifico.lat/api/handoff/<h>` con `x-atlante-key`; prellenar nombre, correo, teléfono y `referral_code`; si falla, continuar sin prellenar | P0 |
| X4 | Feed público sólo lectura | `GET /api/public/trips` (id, nombre, tipo, precio por categoría, duración, capacidad, políticas, imágenes) y `GET /api/public/slots?trip_id=&from=&to=` (id, fecha, hora, cupos, precio); cache 60 s; sin datos personales | P0 |
| X5 | Webhook de conversión | `POST https://www.atlantedelpacifico.lat/api/pex/booking-confirmed` firmado (5.5) al confirmar pago, cancelar o reembolsar cuando `referral_code = ATLANTE` | P0 |
| X6 | Página de éxito con evento cross-domain | Disparar `purchase` en GA4/Meta con el `client_id` recibido por el linker; aceptar `_gl` en la URL | P1 |
| X7 | Add-on en el ferry de Contadora | Mostrar "Tour por las islas — 4 h — +$50" y leer `addon=tour-islas` para dejarlo premarcado | P1 (cuando Contadora se active) |
| X8 | Calendario en `/ferry/bahia` | Reemplazar las píldoras de fechas por un calendario con sólo días con salida habilitados, abierto en el mes de la próxima salida; si no hay salida, ofrecer las 3 próximas | P1 (mejora propia de PEX) |
| X9 | Registro del broker en charters | En la hoja de disponibilidad de charters, columna `BROKER = ATLANTE` para reservas que lleguen con `ref=ATLANTE` | P1 |

## 8. Criterios de aceptación (QA antes de cada merge)

| # | Criterio | Cómo se verifica |
|---|---|---|
| A1 | Ningún texto, precio, reseña o métrica sin fuente en público | `grep` de los valores inventados (850, 1450, 2800, 127, 4.9, "Pocos cupos", ATLANTE10) devuelve 0 resultados en `src/`; JSON-LD sin `aggregateRating` |
| A2 | Canonical, sitemap y robots apuntan a `https://www.atlantedelpacifico.lat` | `curl` a `/robots.txt`, `/sitemap.xml` y `view-source` del home |
| A3 | Toda URL a PEX contiene `ref=ATLANTE` y, si hay lead, `ref_id` | Test unitario de `buildPexUrl()` + `npm run check:pex-links` en CI |
| A4 | Funnel: 3 clics → lead guardado → redirección con parámetros correctos y `addon=` cuando aplica | Test e2e (Playwright) en preview de Vercel |
| A5 | El handoff nunca se bloquea si la DB falla | Test con `DATABASE_URL` inválida: redirige con `ref=ATLANTE` y registra el error |
| A6 | No existe ruta de pago, formulario de tarjeta ni SDK de pasarela en Atlante | `grep -ri "stripe\|paguelo\|yappy\|card_number"` = 0 |
| A7 | Días sin salida no seleccionables; el calendario abre en la próxima salida (modo integrado) | Prueba manual + captura móvil 390 px |
| A8 | Sin la palabra "Sunset" en ES ni EN | `grep -ri sunset src/` = 0 fuera de identificadores internos |
| A9 | Lighthouse móvil ≥ 85 en rendimiento y accesibilidad en `/`, `/reservar/[slug]`, `/charters` | Lighthouse CI en preview |
| A10 | Admin protegido | `/admin/*` sin cookie → redirige a login; APIs de admin verifican `requireAdmin()` |
| A11 | Webhook rechaza firmas inválidas y reenvíos duplicados | Test unitario con firma mala, timestamp viejo y `pex_booking_id` repetido |
| A12 | Build limpio y deploy verificado en 3 niveles | SHA en la rama + build de Vercel + dominio en vivo |

## 9. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| PEX tarda en implementar X1–X5 | Sin atribución automática ni fechas reales | Modo puente desde R1: código visible para pegar + conciliación manual con el export de PEX; rescate por WhatsApp |
| El cliente no pega el código en PEX (modo puente) | Comisión perdida | Pantalla de redirección con el código copiado al portapapeles; mensaje de WhatsApp de seguimiento con el enlace `ref`; X1 lo elimina |
| Catálogo desactualizado frente a PEX | Precio distinto → reclamo | `verificado_el` visible en admin, aviso a los 14 días, `npm run check:pex`; en R1c el feed manda |
| Google penaliza por reseñas/ratings inventados ya indexados | Pérdida de tráfico | R0 elimina el JSON-LD de rating y las reseñas; solicitar re-rastreo en Search Console |
| Supabase pausado o `DATABASE_URL` sin configurar en Vercel | Leads no se guardan | Restaurar el proyecto (o crear uno nuevo) antes de R1; health-check `/api/health` que reporta DB ok; el handoff nunca depende de la DB |
| Dos marcas del mismo dueño compitiendo en Ads | Costo duplicado | Reparto de palabras clave (5.12); nunca pujar los dos por el mismo término |
| Responsabilidad ante el consumidor (ACODECO) por servicios de terceros | Reclamos | Disclosure clara, Atlante nunca cobra, contrato de comisión con cada operador, sello "verificado" sólo con licencia y seguro |
| Datos personales en URLs o logs | Privacidad | Token de handoff; sin PII en query strings ni en logs; política de privacidad publicada |

## 10. Decisiones PENDIENTE MARK

| # | Decisión | Opciones | Efecto si no se decide |
|---|---|---|---|
| 1 | Comisión Atlante → PEX | 20 % (igual a B2B) / otro | Se configura 20 % como valor por defecto editable en admin |
| 2 | Comisión con operadores aliados | 10 % / 15 % / 20 % / por acuerdo | Campo por operador; landing `/aliados` dice "según acuerdo" |
| 3 | Unidad del add-on de Contadora (+$50) | por persona / por reserva | El add-on se crea inactivo |
| 4 | Buzón real de Atlante | concierge@atlantedelpacifico.lat / Gmail / otro | El email se quita del sitio (queda WhatsApp) hasta tenerlo |
| 5 | Dominio .com | comprar y redirigir / eliminar referencias | Se eliminan las referencias (no se compra nada sin tu ok) |
| 6 | Logo de PEX en Atlante | sí / no | Disclosure sólo con texto |
| 7 | Entidad que factura comisiones (razón social y RUC) | Tanya Engineering / SEDECO / nueva | Footer y términos sin razón social (BORRADOR) |
| 8 | Ferry Taboga hoy | activo / pausado | Se carga `available = false` hasta confirmar |
| 9 | Google Business Profile para Atlante | sí (dirección propia) / no | No se crea |
| 10 | Supabase "ATLANTE" pausado | restaurar el proyecto existente / crear uno nuevo | Bloquea R1 (los leads no se guardan) |
| 11 | Quién implementa X1–X9 en PEX | sesión de Code de PEX / Fable / otro | Atlante arranca en modo puente |
| 12 | Horario de respuesta por WhatsApp para publicarlo como hecho verificable | p. ej. "lun–dom 8:00–20:00" | No se publica ninguna promesa de tiempo de respuesta |
'@
$Docs["docs/TODO-atlante-v2.md"] = @'
# TODO — Atlante del Pacífico v2 (broker PEX + charters)

Fecha: 2026-09-09 · Orden = prioridad de ejecución · Esfuerzo estimado para una sesión de código (Claude Code) salvo donde dice Mark / PEX / comercial. Acompaña al `02-PRD-atlante-v2.md`.

Leyenda de "Dónde": Atlante = repo `mharr92-hub/atlante` · PEX = repo de Pacific Experience (otra sesión) · Mark = decisión o cuenta que sólo él puede tocar · Infra = Vercel / Supabase.

| ID | Tarea | Prio | Release | Dónde | Archivos / notas | Esfuerzo | Depende de |
|---|---|---|---|---|---|---|---|
| T01 | Crear rama `feature/atlante-broker` desde `origin/main` (escritor único; sin merge ni deploy sin ok de Mark) | P0 | R0 | Atlante | git | 5 min | — |
| T02 | Dominio y contacto reales: `site.url`/`domain` → `https://www.atlantedelpacifico.lat`; borrar `trust`; email fuera del sitio hasta tener buzón real | P0 | R0 | Atlante | `src/config/site.ts`, `Hero.tsx`, `Footer.tsx`, `ContactSection.tsx`, `layout.tsx` | 1 h | — |
| T03 | Eliminar reseñas inventadas y el `aggregateRating` del JSON-LD del home | P0 | R0 | Atlante | borrar `src/content/reviews.ts`, `ReviewsSection.tsx`; `app/(site)/page.tsx` | 1 h | — |
| T04 | Quitar la urgencia falsa ("Pocos cupos esta semana") | P0 | R0 | Atlante | `TourCard.tsx` (prop `urgency`), `ToursSection.tsx`, `i18n.ts` (`spots_left`), `globals.css` | 30 min | — |
| T05 | Apagar el popup "10 % en tu primera reserva" y el código ATLANTE10; `/api/lead` pasa a guardar `Subscriber` o se elimina | P0 | R0 | Atlante | `LeadPopups.tsx`, `app/api/lead/route.ts`, `i18n.ts` (`popup_*`) | 1 h | — |
| T06 | Sólo USD: quitar selector de moneda y tasas fijas | P0 | R0 | Atlante | `lib/format.ts`, `lib/currency-context.tsx`, `Header.tsx`, `Providers.tsx` | 1 h | — |
| T07 | Eliminar la palabra "Sunset" de todo texto público (ES/EN) | P0 | R0 | Atlante | `i18n.ts` (`filter_sunset`, `tours_title`), `app/layout.tsx` (keywords), `Destinations.tsx`; `tours.ts` se borra en T21 | 30 min | — |
| T08 | Componente único `PexDisclosure` ("Agente autorizado de Pacific Experience…") en home, catálogo, paso 3, redirección y footer | P0 | R0 | Atlante | `components/site/PexDisclosure.tsx` | 1 h | — |
| T09 | Páginas legales en BORRADOR: `/terminos`, `/privacidad`, `/cancelaciones`, `/como-funciona` + enlaces en footer | P0 | R0 | Atlante | `app/(site)/legal/*` | 3 h | — |
| T10 | Redirecciones 301: `/compare` → `/charters/comparar`; `/tours/charter-*`, `/tours/yate-*` → `/charters`; tours inventados → `/tours` | P0 | R0 | Atlante | `next.config.ts` | 30 min | — |
| T11 | Crear `.env.example` con todas las variables (DATABASE_URL, DIRECT_URL, ADMIN_PASSWORD, AUTH_SECRET, NEXT_PUBLIC_GA_ID, NEXT_PUBLIC_META_PIXEL_ID, NEXT_PUBLIC_PEX_BASE_URL, PEX_HANDOFF_SECRET, PEX_WEBHOOK_SECRET, CRON_SECRET) | P0 | R0 | Atlante | `.env.example`, README | 30 min | — |
| T12 | Quitar el JSON-LD `Offer` con precio inventado de las fichas hasta que exista catálogo real | P0 | R0 | Atlante | `app/(site)/tours/[slug]/page.tsx` | 30 min | — |
| T13 | Deploy de R0: build limpio, push, preview, aprobación, merge, verificación en 3 niveles, alta en Search Console del .lat y re-rastreo | P0 | R0 | Mark + Atlante | Vercel | 1 h | T02–T12 |
| T14 | Restaurar el proyecto Supabase "ATLANTE" (`odeivsrdtgernzndwnmm`, hoy INACTIVE) o crear uno nuevo | P0 | Infra | Mark | Decisión #10 | 15 min | — |
| T15 | Configurar en Vercel: `DATABASE_URL` (pooler 6543), `DIRECT_URL` (5432), `ADMIN_PASSWORD`, `AUTH_SECRET` | P0 | Infra | Mark | Antes del push de R1 (las `NEXT_PUBLIC_` se hornean en build) | 15 min | T14 |
| T16 | Decidir buzón real y dominio .com (comprar + 301, o eliminar referencias) | P0 | Infra | Mark | Decisiones #4 y #5 | — | — |
| T17 | Crear propiedad GA4 y Meta Pixel; cargar `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_META_PIXEL_ID` en Vercel | P0 | Infra | Mark | Activa `Analytics.tsx` | 30 min | — |
| T18 | Prisma: `Product`, `ProductAddon`, `Operator`, `Vessel`, `PartnerApplication`, `Handoff`, `PexEvent`; rediseñar `Lead` (el actual pasa a `Subscriber`); migración `broker_v2` | P0 | R1 | Atlante | `prisma/schema.prisma`, `prisma/migrations/*` | 4 h | T14, T15 |
| T19 | Seed del catálogo PEX con `verifiedAt = 2026-09-09` y `sourceUrl`: Ferry Taboga (estado PENDIENTE), Tour por la Bahía $25, Party en la Bahía desde $35, Contadora `available=false` + add-on inactivo; operador `pex` | P0 | R1 | Atlante | `prisma/seed.ts` (idempotente) | 2 h | T18 |
| T20 | `src/lib/pex.ts` con `buildPexUrl()` + test unitario "toda URL lleva `ref=ATLANTE`" + script `npm run check:pex-links` | P0 | R1 | Atlante | `lib/pex.ts`, `tests/pex.test.ts`, `scripts/check-pex-links.ts` | 3 h | — |
| T21 | `/tours` (catálogo) y `/tours/[slug]` (ficha) desde la base de datos; borrar `content/tours.ts` y el comparador viejo | P0 | R1 | Atlante | `app/(site)/tours/*`, `components/tour/*` | 1 día | T18, T19 |
| T22 | Funnel `/reservar/[slug]` en 3 pasos: estado en URL, calendario por `schedule`, categorías de pasajero, adicionales, resumen, checkbox de políticas | P0 | R1 | Atlante | `app/(site)/reservar/[slug]/*`, `components/funnel/*` | 2 días | T21 |
| T23 | `POST /api/leads` (crea `Lead` + `Handoff`, devuelve `destinationUrl`, nunca bloquea) + pantalla `/reservar/[slug]/listo` con código ATLANTE copiable y salto en 2 s | P0 | R1 | Atlante | `app/api/leads/route.ts`, `app/(site)/reservar/[slug]/listo/page.tsx` | 4 h | T20, T22 |
| T24 | `GET /api/handoff/[token]`: secreto compartido, un solo uso, TTL 30 min, sin PII en logs | P0 | R1 | Atlante | `app/api/handoff/[token]/route.ts` | 2 h | T18 |
| T25 | Admin `/admin/leads`: filtros, detalle, botón WhatsApp de rescate, "marcar pagado" con `pex_booking_id` y monto, export CSV | P0 | R1 | Atlante | `app/admin/(dash)/leads/*`, `admin/actions.ts` | 1 día | T18 |
| T26 | Admin `/admin/catalogo`: CRUD de productos y adicionales, `verificado_el` visible, aviso a los 14 días sin verificar | P0 | R1 | Atlante | `app/admin/(dash)/catalogo/*` | 1 día | T18 |
| T27 | `npm run check:pex`: compara precio y disponibilidad del catálogo contra las páginas públicas de PEX y lista diferencias (sólo reporta) | P0 | R1 | Atlante | `scripts/check-pex.ts` | 3 h | T19 |
| T28 | Analítica: helper `track()` con los eventos del PRD 5.12, GA4 `linker` hacia pacificexperience.lat, evento `Lead` de Meta en el paso 3 | P0 | R1 | Atlante | `lib/analytics.ts`, `Analytics.tsx` | 3 h | T17, T22 |
| T29 | Tarjetas simples de las naves PEX (Aura, Pacific Ferry 1, Sirena del Mar) con deep-link `charter_checkout` para no perder atribución antes de R2 | P0 | R1 | Atlante | `components/sections/ChartersSection.tsx` | 2 h | T20 |
| T30 | Retirar del flujo público `/api/bookings`, `PriceCalculator`, el seed antiguo y `AvailabilitySlot` | P0 | R1 | Atlante | `app/api/bookings/route.ts`, `components/tour/PriceCalculator.tsx`, `prisma/seed.ts` | 2 h | T22 |
| T31 | QA de R1 (criterios A1–A6, A8–A10, A12), capturas móvil 390 px y desktop, build, push de la rama (sin merge) | P0 | R1 | Atlante | Reporte con SHA | 4 h | T18–T30 |
| T32 | X1 — Leer `ref`/`ref_id` por URL en checkouts de tours, charter y ferry; prellenar `referral_code`; guardar `ref`, `ref_id`, `utm_*` en la orden; cookie 30 días | P0 | R1b | PEX | Anexo PRD §7 | 1 día | — |
| T33 | X2 — Aceptar `tickets` (y categorías) por URL en el checkout de tours | P0 | R1b | PEX | §7 | 2 h | T32 |
| T34 | X3 — Prellenado por token `h` consultando `GET atlante/api/handoff/<h>` | P0 | R1b | PEX | §7 | 4 h | T24 |
| T35 | X4 — Feed público `GET /api/public/trips` y `GET /api/public/slots` (cache 60 s, sin PII) | P0 | R1b | PEX | §7 | 1 día | — |
| T36 | X5 — Webhook firmado `booking.paid` / `cancelled` / `refunded` hacia Atlante cuando `referral_code = ATLANTE` | P0 | R1b | PEX | §7 | 4 h | T44 |
| T37 | X6 — `purchase` cross-domain en la página de éxito (aceptar `_gl`) | P1 | R1b | PEX | §7 | 2 h | T28 |
| T38 | X7 — Add-on "Tour por las islas — 4 h — +$50" en el ferry de Contadora, premarcado por `addon=` | P1 | R1b | PEX | Cuando Contadora se active; unidad = decisión #3 | 2 h | — |
| T39 | X8 — Calendario en `/ferry/bahia` en lugar de las píldoras de fechas | P1 | R1b | PEX | Mejora propia de PEX | 4 h | — |
| T40 | X9 — Registrar `BROKER = ATLANTE` en la hoja de disponibilidad de charters para reservas con `ref=ATLANTE` | P1 | R1b | PEX / ops | Google Sheets de charters | 30 min | — |
| T41 | `ProductSlot` + `GET /api/cron/sync-pex` (Vercel Cron cada 15 min, `CRON_SECRET`, fallback al último snapshot) | P0 | R1c | Atlante | `app/api/cron/sync-pex/route.ts`, `vercel.json` | 1 día | T35 |
| T42 | Paso 2 con fechas y cupos reales: sólo días con salida, abre en la próxima salida, valida cupo, ofrece 3 próximas fechas | P0 | R1c | Atlante | `components/funnel/DatePicker.tsx` | 1 día | T41 |
| T43 | `buildPexUrl` target `tour_checkout` con `slot_id`, `tickets`, `h` (deep-link directo al checkout) | P0 | R1c | Atlante | `lib/pex.ts` | 2 h | T32–T34 |
| T44 | `POST /api/pex/booking-confirmed`: firma HMAC + timestamp, idempotencia por `pex_booking_id`, estados `paid` / `paid_unmatched`, reversión por cancelación | P0 | R1c | Atlante | `app/api/pex/booking-confirmed/route.ts` | 4 h | T18 |
| T45 | Admin `/admin/comisiones`: mes, operador, reservas, monto, %, comisión; export CSV para Sheets | P0 | R1c | Atlante | `app/admin/(dash)/comisiones/*` | 4 h | T44 |
| T46 | Regla automática `lost` a los 7 días sin pago + aviso al concierge (email/WhatsApp) por cada lead nuevo | P1 | R1c | Atlante | Cron + `lib/notify.ts` | 3 h | T25 |
| T47 | Fichas `Vessel` de Aura, Pacific Ferry 1 y Sirena del Mar con datos de PEX (precios de PF1 y Sirena: NO ENCONTRADOS el 09/09 → revisar `/charter/pacific-ferry-1` y `/charter/sirena-del-mar`) | P1 | R2 | Atlante | `prisma/seed.ts` | 4 h | T18 |
| T48 | `/charters` listado con filtros (capacidad, presupuesto, duración, ruta, tipo, marina) y precio por persona calculado | P1 | R2 | Atlante | `app/(site)/charters/page.tsx` | 1 día | T47 |
| T49 | `/charters/[slug]` ficha estándar + badge "Reserva directa" (PEX, deep-link con `ref`) vs "Cotizar" (aliado) | P1 | R2 | Atlante | `app/(site)/charters/[slug]/page.tsx` | 1 día | T47 |
| T50 | `/charters/comparar` (hasta 4 naves; precio por hora y por persona; incluye / no incluye) | P1 | R2 | Atlante | `components/charters/Compare.tsx` | 4 h | T48 |
| T51 | `/cotizar/[slug]`: lead `charter_partner` (fecha, horas, pax, ocasión, datos) → WhatsApp del concierge; estados `quote_requested` → `paid` en admin | P1 | R2 | Atlante | `app/(site)/cotizar/[slug]/*`, `admin/leads` | 1 día | T25 |
| T52 | `/aliados` + `/aliados/registro` → `PartnerApplication` + `/admin/aliados` | P1 | R2 | Atlante | `app/(site)/aliados/*`, `app/admin/(dash)/aliados/*` | 1 día | T18 |
| T53 | Admin `/admin/naves` y `/admin/operadores`: CRUD, `comision_pct`, contrato, checklist "verificado" (AMP, seguro) | P1 | R2 | Atlante | `app/admin/(dash)/naves/*`, `operadores/*` | 1 día | T18 |
| T54 | Códigos de aliado: `?partner=CODE` → cookie 30 días → `Lead.partnerCode`; reparto en `/admin/comisiones`; reutiliza `Reseller` | P1 | R3 | Atlante | `middleware.ts`, `lib/partner.ts` | 4 h | T45 |
| T55 | Contrato de comisión tipo para operadores + kit de operador (ficha estándar, fotos mínimas, políticas) | P1 | R3 | Mark / legal | Sin plantilla en el repo | 1 día | Decisión #2 |
| T56 | Prospección: 5 primeros operadores reales, hoteles y concierges con código, reutilizar los ~62 prospectos B2B de PEX desde la marca Atlante | P1 | R3 | Comercial | CRM / Sheets | Continuo | T52, T54 |
| T57 | Páginas `/destinos/taboga`, `/destinos/las-perlas`, `/destinos/bahia` con "todas las formas de ir" | P2 | R4 | Atlante | `app/(site)/destinos/[slug]/page.tsx` | 1 día | T21, T48 |
| T58 | EN completo + `hreflang` + rutas `/en/*` | P2 | R4 | Atlante | `i18n.ts`, `middleware.ts`, metadata | 2 días | T57 |
| T59 | Guías comparativas (2 al mes): ferry vs charter a Taboga, cuánto cuesta un yate por persona, mejor mes para Las Perlas | P2 | R4 | Atlante / contenido | `app/(site)/blog/*` | Continuo | T57 |
| T60 | Ads: reparto de palabras clave (Atlante = comparación/charter; PEX = marca/producto); remarketing Meta a `redirect_to_pex` sin `purchase` | P2 | R4 | Mark / ads | Google Ads + Meta | Continuo | T28, T37 |
| T61 | Google Business Profile para Atlante sólo si tiene dirección/entidad distinta de PEX | P2 | R4 | Mark | Decisión #9 | — | Decisión #7 |
| T62 | CI: Lighthouse móvil ≥ 85 y Playwright e2e del funnel en cada preview | P2 | R4 | Atlante | `.github/workflows/ci.yml` | 1 día | T31 |

Resumen de esfuerzo (sesión de código, Atlante): R0 ≈ 1–2 días · R1 ≈ 6–8 días · R1c ≈ 3–4 días · R2 ≈ 5–6 días · R3 ≈ 1 día · R4 ≈ 5+ días. PEX (R1b) ≈ 3–4 días en la sesión de PEX.
'@
$Docs["docs/analisis-broker-2026-09-09.md"] = @'
# Atlante del Pacífico como broker/revendedor de Pacific Experience — análisis y plan de mejoras

Fecha: 2026-09-09 · Fuentes: recorrido en vivo de atlantedelpacifico.lat y pacificexperience.lat (home, fichas, comparador, checkout). Todo lo que no pude verificar está marcado NO VERIFICADO / NO ENCONTRADO.

> Nota (sesión 2, mismo día): este documento es el análisis original. Los puntos D7 y D8 quedaron resueltos al revisar el repo (ver `02-PRD-atlante-v2.md`, sección "Auditoría del repo").

## 1. Resumen en cinco líneas

Atlante hoy es una landing bonita con datos de relleno: precios irreales ($850–$2,800 por persona), 127 reseñas y testimonios que no existen, canonical y sitemap apuntando a un dominio muerto (.com) y todo cierra en WhatsApp. Para convertirlo en broker de PEX hacen falta tres cosas: (1) limpiar lo que hoy es falso o roto, (2) montar el portal de ticketería PEX con el flujo de 3 clics y una atribución real de comisión, y (3) montar el listado de charters como marketplace con naves de PEX y de terceros. La pieza más valiosa que ya existe es que el checkout de PEX es parametrizable por URL (`/tours/checkout?slot_id=&trip_id=&date=`) y ya tiene un campo "Código de referido": el handoff se puede hacer casi sin tocar PEX.

Un punto honesto sobre el modelo: la "comisión" de PEX a Atlante es dinero que pasa de un bolsillo tuyo al otro. El valor real de Atlante está en (a) capturar demanda que PEX no capta (segunda marca en buscadores, en anuncios y en el mundo "broker/comparador"), (b) ganar comisión real sobre charters de terceros, y (c) ser el paraguas de alianzas con hoteles, concierges y operadores. Las recomendaciones están ordenadas con esa lógica.

## 2. Diagnóstico del sitio actual (lo que hay que arreglar antes de vender nada)

| # | Hallazgo | Evidencia observada | Impacto | Acción |
|---|---|---|---|---|
| D1 | Canonical, robots.txt y sitemap apuntan a atlantedelpacifico.com | `<link rel=canonical>` = atlantedelpacifico.com/...; robots.txt → `Sitemap: https://atlantedelpacifico.com/sitemap.xml`; sitemap lista URLs .com; el .com NO resuelve (DNS_PROBE) | Crítico: Google puede desindexar el .lat por señalar a un dominio inexistente | Cambiar `metadataBase`/canonical/sitemap/robots a https://www.atlantedelpacifico.lat (o comprar el .com y redirigir 301 al .lat) |
| D2 | Email de contacto en dominio inexistente | concierge@atlantedelpacifico.com | Leads perdidos | Usar un buzón real (p.ej. concierge@atlantedelpacifico.lat o el Gmail del negocio) y probarlo |
| D3 | Precios de relleno | Travesía atardecer "desde $850 por persona"; Taboga "$1,450 pp"; Las Perlas "$2,800 pp"; charters $1,200/$1,800/$3,200 | Destruye credibilidad; PEX vende el tour bahía a $25 pp y el Aura desde $1,300 | Reemplazar por precios reales de PEX y de cada operador aliado; paridad de precio con PEX obligatoria (el cliente paga en PEX) |
| D4 | Prueba social inventada | "Google 4.9 · 127 reseñas · +200 experiencias · 14 min respuesta"; 3 testimonios con nombres y etiquetas Google/TripAdvisor | Riesgo legal (publicidad engañosa, ACODECO) y de reputación si un cliente lo verifica | Quitar todo; mostrar sólo reseñas reales (PEX tiene 5.0 · 9 reseñas en Google) citando la fuente, o nada hasta tenerlas |
| D5 | Urgencia falsa | Badge "Pocos cupos esta semana" en las 3 tarjetas de tours | Mismo riesgo que D4 | Sustituir por cupos reales del feed de PEX ("28 cupos · 18/09") o eliminar |
| D6 | Capacidad placeholder | /compare: "12 personas" en los 6 productos | Comparador inútil | Alimentar desde catálogo real (Aura hasta 35, Sirena 30–80, etc.) |
| D7 | Widget de reserva "fantasma" | Ficha de tour: contador de invitados, total, "Depósito 30%", fecha/nombre/email → POST a `/api/bookings`. Destino del dato NO VERIFICADO (no envié el formulario) | El cliente cree que reserva y no hay pago ni confirmación | Convertirlo en el paso 1–3 del flujo de reventa (sección 4) que termina en el checkout de PEX |
| D8 | Formulario de contacto sólo abre WhatsApp | Botón "Enviar por WhatsApp"; existe `/api/lead` en el bundle (persistencia NO VERIFICADA) | Sin CRM ni seguimiento | Guardar cada lead en Supabase (tabla `leads`) y además abrir WhatsApp |
| D9 | Charters viven bajo /tours/ | /tours/charter-atardecer-privado, /tours/yate-completo-taboga… | Confunde SEO y navegación | Separar rutas: /tours/… (reventa PEX) y /charters/… (marketplace de naves) |
| D10 | Sin analítica ni píxel | `window.dataLayer` y `fbq` ausentes | No se puede medir ni atribuir | GA4 + Meta Pixel con tracking cross-domain hacia pacificexperience.lat |
| D11 | Sin páginas legales | Footer sin términos, privacidad, política de cancelación, razón social | Requisito para pasarelas, ads y confianza | Términos, privacidad, "Cómo funciona / quién cobra", política de cancelación (heredada de PEX o del operador) |
| D12 | Selector USD/EUR/COP/MXN | Conversión en cliente; el pago en PEX es en USD | Expectativa falsa de cobro en otra moneda | Mantener sólo como "referencia aproximada" o quitar |
| D13 | Sin hreflang / EN incompleto | Botón EN existe; sin `<link rel=alternate hreflang>` | SEO bilingüe débil | hreflang es/en y rutas /en/… |
| D14 | Contenido de destinos sin páginas propias | Taboga, Las Perlas, Bahía son sólo tarjetas | Se pierde SEO de destino (donde un broker gana) | Páginas /destinos/taboga, /destinos/las-perlas, /destinos/bahia con "todas las formas de ir" (ferry, tour, charter) |

## 3. Arquitectura propuesta: dos portales bajo una marca

| Portal | Qué vende | Quién cobra | Dónde gana Atlante | Rutas propuestas |
|---|---|---|---|---|
| Ticketería (reventa PEX) | Ferry Taboga, Tour por la Bahía, Party en la Bahía (Sirena del Mar) y cualquier tour nuevo de PEX | Siempre PEX (Yappy / PagueloFácil en pacificexperience.lat) | Comisión interna por `referral_code=ATLANTE` + captura del lead antes del pago | /tours, /tours/[slug], /ferry, /reservar/[slug] (3 pasos) |
| Reservas de naves (marketplace de charters) | Aura, Pacific Ferry 1, Sirena del Mar (PEX) + naves de operadores aliados | PEX para sus naves (deep-link a `/charter/checkout?vessel=…`); el operador para las suyas; Atlante factura comisión al operador | Comisión real 10–20 % sobre terceros; comisión interna sobre PEX | /charters, /charters/[slug], /charters/comparar, /cotizar |
| Capa común | Destinos, guías, comparador, blog, "Cómo funciona", alianzas | — | SEO de broker/comparador que PEX no puede hacer sin canibalizarse | /destinos/[slug], /como-funciona, /aliados, /blog |

Regla de oro: Atlante nunca cobra al cliente final. Así no necesita pasarela, no asume responsabilidad de operador ante ACODECO y el texto legal es simple ("Atlante es agente/representante autorizado; la reserva y el pago se procesan con el operador").

## 4. Portal de ticketería PEX — flujo de 3 clics

### 4.1 Cómo se ve para el cliente

| Clic | Pantalla en Atlante | Qué captura | Qué muestra |
|---|---|---|---|
| 0 | /tours (catálogo PEX) | — | Tarjetas con precio real, duración, próxima salida y cupos reales; banda "Agente autorizado de Pacific Experience" |
| 1 | Elegir tour | `trip_id` | Ficha: fotos, itinerario, incluye, políticas de PEX |
| 2 | Fecha + salida + cantidad | `date`, `slot_id`, `pax` (y categorías adulto/niño/jubilado) | Calendario con fechas reales del feed de PEX y cupos por salida |
| 3 | Datos | nombre, email, teléfono, checkbox políticas | Resumen + "Pagar en Pacific Experience" (explicación de un renglón: "Serás redirigido al checkout seguro de PEX; el cobro lo hace PEX") |
| → | Redirección | — | `https://www.pacificexperience.lat/tours/checkout?trip_id=…&slot_id=…&date=…&tickets=N&ref=ATLANTE&h=<token>&utm_source=atlante` |

El cliente llega al checkout de PEX con todo prellenado y sólo confirma y paga. Atlante ya guardó el lead (nombre, WhatsApp, tour, fecha) para seguimiento si abandona. Los datos personales no viajan en la URL: Atlante crea un registro `handoff` con un token de un solo uso (expira en 30 min) y PEX lo consulta servidor-a-servidor (`GET atlante/api/handoff/<token>`) para prellenar nombre, correo y teléfono. Así no quedan datos personales en logs, analítica ni historial del navegador.

### 4.2 Lo que hay que construir en cada lado

| Lado | Cambio | Detalle técnico | Esfuerzo |
|---|---|---|---|
| PEX | Feed público de catálogo y disponibilidad | Endpoint sólo lectura, p.ej. `GET /api/public/trips` (id, nombre, precio, duración, capacidad, políticas) y `GET /api/public/slots?trip_id=&from=&to=` (fecha, hora, cupos, precio). Cache 60 s. Sin datos personales | 1 día |
| PEX | Checkout acepta prellenado por URL + token | Leer `tickets`, `ref` y `h` en `/tours/checkout` y `/charter/checkout`; con `h` consulta el handoff en Atlante y prellena nombre/correo/teléfono; `ref` rellena el campo existente `referral_code` (hoy sólo manual, NO VERIFICADO que acepte URL) | 1 día |
| PEX | Persistir origen en la reserva | Guardar `referral_code` y `utm_*` en la reserva; cookie de 30 días para que si el cliente vuelve directo, la comisión se conserve | Medio día |
| PEX | Webhook de confirmación | Al confirmarse el pago con `referral_code=ATLANTE`, POST firmado a Atlante (`/api/pex/booking-confirmed`) con id, monto, tour, fecha (sin datos de tarjeta) | Medio día |
| PEX | Página de éxito con evento cross-domain | Disparar `purchase` en GA4/Meta con el `client_id` recibido por linker | Medio día |
| Atlante | Catálogo sincronizado | Cron (Vercel) que lee el feed de PEX y actualiza tabla `products` en Supabase (`source='pex'`); fallback al último snapshot si PEX no responde | 1 día |
| Atlante | Flujo /reservar/[slug] en 3 pasos | Estado en URL (`?date=&slot=&pax=`) para que el cliente pueda volver atrás; validación de cupos contra el feed antes de redirigir | 2 días |
| Atlante | Tabla `leads` + notificación | Guardar lead al paso 3 y avisar por WhatsApp/Email al concierge; estado `redirigido → pagado` cuando llega el webhook | 1 día |
| Atlante | Tracking | GA4 con `linker` hacia pacificexperience.lat; Meta Pixel; evento `redirect_to_pex` | Medio día |
| Ambos | Reporte de comisiones | Vista mensual: reservas con `referral_code=ATLANTE`, monto, comisión %; exportable a Sheets | 1 día |

### 4.3 Catálogo PEX a listar (precios observados hoy en pacificexperience.lat)

| Producto | Precio observado | Datos clave | Deep-link objetivo |
|---|---|---|---|
| Ferry a Isla Taboga (boleto abierto) | Adulto nacional desde $10 por tramo · turista $12 entre semana / $15 fin de semana · niño y jubilado $8 · entrada puerto $1 | Sin hora fija, válido 180 días; salidas 5:45 AM – 3:35 PM desde Isla Perico | URL del checkout de ferry NO VERIFICADA (botón "Comprar boleto") |
| Tour por la Bahía (Pacific Ferry 1) | $25 por persona | 1 h 30 min; salidas 5:30–7:00 PM y 8:00–9:30 PM; fechas vie/sáb/dom desde 18/09/2026; fee de puerto incluido | `/tours/checkout?slot_id=&trip_id=&date=` (verificado) |
| Party en la Bahía — Sirena del Mar | Desde $35 por persona | 2 h 30 min; vie · sáb 7:00–9:30 PM; 30 a 80 personas; DJ, bebida de bienvenida, barra de pago | `/tours/c0d1a003-0000-4000-8000-000000000085` → checkout |
| Chárter Aura | Barco completo desde $1,300 · desde $55/persona | Hasta 35 personas; 4h · 8h · 12h; Marina Flamenco; apartado 30 % | `/charter/checkout?vessel=aura` (verificado en enlace) |
| Chárter Pacific Ferry 1 / Sirena del Mar | NO ENCONTRADO en la ficha (páginas /charter/pacific-ferry-1 y /charter/sirena-del-mar existen; precios no revisados) | — | `/charter/checkout?vessel=pacific-ferry-1` / `?vessel=sirena-del-mar` (por analogía, NO VERIFICADO) |

Nota: en agosto quedó registrado "ferry pausado hasta nuevo aviso", pero hoy la página /ferry/taboga muestra horarios y "Comprar boleto". Conviene confirmar el estado real antes de listarlo en Atlante.

### 4.4 Reglas comerciales del portal de reventa

| Regla | Por qué |
|---|---|
| Paridad de precio con PEX, siempre | El cliente ve el precio final en PEX; cualquier diferencia rompe la confianza y la comisión no justifica el margen |
| Mismas políticas que PEX (100 % al reservar tour, reembolso sólo 24 h, charter 30 % apartado) mostradas antes del clic 3 | Evita reclamos "en Atlante decía otra cosa" |
| Transparencia "Agente autorizado de Pacific Experience" en catálogo, paso 3 y footer | Cumple deber de información al consumidor y explica por qué el pago cambia de dominio |
| Comisión interna sugerida: la misma que ya definiste para B2B en PEX (20 %) | Un solo número para Atlante, hoteles y agencias simplifica el reporte |
| Lead siempre capturado antes de redirigir | El abandono en checkout se recupera por WhatsApp desde el número de Atlante (+507 6860 3623), que es distinto al de PEX |

## 5. Portal de reservas de naves — marketplace de charters

### 5.1 Qué es y qué no es

Atlante lista "los mejores charters de Panamá": las 3 naves de PEX más las de operadores aliados. Para naves de PEX el cierre es el checkout de PEX (`/charter/checkout?vessel=aura&ref=ATLANTE`, apartado 30 %). Para naves de terceros, en la versión 1 el cierre es una cotización gestionada por el concierge de Atlante (lead → WhatsApp → propuesta → el operador cobra al cliente → el operador paga comisión a Atlante). Sólo cuando un operador tenga reserva online propia se le hace deep-link como a PEX.

### 5.2 Ficha estándar de nave (campos del catálogo en Supabase)

| Campo | Ejemplo Aura (observado en PEX) | Obligatorio |
|---|---|---|
| Nombre, tipo, eslora | Aura · catamarán · eslora NO ENCONTRADA en la ficha | Sí |
| Operador (`source`) | pex / nombre del aliado | Sí |
| Capacidad máxima | Hasta 35 personas | Sí |
| Salida (marina) | Marina Flamenco, Amador | Sí |
| Duraciones y precios | 4h · 8h · 12h; barco completo desde $1,300; desde $55/persona | Sí |
| Rutas | Taboga, Bahía, Las Perlas | Sí |
| Incluye | Combustible, capitán y marino, hielo/coolers, nevera, toallas, agua y sodas, BBQ, piscina de mar, A/C, camarotes, baños y duchas, agua caliente, sonido | Sí |
| Bajo solicitud | Snorkel, kayaks, sillas flotantes, pesca | No |
| Política de apartado y cancelación | 30 % apartado; saldo 24 h antes (regla PEX) | Sí |
| Fotos (mín. 8) y video | Galería 23 fotos en PEX | Sí |
| Reseñas reales con fuente | 5.0 · 9 reseñas Google (PEX) | No |
| Modo de cierre | `deeplink` (URL) o `cotizacion` (lead) | Sí |
| Comisión pactada y contrato firmado | 20 % PEX/B2B; terceros según acuerdo | Sí (interno, no visible) |

### 5.3 Flujo de cotización de charter (naves de terceros)

| Paso | Atlante | Operador aliado |
|---|---|---|
| 1 | Cliente elige nave, fecha, horas, pax y deja datos → lead en Supabase con `vessel_id` | — |
| 2 | Concierge confirma disponibilidad por WhatsApp/Email con el operador (SLA 2 h) | Responde disponibilidad y precio final |
| 3 | Atlante envía propuesta al cliente (plantilla PDF ya existente en tu flujo de propuestas) con precio del operador, sin recargo visible | — |
| 4 | Cliente acepta → Atlante pasa el contacto y el resumen al operador | Operador cobra apartado y saldo directamente al cliente |
| 5 | Operador confirma pago → Atlante marca `pagado` | Paga comisión a Atlante a fin de mes contra factura |

Motivo de que cobre el operador: Atlante no maneja dinero de clientes, no necesita pasarela ni fianza, y la responsabilidad del servicio (seguro, licencias AMP, tripulación) queda en quien opera la nave.

### 5.4 Funciones del portal de charters

| Función | Descripción | Prioridad |
|---|---|---|
| Listado con filtros | Capacidad, presupuesto, duración, ruta, tipo de nave, salida | Alta |
| Comparador real | Reemplaza /compare: hasta 4 naves, precio por hora y por persona, incluye/no incluye | Alta |
| "Precio por persona" calculado | Barco completo ÷ pax elegido, como ya hace PEX ("desde $55/persona") | Alta |
| Disponibilidad | PEX: del feed; terceros: "consultar" con badge de tiempo de respuesta real | Media |
| Ocasiones | Landing por ocasión: cumpleaños, despedida, corporativo, propuesta de matrimonio, atardecer | Media |
| Sello "Operador verificado" | Sólo con licencia AMP, seguro y contrato de comisión firmados (checklist interno) | Media |
| Alta de operador (self-service) | Formulario /aliados/registro que crea la ficha en borrador para revisión | Media |
| Calendario compartido | Cuando haya 3+ operadores, sincronizar bloqueos por iCal/WhatsApp | Baja |

## 6. Alianzas — cómo usar Atlante como paraguas

| Tipo de aliado | Qué le ofrece Atlante | Cómo cierra | Comisión | Herramienta |
|---|---|---|---|---|
| Operadores de charter (yates, lanchas, veleros) | Ficha en el marketplace, leads calificados, propuesta profesional | Cotización → operador cobra | 10–20 % pagada por el operador | Contrato de agencia/comisión + ficha estándar |
| Hoteles y concierges | Portal con su propio código de referido (reutiliza `referral_code` de PEX; para terceros lo lleva Atlante) | Cliente reserva en Atlante con código del hotel | El hotel recibe parte de la comisión (p.ej. 10 % de los 20 %) | Landing /aliados + reporte mensual |
| Agencias y DMC | Tarifa neta y listado unificado (ferry + tours + charters) | Reserva en PEX con código de la agencia | Igual que B2B PEX (20 %) | Los ~62 prospectos ya compilados para PEX se pueden trabajar desde Atlante sin canibalizar la marca PEX |
| Organizadores de eventos (Instagram) | Party en la Bahía y charters para grupos 30–80 | Deep-link PEX | Comisión por evento | Kit de promo con enlaces `ref=` únicos |
| Restaurantes/actividades en Taboga | Paquete ferry + almuerzo/actividad | Ferry en PEX + reserva del aliado | Cruzada | Página /destinos/taboga |

## 7. Marca, confianza y legal

| Tema | Recomendación |
|---|---|
| Posicionamiento | Mantener la voz de "concierge marítimo que elige por ti" — es lo que justifica un broker frente a ir directo a PEX. Hero actual está bien; hay que cambiar el subtítulo por algo verificable ("Comparamos ferry, tours y charters de operadores verificados y te llevamos al pago directo con el operador") |
| Relación con PEX | Declararla: "Agente autorizado de Pacific Experience" en catálogo, checkout y footer. No presentar a Atlante como independiente si comparte dueño: lo verificable no da problemas, lo inventado sí |
| Reseñas | Sólo reales y con fuente. Se puede mostrar el widget de Google de PEX en las fichas de PEX ("Reseñas del operador") |
| Textos legales | /terminos (rol de intermediario, quién cobra, quién opera), /privacidad (datos del lead, handoff a PEX, cookies), /cancelaciones (espejo de PEX + regla por operador), /como-funciona (3 clics explicados) |
| Datos del negocio | Razón social y RUC de la entidad que factura comisiones (NO ENCONTRADO en el sitio). Si Atlante factura a operadores, necesita entidad y facturación propias |
| Marca y dominio | Comprar atlantedelpacifico.com (el sitio ya lo cita en canonical/email) y redirigir al .lat, o eliminar toda referencia al .com |
| Números de contacto | Mantener el WhatsApp de Atlante (+507 6860 3623) separado del de PEX (+507 6493-5541 / 6441-5920) para que el cliente perciba dos marcas y el seguimiento se pueda medir |
| Consumidor | Sin urgencia inventada, precio final visible antes del clic 3, mismas políticas que el operador |

## 8. SEO, contenido y adquisición

| Área | Acción | Nota |
|---|---|---|
| Técnico | Canonical/sitemap/robots al .lat; hreflang es/en; JSON-LD `TouristTrip` (ya existe) + `Product/Offer` con precio real + `Organization`; Search Console para el .lat | Corrige D1/D13 |
| Palabras clave de broker (no compiten con PEX) | "alquiler de yate en Panamá precios", "mejores charters Panamá", "comparar tours a Taboga", "cómo llegar a Taboga", "yate para cumpleaños Panamá", "charter Las Perlas" | PEX se queda con marca + producto ("ferry Taboga", "tour bahía") |
| Páginas de destino | /destinos/taboga, /las-perlas, /bahia con "todas las formas de ir" y enlaces a ferry/tour/charter | Es donde un comparador gana tráfico orgánico |
| Contenido | Guías comparativas (ferry vs charter a Taboga, cuánto cuesta un yate por persona, mejor mes para Las Perlas) | 2 artículos/mes; reutilizar el calendario social semanal ya planeado |
| Google Business Profile | Sólo si Atlante tiene dirección/entidad distinta a PEX; dos perfiles del mismo negocio en la misma dirección violan las políticas de Google | NO decidido |
| Ads | Google: Atlante puja por términos de comparación/charter y PEX por marca/producto (evitar pujar los dos por lo mismo). Meta: Atlante como marca "concierge" con leads; remarketing a quienes abandonaron en PEX con `ref=ATLANTE` | Requiere D10 |
| Medición | Objetivo único: reservas confirmadas en PEX con `referral_code=ATLANTE` y cotizaciones cerradas de terceros; tablero mensual en Sheets | — |

## 9. Revisión del prompt que pegaste para la sesión de código

El prompt está bien armado (fases, `PENDIENTE MARK`, helper único `buildPexUrl()`, add-ons genéricos). Estas son las correcciones y los huecos que detecté al contrastarlo con lo que hay publicado hoy:

| # | Tema | Qué dice el prompt | Qué observé | Corrección |
|---|---|---|---|---|
| P1 | Bloque 0 "cuadro gigante de fechas" | Lo pone como P0 del repo de Atlante y pide capturas antes/después | Ese cuadro (píldoras con decenas de fechas hasta diciembre + input de fecha suelto + "No hay salidas disponibles") está en **PEX** (`/ferry/bahia`), no en Atlante. Atlante hoy tiene un input de fecha simple | Mover el Bloque 0 a la sesión de PEX. En Atlante queda como especificación del calendario del nuevo funnel (días sin salida deshabilitados), sin "antes/después" |
| P2 | Fase 0 punto 2: "comprueba si el checkout acepta parámetros" | Se le pide a Code que lo descubra | Ya verificado: `/tours/checkout?slot_id=&trip_id=&date=` (3 parámetros); campo "Código de referido" (`name=referral_code`) existe en el formulario; aceptación de `ref`/`ref_id`/prefill por URL NO VERIFICADA; charter: `/charter/checkout?vessel=aura` | Pegar estos datos en el prompt para que Code no repita la exploración; dejar sólo la verificación de `ref` por URL |
| P3 | Fuente de fechas del funnel | "Las fechas disponibles salen de la misma fuente que hoy (Supabase / lo que exista)" | Atlante no tiene fechas reales de PEX; las salidas viven en PEX. Sin feed, el paso 2 mostraría fechas inventadas o desactualizadas | Añadir a "Requiere cambio en PEX" un feed público sólo lectura (`GET /api/public/trips`, `GET /api/public/slots`) y en Atlante un cron que lo copie a Supabase. Mientras no exista: paso 2 con fecha libre + aviso "disponibilidad se confirma en PEX" |
| P4 | Datos personales en la URL | "redirige a `pex_url` con `?ref=atlante&ref_id=` + los parámetros de prefill que PEX acepte" (nombre, email, teléfono) | Nombre/correo/teléfono en query string quedan en logs, analítica e historial | Prefill vía token de un solo uso (`h=<token>`, PEX lo resuelve servidor-a-servidor) o sin prefill de datos personales; sólo `ref`, `ref_id`, `trip_id`, `slot_id`, `date`, `tickets`, UTM |
| P5 | Falta: canonical/sitemap/robots al .com muerto | No lo menciona | D1 (crítico SEO) | Añadir como P0 del Bloque 5 |
| P6 | Falta: prueba social y urgencia inventadas | No lo menciona | D4, D5 (127 reseñas, testimonios, "Pocos cupos") | Añadir como P0 del Bloque 1: eliminar todo lo no verificable |
| P7 | Falta: email en dominio inexistente y selector de moneda | No lo menciona | D2, D12 | Añadir a Bloque 1 (`PENDIENTE MARK` el buzón real) |
| P8 | Ferry Taboga | "todos los tours y ferrys de PEX" | En agosto quedó "ferry pausado hasta nuevo aviso"; hoy la web lo muestra activo con horarios y "Comprar boleto" | Confirmar estado antes de cargarlo con `disponible = true` |
| P9 | Contadora | "hoy figura en PEX como no disponible por el momento" | Coincide con lo registrado ($130, "no disponible por el momento") | OK; el add-on "Tour por las islas — 4 h — +$50" queda con unidad `PENDIENTE MARK` |
| P10 | Comisión | "% comisión" en `PENDIENTE MARK` | Para B2B de PEX ya definiste 20 % | Decidir si Atlante usa el mismo 20 % (simplifica el reporte) |
| P11 | Webhook de conversión | "`convertido` lo marca Mark a mano hasta que PEX devuelva datos" | Correcto para arrancar; a mano no escala | Añadir a "Requiere cambio en PEX": POST firmado a Atlante al confirmarse pago con `ref=atlante` |
| P12 | Idioma | "si es sólo español, no inventes traducciones" | El sitio tiene botón ES/EN y textos EN parciales; sin hreflang | Mantener EN como P2 y añadir hreflang cuando se complete |

## 10. Roadmap priorizado

| Fase | Cuándo | Entregables | Dónde | Esfuerzo |
|---|---|---|---|---|
| 0 · Limpieza | Esta semana | D1 canonical/sitemap/robots al .lat; D2 email; D3 precios reales; D4/D5 quitar reseñas, métricas y urgencia inventadas; D11 legales en borrador; D12 moneda; disclosure "Agente autorizado de PEX" | Atlante | 1–2 días |
| 1 · Ticketería PEX | Semana 1–2 | Catálogo PEX en Supabase (`products`, `product_addons`) + admin; funnel `/reservar/[slug]` 3 pasos; `leads`; `buildPexUrl()` con `ref`/`ref_id`/UTM; pantalla de redirección; analítica por paso; `npm run check:pex` | Atlante | 5–7 días |
| 1b · Cambios mínimos en PEX | Paralelo | Leer `ref`/`ref_id` en checkout y guardarlos en la orden; prefill por token; feed público de trips/slots; webhook de confirmación; add-on Contadora premarcado por `addon=`; Bloque 0 (calendario en vez de píldoras) | PEX | 3–4 días |
| 2 · Charters | Semana 3–4 | `/charters` con filtros, fichas de Aura / Pacific Ferry 1 / Sirena del Mar, badge "Reserva directa" vs "Cotizar", `partner_applications`, admin de naves con `comision_pct` | Atlante | 4–6 días |
| 3 · Alianzas | Semana 4 en adelante | Contrato de comisión tipo, kit de operador, 5 primeros operadores reales, hoteles/concierges con código | Comercial | Continuo |
| 4 · Crecimiento | Mes 2 | Páginas de destino, comparador real, 2 guías/mes, GA4 + Meta con cross-domain, ads segmentados por marca, tablero mensual de comisiones | Atlante + PEX | Continuo |

## 11. Decisiones que necesito de ti (`PENDIENTE MARK`)

| # | Decisión | Opciones |
|---|---|---|
| 1 | Comisión Atlante → PEX | 20 % (igual a B2B) / otro |
| 2 | Comisión con operadores aliados | 10 % / 15 % / 20 % / por acuerdo |
| 3 | Unidad del add-on de Contadora (+$50) | por persona / por reserva |
| 4 | Buzón real de Atlante | concierge@atlantedelpacifico.lat / Gmail / otro |
| 5 | Dominio .com | comprar y redirigir / eliminar referencias |
| 6 | Logo de PEX en Atlante | sí / no |
| 7 | Entidad que factura comisiones | Tanya Engineering / SEDECO / nueva |
| 8 | Ferry Taboga hoy | activo / pausado |
| 9 | Google Business Profile para Atlante | sí (dirección propia) / no |
| 10 | Quién implementa los cambios en PEX | sesión de Code de PEX (te dejo la especificación lista en el prompt v2) |
'@
$Docs["docs/bloques/00-reglas.md"] = @'
# Reglas comunes — se aplican a TODOS los bloques

Contexto: repo de **Atlante del Pacífico** (atlantedelpacifico.lat): Next.js 16 App Router + TypeScript + Tailwind v4 + Prisma 6 sobre Postgres (proyecto Supabase "ATLANTE"), desplegado en Vercel. Es un proyecto totalmente separado de Pacific Experience (PEX, pacificexperience.lat): no importes código de PEX, no toques su repo ni su base de datos, no compartas credenciales.

Antes de escribir código lee: `AGENTS.md` (Next.js 16 tiene cambios respecto a lo que conoces: consulta `node_modules/next/dist/docs/`), `docs/PRD-atlante-v2.md`, `docs/TODO-atlante-v2.md` y los reportes de bloques anteriores en `docs/reportes/`.

Reglas (no negociables):

1. Trabajas SOLO en la rama actual (`feature/atlante-broker`). Nunca hagas merge a `main`, nunca despliegues, nunca crees ni cambies variables en Vercel ni en Supabase. No ejecutes migraciones contra ninguna base de datos remota (`prisma migrate deploy` lo corre el script de Mark, no tú); sí puedes generar archivos de migración.
2. Commits en español, pequeños y descriptivos (`git add -A && git commit -m "..."`) al terminar cada sub-bloque. No hagas `git push` (lo hace el script).
3. No inventes datos. Precios, horarios, capacidades, políticas, comisiones, reseñas, métricas o textos legales que no estén en este prompt o en `docs/PRD-atlante-v2.md` no existen: van a la sección `PENDIENTE MARK` del reporte, nunca a la web.
4. Nunca uses la palabra "Sunset" en ningún texto (ES ni EN). Usa "atardecer" / "evening" / "dusk".
5. Atlante nunca cobra: prohibido cualquier formulario de tarjeta, SDK o ruta de pago. El pago ocurre en PEX o con el operador aliado.
6. Todo enlace a pacificexperience.lat se construye con `buildPexUrl()` de `src/lib/pex.ts`. Nunca escribas el dominio de PEX a mano fuera de ese archivo.
7. Nunca pongas nombre, correo ni teléfono en query strings, en URLs ni en logs.
8. No instales ni contrates servicios pagos. Puedes añadir dependencias npm gratuitas si son necesarias (justifícalo en el reporte).
9. Todo debe funcionar sin base de datos (`DATABASE_URL` ausente o DB caída) degradando con gracia: nunca bloquees la navegación ni el handoff a PEX porque la DB falle.
10. Al terminar el bloque `npm run lint` y `npm run build` deben pasar. Si algo falla, arréglalo antes de cerrar el bloque.
11. Escribe el reporte del bloque en `docs/reportes/bloque-XX.md`: qué hiciste (por archivo), qué no, `PENDIENTE MARK`, cómo probarlo. Haz commit del reporte.
12. Si una instrucción de este prompt contradice el PRD, manda el prompt. Si algo es ambiguo, elige la opción más simple, anótalo en el reporte y sigue. No te detengas a preguntar: no hay nadie mirando.
13. Idioma: ES por defecto y EN vía el diccionario existente (`src/lib/i18n.ts` + objetos `{ es, en }`). Todo texto nuevo va en ambos idiomas con el mismo mecanismo. Puedes usar tildes en los textos nuevos.
14. Mobile-first (390 px): tipografía legible al sol (nada de 12 px gris sobre claro), botones de 44 px mínimo, sin scroll horizontal.
15. Al final de cada bloque verifica con búsqueda de texto que en `src/` no aparezcan: `atlantedelpacifico.com`, `ATLANTE10`, `Pocos cupos`, `Sunset`, `127 reseñas`, ni valores de precio inventados (`850`, `1450`, `2800`, `1200`, `1800`, `3200` como precios).
'@
$Docs["docs/bloques/01-R0-limpieza.md"] = @'
# Bloque 1 — R0 · Limpieza y verdad (P0)

Objetivo: que nada falso o roto quede publicado. En este bloque no agregues funciones nuevas (salvo los placeholders indicados). Al terminar, el sitio debe poder desplegarse solo con esto sin mostrar ningún dato inventado.

Hechos verificados que necesitas (no explores de más):

- `src/config/site.ts` tiene `domain`/`url` apuntando a `atlantedelpacifico.com` (dominio que NO resuelve), `email: concierge@atlantedelpacifico.com` (buzón inexistente) y `trust: { googleRating: 4.9, reviewCount: 127, experiences: 200, avgResponseMinutes: 14 }` (inventado).
- `src/content/reviews.ts` tiene 3 testimonios inventados y `aggregateRating {4.9, 127}`; se usa en `ReviewsSection.tsx` y en el JSON-LD de `src/app/(site)/page.tsx`. `About.tsx` tiene una cita inventada en el bloque `.quote`.
- `TourCard.tsx` recibe la prop `urgency` y muestra `spots_left` = "Pocos cupos esta semana" (inventado); `ToursSection.tsx` la pasa como `urgency`.
- `LeadPopups.tsx` promete "10 % en tu primera reserva" y muestra el código `ATLANTE10`; `src/app/api/lead/route.ts` es un stub que solo hace `console.log`. Ese descuento no existe en ningún checkout.
- Selector de moneda USD/EUR/COP/MXN con tasas fijas en `lib/format.ts` + `lib/currency-context.tsx` + `<select className="currency-select">` en `Header.tsx`. El pago en PEX es en USD.
- La palabra "Sunset" aparece en `src/content/tours.ts` (name/itinerary EN), `src/content/reviews.ts`, `src/lib/i18n.ts` (`tours_title`, `filter_sunset`), `src/app/layout.tsx` (keyword "sunset cruise Panama City") y `src/components/sections/Destinations.tsx` ("Bay of Panama at sunset").
- `src/content/tours.ts` tiene 6 productos inventados (precios $850/$1,450/$2,800 por persona y $1,200/$1,800/$3,200 por barco, capacidad 12). Se reemplaza entero en el bloque 2; aquí solo se ocultan los precios.
- `robots.ts`, `sitemap.ts`, `metadataBase`, `alternates.canonical` y OG derivan todos de `site.url`.
- No existe `.env.example` aunque el README lo cita.

Tareas:

1. `src/config/site.ts`: `domain: "www.atlantedelpacifico.lat"`, `url: "https://www.atlantedelpacifico.lat"`. Elimina `email` (y todo uso: `ContactSection.tsx`, JSON-LD del home). Elimina `trust` y su uso en `Hero.tsx` (`.trust-row`). Elimina `social.tripadvisor` (vacío) y `social.google` (es un mapa genérico, no un perfil). Mantén `social.instagram` pero anótalo en PENDIENTE MARK (no verificado que exista la cuenta). Mantén WhatsApp `50768603623` / `+507 6860 3623`.
2. Crea `src/lib/pex.ts` mínimo (se amplía en el bloque 2): `export const PEX_BASE_URL = process.env.NEXT_PUBLIC_PEX_BASE_URL ?? "https://www.pacificexperience.lat"` y `export function buildPexUrl(opts: { target: "home" | "path"; path?: string; leadId?: string; campaign?: string }): string` que siempre añade `ref=ATLANTE`, `utm_source=atlante`, `utm_medium=referral`, `utm_campaign=<campaign ?? "site">` y `ref_id=<leadId>` si existe. Es el ÚNICO lugar donde puede aparecer el dominio de PEX.
3. Reseñas y rating: borra `src/content/reviews.ts` y `src/components/sections/ReviewsSection.tsx`; quita `aggregateRating` (y el import) del JSON-LD en `src/app/(site)/page.tsx`; en `About.tsx` elimina el bloque `.quote`. Borra el CSS `.review-card`, `.review-grid`, `.quote` si quedan sin uso.
4. Urgencia: elimina la prop `urgency` de `TourCard.tsx` y su uso; borra las claves `spots_left` y `booked_today` de `i18n.ts` y el CSS `.urgency`.
5. Popup y `/api/lead`: elimina `LeadPopups.tsx` y su uso en `src/app/(site)/layout.tsx`; borra `src/app/api/lead/route.ts`; borra las claves `popup_*` de `i18n.ts` y el CSS `.popup-*`.
6. Moneda: solo USD. Elimina `CurrencyProvider`, `useCurrency`, `lib/currency-context.tsx`, el `<select className="currency-select">` del Header y las tasas de `lib/format.ts`. `money(usd)` queda solo USD (`en-US`, `USD`, 0 decimales si es entero, 2 si tiene centavos). Actualiza `Providers.tsx` y todos los componentes que usaban `useCurrency`.
7. "Sunset": en `i18n.ts` `tours_title.en` → "Evening, island, archipelago." y `filter_sunset.en` → "Evening"; en `app/layout.tsx` la keyword → "evening cruise Panama City"; en `Destinations.tsx` → "Bay of Panama at dusk". En `content/tours.ts` cambia los textos EN con "Sunset"/"sunset" a "Evening"/"dusk" (el archivo se reemplaza en el bloque 2, no lo rediseñes). Renombra la categoría interna `"sunset"` a `"evening"` y la clase `card-sunset` a `card-evening` (CSS incluido). Al final `grep -ri sunset src/` debe devolver 0 resultados.
8. Precios inventados fuera de la vista (temporal hasta el bloque 2): en `TourCard.tsx` no muestres el precio (deja duración); elimina la página `/compare` y `CompareTable.tsx`; reemplaza `PriceCalculator.tsx` en `TourDetail.tsx` por un panel simple con el CTA de WhatsApp existente ("Consultar por WhatsApp") sin precio, sin depósito y sin formulario. Borra `src/app/api/bookings/route.ts` y `src/lib/bookings.ts` solo si nada más los importa (el admin `actions.ts` importa `confirmBooking/markPaid/cancelBooking` → en ese caso deja `lib/bookings.ts` y solo borra la ruta API pública). El bloque 2 rehace el admin.
9. Disclosure: crea `src/components/site/PexDisclosure.tsx` (client, bilingüe) con variantes `banner` (bloque destacado) e `inline` (una línea). Texto ES: "Atlante del Pacífico es agente autorizado de Pacific Experience. La reserva y el pago se completan en pacificexperience.lat." EN: "Atlante del Pacífico is an authorized agent of Pacific Experience. Booking and payment are completed on pacificexperience.lat." El enlace a PEX usa `buildPexUrl({ target: "home", campaign: "disclosure" })`. Sin logo de PEX (PENDIENTE MARK). Úsalo como `banner` en el home (justo debajo del hero) y como `inline` en el Footer.
10. Hero: reemplaza `hero_lede` (ES/EN) por: ES "Comparamos ferry, tours y charters de operadores verificados y te llevamos al pago directo con el operador." EN "We compare ferries, tours and charters from verified operators and take you straight to paying the operator." Deja dos botones: "Tickets y tours" → `/tours` y "Charters" → `/charters`. Actualiza `navItems` en `site.ts`: Tours → `/tours`, Charters → `/charters`, Destinos → `/#destinos`, Cómo funciona → `/como-funciona`, Contacto → `/#contacto`.
11. Placeholders para no romper enlaces: crea `src/app/(site)/tours/page.tsx` y `src/app/(site)/charters/page.tsx` que rendericen las secciones actuales (`ToursSection` / `ChartersSection`) con metadata propia. El bloque 2 las reemplaza.
12. Legales en BORRADOR: crea `src/app/(site)/terminos/page.tsx`, `privacidad/page.tsx`, `cancelaciones/page.tsx`, `como-funciona/page.tsx` (server components con `metadata`, contenido bilingüe con un objeto `{ es, en }` local y el locale de la cookie como hace `tours/[slug]/page.tsx`), cada una con una franja visible al inicio: "BORRADOR — pendiente de revisión por Mark". Contenido mínimo (no inventes leyes, artículos ni plazos):
    - Términos: Atlante intermedia; el operador (Pacific Experience u otro operador aliado) presta el servicio y cobra; las condiciones de cada reserva son las del operador; Atlante no procesa pagos ni guarda datos de tarjeta; contacto por WhatsApp.
    - Privacidad: datos que se piden (nombre, WhatsApp, email, fecha, cantidad de pasajeros); para qué (gestionar la solicitud y transferirlos al operador para completar la reserva); cookies y analítica (GA4 / Meta cuando estén activas); cómo pedir corrección o borrado (WhatsApp).
    - Cancelaciones: para productos de Pacific Experience aplican las políticas publicadas en pacificexperience.lat (enlace con `buildPexUrl({ target: "path", path: "/politicas", campaign: "cancelaciones" })` — si esa ruta no existe en PEX, enlaza al home); puedes citar "según lo publicado por Pacific Experience el 09/09/2026: reserva con 30 % de abono y 70 % restante 24 h antes de navegar; reembolso completo dentro de las primeras 24 h tras pagar el abono" para charters, y "los tours compartidos se pagan 100 % al reservar" para tours. Para operadores aliados: la política de cada operador se muestra en su ficha.
    - Cómo funciona: los 3 pasos (eliges tu experiencia → fecha y pasajeros → tus datos) y el pago en Pacific Experience; el código de referido ATLANTE.
    Enlaza las 4 páginas desde el Footer.
13. Redirecciones 301 en `next.config.ts` (`async redirects()`): `/compare` → `/charters`; `/tours/charter-atardecer-privado`, `/tours/yate-completo-taboga`, `/tours/charter-premium-las-perlas` → `/charters`; `/tours/travesia-al-atardecer`, `/tours/escape-a-taboga`, `/tours/expedicion-a-las-perlas` → `/tours`.
14. `.env.example` con una línea de comentario por variable y sin valores reales: `DATABASE_URL` (pooler 6543), `DIRECT_URL` (5432), `ADMIN_PASSWORD`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_PEX_BASE_URL`, `PEX_HANDOFF_SECRET`, `PEX_WEBHOOK_SECRET`, `CRON_SECRET`.
15. JSON-LD: en `app/(site)/tours/[slug]/page.tsx` elimina `offers` (precio inventado). En el home deja `TravelAgency` con `name`, `url`, `telephone` (WhatsApp) y `address`; sin `email` ni rating. Añade `noindex` a `/admin`.
16. `README.md`: actualiza el estado (R0 hecho; R1–R4 según `docs/PRD-atlante-v2.md`), quita las menciones a reviews, urgency pills, multi-currency y popups; añade la sección "Reglas" (nunca Sunset; Atlante nunca cobra; `buildPexUrl` único).
17. Verificación final: `npm run lint && npm run build`; `grep -rn "atlantedelpacifico.com\|ATLANTE10\|Pocos cupos\|Sunset\|sunset\|127\|4\.9" src/` = 0 resultados relevantes. Reporte en `docs/reportes/bloque-01.md` con PENDIENTE MARK: buzón real, Instagram, logo PEX, dominio .com (comprar+301 o nada), razón social/RUC para términos.
'@
$Docs["docs/bloques/02-R1-ticketeria-puente.md"] = @'
# Bloque 2 — R1 · Ticketería PEX en modo puente (P0) — el bloque más importante

Objetivo: catálogo REAL de Pacific Experience + funnel de 3 clics que guarda el lead y redirige a PEX con nuestro código (`ref=ATLANTE&ref_id=<lead>`). Todo funciona sin base de datos; con base de datos guarda leads, handoffs y eventos. "Modo puente" = PEX todavía no lee parámetros por URL ni expone feed: el cliente llega a la página del producto en PEX y, si el checkout se lo pide, pega el código ATLANTE (por eso se lo mostramos y se lo copiamos al portapapeles antes de saltar).

## 2.1 Datos verificados de PEX (recorrido en vivo del 09/09/2026) — úsalos tal cual

| Producto | Tipo | Datos publicados por PEX | Ruta en PEX (`pexPath`) | Checkout conocido | `available` |
|---|---|---|---|---|---|
| Tour por la Bahía (Pacific Ferry 1) | `tour` | $25 por persona · 1 h 30 min · salidas 5:30–7:00 PM y 8:00–9:30 PM · viernes, sábado y domingo desde el 18/09/2026 · incluye fee de puerto y parqueo gratis · zarpa de Isla Perico, Amador · boarding con código QR por email · pago online 100 % al reservar | `/ferry/bahia` | `/tours/checkout?slot_id=&trip_id=&date=` (los IDs viven en PEX; `trip_id` NO ENCONTRADO → `pexTripId: null`) | `true` |
| Party en la Bahía (Sirena del Mar) | `party` | Desde $35 por persona · 2 h 30 min · viernes y sábado 7:00–9:30 PM · grupos de 30 a 80 personas · DJ, bebida de bienvenida y barra de pago | `/tours/c0d1a003-0000-4000-8000-000000000085` | igual que el anterior | `true` |
| Ferry a Isla Taboga (boleto abierto) | `ferry` | Adulto nacional desde $10 por tramo · turista $12 entre semana / $15 fin de semana · niño y jubilado $8 · peaje de entrada a Taboga $1 en efectivo (no incluido) · seis salidas diarias desde Isla Perico 5:45 AM–3:35 PM y seis regresos 6:35 AM–4:30 PM · ~30 min de travesía · boleto válido 180 días para cualquier salida | `/ferry/taboga` | NO ENCONTRADO (botón "Comprar boleto" sin URL visible) → enlaza `/ferry/taboga` | `false` — PENDIENTE MARK (en agosto quedó "pausado hasta nuevo aviso"; la web de PEX lo muestra vendiendo). Que Mark lo active cambiando un booleano |
| Ferry a Contadora | `ferry` | $130 registrado · "no disponible por el momento" · add-on "Tour por las islas del archipiélago — 4 h — +$50" (unidad por persona o por reserva: PENDIENTE MARK) | `/ferry/contadora` (NO VERIFICADO) | — | `false` |
| Chárter Aura (catamarán) | `charter_pex` | Barco completo desde $1,300 · desde $55/persona · hasta 35 personas (Bahía/Puente), 30 (Taboga), 15 (Las Perlas) · 4 h / 8 h / 12 h · Isla Taboga 8 h: $1,700 hasta 15 pax, $2,250 hasta 30 pax · Marina Flamenco, Amador · reserva con 30 % de abono y 70 % 24 h antes · reembolso completo dentro de las primeras 24 h tras pagar el abono · incluye combustible, capitán y marino, hielo, coolers, nevera, congelador, toallas, agua y sodas, BBQ, piscina de mar, A/C, camarotes, baños, agua caliente, sonido · bajo solicitud: snorkel, kayaks, sillas flotantes, pesca; BBQ $20/persona, catering con chef $30/persona, open bar $15/persona, jetski $100/h, hora extra $300 · métodos que muestra PEX: transferencia, Yappy, tarjetas (+7 %), Amex (+3 % extra), Tether | `/charter/aura` | `/charter/checkout?vessel=aura` | `true` |
| Chárter Pacific Ferry 1 | `charter_pex` | Hasta 30 personas · 4 h / 8 h / 12 h · Bahía y Puente 4 h: $1,300 hasta 15 pax / $1,790 hasta 30 · Isla Taboga 8 h: $1,700 hasta 15 / $2,250 hasta 30 · Las Perlas 12 h: $3,000 hasta 15 / $3,550 hasta 30 · "desde $59/persona" · 30 % de abono, 70 % 24 h antes · incluye capitán y tripulación, combustible, hielo y coolers, agua y sodas, BBQ, cubierta techada, salón interior, baños, sonido, toallas · Marina Flamenco | `/charter/pacific-ferry-1` | `/charter/checkout?vessel=pacific-ferry-1` | `true` |
| Chárter Sirena del Mar | `charter_pex` | Hasta 80 personas · 4 h / 8 h / 12 h · Bahía y Puente 4 h: $1,300 hasta 15 / $1,950 hasta 35 / $3,410 hasta 80 · Isla Taboga 8 h: $1,700 hasta 15 / $2,250 hasta 30 / $4,080 hasta 80 · Las Perlas 12 h: $3,000 hasta 15 / $5,380 hasta 80 · 30 % de abono, 70 % 24 h antes · incluye capitán y tripulación, combustible, hielo y coolers, agua y sodas, BBQ, A/C, cabina cerrada, baños, sonido, toallas · opcional: snorkel, kayaks, sillas flotantes, pesca · Marina Flamenco | `/charter/sirena-del-mar` | `/charter/checkout?vessel=sirena-del-mar` | `true` |

Políticas generales de PEX observadas: tours compartidos se pagan 100 % al reservar; reembolso solo hasta 24 h antes. Charters: 30 % de abono, saldo 24 h antes, reembolso completo en las primeras 24 h tras el abono. Contactos de PEX (no los muestres en Atlante): +507 6493-5541 y +507 6441-5920. Fotos: no hay fotos de PEX en este repo; usa las imágenes actuales de `public/` como placeholder y deja `PENDIENTE MARK: fotos reales de cada producto/nave (mismo dueño, se pueden reutilizar las de PEX)`.

## 2.2 Catálogo en código — `src/content/catalog.ts` (reemplaza `src/content/tours.ts`)

Un solo archivo tipado con `verifiedAt` y `sourceUrl` por producto (la edición desde admin queda para el bloque 3). Tipos mínimos:

```ts
export type Locale = "es" | "en";
export type Localized = Record<Locale, string>;
export type ProductKind = "tour" | "party" | "ferry" | "charter_pex";
export type PriceUnit = "per_person" | "per_segment" | "per_boat";
export interface PriceRow { label: Localized; price: number; note?: Localized }          // p. ej. Adulto nacional / Turista / Niño y jubilado, o tramos de capacidad
export interface Schedule { weekdays: number[]; times: { start: string; end?: string }[]; validFrom?: string; note?: Localized }  // 0 = domingo
export interface Product {
  slug: string; kind: ProductKind; source: "pex";
  name: Localized; summary: Localized; description: Localized;
  priceFrom: number; priceUnit: PriceUnit; priceTable?: PriceRow[];
  durationMin?: number; durationLabel: Localized;
  schedule?: Schedule; capacityMin?: number; capacityMax?: number;
  includes: Localized[]; notIncluded?: Localized[]; policies: Localized[];
  addons?: { slug: string; name: Localized; price: number; unit: "per_person" | "per_booking" | "pending"; durationMin?: number; active: boolean }[];
  images: string[];
  pexPath: string; pexCheckout?: { kind: "tour"; tripId: string | null } | { kind: "charter"; vessel: string };
  available: boolean; verifiedAt: string; sourceUrl: string; order: number;
  badges?: ("family" | "adventure" | "romantic" | "celebration" | "snorkel" | "group" | "evening")[];
}
export const catalog: Product[]; export function getProduct(slug): Product | undefined;
export const ticketProducts = catalog.filter(p => ["tour","party","ferry"].includes(p.kind));
export const pexVessels = catalog.filter(p => p.kind === "charter_pex");
```

Slugs: `tour-bahia`, `party-bahia`, `ferry-taboga`, `ferry-contadora`, `charter-aura`, `charter-pacific-ferry-1`, `charter-sirena-del-mar`. `verifiedAt: "2026-09-09"`, `sourceUrl` = `https://www.pacificexperience.lat` + `pexPath` (es un dato, no un enlace: puede vivir en el catálogo, pero cualquier `href` que se renderice pasa por `buildPexUrl`). Textos ES/EN escritos por ti a partir de los datos de 2.1, sin añadir nada que no esté ahí. Borra `src/content/tours.ts` y todo lo que dependa de él (`Badges` puede quedarse adaptado a los nuevos badges).

## 2.3 `src/lib/pex.ts` completo + tests + guardarraíl

```ts
export type PexTarget = "home" | "path" | "tour_page" | "tour_checkout" | "charter_page" | "charter_checkout";
export function buildPexUrl(opts: {
  target: PexTarget; path?: string; tripId?: string | null; slotId?: string; date?: string; tickets?: number;
  vessel?: string; addons?: string[]; leadId?: string; handoffToken?: string; campaign?: string;
}): string
```

- Base: `NEXT_PUBLIC_PEX_BASE_URL` o `https://www.pacificexperience.lat`.
- `tour_page` → `path` (p. ej. `/ferry/bahia`); `tour_checkout` → `/tours/checkout` con `trip_id`, `slot_id`, `date`, `tickets` (solo los presentes); si falta `tripId` cae a `tour_page`. `charter_page` → `path`; `charter_checkout` → `/charter/checkout?vessel=`.
- Siempre: `ref=ATLANTE`, `utm_source=atlante`, `utm_medium=referral`, `utm_campaign=<campaign ?? slug ?? "site">`; `ref_id=<leadId>` si existe; `h=<handoffToken>` si existe; `addon=<slug>` repetido por cada add-on. Prohibido cualquier otro parámetro (nada de nombre/email/teléfono).
- `export const ATLANTE_REF = "ATLANTE"`.
- Tests con el test runner de Node: `tests/pex.test.ts` (`import { test } from "node:test"; import assert from "node:assert/strict"`), script `"test": "node --import tsx --test tests/pex.test.ts tests/leads.test.ts"` (lista explícita de archivos: funciona igual en Windows). Casos: cada target contiene `ref=ATLANTE`; `ref_id` aparece solo con lead; `tour_checkout` sin `tripId` cae a la página; los add-ons se repiten; nunca aparecen `name`, `email`, `phone`.
- Guardarraíl: `scripts/check-pex-links.mjs` recorre `src/` y falla (exit 1) si encuentra `pacificexperience.lat` fuera de `src/lib/pex.ts` y `src/content/catalog.ts` (allí solo como `sourceUrl`). Script `"check:pex-links": "node scripts/check-pex-links.mjs"`. Añádelo a `"lint"`: `"lint": "eslint && node scripts/check-pex-links.mjs"`.

## 2.4 Prisma — modelos nuevos y migración (sin tocar la base de datos remota)

1. Copia `prisma/schema.prisma` a `prisma/schema.base.prisma` ANTES de editar (se usa para el diff y luego se borra).
2. Cambios en `schema.prisma`:
   - Renombra el modelo `Lead` actual (email único, newsletter) a `Subscriber` (`@@map("Subscriber")`).
   - Nuevo `enum LeadStatus { created redirected paid paid_unmatched lost quote_requested quoted accepted }` y `enum LeadType { tour party ferry charter_pex charter_partner }`.
   - Nuevo `model Lead { id String @id @default(cuid()); type LeadType; productSlug String?; vesselSlug String?; serviceDate DateTime? @db.Date; timeSlot String?; pax Json?; paxTotal Int?; addons Json?; name String; email String; phone String; partnerCode String?; utmSource String?; utmMedium String?; utmCampaign String?; landingPath String?; destinationUrl String?; status LeadStatus @default(created); pexBookingId String? @unique; amount Decimal? @db.Decimal(10,2); commissionPct Decimal? @db.Decimal(5,2); commissionAmount Decimal? @db.Decimal(10,2); notes String?; createdAt DateTime @default(now()); redirectedAt DateTime?; paidAt DateTime?; updatedAt DateTime @updatedAt; handoffs Handoff[]; events PexEvent[]; @@index([status, createdAt]); @@index([email]); @@index([serviceDate]) }`.
   - `model Handoff { token String @id; leadId String; lead Lead @relation(fields:[leadId], references:[id], onDelete: Cascade); expiresAt DateTime; usedAt DateTime?; createdAt DateTime @default(now()) }`.
   - `model PexEvent { id String @id @default(cuid()); pexBookingId String; eventType String; payload Json; signatureOk Boolean; leadId String?; lead Lead? @relation(...); createdAt DateTime @default(now()); @@unique([pexBookingId, eventType]) }`.
   - `model PartnerApplication { id String @id @default(cuid()); name String; vesselName String?; capacity Int?; zone String?; whatsapp String; email String?; photos Json?; status String @default("new"); createdAt DateTime @default(now()) }`.
   - Deja `Booking`, `Payment`, `AvailabilitySlot`, `Customer`, `Coupon`, `GiftCard`, `Review`, `Reseller` como están (dejan de usarse en el sitio público).
3. Migraciones: crea `prisma/migrations/migration_lock.toml` (`provider = "postgresql"`), `prisma/migrations/0001_init/migration.sql` con el contenido íntegro de `prisma/initial-schema.sql`, y `prisma/migrations/0002_broker_v2/migration.sql` generado con `npx prisma migrate diff --from-schema-datamodel prisma/schema.base.prisma --to-schema-datamodel prisma/schema.prisma --script`. Revisa que el rename `Lead` → `Subscriber` quede como `ALTER TABLE "Lead" RENAME TO "Subscriber"` (edita el SQL a mano si el diff genera DROP + CREATE; la tabla puede tener datos). Borra `schema.base.prisma`. Sustituye `package.json#prisma` por `prisma.config.ts` (Prisma 6.19 lo pide) manteniendo `seed`.
4. `npx prisma generate` y `npx prisma validate` deben pasar. NO ejecutes `migrate dev/deploy/push`.
5. `prisma/seed.ts`: elimina la creación de cupos y del cupón; déjalo como no-op idempotente que solo imprime "catálogo en código; nada que sembrar" (o bórralo y quita el script si prefieres).

## 2.5 Páginas públicas

- `/tours` (`src/app/(site)/tours/page.tsx`): catálogo de `ticketProducts` con `available === true`: tarjeta con foto, nombre, precio real ("desde $25 por persona" / "desde $10 por tramo"), duración, días de salida, badge del tipo, CTA "Reservar" → `/reservar/[slug]`. `PexDisclosure` variante `banner` arriba. Metadata + JSON-LD `ItemList`.
- `/tours/[slug]`: ficha desde el catálogo (404 si no existe o `available === false`): galería, descripción, incluye, horario, políticas del operador, tabla de precios, CTA fijo en móvil "Reservar — desde $X" → `/reservar/[slug]`. JSON-LD `TouristTrip` + `Offer` con el precio real y `provider` = Pacific Experience. `generateStaticParams` con los slugs disponibles.
- `/charters` (placeholder mejorado, el marketplace completo llega en el bloque 4): tarjetas de `pexVessels` con capacidad, duraciones, "barco completo desde $X · desde $Y/persona" (solo si el dato existe; si no, "consultar"), badge "Reserva directa en Pacific Experience" y CTA "Reservar en PEX" → `buildPexUrl({ target: "charter_checkout", vessel, campaign: slug })` (sin lead en este bloque; la captura de lead para charters llega en el bloque 4) + CTA secundario WhatsApp de Atlante. Enlace "Ver ficha en PEX" → `charter_page`.
- Home: `ToursSection` y `ChartersSection` leen del catálogo (3 tickets + 3 naves) y enlazan a `/tours` y `/charters`. Elimina filtros por categoría inventada.
- `/reservar/[slug]` y `/reservar/[slug]/listo`: ver 2.6.
- Elimina `RouteMap.tsx` (los productos no tienen coordenadas de ruta verificadas) y `react-leaflet`/`leaflet` de `package.json` si ya nada los usa. `WeatherWidget` puede quedarse en la ficha (dato real de Open-Meteo).

## 2.6 Funnel de 3 clics — `/reservar/[slug]` (client component `components/funnel/Funnel.tsx`)

Estado en la URL (`?step=&date=&slot=&pax=&addons=`) para poder volver atrás. Barra de progreso de 3 pasos. 404 si el producto no existe o no está disponible.

- Paso 1 (resumen y confirmación del producto): nombre, precio real, duración, "Pago seguro en Pacific Experience" (`PexDisclosure` inline), botón "Elegir fecha".
- Paso 2 (fecha y pasajeros): calendario mensual propio (sin librerías pesadas) donde SOLO se habilitan los días de la semana de `schedule.weekdays` desde `max(hoy+1, validFrom)`; abre en el mes de la primera fecha habilitada y la preselecciona. Selector de horario con `schedule.times` (si hay uno solo, fijo). Cantidad por categoría según `priceTable` (ferry: adulto nacional / turista / niño y jubilado; tour: por persona) con mínimo 1 y máximo 20 (party: mínimo 30, máximo 80 → si el producto tiene `capacityMin`, respétalo y muestra "grupo mínimo 30"). Bloque "Adicionales" con los `addons` activos. Aviso: "La disponibilidad final se confirma en Pacific Experience." Para `ferry` (boleto abierto, sin hora fija): la fecha es "fecha estimada de viaje" y el horario se omite.
- Paso 3 (datos): resumen (producto, fecha, horario, pasajeros por categoría, adicionales, total estimado = Σ precio × cantidad + adicionales, con nota "El cobro lo realiza Pacific Experience; el total final lo verás en su checkout"), campos `nombre` (≥ 2 palabras), `whatsapp` (input con prefijo +507 por defecto; normaliza a E.164 sin `+`), `email`, `partnerCode` (opcional, prellenado desde `?partner=` o cookie `atl_partner`), checkbox obligatorio "Acepto las políticas de Pacific Experience y que Atlante transfiera mis datos a Pacific Experience para completar la reserva" (con enlaces a `/terminos` y `/privacidad`). Botón "Continuar al pago en Pacific Experience".
- Envío: `POST /api/leads` (ver 2.7). Con la respuesta (`leadId`, `handoffToken`, `destinationUrl`) navega a `/reservar/[slug]/listo?lead=<id>` pasando el `destinationUrl` por `sessionStorage` (no por URL). Si la API falla o tarda más de 4 s: construye `destinationUrl` en el cliente con `buildPexUrl` sin `leadId`, registra el error en consola y continúa igual. El handoff nunca se bloquea.
- Pantalla `/listo`: "Te llevamos a Pacific Experience para completar tu pago", resumen, cuenta regresiva de 3 s con botón "Ir ahora", y la línea "Tu código de referido es ATLANTE — si el checkout te lo pide, pégalo" con botón "Copiar" (`navigator.clipboard`, con fallback). Al saltar: `window.location.assign(destinationUrl)` (misma pestaña), dispara `redirect_to_pex` y hace `POST /api/leads/[id]/redirected` (best-effort, `keepalive: true`). `noindex`.
- Textos en ES/EN. Todo usable a 390 px sin scroll horizontal; tipografía ≥ 15 px.

## 2.7 APIs

- `POST /api/leads`: valida (zod no está instalado: valida a mano o añade `zod`, es gratuito), recalcula el total en el servidor desde el catálogo (el cliente no manda precios), crea `Lead` (`status: created`, `type` según `kind`, `landingPath` desde la cookie `atl_landing` si existe, `utm_*` desde la cookie `atl_utm` — crea un `middleware.ts` ligero que guarde en cookies de 30 días los `utm_*` y `partner` de la primera visita), crea `Handoff` (token 32 bytes hex, `expiresAt = now + 30 min`), construye `destinationUrl` con `buildPexUrl({ target: kind === "charter_pex" ? "charter_checkout" : "tour_page", path: pexPath, leadId, handoffToken, addons, campaign: slug })` y lo guarda en el lead. Respuesta `{ ok, leadId, handoffToken, destinationUrl }`. Sin DB (`DATABASE_URL` ausente o error de conexión): responde igual `{ ok: true, leadId: null, destinationUrl }` con `destinationUrl` sin `ref_id` y registra `console.warn("[leads] sin DB")`. Nunca 500 por la DB. Rate-limit simple en memoria por IP (p. ej. 20/min).
- `POST /api/leads/[id]/redirected`: marca `redirectedAt` y `status: redirected` (best-effort).
- `GET /api/handoff/[token]`: requiere cabecera `x-atlante-key` igual a `PEX_HANDOFF_SECRET` (si la variable no existe → 503); token de un solo uso (marca `usedAt`), 404 si no existe, usado o vencido; responde `{ name, email, phone, tickets, pax, addons, referral_code: "ATLANTE", ref_id }`. Sin PII en logs.
- `POST /api/pex/booking-confirmed` (webhook, esqueleto listo para el bloque 3): cabeceras `x-pex-timestamp` y `x-pex-signature` = HMAC-SHA256(`${timestamp}.${rawBody}`, `PEX_WEBHOOK_SECRET`) comparada con `timingSafeEqual`; rechaza timestamps con más de 5 min; idempotente por `(pex_booking_id, event)` vía `PexEvent`; eventos `booking.paid` (→ `status: paid`, `amount`, `paidAt`, `commissionPct` = `COMMISSION_PCT_DEFAULT` 20 editable por env `ATLANTE_COMMISSION_PCT`, `commissionAmount`), `booking.cancelled` / `booking.refunded` (→ `status: lost`, comisión 0). Lead sin `ref_id`: si `customer_email_sha256` coincide con algún lead `redirected` de la misma `service_date`, empareja; si no, crea un lead `paid_unmatched` con los datos del evento (sin email en claro). Sin `PEX_WEBHOOK_SECRET` → 503.
- Borra `src/app/api/bookings/route.ts` y `src/lib/bookings.ts` (el admin nuevo no los usa).

## 2.8 Admin (misma auth de `lib/auth.ts`)

- `/admin` (resumen): leads creados / redirigidos / pagados del mes, monto pagado y comisión acumulada, últimos 8 leads.
- `/admin/leads`: tabla con filtros (`status`, `type`, rango de fechas, `productSlug`, `partnerCode`), columnas: fecha, cliente (nombre + WhatsApp + email), producto, fecha de servicio, pax, estado, monto/comisión, acciones: "WhatsApp" (abre `wa.me/<phone>` desde el número de Atlante con la plantilla de rescate: "Hola {nombre}, soy del equipo de Atlante del Pacífico. Vi que empezaste tu reserva de {producto} para el {fecha}. ¿Te ayudo a completarla? Enlace directo: {destinationUrl}"), "Marcar pagado" (formulario con `pex_booking_id` y monto → estado `paid`, comisión calculada), "Perdido", "Nota". Export CSV en `/admin/leads/export` (route handler con `requireAdmin`, UTF-8 con BOM, separador coma).
- Elimina `/admin/bookings`, `/admin/calendar` y las acciones asociadas (`confirmAction`, `markPaidAction` de bookings, slots). Nav: Resumen · Leads · (Catálogo y Naves llegan en bloques 3 y 4).
- `/admin/*` con `noindex` y `dynamic = "force-dynamic"` (ya está en el layout).

## 2.9 Analítica

- `src/lib/analytics.ts`: `track(event, params)` que empuja a `window.dataLayer` (GA4 vía `gtag` si existe) y a `fbq` si existe; no-op en servidor. Eventos: `view_catalog {portal}`, `view_product {slug, kind}`, `funnel_step {slug, step}`, `lead_created {lead_id, slug, pax, value}`, `redirect_to_pex {lead_id, target, mode: "puente"}`, `whatsapp_click {context}`.
- `Analytics.tsx`: en la config de GA4 añade `linker: { domains: ["pacificexperience.lat"] }` y `allow_enhanced_conversions` no. Meta: `fbq('track','Lead')` en `lead_created`.
- Conecta `whatsapp_click` en `WhatsAppFloat`, tarjetas y el admin no (solo público).

## 2.10 Limpieza y verificación

- Borra archivos muertos: `PriceCalculator.tsx`, `CompareTable.tsx`, `RouteMap.tsx`, `content/tours.ts`, `lib/bookings.ts`, `api/bookings`, páginas de admin retiradas, CSS sin uso.
- `sitemap.ts`: home, `/tours`, `/tours/[slug]` disponibles, `/charters`, `/como-funciona`, `/terminos`, `/privacidad`, `/cancelaciones`. `robots.ts`: `disallow: ["/admin", "/reservar/*/listo", "/api/"]`.
- Tests: `npm run test` (pex + un test de `computeTotal` del funnel con el catálogo real: 2 adultos del tour bahía = $50; ferry 1 adulto nacional + 1 niño = $18).
- `npm run lint && npm run build && npm run test && npm run check:pex-links` deben pasar.
- Prueba manual documentada en el reporte: `npm run dev` sin `DATABASE_URL` → completar el funnel del tour bahía → la pantalla `/listo` muestra el código y el `destinationUrl` es `https://www.pacificexperience.lat/ferry/bahia?ref=ATLANTE&utm_source=atlante&utm_medium=referral&utm_campaign=tour-bahia` (sin `ref_id` porque no hay DB). Con `DATABASE_URL` local, el mismo flujo crea el lead y añade `ref_id` y `h`.
- Reporte `docs/reportes/bloque-02.md` con PENDIENTE MARK: `trip_id` del tour bahía en PEX, estado del ferry Taboga, unidad del add-on de Contadora, fotos reales, comisión (20 % por defecto), `PEX_HANDOFF_SECRET`/`PEX_WEBHOOK_SECRET` a acordar con la sesión de PEX.
'@
$Docs["docs/bloques/03-R1c-integrado-y-catalogo.md"] = @'
# Bloque 3 — R1c · Modo integrado (feed + webhook) y catálogo administrable (P0 cuando PEX exponga X1–X5)

Objetivo: dejar lista la integración con PEX detrás de banderas, de modo que cuando la sesión de PEX publique el feed y el webhook (ver `docs/anexo-PEX.md`), Atlante pase de "modo puente" a "modo integrado" sin reescribir nada. Además, mover el catálogo a la base de datos con administración.

Todo lo de este bloque debe funcionar con el feed ausente: si `PEX_FEED_URL` no está definido o no responde, el sitio sigue en modo puente con el catálogo en código.

## 3.1 Feed de PEX (contrato esperado, especificado en `docs/anexo-PEX.md` X4)

- `GET {PEX_FEED_URL}/trips` → `[{ id, slug, kind, name, price_from, price_table[], duration_min, capacity_min, capacity_max, policies[], images[], path, available }]`
- `GET {PEX_FEED_URL}/slots?trip_id=&from=&to=` → `[{ id, trip_id, date, start, end, capacity_remaining, price }]`
- Crea `src/lib/pex-feed.ts` con un cliente tipado, timeout 5 s, cache en memoria 60 s, y fixtures en `tests/fixtures/pex-feed/*.json` para tests.

## 3.2 Sincronización → base de datos

- Modelos Prisma nuevos: `Product` (espejo del tipo del catálogo + `source`, `pexTripId`, `verifiedAt`, `sourceUrl`, `commissionPct`, `available`, `order`, `syncedAt`), `ProductAddon`, `ProductSlot { id, productId, pexSlotId @unique, date @db.Date, startTime, endTime, capacityRemaining, price, syncedAt }`. Migración `0003_catalog` con `prisma migrate diff` como en el bloque 2 (sin tocar DB remota).
- `src/lib/catalog.ts`: `getProducts()` / `getProduct(slug)` leen de la DB si hay `DATABASE_URL` y la tabla tiene filas; si no, caen al catálogo en código (`src/content/catalog.ts`). Las páginas públicas y el funnel usan SOLO `lib/catalog.ts` (nunca el archivo de contenido directamente).
- Seed: `prisma/seed.ts` inserta/actualiza (upsert por `slug`) el catálogo en código en `Product`/`ProductAddon` con `verifiedAt` y `sourceUrl`. Idempotente.
- `GET /api/cron/sync-pex` (protegido por `Authorization: Bearer ${CRON_SECRET}`): lee `/trips` y `/slots` (próximos 90 días), hace upsert en `Product`/`ProductSlot`, marca `syncedAt`, y si el feed falla deja el snapshot anterior intacto y responde `{ ok: false, reason }`. `vercel.json` con `crons: [{ path: "/api/cron/sync-pex", schedule: "*/15 * * * *" }]`.

## 3.3 Funnel en modo integrado

- Paso 2: si el producto tiene `ProductSlot` sincronizados (`syncedAt` < 24 h), el calendario habilita SOLO los días con slot y muestra horarios con cupos ("18 cupos"); valida `paxTotal <= capacityRemaining`; si no hay cupo, ofrece las 3 próximas fechas con cupo como botones. Si no hay slots, se comporta como en el bloque 2 (modo puente) y muestra el aviso.
- `POST /api/leads`: si el lead trae `slotId` válido, `destinationUrl` usa `buildPexUrl({ target: "tour_checkout", tripId: product.pexTripId, slotId, date, tickets: paxTotal, leadId, handoffToken, addons })`.
- Muestra "Modo: integrado" / "Modo: puente" solo en el admin, nunca en público.

## 3.4 Conciliación y comisiones

- El webhook del bloque 2 ya persiste `PexEvent`; aquí añade `/admin/comisiones`: por mes y por producto/operador: leads pagados, monto, `commissionPct`, comisión; export CSV. `ATLANTE_COMMISSION_PCT` por defecto 20 (PENDIENTE MARK) y `commissionPct` por producto en admin.
- Regla automática: cron diario (`/api/cron/leads-housekeeping`, mismo `CRON_SECRET`) que pasa a `lost` los leads `redirected` con más de 7 días sin `paid`.
- Notificación al concierge por cada lead nuevo: implementa `src/lib/notify.ts` con un proveedor "log" (consola) y una interfaz para email/WhatsApp; no contrates servicios (PENDIENTE MARK: Resend/Twilio u otro).

## 3.5 Admin de catálogo y verificación contra PEX

- `/admin/catalogo`: lista y edición de `Product` y `ProductAddon` (precio, disponibilidad, horario, textos ES/EN, `verifiedAt` con botón "Marcar verificado hoy", `commissionPct`). Aviso visible si `verifiedAt` > 14 días.
- `scripts/check-pex.mjs` (`npm run check:pex`): para cada producto con `sourceUrl`, descarga la página pública de PEX y compara el precio "desde" y la disponibilidad con el catálogo; imprime una tabla de diferencias y termina con exit 1 si hay alguna. Solo reporta, no corrige.

## 3.6 Verificación

- Tests: cliente del feed con fixtures, sync (mock de Prisma o test de integración condicionado a `TEST_DATABASE_URL`), firma del webhook (válida, inválida, timestamp viejo, duplicado), housekeeping.
- `npm run lint && npm run build && npm run test`. Reporte `docs/reportes/bloque-03.md` con la lista exacta de variables nuevas (`PEX_FEED_URL`, `CRON_SECRET`, `ATLANTE_COMMISSION_PCT`) y el estado "modo puente hasta que PEX publique X4/X5".
'@
$Docs["docs/bloques/04-R2-charters.md"] = @'
# Bloque 4 — R2 · Marketplace de charters (P1)

Objetivo: `/charters` como listado unificado de naves (las 3 de PEX ahora; operadores aliados después), con comparador, precio por persona calculado, y dos modos de cierre: "Reserva directa" (PEX → checkout con `ref`) y "Cotizar" (aliado → lead + WhatsApp). Sin naves ni operadores ficticios: solo las 3 de PEX con los datos del bloque 2 (sección 2.1).

## 4.1 Modelo

- Prisma: `Operator { id, slug @unique, name, whatsapp?, email?, commissionPct Decimal(5,2)?, contractSignedAt?, ampLicense?, insuranceUntil?, verified Boolean @default(false), active Boolean @default(true) }` y `Vessel { id, slug @unique, operatorId, name, type, lengthFt?, capacityMax, marina, pricing Json (filas: ruta, duración h, capacidad máx., precio barco), routes Json, includes Json, onRequest Json, depositPct, cancellationPolicy Json ({es,en}), photos Json, video?, closeMode ("deeplink"|"quote"), pexVesselSlug?, pexPath?, verifiedAt, sourceUrl?, active, order }`. Migración `0004_charters` (diff, sin tocar DB remota). Seed: operador `pex` + Aura, Pacific Ferry 1 y Sirena del Mar con la tabla de precios completa del bloque 2.
- `src/lib/vessels.ts` con fallback en código (`src/content/vessels.ts`) igual que el catálogo.

## 4.2 Páginas

- `/charters`: filtros (capacidad mínima, presupuesto máximo por barco, duración 4/8/12 h, ruta Bahía/Taboga/Las Perlas, tipo, marina); control "¿Cuántas personas?" que calcula "desde $X por persona" = precio del tramo de capacidad que cubre a ese grupo ÷ personas (como hace PEX: Aura "desde $55/persona"); orden por precio por persona. Tarjeta: foto, nombre, tipo, capacidad, "desde $1,300 (4 h · hasta 15 pax)", badge `Reserva directa` o `Cotizar`.
- `/charters/[slug]`: ficha estándar (nombre, tipo, capacidad, marina, tabla de precios por ruta/duración/capacidad, incluye, bajo solicitud con precios cuando PEX los publica, políticas de apartado y cancelación, galería, operador). CTA principal según `closeMode`: `deeplink` → formulario corto (nombre, WhatsApp, email, fecha, horas, pax, ocasión) que crea un lead `charter_pex` vía `POST /api/leads` y redirige a `buildPexUrl({ target: "charter_checkout", vessel, leadId, handoffToken, campaign: slug })` con la misma pantalla `/listo` del bloque 2; `quote` → `/cotizar/[slug]`.
- `/charters/comparar?v=aura,pacific-ferry-1`: hasta 4 naves lado a lado: capacidad, precio por 4/8/12 h, precio por persona para el grupo indicado, incluye/no incluye, apartado, política.
- `/cotizar/[slug]` (para `closeMode = quote`; hoy sin naves, pero la ruta queda lista): formulario → lead `charter_partner` con estado `quote_requested` → abre WhatsApp de Atlante con el resumen; texto "Te respondemos en menos de 2 horas en horario de atención" solo si Mark lo confirma (PENDIENTE MARK; mientras tanto "Te respondemos por WhatsApp").
- `/aliados` y `/aliados/registro`: propuesta para operadores (ficha + leads calificados; comisión "según acuerdo" — PENDIENTE MARK), hoteles/concierges (código de aliado) y agencias; formulario → `PartnerApplication` (`POST /api/partner-applications`, con rate-limit) + `/admin/aliados` para revisarlas.
- Home: `ChartersSection` muestra las 3 naves con precio por persona para 15 personas y enlace a `/charters`.

## 4.3 Admin

- `/admin/naves` y `/admin/operadores`: CRUD; `commissionPct` interno (nunca público); checklist "verificado" (licencia AMP, seguro vigente, contrato firmado) → solo con los 3 se muestra el sello "Operador verificado" en público.
- `/admin/leads` muestra los leads de charter con `vesselSlug`, horas y pax; estados `quote_requested → quoted → accepted → paid / lost` con acciones.

## 4.4 Verificación

- Tests: cálculo de precio por persona (Aura 15 pax Bahía 4 h = $1,300/15 = $86.67; Sirena 80 pax Las Perlas = $5,380/80 = $67.25), filtros, y que toda URL de "Reserva directa" contiene `ref=ATLANTE`.
- Lighthouse móvil ≥ 85 en `/charters` (documenta el resultado con `npx lighthouse` si está disponible; si no, anótalo).
- Reporte `docs/reportes/bloque-04.md`.
'@
$Docs["docs/bloques/05-R3-alianzas.md"] = @'
# Bloque 5 — R3 · Alianzas y códigos de aliado (P1)

Objetivo: que hoteles, concierges, agencias y organizadores puedan recomendar Atlante con su propio código y que la comisión se reparta en el reporte, sin cambiar nada del lado de PEX (PEX solo conoce `ref=ATLANTE`).

## 5.1 Códigos de aliado

- Reutiliza el modelo `Reseller` (nombre, email, `referralCode`, `commissionPercent`, `active`). Añade `kind` ("hotel" | "agency" | "organizer" | "operator"), `whatsapp?`, `notes?` con migración `0005_partners`.
- `middleware.ts`: si llega `?partner=CODE` (o `?ref=CODE` en rutas de Atlante), guarda cookie `atl_partner` de 30 días (httpOnly no, para que el funnel lo lea) y limpia el parámetro de la URL canónica.
- `POST /api/leads` valida `partnerCode` contra `Reseller.active` y lo guarda en `Lead.partnerCode`; si no existe, lo ignora sin error.
- Reporte `/admin/comisiones`: columna "aliado" y reparto: comisión Atlante = monto × `commissionPct`; parte del aliado = monto × `Reseller.commissionPercent` (PENDIENTE MARK: reparto por defecto); export CSV por aliado.
- `/admin/aliados`: alta manual de `Reseller` (código en mayúsculas, único), enlace de invitación `https://www.atlantedelpacifico.lat/?partner=CODE` con botón copiar, y revisión de `PartnerApplication` (aprobar → crea `Reseller` u `Operator` según `kind`).

## 5.2 Materiales (borradores en `docs/comercial/`, marcados BORRADOR — revisar Mark)

- `contrato-comision-operador.md`: objeto (intermediación), comisión (porcentaje en blanco), forma de pago (mensual contra factura), obligaciones del operador (licencia, seguro, precio igual al público), datos que se comparten, duración y terminación. Sin citar leyes.
- `kit-operador.md`: qué necesita Atlante para publicar una nave (8 fotos mínimo, capacidad, marina, tabla de precios por ruta/duración, incluye/no incluye, políticas, WhatsApp de contacto).
- `propuesta-hoteles.md`: cómo funciona el código, qué gana el hotel, ejemplo con números en blanco.

## 5.3 Verificación

- Tests: cookie de partner → lead con `partnerCode`; código inactivo se ignora; reparto de comisión.
- `npm run lint && npm run build && npm run test`. Reporte `docs/reportes/bloque-05.md`.
'@
$Docs["docs/bloques/06-R4-crecimiento.md"] = @'
# Bloque 6 — R4 · Crecimiento: destinos, EN completo, CI (P2)

Objetivo: SEO de broker (páginas de destino y comparación), sitio completo en inglés con `hreflang`, y CI que proteja lo construido. Contenido solo con datos del catálogo y de las naves; nada inventado sobre lugares (sin cifras, distancias ni tiempos que no estén ya en el repo).

## 6.1 Páginas de destino

- `/destinos/taboga`, `/destinos/las-perlas`, `/destinos/bahia`: "todas las formas de ir": para cada destino lista los productos del catálogo y las naves cuyas rutas lo incluyen (ferry, tour, party, charter) con precio real y CTA correspondiente (`/reservar/[slug]` o `/charters/[slug]`). Texto descriptivo breve (2–3 párrafos) escrito por ti, sin datos numéricos nuevos. JSON-LD `TouristDestination` sin rating.
- Enlaza desde el home (`Destinations.tsx`) y el footer; añade al sitemap.

## 6.2 Inglés completo + hreflang

- Revisa que TODO el sitio público tenga EN (catálogo, naves, funnel, legales, admin no). 
- Rutas `/en/*` mediante `middleware.ts` (reescritura por prefijo) o segmento `[locale]` — elige la opción más simple compatible con Next.js 16 y documéntala. `<link rel="alternate" hreflang="es" | "en" | "x-default">` en `metadata.alternates.languages` de cada página. Selector ES/EN del header navega entre las rutas equivalentes.
- `grep -ri sunset src/` sigue en 0.

## 6.3 CI

- `.github/workflows/ci.yml`: en cada push a ramas `feature/*` y en PRs a `main`: `npm ci`, `npm run lint`, `npm run test`, `npm run build` (con `DATABASE_URL` ficticia si el build lo exige), `npm run check:pex-links`. Añade Playwright e2e mínimo del funnel del tour bahía en modo puente (arranca `next start` y comprueba que `/reservar/tour-bahia` llega a `/listo` y que el enlace final contiene `ref=ATLANTE`). Lighthouse CI opcional (`@lhci/cli`, gratuito) con umbral 85 móvil en `/`, `/reservar/tour-bahia`, `/charters`; si falla por red en CI, déjalo como job no bloqueante.

## 6.4 Verificación

- `npm run lint && npm run build && npm run test`. Reporte `docs/reportes/bloque-06.md` con capturas o descripción de las 3 rutas clave a 390 px.
'@
$Docs["docs/bloques/anexo-PEX.md"] = @'
# Anexo — Cambios que requiere Pacific Experience (para la sesión de código de PEX, NO para este repo)

Atlante del Pacífico (atlantedelpacifico.lat) va a revender los tours, el ferry y los charters de PEX. Cada venta que entre desde Atlante debe quedar atribuida con `referral_code = ATLANTE`. Estos son los cambios mínimos en PEX, en orden de prioridad. Lo que ya existe en PEX (verificado el 09/09/2026): checkout de tours en `/tours/checkout?slot_id=&trip_id=&date=` con un campo manual "Código de referido" (`name=referral_code`); checkout de charter en `/charter/checkout?vessel=aura|pacific-ferry-1|sirena-del-mar`; página del tour bahía en `/ferry/bahia`; ferry en `/ferry/taboga`.

| # | Cambio | Especificación mínima | Prioridad |
|---|---|---|---|
| X1 | Leer `ref` y `ref_id` por URL en `/tours/checkout`, `/charter/checkout`, la compra de ferry y las páginas de producto | Si llega `ref`, prellenar `referral_code` (y bloquearlo o dejarlo editable, a decisión de PEX); guardar `ref`, `ref_id` y `utm_source/medium/campaign` en la orden; cookie `pex_ref` de 30 días para que la atribución sobreviva si el cliente vuelve directo o desde otra página | P0 |
| X2 | Aceptar `tickets` (y categorías si aplica) por URL en el checkout de tours | Prellenar la cantidad; validar contra el cupo | P0 |
| X3 | Prellenado por token `h` | Si el checkout recibe `h`, llamar en el servidor a `GET https://www.atlantedelpacifico.lat/api/handoff/<h>` con cabecera `x-atlante-key: <PEX_HANDOFF_SECRET>` (secreto compartido acordado con Mark); respuesta `{ name, email, phone, tickets, pax, addons, referral_code, ref_id }`; prellenar nombre, correo, teléfono y `referral_code`; si falla, continuar sin prellenar. El token es de un solo uso y vence a los 30 min | P0 |
| X4 | Feed público sólo lectura | `GET /api/public/trips` → `[{ id, slug, kind (tour/party/ferry), name, price_from, price_table: [{label, price}], duration_min, capacity_min, capacity_max, policies: [], images: [], path, available }]` y `GET /api/public/slots?trip_id=&from=&to=` → `[{ id, trip_id, date, start, end, capacity_remaining, price }]`. Cache 60 s, CORS abierto solo para GET, sin datos personales | P0 |
| X5 | Webhook de conversión hacia Atlante | Al confirmar pago, cancelar o reembolsar una orden con `referral_code = ATLANTE`: `POST https://www.atlantedelpacifico.lat/api/pex/booking-confirmed` con cuerpo `{ event: "booking.paid" | "booking.cancelled" | "booking.refunded", pex_booking_id, ref, ref_id, product: { type, id, name }, service_date, tickets, amount, currency: "USD", paid_at, customer_email_sha256 }`, cabeceras `x-pex-timestamp` (epoch segundos) y `x-pex-signature` = HMAC-SHA256(`${timestamp}.${body}`, `PEX_WEBHOOK_SECRET`). Reintentar con backoff si Atlante no responde 200. Sin datos de tarjeta ni nombre | P0 |
| X6 | Página de éxito con evento cross-domain | Aceptar el parámetro `_gl` del linker de GA4 y disparar `purchase` (transaction_id, value) en GA4 y Meta cuando la orden tenga `ref` | P1 |
| X7 | Add-on en el ferry de Contadora | Mostrar "Tour por las islas del archipiélago — 4 h — +$50" (unidad por persona o por reserva según decida Mark) y leer `addon=tour-islas` para dejarlo premarcado | P1 (cuando Contadora se active) |
| X8 | Calendario en `/ferry/bahia` | Reemplazar las píldoras de fechas por un calendario que solo habilite días con salida, abierto en el mes de la próxima salida; si el día no tiene salida, ofrecer las 3 próximas fechas | P1 (mejora propia de PEX) |
| X9 | Broker en charters | En la hoja de disponibilidad de charters, columna `BROKER = ATLANTE` para reservas que lleguen con `ref=ATLANTE`; incluir `ref` en la propuesta/PDF interno | P1 |

Secretos a acordar entre ambos proyectos (Mark los crea y los carga en Vercel de cada uno): `PEX_HANDOFF_SECRET` y `PEX_WEBHOOK_SECRET` (32+ caracteres aleatorios cada uno, distintos).
'@
$written = 0
foreach ($k in $Docs.Keys) { if (Write-TextFile (Join-Path $RepoDir $k) $Docs[$k]) { $written++ } }
New-Item -ItemType Directory -Path (Join-Path $RepoDir "docs/reportes") -Force | Out-Null
Write-TextFile (Join-Path $RepoDir "docs/reportes/.gitkeep") "" | Out-Null
try {
  if ($PSCommandPath) {
    $selfDest = Join-Path $RepoDir "scripts/atlante-bloques.ps1"
    $same = (Test-Path $selfDest) -and ((Get-FileHash $PSCommandPath -Algorithm SHA256).Hash -eq (Get-FileHash $selfDest -Algorithm SHA256).Hash)
    if (-not $same) { New-Item -ItemType Directory -Path (Split-Path -Parent $selfDest) -Force | Out-Null; [System.IO.File]::Copy($PSCommandPath, $selfDest, $true); $written++ }
  }
} catch { Write-Warn2 "No pude copiar el script a scripts/: $($_.Exception.Message)" }
Write-Ok "$written archivo(s) de docs escritos/actualizados"
if (Git-CommitAll "docs: PRD v2, TODO, reglas, bloques de trabajo y anexo PEX") { Write-Ok "commit de docs" } else { Write-Ok "docs sin cambios" }
Git-Push | Out-Null

# ----------------------------------------------------------------------------------------------------
# 3. Dependencias y entorno
# ----------------------------------------------------------------------------------------------------
Write-Step "3/6 · Dependencias (npm install) y entorno"
Invoke-Native npm @("install", "--no-audit", "--no-fund") -Ignore | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Warn2 "npm install terminó con errores; Claude Code intentará resolverlo en el bloque." } else { Write-Ok "npm install" }
Import-DotEnv $RepoDir
$hasDb = [bool]$env:DATABASE_URL
if ($hasDb) { Write-Ok "DATABASE_URL presente: las migraciones se aplicarán al final de cada bloque" }
else {
  Write-Warn2 "Sin DATABASE_URL en .env.local: el sitio funciona en modo sin base de datos (los leads no se guardan)."
  Write-Host @"
   Para activar la base de datos (cuando quieras, no bloquea los bloques):
     1) Supabase → proyecto ATLANTE (está pausado): Restore project.
     2) Settings → Database → copia las URLs: pooler (puerto 6543) → DATABASE_URL ; directa (5432) → DIRECT_URL.
     3) Crea $RepoDir\.env.local con DATABASE_URL, DIRECT_URL, ADMIN_PASSWORD, AUTH_SECRET (y las mismas en Vercel).
     4) Vuelve a correr este script (o: npx prisma migrate deploy).
"@ -ForegroundColor DarkGray
}

function Invoke-DbMigrate {
  if (-not $env:DATABASE_URL) { return }
  if (-not (Test-Path (Join-Path $RepoDir "prisma/migrations"))) { Write-Host " (aún no hay migraciones)" -ForegroundColor DarkGray; return }
  Write-Host " prisma migrate deploy ..." -ForegroundColor DarkGray
  $out = Invoke-Native npx @("prisma", "migrate", "deploy") -Ignore
  if ($LASTEXITCODE -eq 0) { Write-Ok "migraciones aplicadas"; return }
  $txt = $out -join "`n"
  if ($txt -match "P3005") {
    Write-Warn2 "La base ya tenía tablas (P3005): marco 0001_init como aplicada y reintento."
    Invoke-Native npx @("prisma", "migrate", "resolve", "--applied", "0001_init") -Ignore | Out-Null
    $out2 = Invoke-Native npx @("prisma", "migrate", "deploy") -Ignore
    if ($LASTEXITCODE -eq 0) { Write-Ok "migraciones aplicadas"; return }
    Write-Warn2 "migrate deploy sigue fallando:`n$($out2 -join "`n")"
  } else { Write-Warn2 "migrate deploy falló:`n$txt" }
}

# ----------------------------------------------------------------------------------------------------
# 4. Claude Code por bloque
# ----------------------------------------------------------------------------------------------------
$AllowedTools = "Read,Edit,MultiEdit,Write,Glob,Grep,LS,WebFetch,WebSearch,TodoWrite,Bash(npm:*),Bash(npx:*),Bash(node:*),Bash(git:*),Bash(dir:*),Bash(type:*),Bash(findstr:*),Bash(where:*),Bash(mkdir:*),Bash(copy:*),Bash(move:*),Bash(ren:*),Bash(del:*),Bash(rmdir:*),Bash(echo:*),Bash(cat:*),Bash(ls:*),Bash(cp:*),Bash(mv:*),Bash(rm:*),Bash(grep:*),Bash(find:*),Bash(head:*),Bash(tail:*),Bash(wc:*),Bash(sed:*),Bash(pwd:*),Bash(test:*),Bash(true:*)"

function Write-Linea([string]$Text) { Write-Host ((Get-Date).ToString("yyyy-MM-dd HH:mm:ss") + "  " + $Text) }

function Get-ClaudeExe {
  $cmd = Get-Command claude -ErrorAction SilentlyContinue
  if (-not $cmd) { throw "claude no está en el PATH" }
  $src = $cmd.Source
  if ($src -and $src.ToLower().EndsWith(".ps1")) {
    $alt = [System.IO.Path]::ChangeExtension($src, ".cmd")
    if (Test-Path $alt) { return $alt }
  }
  return $src
}

function Invoke-Claude([string]$Prompt, [string]$LogPath, [string]$Task, [string]$Etiqueta) {
  # Corre Claude Code en segundo plano con el prompt por stdin y escribe su salida al log;
  # mientras tanto imprime una línea de latido cada $Latido segundos (como el vigilante de PEX).
  $promptFile = Join-Path $RepoDir ("logs/prompt-" + (Get-Date).ToString("yyyyMMdd-HHmmss") + ".txt")
  [System.IO.File]::WriteAllText($promptFile, $Prompt, $Script:Utf8NoBom)
  $args = @("-p", ('"' + $Task.Replace('"', "'") + '"'), "--output-format", "text", "--max-turns", "$MaxTurns")
  if ($Peligroso) { $args += "--dangerously-skip-permissions" } else { $args += @("--permission-mode", "acceptEdits", "--allowedTools", ('"' + $AllowedTools + '"')) }
  if ($Model) { $args += @("--model", $Model) }
  $errLog = [System.IO.Path]::ChangeExtension($LogPath, ".err.log")
  Add-Content -Path $LogPath -Value ("===== " + (Get-Date).ToString("s") + " · claude " + ($args -join " ")) -Encoding UTF8
  $exe = Get-ClaudeExe
  $inicio = Get-Date
  $commits0 = ((Invoke-Native git @("rev-list", "--count", "HEAD") -Ignore) -join "").Trim()
  Write-Linea ("▶ Ejecutando " + $Etiqueta + "  (log: logs/" + (Split-Path -Leaf $LogPath) + ")")
  $p = Start-Process -FilePath $exe -ArgumentList $args -WorkingDirectory $RepoDir -RedirectStandardInput $promptFile -RedirectStandardOutput $LogPath -RedirectStandardError $errLog -NoNewWindow -PassThru
  $ultimo = 0
  while (-not $p.HasExited) {
    Start-Sleep -Seconds 1
    $seg = [int]((Get-Date) - $inicio).TotalSeconds
    if ($seg - $ultimo -ge $Latido) {
      $ultimo = $seg
      $kb = 0; try { $kb = [int]((Get-Item $LogPath).Length / 1KB) } catch {}
      $commits = ((Invoke-Native git @("rev-list", "--count", "HEAD") -Ignore) -join "").Trim()
      $nuevos = 0; try { $nuevos = [int]$commits - [int]$commits0 } catch {}
      $cambios = @(Invoke-Native git @("status", "--porcelain") -Ignore | Where-Object { $_ -ne "" }).Count
      Write-Linea ("  … " + $Etiqueta + " en curso · " + [int]($seg / 60) + " min · log " + $kb + " KB · commits nuevos: " + $nuevos + " · archivos modificados sin commit: " + $cambios)
      if (Test-Path (Join-Path $RepoDir "logs/STOP")) { Write-Linea "  logs/STOP encontrado: se espera a que termine este bloque y se detiene." }
    }
  }
  $p.WaitForExit()
  $code = $p.ExitCode
  Add-Content -Path $LogPath -Value ("===== fin claude · exit " + $code + " · " + (Get-Date).ToString("s")) -Encoding UTF8
  try { Remove-Item $promptFile -ErrorAction SilentlyContinue } catch {}
  return $code
}

function Get-BloqueFile([int]$N) {
  $pattern = ("{0:00}-*.md" -f $N)
  $f = Get-ChildItem (Join-Path $RepoDir "docs/bloques") -Filter $pattern | Select-Object -First 1
  if (-not $f) { throw "No encuentro docs/bloques/$pattern" }
  return $f.FullName
}

function Invoke-Build([string]$LogPath) {
  if ($SinBuild) { return $true }
  Write-Host " npm run build ..." -ForegroundColor DarkGray
  $out = Invoke-Native npm @("run", "build") -Ignore
  Add-Content -Path $LogPath -Value ("`n===== npm run build (exit $LASTEXITCODE)`n" + ($out -join "`n")) -Encoding UTF8
  if ($LASTEXITCODE -eq 0) { Write-Ok "build"; return $true }
  $Script:LastBuildOutput = ($out | Select-Object -Last 120) -join "`n"
  Write-Warn2 "build falló"; return $false
}

function Invoke-Bloque([int]$N) {
  $reglas = Get-Content (Join-Path $RepoDir "docs/bloques/00-reglas.md") -Raw -Encoding UTF8
  $bloqueFile = Get-BloqueFile $N
  $bloque = Get-Content $bloqueFile -Raw -Encoding UTF8
  $stamp = (Get-Date).ToString("yyyyMMdd-HHmm")
  $log = Join-Path $RepoDir ("logs/bloque-{0:00}-{1}.log" -f $N, $stamp)
  Write-Step ("Bloque $N/6 · " + (Split-Path -Leaf $bloqueFile) + "  (log: logs\" + (Split-Path -Leaf $log) + ")")

  $prompt = $reglas + "`n`n---`n`n" + $bloque + "`n`n---`n`nContexto de ejecución: hoy es " + (Get-Date).ToString("yyyy-MM-dd") + ". Rama: $Branch. Este es el bloque $N de 6; los reportes anteriores están en docs/reportes/. Ejecuta TODO el bloque de principio a fin sin pedir confirmación. Al final, haz commit (sin push)."
  $task = "Ejecuta íntegramente el bloque de trabajo que recibes por stdin (reglas comunes + bloque $N). No preguntes: no hay nadie mirando. Termina con commit y el reporte en docs/reportes/bloque-{0:00}.md." -f $N
  $code = Invoke-Claude $prompt $log $task ("bloque " + $N + " · " + (Split-Path -Leaf $bloqueFile))
  if ($code -ne 0) { Write-Warn2 "claude terminó con código $code (se continúa igual: se revisa el estado del repo)" }

  if (Git-CommitAll ("Bloque {0}: cierre automático (archivos pendientes de commit)" -f $N)) { Write-Ok "commit de cierre" }

  $ok = Invoke-Build $log
  $intentos = 0
  while (-not $ok -and $intentos -lt 2) {
    $intentos++
    Write-Warn2 "Pidiendo a Claude Code que arregle el build (intento $intentos de 2)"
    $fix = $reglas + "`n`n---`n`n" + ('El comando "npm run build" falló en la rama ' + $Branch + ' después del bloque ' + $N + '. Últimas líneas de la salida:') + "`n`n" + $Script:LastBuildOutput + "`n`n" + 'Arregla el error sin cambiar el alcance del bloque, vuelve a correr "npm run lint" y "npm run build" hasta que pasen, y haz commit.'
    Invoke-Claude $fix $log "Arregla el build roto según las instrucciones que recibes por stdin. No preguntes." ("bloque " + $N + " · corrección de build " + $intentos) | Out-Null
    Git-CommitAll ("Bloque {0}: corrección de build" -f $N) | Out-Null
    $ok = Invoke-Build $log
  }
  if (-not $ok) { Write-Warn2 "El build sigue fallando después del bloque $N; revisa el log. Se hace push igual para no perder el trabajo." }

  Invoke-DbMigrate
  Git-Push | Out-Null
  $rep = "docs/reportes/bloque-{0:00}.md" -f $N
  if (Test-Path (Join-Path $RepoDir $rep)) { Write-Linea ("✔ Terminada: bloque " + $N + " → " + $rep) } else { Write-Linea ("✔ Terminada: bloque " + $N + " (sin reporte en " + $rep + ")") }

  $estado = Get-Estado
  $done = @($estado.completados | ForEach-Object { [int]$_ })
  if ($ok -and ($done -notcontains $N)) { $done += $N }
  $estado.completados = $done
  Save-Estado $estado
  return $ok
}

if ($SoloPreparar) {
  Write-Step "Listo (solo preparación)"
  Write-Host " Docs subidos a la rama $Branch. Para correr los bloques: .\atlante-bloques.ps1" -ForegroundColor Green
  Write-Host " Pull request: $Script:CompareUrl"
  exit 0
}

Write-Step "4/6 · Ejecución de bloques"
$estado = Get-Estado
$completados = @($estado.completados | ForEach-Object { [int]$_ })
$inicio = if ($Desde -gt 0) { $Desde } else { 1 }
$resultados = [ordered]@{}
for ($n = $inicio; $n -le $Hasta; $n++) {
  if ($Desde -eq 0 -and $completados -contains $n) { Write-Host " Bloque $n ya completado (logs/estado.json) — saltando. Usa -Desde $n para repetirlo." -ForegroundColor DarkGray; $resultados["$n"] = "ya hecho"; continue }
  $r = Invoke-Bloque $n
  $resultados["$n"] = if ($r) { "OK" } else { "build con errores" }
  if (Test-Path (Join-Path $RepoDir "logs/STOP")) { Write-Linea "logs/STOP encontrado: me detengo aquí (bórralo para continuar en la próxima corrida)."; Remove-Item (Join-Path $RepoDir "logs/STOP") -ErrorAction SilentlyContinue; break }
  if ($Pausar -and $n -lt $Hasta) { Read-Host " Bloque $n terminado. Enter para continuar con el bloque $($n + 1) (Ctrl+C para parar)" | Out-Null }
}

# ----------------------------------------------------------------------------------------------------
# 5. Resumen
# ----------------------------------------------------------------------------------------------------
Write-Step "5/6 · Resumen"
foreach ($k in $resultados.Keys) { Write-Host ("  Bloque {0}: {1}" -f $k, $resultados[$k]) }
$pend = Get-ChildItem (Join-Path $RepoDir "docs/reportes") -Filter "bloque-*.md" -ErrorAction SilentlyContinue | ForEach-Object { Select-String -Path $_.FullName -Pattern "PENDIENTE MARK" -Context 0, 3 } | Select-Object -First 40
if ($pend) { Write-Host ""; Write-Host " PENDIENTE MARK encontrados en los reportes (revisa docs/reportes/*.md):" -ForegroundColor Yellow; $pend | ForEach-Object { Write-Host ("   " + $_.Filename + ": " + $_.Line.Trim()) } }

Write-Step "6/6 · Siguiente paso (manual, tú decides)"
Write-Host " Nada se ha mezclado a main ni desplegado. Revisa la rama y abre el Pull Request:" -ForegroundColor Green
Write-Host "   $Script:CompareUrl"
Write-Host " Vercel construye un preview de la rama automáticamente si el proyecto está conectado a GitHub."
Write-Host " Cambios que requiere PEX (otra sesión): docs\bloques\anexo-PEX.md"
Write-Host " Logs: $RepoDir\logs\"
