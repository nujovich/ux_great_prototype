# GAP ANALYSIS — SDD Kit vs OpenAPI vs SQL vs pev.ts

**Fecha:** 01/06/2026
**Estado:** Borrador — pendiente de revision

---

## 1. Reglas SDD sin representacion en OpenAPI/SQL

| Regla | Descripcion | OpenAPI | SQL |
|-------|-------------|---------|-----|
| BR-02 | Draft gate — requiere Save as Draft antes de Definitive | No hay sessionId ni distincion draft de sesion | — |
| BR-04 | Approved = terminal — inmutable | No documenta inmutabilidad en API | Trigger implicito |
| BR-07 | Null compatibility — null vs null = compatible | No documenta en API | — |
| BR-09 | occurrence_locked default=false | Campo no existe en JU schema | DEFAULT false |
| BR-10 | assignee read-only desde HVT | No documenta que no es editable | — |
| BR-12 | Inductor sin cran se saltea silenciosamente | No hay warning en API | — |
| BR-14 | Comment scoped to (line, metier) | No hay estructura comentario en API | — |
| BR-16 | Sent = locked — no se puede editar | Status enum tiene "Sent" pero no documenta bloqueo | — |
| BR-17 | Re-save overwrites previous Draft | No documenta overwrite behavior | — |
| BR-20 | Custom JU permissions — Engineer/PMO/Admin pueden crear | No hay endpoint ni schema | — |
| ALLOC-BR-02 | Auto-rules skip assigned JUs | No hay endpoint de preview | — |
| ALLOC-BR-03 | FTE read-only | No hay campo FTE read-only en response | — |
| ALLOC-BR-07 | FTE sin societe = warning (no blocking) | No hay estructura de warning | — |
| ALLOC-BR-08 | Diversity dropdown non-blocking | diversity_selection no esta en API schema | En SQL |
| ALLOC-BR-14 | Filter persistence | No hay params de estado de filtro | — |
| DEL-BR-01..10 | Bulk inductor deletion (10 reglas) | **Sin endpoint** | — |
| WL-BR-05 | JU coefficients immutable after save | No documenta inmutabilidad | Comentario |
| CYCLE-BR-03 | No deletion de ciclos | No documenta que no hay DELETE | No hay DELETE |
| MGMT-BR-04 | H-NP/H-PROJECT excluidos de filtro | No documenta exclusion | — |

---

## 2. Campos en SQL que NO estan en OpenAPI

| Campo SQL | Tabla |
|-----------|-------|
| pl_number | project_line |
| pl_name | project_line |
| assignee_oid | project_line |
| parent_pl_number | project_line |
| diversity_selection | job_unit_allocation |
| occurrence_locked | job_unit |
| ws_n2_entry_id | inductor |
| ws_n3_entry_id | job_unit |
| generic_profile | ws_n3_entry, job_unit |
| active (bool) | inductor |
| ju_codes (TEXT[]) | allocation_rule |
| variant_societies (TEXT[]) | allocation_rule |
| group_name | inductor, ws_n2_entry |
| fmm / fmm_desc | job_unit |
| smm / dmm | job_unit |
| total_fte / total_bh / total_km | job_unit |

---

## 3. JU schema en OpenAPI vs SQL

### Estado anterior (6 campos — incompleto)
```
id, name, occurrence, locked, custom, metier
```

### Estado actual — estabilizado en v2.0 (15 campos)
```
id, cran_id, name, long_name,
variable, fixed, unit_type,
occurrence, occurrence_locked,
fmm, smm, dmm, generic_profile,
custom, metier
```

### Mapping a SQL
| OpenAPI (JU) | SQL (job_unit / ws_n3_entry) | Notas |
|---|---|---|
| id | id | — |
| cran_id | ws_n2_entry_id (via ws_n3_entry) | Denormalizado para el cliente |
| name | ju_short_name | Campo display principal |
| long_name | ju_long_name | Descripcion extendida |
| variable | variable | Coeficiente variable (días/unit) |
| fixed | fixed | Componente fijo (días) |
| unit_type | unit_type | man_day / bench_hours / kilometres / kiloeuros |
| occurrence | occurrence | Multiplicador del engineer |
| occurrence_locked | occurrence_locked | BR-09: bloqueo de ocurrencia |
| fmm | fmm / fmm_desc | Solo codigo (desc omitida en API) |
| smm | smm | — |
| dmm | dmm | — |
| generic_profile | generic_profile | — |
| custom | is_custom | Renombrado a `custom` en API |
| metier | metier | Routing métier (ALLOC-BR-17) |

