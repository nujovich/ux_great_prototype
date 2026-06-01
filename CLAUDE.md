# GREAT System — UX Prototype

Lee `node_modules/great-sdd-kit/AGENTS.md` antes de generar cualquier código. Este proyecto usa Specification-Driven Development: las reglas de negocio están en `node_modules/great-sdd-kit/great_sdd/specs/` como datos verificables (78 reglas en 6 vistas).

Siempre corre `pytest node_modules/great-sdd-kit/tests/ -v` después de generar código para validar que cumple las reglas.

Referencia rápida del SDD Kit:
- `node_modules/great-sdd-kit/great_sdd/specs/` → 78 reglas de negocio
- `node_modules/great-sdd-kit/great_sdd/modules/` → 30 módulos Python puros
- `node_modules/great-sdd-kit/great_sdd/pipeline/` → 6 pipelines (blueprint para endpoints)
- `node_modules/great-sdd-kit/tests/` → 257 tests que verifican las reglas

El SDD Kit es una dependencia npm (`great-sdd-kit`). Se instala con `npm install` y se actualiza con `npm update great-sdd-kit`. No usar git submodule.

Este es el frontend del sistema GREAT. El prototipo UX actual está en React/Vite/TypeScript.
