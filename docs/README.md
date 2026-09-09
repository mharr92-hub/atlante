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