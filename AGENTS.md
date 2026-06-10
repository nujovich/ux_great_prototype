# AGENTS.md — GREAT System UX Prototype

Eres un agente de IA generando código para el prototipo UX del GREAT System.

## Antes de generar cualquier código

1. Lee `node_modules/great-sdd-kit/AGENTS.md` — contiene las reglas de negocio que tu código debe cumplir.
2. Lee las specs relevantes en `node_modules/great-sdd-kit/great_sdd/specs/` para las vistas que estás implementando.

## Reglas críticas (NUNCA violar)

1. **No deletion** (BR-01): Las estimaciones nunca se borran
2. **Draft gate** (BR-02): No existe "Save as Definitive" sin "Save as Draft" antes
3. **Estimated = locked** (BR-03): status=Estimated es read-only hasta que CPO actúe
4. **Approved = terminal** (BR-04): Approved no cambia por ninguna acción
5. **Multi-select compatibility** (BR-06): 4 campos deben coincidir
6. **null vs null = compatible; null vs value = no** (BR-07)
7. **SP date mandatory** (BR-08): No se guarda sin fecha SP

## Stack del prototipo

- React 19 + Vite + TypeScript
- Zustand para estado
- Tailwind CSS
- Vitest para tests

## Tests

Después de generar código que implemente reglas de negocio:
```bash
pytest node_modules/great-sdd-kit/tests/ -v
```

## SDD Kit

Dependencia npm: `great-sdd-kit` (git+https desde GitHub).
Instalación: `npm install`
Actualización: `npm update great-sdd-kit`
Rutas: `node_modules/great-sdd-kit/`
