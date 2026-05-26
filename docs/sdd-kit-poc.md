# SDD Kit — PoC de Integración

## Proyecto: UX Great Prototype (Frontend)

**Fecha:** 2026-05-26
**Repositorio:** `/mnt/c/Users/NadiaUjovich/ux_great_prototype`
**SDD Kit:** `github.com/nujovich/great-dspy-pipeline` (submodule en `sdd-kit/`)

---

## 1. Integración del submodule

```bash
cd ux_great_prototype
git submodule add https://github.com/nujovich/great-dspy-pipeline.git sdd-kit
```

**Resultado:**

```
Submodule: 6959ba177642050e3733ae161794f9710de8de15 sdd-kit (heads/master)
```

El SDD Kit está disponible como directorio `sdd-kit/` dentro del proyecto frontend.

---

## 2. Archivos de entry point para agentes

Se añadieron al proyecto raíz:

| Archivo | Contenido |
|---------|-----------|
| `CLAUDE.md` | "Carga sdd-kit/AGENTS.md antes de generar cualquier código" |
| `.cursorrules` | "Carga sdd-kit/AGENTS.md. Corre pytest sdd-kit/tests/ -v" |
| `.github/copilot-instructions.md` | "Before generating code, load sdd-kit/AGENTS.md" |

Cuando un agente (Claude Code, Cursor, Copilot) abre este proyecto, automáticamente:

1. Lee el entry point del proyecto raíz
2. Carga `sdd-kit/AGENTS.md` con las 78 reglas de negocio
3. Tiene acceso a `sdd-kit/great_dspy/specs/` con las reglas como datos
4. Puede importar `sdd-kit/great_dspy/modules/` para lógica ya implementada
5. Puede validar con `pytest sdd-kit/tests/ -v`

---

## 3. Validación completa

### 3.1 Contenido del SDD Kit

```
sdd-kit/
├── great_dspy/
│   ├── specs/          ← 6 archivos de specs (reglas de negocio)
│   ├── modules/        ← 7 archivos de módulos (lógica pura)
│   └── pipeline/       ← 6 pipelines (orquestación)
├── sdd/                ← Core reutilizable
├── tests/              ← 7 archivos de test
├── AGENTS.md           ← Instrucciones universales para agentes
├── INTEGRATION.md      ← Guía de integración
└── SDD-OVERVIEW.md     ← Resumen del kit
```

### 3.2 Rules de Pre-Estimation (17 reglas)

Del archivo `sdd-kit/great_dspy/specs/pre_estimation_specs.py`:

| ID | Regla |
|----|-------|
| BR-01 | No deletion — estimations are never deleted |
| BR-02 | Draft gate — 'Save as Definitive' requires 'Save as Draft' first |
| BR-03 | Estimated = locked — read-only until CPO acts |
| BR-04 | Approved = terminal — permanently locked |
| BR-05 | Engineer approval inferred from status |
| BR-06 | Multi-select compatibility (4 fields) |
| BR-07 | null vs null compatible; null vs value incompatible |
| BR-08 | SP date mandatory — blocks save |
| BR-09 | Occurrence lock default = false |
| BR-10 | Assignment read-only from HVT |
| BR-11 | Custom JUs allowed without workload standard |
| BR-12 | Inductor without cran = silently skipped |
| BR-13 | Zero occurrence allowed (output = 0) |
| BR-14 | Comments scoped to (line, métier) |
| BR-15 | Draft is always the first step |
| BR-16 | Sent = locked |
| BR-17 | Re-save overwrites previous Draft |

### 3.3 Tests de Pre-Estimation

**Compatibility Tests** (especificación §5):

```
sdd-kit/tests/test_pipeline.py::TestCompatibilityRules::test_compatible_lines_same_fields PASSED
sdd-kit/tests/test_pipeline.py::TestCompatibilityRules::test_incompatible_different_organ_type PASSED
sdd-kit/tests/test_pipeline.py::TestCompatibilityRules::test_null_vs_null_compatible PASSED
sdd-kit/tests/test_pipeline.py::TestCompatibilityRules::test_null_vs_value_incompatible PASSED
sdd-kit/tests/test_pipeline.py::TestCompatibilityRules::test_single_line_always_compatible PASSED
sdd-kit/tests/test_pipeline.py::TestCompatibilityRules::test_three_compatible_lines PASSED
sdd-kit/tests/test_pipeline.py::TestSpecsConsistency::test_compatibility_fields_are_valid PASSED
```

