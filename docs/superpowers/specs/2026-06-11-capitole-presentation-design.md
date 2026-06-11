# Capitole Presentation Design System — GREAT Project

> Spec for HTML/CSS slides of the GREAT System UX Prototype.  
> Follows Capitole Consulting brand language: navy → blue → cyan, white canvas, 16:9.

## Design Tokens

```css
:root {
  /* Palette */
  --c-navy:  #0f1f3d;
  --c-blue:  #1a56db;
  --c-cyan:  #06b6d4;
  --c-white: #ffffff;
  --c-gray:  #f3f4f6;
  --c-text:  #1f2937;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --text-display: clamp(2.5rem, 6vw, 4.5rem);
  --text-title:   clamp(1.5rem, 3vw, 2.25rem);
  --text-body:    1.125rem;
  --text-caption: 0.875rem;

  /* Layout */
  --slide-w: 1280px;
  --slide-h:  720px;
  --gap:       3rem;
}
```

## File Structure

```
presentation/
├── index.html          ← deck (all slides as <section>)
├── style.css           ← design system + layout classes
└── assets/
    ├── capitole-logo.svg
    └── screenshots/    ← app screenshots for visual slides
```

## Slide Layout Catalog

### `.slide--cover`
- Background: `--c-navy`
- Top-left: Capitole logo (white, 120px wide)
- Center: project title (display size, white, bold) + subtitle (cyan, body)
- Bottom-right: date + author (caption, gray-400)

### `.slide--agenda`
- Background: `--c-white`
- Left accent bar: 4px solid `--c-cyan`
- Title: "Contenido" (title size, navy)
- Body: ordered list, each item `1.5rem`, number in cyan, text in `--c-text`

### `.slide--section`
- Background: `linear-gradient(135deg, --c-navy, --c-blue)`
- Large section number (display size × 2, `--c-cyan`, opacity 0.3, positioned top-right)
- Section title (display size, white, center-left aligned)

### `.slide--content`
- Background: `--c-white`
- Title (title size, `--c-navy`) with 2px bottom border in `--c-cyan`
- Body: bullet list, `::marker` in `--c-cyan`, `1.6` line-height, `--c-text` color

### `.slide--visual`
- Background: `--c-gray`
- Image/screenshot: max 80% width, centered, `box-shadow: 0 4px 24px rgba(0,0,0,.12)`
- Caption: below image, caption size, `--c-text`, italic

### `.slide--code`
- Background: `--c-navy`
- Title (title size, `--c-cyan`)
- Code block: monospace font, `--c-gray` text, `background: rgba(255,255,255,.05)`, `border-radius: 8px`, `padding: 1.5rem`

### `.slide--closing`
- Background: `--c-navy`
- Center: Capitole logo (white) + closing message (title size, white)
- Bottom: contact / Q&A line (cyan, caption size)

## Navigation

~15 lines of vanilla JS. Arrow keys ← → (or ↑ ↓) advance slides.  
`.slide` defaults to `display: none`; `.slide.active` to `display: flex`.

```js
const slides = document.querySelectorAll('.slide');
let current = 0;
const show = i => {
  slides[current].classList.remove('active');
  current = (i + slides.length) % slides.length;
  slides[current].classList.add('active');
};
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') show(current + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   show(current - 1);
});
show(0);
```

## Presentation Narrative — GREAT System

15 slides, 4 sections.

| # | Layout | Content |
|---|--------|---------|
| 1 | cover | "GREAT System · UX Prototype" / Capitole · 2026 · Nadia Ujovich |
| 2 | agenda | 4 secciones: El problema · El sistema · El prototipo · Próximos pasos |
| 3 | section | §1 — El problema |
| 4 | content | Estimación de proyectos hoy: proceso manual y fragmentado |
| 5 | content | La necesidad: trazabilidad Draft→Definitivo, roles y permisos claros |
| 6 | section | §2 — El sistema |
| 7 | content | 7 vistas · 5 roles: Engineer / PMO / Admin / RCRC / CPO |
| 8 | visual | Screenshot: Pre-Estimación + Panel de edición |
| 9 | section | §3 — El prototipo |
| 10 | visual | Estimation Review — flujo de aprobación |
| 11 | visual | Allocation — asignación a ingenieros |
| 12 | code | Stack: React 19 · Vite · TS · Zustand · Tailwind + SDD Kit (78 reglas, 257 tests) |
| 13 | section | §4 — Próximos pasos |
| 14 | content | Backend pendiente · validación con PMO · integración de datos reales |
| 15 | closing | Q&A · contacto · logo Capitole |
