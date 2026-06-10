# GREAT API v2 — Razonamiento de Endpoints

**Fecha:** 29 de mayo de 2026
**Autor:** Nadia Ujovich
**Contexto:** Expansión del OpenAPI de PEV API v1 (solo Pre-Estimation) a GREAT API v2 (todas las vistas del sistema).

---

## 1. Punto de Partida

Partí del archivo `pev-openapi.yaml` que solo cubría Pre-Estimation: listado de project lines, detalle, estimación (draft/definitive/batch/copy), workload standard, prototipo, y el callback HVT Stage 2 que ya existía.

El `schema.sql` y `schema.md` del Greenfield Database Design v2 (19 tablas PostgreSQL) fueron la guía para inferir los endpoints faltantes. Cada tabla que almacena datos escribibles o leíbles necesitaba endpoints REST.

---

## 2. Decisión de project_id

El schema de BD usa `(pl_number, metier)` como clave compuesta única (UNIQUE constraint en `project_cycle`, `pl_number`, `metier`). La API anterior usaba `project_id` sin definir qué era.

Le pregunté a mi compañero y confirmó: `pl_number` no es único, `pl_number + metier` sí. Sugirió crear un `project_id` interno único.

**Decisión:** el formato será `PL-016-Backend` (pl_number + "-" + metier). Esto lo hice consistente en todo el OpenAPI y los tipos TypeScript.

---

## 3. Estimation Review — HVT (Stage 1, 2, 3)

### Stage 1: Send to HVT

Identifiqué que faltaba el endpoint de envío a HVT. De la captura de pantalla del dashboard vi un botón "Send to HVT" por cada línea individual en la tabla "PENDING REVIEW" (status Estimated). Las reglas del SDD Kit confirman:

- Solo líneas en status `Estimated` se envían (ERev-BR-04)
- Sent es irreversible (ERev-BR-02), confirmado por el subtítulo en la captura: "Locked in GREAT until CPO response"
- Solo PMO/Admin pueden enviar (permisos del spec)

El endpoint es por línea individual (no batch), porque el botón está en cada fila. El backend compone el HVT payload internamente desde project_line + estimation + yearly_values. El body del request está vacío (solo el ID en el path).

### Stage 2: HVT Callback (ya existía)

El endpoint `POST /hvt/stage2-callback` ya estaba. Lo validé: recibe array de `HvtCallbackItem` con `project_line_id`, `metier`, `approved`, `comment`. Incluye `cpo_comment` de rejection que el frontend necesita mostrar. Lo agregué al `ProjectLineDetail` schema.

### Stage 3: Final Review Send

Del spec de Final Review (FR-BR-08): envía todo el ciclo activo a HVT, no tiene per-line send. Es non-blocking (FR-BR-06), se puede reenviar (FR-BR-07). El request body solo lleva `cycle_id`. El response incluye `lines_sent` y opcionalmente `warning` sobre allocation incompleta.

---

## 4. Allocation

### PUT vs PATCH allocation

Identifiqué dos operaciones distintas:
- **PUT** — Bulk replace, reemplaza toda la allocation de la línea
- **PATCH** — Dirty-row save, solo filas modificadas (ALLOC-BR-05)

El cost_type no cambia nunca en bulk assign (ALLOC-BR-10). TSA/TC sin sociedad bloquea save (ALLOC-BR-06).

### Split / Undo Split

Del spec (ALLOC-BR-11): porcentajes deben sumar 100%. Cada split hereda el cost_type del JU original (confirmado por mí: pregunté y la respuesta fue sí, hereda). Undo split elimina children via CASCADE y restaura parent (ALLOC-BR-12).

### Bulk Assign

Sobrescribe sociedades existentes (ALLOC-BR-09). Nunca cambia cost_type (ALLOC-BR-10).

### Allocation Rules

Las rules se cargan como JSON estructurado (no Excel), por metier. El schema tiene columnas estructuradas (`organ_type`, `fuel_type`, etc.) — no hay mention de "Excel-only" en allocation rules (sí en workload standard, WL-BR-02). Incluye `apply_on_upload`: si es true, re-ejecuta auto-rules en JUs sin sociedad de ese metier.

### K€ Rates

Upload con versionado inline (`valid_from`). Cada upload crea nueva versión, la anterior queda como historia.

### Metier Distribution

Configuración de distribución temporal (`sp_pc`, `pc_co`, `co_sop`) por metier. Validación: deben sumar 1.0 (constraint en BD). Versionado con `valid_from`.

---

## 5. Management View

Read-only, solo PMO/Admin (MGMT-BR-01). Dos charts:
- **Pie chart:** conteo de pares (PL, Métier) por status. Filtro por metier.
- **Timeline:** serie temporal de status counts desde `status_change_log`.

Pendiente: MGMT-01 (event log vs daily snapshot) — no bloquea el endpoint, asumí event log approach.

---

## 6. Transversal

### Cycles

GET/POST cycles. Crear un ciclo auto-desactiva el actual (CYCLE-BR-04). No se pueden reactivar (CYCLE-BR-02) ni borrar (CYCLE-BR-03). Campos obligatorios: `name` + `start_date`. El `created_by_oid` viene del JWT.

### Workload Standard

Upload .xlsx por metier (WL-BR-02). Solo Admin/RCRC (WL-BR-01). Preprocesamiento y validación antes de persistir (WL-BR-03, WL-BR-06). Cada upload es nueva versión (WL-BR-04).

### Emails

Log de emails del ciclo activo con filtros. Retry por `email_log_id` específico.

---

## 7. cpo_comment en Project Line Detail

De la captura de pantalla del frontend hay una columna "Comments" en la tabla "REJECTED (IN REWORK)" que muestra el comment del CPO. Confirmé que este dato viene del HVT Stage 2 callback y se guarda en `status_change_log.comment`. Agregué `cpo_comment` al schema `ProjectLineDetail`.

---

## 8. Pendientes para el Lunes (con compañero)

1. **HVT-02:** ¿Cuáles campos NULL de `project_line` pasan a NOT NULL con el Stage 1 payload? Los sospechosos son `organ_type`, `energy`, `project_ranking`, `injection_system` (matching) y `sp_date` (BR-08). El schema NO está congelado.

2. **Upload XLSX endpoints:** Format/structure de los archivos de upload (workload standard, allocation rules?). Pendiente definir.

3. **MGMT-01:** Timeline data source — event log vs daily snapshot (no bloquea).

4. **ALLOC-01:** K€ job units — 4 preguntas abiertas (fórmula, grid display, societe requirement, Final Review appearance).

5. **FINAL-01:** Stage 3 HVT payload — fields/granularity por acordar con HVT team.

6. **TRANS-01:** Email service — Microsoft Graph API vs SMTP relay (bloquea TODOS los emails).

---

## 9. Archivos Generados

- `docs/pev-openapi.yaml` — GREAT API v2 (30+ endpoints, 40+ schemas)
- `docs/pev.ts` — TypeScript types auto-generados desde el OpenAPI

## 10. Repositorio

Los archivos están en `ux_great_prototype/docs/`. Commit: `2c8b14c`.
