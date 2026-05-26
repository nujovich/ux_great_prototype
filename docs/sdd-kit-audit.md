# SDD Kit — Auditoría de Prototipo vs Specs

**Fecha:** 2026-05-26
**Prototipo:** UX Great Prototype (`ux_great_prototype/`)
**SDD Kit:** `sdd-kit/` (submodule)

---

## Resultado de la integración

| Componente | Estado |
|-----------|--------|
| Submodule SDD Kit | ✅ Cargado |
| Tests del kit (216) | ✅ Pasando |
| AGENTS.md en contexto del agente | ✅ Cargado |
| Specs de Pre-Estimation disponibles | ✅ 17 reglas |

---

## Discrepancias encontradas

### 1. Compatibilidad multi-línea (`src/lib/compatibility.ts`)

**Prototipo actual** — verifica:
- Mismo métier
- Mismo ciclo (cycleId)
- Que ninguna línea esté bloqueada (approved/allocated)

**Spec (BR-06, BR-07)** — debe verificar:
- Mismo **Organ Type**
- Misma **Energy / Fuel Type**
- Mismo **Project Ranking**
- Mismo **Injection System**
- `null vs null` = compatible
- `null vs valor` = NO compatible

**Conclusión:** ❌ El prototipo chequea campos incorrectos.

### 2. Fórmula de estimación (`src/lib/calc.ts`)

**Prototipo actual:**
```typescript
return sum + occ * ju.variable + ju.fixed;
```
```typescript
const customDays = customJUs.reduce((acc, j) => acc + j.days, 0);
return (inductorDays + customDays) * Math.max(globalOccurrences, 1);
```

**Spec (§9.1):**
```
Total = (Variable × Occurrence) + Fixed
```

La fórmula base `occ × variable + fixed` es correcta. ✅
Pero el prototipo multiplica el total por `globalOccurrences` que no existe en el spec. ❌

### 3. Cálculo de FTE (`src/lib/calc.ts`)

**Prototipo actual:** No calcula FTE. Solo calcula "días".

**Spec (§9.2):**
```
man_day → FTE = Total / 209
bench_hours → BH
kilometres → KM
k_euros → Excluido
```

**Conclusión:** ❌ Falta el cálculo de FTE, BH, KM.

### 4. Distribución mensual (`src/lib/calc.ts`)

**Prototipo actual:**
```typescript
const weights = [0.5, 1, 1.2, 1.3, 1.4, 1.4, 1.2, 1.1, 1, 0.9, 0.6, 0.4];
```

**Spec (§9.4):**
```
Distribución uniforme desde SP date (siempre 1º del mes).
Los valores mensuales suman al total anual.
```

**Conclusión:** ❌ Pesos hardcodeados sin relación con SP date.

### 5. Cálculo de K€ (`src/lib/calc.ts`)

**Prototipo actual:**
```typescript
return days * (rate?.rate ?? 0.85);
```

**Spec (§11, Allocation):**
```
K€ por año = FTE(año) × Rate(societe-site, año)
```
El K€ NO se calcula en Pre-Estimation. Se calcula en Allocation (§11).

**Conclusión:** ❌ K€ no corresponde a esta vista.

### 6. Inductor sin cran

**Prototipo actual:**
```typescript
if (!sel.selectedCranId) return acc;
```

**Spec (BR-12):**
```
Inductor without cran → skipped silently. Does not block estimation or saving.
```

**Conclusión:** ✅ Correcto.

---

## Resumen

| Archivo | Regla | Prototipo | Spec | Estado |
|---------|-------|-----------|------|--------|
| `compatibility.ts` | BR-06, BR-07 | Métier + Cycle + Status | 4 campos de compatibilidad | ❌ |
| `calc.ts` | §9.1 | Fórmula base OK, globalOccurrences extra | (Variable × Occurrence) + Fixed | ⚠️ |
| `calc.ts` | §9.2 | No calcula FTE | FTE = Total / 209 | ❌ |
| `calc.ts` | §9.4 | Pesos fijos | Distribución uniforme desde SP | ❌ |
| `calc.ts` | §11 | K€ en Pre-Estimation | K€ en Allocation | ❌ |
| `calc.ts` | BR-12 | Skip sin cran | Skip sin cran | ✅ |

**6 hallazgos: 3 críticos, 1 menor, 2 correctos.**

---

## Próximo paso

Corregir `src/lib/compatibility.ts` y `src/lib/calc.ts` para alinearlos con el spec. Ver `sdd-kit/great_dspy/specs/pre_estimation_specs.py` para las reglas exactas y `sdd-kit/great_dspy/modules/pre_estimation.py` para la implementación de referencia en Python.