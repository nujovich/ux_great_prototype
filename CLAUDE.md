# GREAT System — UX Prototype

Lee `sdd-kit/AGENTS.md` antes de generar cualquier código. Este proyecto usa Specification-Driven Development: las reglas de negocio están en `sdd-kit/great_dspy/specs/` como datos verificables (78 reglas en 6 vistas).

Siempre corre `pytest sdd-kit/tests/ -v` después de generar código para validar que cumple las reglas.

Referencia rápida del SDD Kit:
- `sdd-kit/great_dspy/specs/` → 78 reglas de negocio
- `sdd-kit/great_dspy/modules/` → 30 módulos Python puros
- `sdd-kit/great_dspy/pipeline/` → 6 pipelines (blueprint para endpoints)
- `sdd-kit/tests/` → 216 tests que verifican las reglas

Este es el frontend del sistema GREAT. El prototipo UX actual está en React/Vite/TypeScript.