### 3.4 Suite completo

```
216 passed in 1.16s
```

Las 216 pruebas verifican las 78 reglas de negocio distribuidas en 6 vistas.

---

## 4. Flujo de desarrollo con el SDD Kit

### 4.1 El agente carga el contexto automáticamente

```
Desarrollador abre el proyecto en Claude Code / Cursor / Copilot
                        ↓
         Lee CLAUDE.md / .cursorrules / copilot-instructions.md
                        ↓
              "Carga sdd-kit/AGENTS.md"
                        ↓
         Agente conoce las 78 reglas de negocio
                        ↓
         Puede generar código que las cumpla
```

### 4.2 Ejemplo: Implementar "Selección de líneas compatibles"

Un agente leyendo el SDD Kit sabe que:

1. La regla está en `BR-06` (Multi-select compatibility)
2. La lógica está en `SelectionValidator` en `modules/pre_estimation.py`
3. La función `are_lines_compatible()` verifica 4 campos
4. El test `test_null_vs_value_incompatible` verifica el caso null vs valor
5. El pipeline llama a `SelectionValidator.forward(lines)` como primera etapa

Puede generar el código frontend (React/TypeScript) que:

- Valida los 4 campos antes de permitir selección múltiple
- Muestra error si Organ Type no coincide
- Muestra error si Energy/Fuel Type no coincide
- Maneja null en Injection System (null vs null OK, null vs valor NO)

Y validar contra `pytest sdd-kit/tests/ -v`.

### 4.3 Cuando cambie una regla

```
PO: "CPO ahora también edita en Pre-Estimation"

1. Agente edita sdd-kit/great_dspy/specs/pre_estimation_specs.py
   → Cambia Role.CPO: can_view=False → can_view=True

2. Agente corre pytest sdd-kit/tests/ -v
   → Ve qué tests fallan (permissions, allocation, etc.)

3. Agente arregla los módulos y tests afectados
   → modules/estimation_review.py, modules/allocation.py, etc.

4. pytest sdd-kit/tests/ -v → 216 passed

5. commit + push
```

---

## 5. Estructura final del proyecto

```
ux_great_prototype/              ← Frontend del sistema GREAT
├── src/                         ← Código React/TypeScript
├── public/
├── CLAUDE.md                    ← "Carga sdd-kit/AGENTS.md"
├── .cursorrules                 ← "Carga sdd-kit/AGENTS.md"
├── .github/copilot-instructions.md
├── sdd-kit/                     ← Submodule del SDD Kit
│   ├── AGENTS.md                ← Instrucciones para el agente
│   ├── great_dspy/specs/        ← 78 reglas de negocio
│   ├── great_dspy/modules/      ← 30 módulos Python
│   ├── great_dspy/pipeline/     ← 6 pipelines
│   ├── sdd/                     ← Core SDD reutilizable
│   └── tests/                   ← 216 tests
└── ...
```

---

## Conclusiones

| Aspecto | Estado |
|---------|--------|
| SDD Kit como submodule | ✅ Integrado |
| CLAUDE.md apuntando al kit | ✅ Creado |
| .cursorrules apuntando al kit | ✅ Creado |
| copilot-instructions.md | ✅ Creado |
| Tests del kit pasan | ✅ 216/216 |
| Pre-Estimation compatibility | ✅ 7/7 tests |
| Agente carga reglas automáticamente | ✅ Sin handoff manual |
| Reglas como datos, no prompts | ✅ 78 reglas en 6 specs |

El SDD Kit está listo para que cualquier agente de IA (Claude Code, Cursor, Copilot) lo cargue automáticamente al abrir el proyecto y desarrolle código que cumpla las reglas de negocio del sistema GREAT.