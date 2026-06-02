# GREAT System — UX Prototype

Prototipo UX clickeable del sistema GREAT (estimación y asignación de trabajo para proyectos). Construido en **React + Vite + TypeScript + Tailwind**.

Este prototipo es la fuente de verdad visual: cada story que toque el frontend está bloqueada hasta que su vista sea validada acá.

## Restricciones del prototipo

- ✅ Fixture data en memoria (sin backend)
- ✅ Role switcher visible (Engineer / PMO / Admin / RCRC / CPO)
- ❌ Sin autenticación real
- ❌ Sin llamadas a API
- ❌ Reset on reload (los cambios viven solo en sesión)

## Cómo correr

```bash
npm install
npm run dev
```

Build de producción:

```bash
npm run build
npm run preview
```

## Vistas

| Vista | Path | Roles con acceso |
|---|---|---|
| Inicio (índice + matriz) | `/` | Todos |
| Pre-Estimation | `/pre-estimation` | Engineer (solo suyas), PMO, Admin, RCRC, CPO |
| Estimation Review | `/estimation-review` | PMO, Admin, RCRC, CPO |
| Allocation | `/allocation` | PMO, Admin, CPO |
| Final Review | `/final-review` | PMO, Admin, RCRC, CPO |
| Management | `/management` | PMO, Admin, RCRC, CPO |
| Admin | `/admin` | Admin |

## Role switcher

En la barra superior, dropdown **"Ver como"**. Solo existe en el prototipo (en producción no aparece). Al cambiar de rol:

- Sidebar se filtra mostrando solo las vistas accesibles
- Si estás en una vista bloqueada por el nuevo rol, ves un aviso de acceso restringido
- Cuando el rol es **Engineer**, el grid de Pre-Estimation filtra automáticamente por `eng-1` (Ana Martinez)

## Flujos clickeables principales

1. **Estimate → Draft → Definitive**: como Engineer entrá a Pre-Estimation, abrí una línea sin estimar (status "Sin estimar"), completá ocurrencias + inductores, "Guardar borrador" y luego "Promover a definitiva".
2. **Rejection rework**: cambiá a CPO, andá a Estimation Review, rechazá una línea estimada con un comentario. Volvé a Engineer: la línea aparece en rojo con el comentario; abrila y reestimá.
3. **Multi-line selection**: como PMO en Pre-Estimation, marcá checkboxes en filas. Si mezclás métiers, aparece el banner rojo de incompatibilidad. Si son compatibles, se habilita "Estimar en bulk".
4. **Copy estimation**: abrí una línea con estimación cargada y clickeá "Copiar a otras líneas" en el footer del panel.

## Estructura

```
src/
├── App.tsx               # Router
├── layouts/              # AppShell + Sidebar + TopBar
├── pages/                # Una por vista
├── components/
│   ├── shared/           # Button, Modal, Toaster, StatusBadge, RoleGate, EmptyState
│   ├── grid/             # ProjectLineGrid, GridFilters, BulkActionsBar
│   └── estimation/       # EstimationPanel, CopyEstimationModal
├── fixtures/             # 26 project lines, inductores, cycles, engineers, admin data
├── store/                # Zustand: role, data, UI (toasts, selección, panel abierto)
├── lib/                  # permissions, calc, compatibility, format
└── types/                # ProjectLine, Estimation, Allocation, Role, etc.
```

## Tipos API

Los tipos TypeScript se generan desde la especificación OpenAPI v2 (`docs/pev-openapi.yaml`):

```bash
npx openapi-typescript docs/pev-openapi.yaml -o src/types/pev.ts
```

Después de regenerar, `src/types/index.ts` re-exporta los schemas con nombres limpios desde `pev.ts` y mantiene aliases legacy (`ProjectLine`, `LineStatus`) para compatibilidad durante la migración.

## Base de datos

El esquema PostgreSQL v2 (greenfield) está en `docs/schema.sql`. Incluye:

- 19 tablas: ciclos, project lines, inductores, job units, allocation, workload standard, config, prototype, audit
- CHECK constraints, triggers de `updated_at`, y el trigger de validación de `job_unit.metier` (BH/KM → H-TESTING)
- Índices para las queries del grid de allocation, timeline, y filtros de compatibilidad

## Estados visuales cubiertos

Cada vista tiene al menos:
- **Happy path** (datos poblados, flujos completos)
- **Empty state** (filtros sin resultados o sin datos)
- **Locked** (estimación definitiva muestra panel read-only con badge "Bloqueada")
- **Error / incompatibilidad** (selección multi-line incompatible muestra banner rojo)
- **Rejection** (línea rechazada muestra comentario CPO en grid y panel)
