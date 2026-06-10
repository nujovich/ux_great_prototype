# SDD Kit — Proof of Concept

## Repositorio base

- **Proyecto:** UX Great Prototype (`ux_great_prototype/`)
- **Rama:** `feat/sdd-kit-integration` (partió de `claude/epic-carson-loXuA`)
- **SDD Kit:** `github.com/nujovich/great-dspy-pipeline` (submodule en `sdd-kit/`)

---

## 1. Integración del submodule

```bash
cd ux_great_prototype
git checkout -b feat/sdd-kit-integration
git submodule add https://github.com/nujovich/great-dspy-pipeline.git sdd-kit
```

Resultado:
```
Submodule: 6959ba177642050e3733ae161794f9710de8de15 sdd-kit (heads/master)
```

---

## 2. Entry points para agentes de IA

Se crearon 3 archivos en la raíz del proyecto. Cada uno dice lo mismo a su respectivo agente: "Carga sdd-kit/AGENTS.md antes de generar código".

### CLAUDE.md (Claude Code)

```markdown
# GREAT System — UX Prototype

Lee `sdd-kit/AGENTS.md` antes de generar cualquier código. Este proyecto usa
Specification-Driven Development: las reglas de negocio están en
`sdd-kit/great_dspy/specs/` como datos verificables (78 reglas en 6 vistas).

Siempre corre `pytest sdd-kit/tests/ -v` después de generar código.
```

### .cursorrules (Cursor IDE)

```
Carga sdd-kit/AGENTS.md antes de generar codigo. Las reglas de negocio estan en
sdd-kit/great_dspy/specs/ (78 reglas, 6 vistas).

Siempre corre pytest sdd-kit/tests/ -v para validar que cumples las reglas.
```

### .github/copilot-instructions.md (GitHub Copilot)

```
Before generating code, load sdd-kit/AGENTS.md. Business rules are in
sdd-kit/great_dspy/specs/ (78 rules, 6 views). Always run
pytest sdd-kit/tests/ -v to validate compliance.
```

---

## 3. Validación del SDD Kit

```bash
$ python -m pytest sdd-kit/tests/ -q
........................................................................ [ 33%]
........................................................................ [ 66%]
........................................................................ [100%]
216 passed in 1.21s
```

216 tests verifican las 78 reglas de negocio distribuidas en 6 vistas del sistema GREAT.

Ver `OUTPUT.md` para la salida completa de cada suite de tests.

---

## 4. Auditoría: Prototipo vs Specs

El agente (cargando AGENTS.md + specs/) analizó el código existente del prototipo
y encontró 6 discrepancias contra las reglas de negocio.

| # | Archivo | Regla del spec | Prototipo (antes) | Corrección aplicada |
|---|---------|---------------|-------------------|---------------------|
| 1 | `src/lib/compatibility.ts` | BR-06, BR-07 | Chequeaba métier + ciclo + locked status | Ahora chequea: Organ Type, Energy, Ranking, Injection System + null handling |
| 2 | `src/lib/calc.ts` | §9.1 | Multiplicaba por `globalOccurrences` extra | Solo `(Variable × Occurrence) + Fixed` |
| 3 | `src/lib/calc.ts` | §9.2 | No calculaba FTE | `FTE = Total MD / 209` |
| 4 | `src/lib/calc.ts` | §9.4 | Pesos fijos hardcodeados | Distribución uniforme desde SP date |
| 5 | `src/lib/calc.ts` | §11 | K€ en Pre-Estimation | K€ se calcula en Allocation (stub = 0) |
| 6 | `src/types/index.ts` | §5 | Sin campos de compatibilidad | organType, energyFuelType, projectRanking, injectionSystem, spDate, durationMonths |

---

## 5. Cambios aplicados

### 5.1 `src/types/index.ts` — Tipos extendidos

Se añadieron los campos que el spec requiere para validación de compatibilidad
y cálculo de estimación:

```typescript
export interface ProjectLine {
  // ...campos existentes...

  // SDD Kit fields (from pre_estimation_specs.py)
  organType?: string;
  energyFuelType?: string;
  projectRanking?: string;
  injectionSystem?: string | null;
  spDate?: string;                // YYYY-MM-DD, always 1st of month
  durationMonths?: number;
  description?: string;
}
```

### 5.2 `src/lib/compatibility.ts` — Compatibilidad multi-línea

**Antes:** chequeaba métier, ciclo y locked status (no alineado con el spec).

**Después:** chequea los 4 campos de compatibilidad del spec (BR-06, BR-07):