### Campos SQL aún fuera del OpenAPI (omitidos intencionalmente)
| Campo SQL | Motivo de omision |
|---|---|
| inductor_id | Redundante — expresado via nesting Inductor→Cran→JU |
| project_line_id | Contexto del endpoint, no del JU |
| ws_n3_entry_id | Identificador interno del WS; irrelevante para el cliente |
| fmm_desc | Descripcion textual del FMM; no necesaria en frontend |
| total_fte / total_bh / total_km | Calculados server-side, se retornan en PreSaveSummary |
| created_at / updated_at | No expuestos por design; el ciclo lo provee |

**Impacto resuelto:** El frontend puede ahora renderizar coeficientes, códigos FMM/SMM/DMM y `unit_type` directamente desde el tipo `JU` sin interfaces legacy (`JobUnit`).

---

## 4. Campos en OpenAPI que NO estan en SQL

| Campo OpenAPI | Nota |
|---------------|------|
| description (ProjectLineDetail) | No existe columna en SQL |
| energy (OpenAPI) vs energy_fuel_type (SDD) | Naming split — SDD tiene 2 campos |

---

## 5. Inconsistencias de naming

| SDD Kit | OpenAPI/SQL | Status |
|---------|-------------|--------|
| energy_fuel_type | energy (OpenAPI) | Inconsistente |
| ju_short_name / ju_long_name | name (unico en OpenAPI) | SDD tiene 2, API tiene 1 |
| Bench Hours (SQL unit_type) | No aparece en JU schema | Falta |
| occurrence_locked | No en JU schema | Falta |

---

## 6. Endpoints faltantes en OpenAPI

1. DELETE /bulk-inductor — DEL-BR-01..10 (10 reglas SDD sin endpoint)
2. GET /estimation/review/view — Vista Estimation Review completa
3. PUT /estimation/review/send-all — Send all eligible (no solo unitario)
4. GET /allocation/auto-rules-preview — Preview de asignacion automatica
5. GET /allocation/ju/{id}/yearly-values — Valores yearly de un JU
6. GET /final-review — Lineas approved por ciclo
7. GET /final-review/export-csv — Export CSV flat
8. GET /cycles/{id}/summary — Resumen del ciclo
9. CRUD /prototype-categories — Admin CRUD, no solo listado
10. POST /project-lines/{id}/custom-ju — Crear Custom JU (BR-20)

---

## 7. Tipos en pev.ts que faltan (heredado del OpenAPI)

| Tipo SDD | pev.ts equivalente | Status |
|----------|-------------------|--------|
| JobUnit dataclass (15+ campos) | JU (6 campos) |  ✅ Estabalizado |
| Inductor dataclass (con selected_cran, job_units, group_name) | Inductor (id, name, crans) | INCOMPLETO |
| PrototypeEstimation (categories: dict) | PrototypePayload (PrototypeCategoryEntry[]) | Diferente estructura |
| AllocationRule (ju_codes, variant_societies, priority, row_order) | AllocationRuleEntry | Parcial |

---

## 8. Reglas cubiertas correctamente

| Regla | SDD Kit | OpenAPI | SQL | pev.ts |
|-------|---------|---------|-----|--------|
| ALLOC-BR-17 JU metier routing | ✅ resolve_ju_metier() | ✅ JU.metier enum + description | ✅ Trigger validate_job_unit_metier | ✅ |
| ALLOC-BR-11 Split 100% | ✅ | ✅ SplitRequest description | ✅ CHECK constraint | ✅ |
| ALLOC-BR-06 TSA/TC blocks save | ✅ | ✅ PatchAllocation description | — | ✅ |
| ALLOC-BR-09 Bulk assign overwrites | ✅ | ✅ BulkAssign description | — | ✅ |
| ALLOC-BR-10 Bulk assign no cost_type change | ✅ | ✅ BulkAssign description | — | ✅ |
| ALLOC-BR-12 Split undo cascade | ✅ | ✅ UndoSplit description | ✅ ON DELETE CASCADE | ✅ |
| CYCLE-BR-01 One active cycle | ✅ | — | ✅ Partial unique index | — |
| CYCLE-BR-02 No reactivation | ✅ | ✅ CreateCycle description | — | — |

---

## Resumen ejecutivo

- **~20 reglas SDD** sin representacion en OpenAPI/SQL
- **~15 campos SQL** sin OpenAPI
- **JU schema** en API severamente incompleto (6 vs 20+ campos)
- **~10 endpoints** faltantes
- **BR-20 (Custom JU permissions)** en SDD Kit pero sin endpoint API
- **ALLOC-BR-17 (JU metier routing)** completo en todas las capas
- **pev.ts** consistente con OpenAPI (hereda las mismas faltas)

**Prioridad alta:**
1. Expandir JU schema en OpenAPI con campos de coeficientes
2. Agregar endpoints faltantes (bulk inductor, auto-rules preview, final review)
3. Documentar BR-20 en API (Custom JU permissions)
4. Resolver naming inconsistencies (energy vs energy_fuel_type)