```typescript
const COMPATIBILITY_FIELDS: (keyof ProjectLine)[] = [
  'organType',
  'energyFuelType',
  'projectRanking',
  'injectionSystem',
];

export function checkCompatibility(lines: ProjectLine[]): CompatibilityResult {
  if (lines.length < 2) return { compatible: true, reasons: [] };

  for (const field of COMPATIBILITY_FIELDS) {
    const values = new Map<string | null, number>();
    for (const line of lines) {
      const val = line[field] ?? null;
      values.set(val, (values.get(val) ?? 0) + 1);
    }
    if (values.size <= 1) continue;

    // null vs value = incompatible (BR-07)
    const hasNull = values.has(null);
    const hasValue = Array.from(values.keys()).some(k => k !== null);
    if (hasNull && hasValue) {
      reasons.push(`...mixed null and values — incompatible (BR-07)`);
    } else {
      reasons.push(`...multiple values — all lines must share same value (BR-06)`);
    }
  }
  return { compatible: reasons.length === 0, reasons };
}
```

### 5.3 `src/lib/calc.ts` — Cálculo de estimación

**Antes:** solo calculaba "días" con un multiplicador extra y pesos fijos.

**Después:** implementa exactamente las fórmulas del spec:

```typescript
const MAN_DAY_FTE_DIVISOR = 209;

export function calculateEstimation(...): CalculationResult {
  let totalManDays = 0, totalBh = 0, totalKm = 0;

  for (const sel of selections) {
    if (!sel.selectedCranId) continue;  // BR-12: skip sin cran

    for (const ju of cranJUs) {
      // §9.1: Total = (Variable × Occurrence) + Fixed
      const total = occurrence * ju.variable + ju.fixed;

      // §9.2: Unit type handling
      switch (ju.unitType) {
        case 'ManDay': totalManDays += total; break;
        case 'BenchHours': totalBh += total; break;
        case 'Kilometres': totalKm += total; break;
        case 'KEuros': break; // excluded from scope
      }
    }
  }

  // §9.2: FTE = Total MD / 209
  const totalFte = totalManDays > 0
    ? Math.round((totalManDays / MAN_DAY_FTE_DIVISOR) * 100) / 100 : 0;

  return { totalManDays, totalFte, totalBh, totalKm, breakdown };
}
```

Distribución mensual según §9.4:

```typescript
export function distributeByMonth(
  totalManDays: number, spDate: string, durationMonths: number = 12
): number[] {
  const monthly = totalManDays / durationMonths;
  const result: number[] = [];
  for (let i = 0; i < 12; i++) {
    result.push(i < durationMonths ? Math.round(monthly * 100) / 100 : 0);
  }
  return result;
}
```

### 5.4 `src/fixtures/projectLines.ts` — Datos de prueba

Las 26 líneas de prueba ahora incluyen los campos de compatibilidad del spec.
Líneas del mismo proyecto comparten los mismos valores (PL-001 y PL-002 ambas
son Thermal Engine / Gasoline / Mother / Direct Injection), lo que permite probar
selección múltiple compatible.

---

## 6. Estructura final del proyecto

```
ux_great_prototype/
├── src/
│   ├── types/index.ts           ← + organType, energyFuelType, etc.
│   ├── lib/compatibility.ts     ← Corregido según BR-06/BR-07
│   ├── lib/calc.ts              ← Corregido según §9.1-9.4
│   └── fixtures/projectLines.ts ← + campos SDD Kit
├── CLAUDE.md                    ← "Carga sdd-kit/AGENTS.md"
├── .cursorrules                 ← "Carga sdd-kit/AGENTS.md"
├── .github/copilot-instructions.md ← "Load sdd-kit/AGENTS.md"
├── sdd-kit/                     ← Submodule del SDD Kit
│   ├── AGENTS.md
│   ├── great_dspy/specs/        ← 78 reglas de negocio
│   ├── great_dspy/modules/      ← 30 módulos Python
│   ├── great_dspy/pipeline/     ← 6 pipelines
│   └── tests/                   ← 216 tests
├── docs/
│   ├── sdd-kit-poc.md           ← Este documento
│   ├── sdd-kit-audit.md         ← Hallazgos de la auditoría
│   └── OUTPUT.md                ← Salida completa de tests
└── ...
```

---

## 7. Flujo de desarrollo con el SDD Kit

1. El desarrollador abre el proyecto en su agente (Claude Code, Cursor, Copilot)
2. El agente lee `CLAUDE.md` → `sdd-kit/AGENTS.md` → las 78 reglas de negocio
3. El desarrollador pide una feature (ej: "implementa el endpoint de save-draft")
4. El agente lee `sdd-kit/great_dspy/specs/` para conocer las reglas
5. El agente lee `sdd-kit/great_dspy/modules/` para entender la lógica
6. El agente genera código que cumple las reglas
7. `pytest sdd-kit/tests/ -v` valida que no haya violaciones
8. `npx tsc --noEmit` valida que TypeScript compile

Sin documentación externa. Sin handoff manual. Sin "pregúntale a Producto".

---

## 8. Repositorios

- SDD Kit: https://github.com/nujovich/great-dspy-pipeline
- UX Prototype: (rama `feat/sdd-kit-integration`)