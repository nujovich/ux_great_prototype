# Capitole Presentation — GREAT System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 15-slide HTML/CSS presentation of the GREAT System UX Prototype following the Capitole Consulting brand design system.

**Architecture:** Zero-dependency static deck — `presentation/style.css` holds design tokens and 7 layout classes; `presentation/index.html` contains all 15 slides as `<section>` elements with ~20 lines of vanilla JS for keyboard navigation. No build step, no framework. Open `index.html` directly in the browser.

**Tech Stack:** HTML5, CSS custom properties, vanilla JS, Inter font (Google Fonts CDN), optional Fira Code for code slide.

> **Note on TDD:** This feature is pure HTML/CSS with no testable business logic. Verification is visual (browser). Strict TDD mode applies to TypeScript/React changes only — it does not apply here. After each task, open `presentation/index.html` in the browser and check the affected slide.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `presentation/style.css` | Create | Design tokens + 7 layout classes + base reset |
| `presentation/index.html` | Create | 15 slides + JS navigation + slide counter |
| `presentation/assets/capitole-logo.svg` | Create | Wordmark SVG placeholder (replace with real logo) |
| `presentation/assets/screenshots/` | Create (dir) | App screenshots — captured manually after tasks |

---

## Task 1: CSS Design System (`style.css`)

**Files:**
- Create: `presentation/style.css`

- [ ] **Step 1.1: Create `presentation/` directory and `style.css`**

```bash
mkdir -p presentation/assets/screenshots
```

Create `presentation/style.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --c-navy:  #0f1f3d;
  --c-blue:  #1a56db;
  --c-cyan:  #06b6d4;
  --c-white: #ffffff;
  --c-gray:  #f3f4f6;
  --c-text:  #1f2937;

  --font-sans: 'Inter', system-ui, sans-serif;
  --text-display: clamp(2.5rem, 6vw, 4.5rem);
  --text-title:   clamp(1.5rem, 3vw, 2.25rem);
  --text-body:    1.125rem;
  --text-caption: 0.875rem;

  --slide-w: 1280px;
  --slide-h:  720px;
  --gap:       3rem;
}

body {
  font-family: var(--font-sans);
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.deck {
  position: relative;
  width: var(--slide-w);
  height: var(--slide-h);
}

.slide {
  display: none;
  width: var(--slide-w);
  height: var(--slide-h);
  padding: var(--gap);
  position: absolute;
  inset: 0;
}

.slide.active { display: flex; }

/* ── Cover ────────────────────────────────── */
.slide--cover {
  background: var(--c-navy);
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 1rem;
}
.slide--cover .logo {
  position: absolute;
  top: var(--gap);
  left: var(--gap);
  width: 120px;
}
.slide--cover .title {
  font-size: var(--text-display);
  font-weight: 700;
  color: var(--c-white);
  line-height: 1.1;
}
.slide--cover .subtitle {
  font-size: var(--text-body);
  color: var(--c-cyan);
}
.slide--cover .meta {
  position: absolute;
  bottom: var(--gap);
  right: var(--gap);
  font-size: var(--text-caption);
  color: #9ca3af;
  text-align: right;
  line-height: 1.8;
}

/* ── Agenda ───────────────────────────────── */
.slide--agenda {
  background: var(--c-white);
  flex-direction: column;
  justify-content: center;
  gap: 1.5rem;
  border-left: 4px solid var(--c-cyan);
  padding-left: calc(var(--gap) + 1rem);
}
.slide--agenda .slide-title {
  font-size: var(--text-title);
  font-weight: 700;
  color: var(--c-navy);
}
.slide--agenda ol {
  list-style: none;
  counter-reset: item;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.slide--agenda ol li {
  font-size: 1.5rem;
  color: var(--c-text);
  display: flex;
  align-items: center;
  gap: 1rem;
  counter-increment: item;
}
.slide--agenda ol li::before {
  content: counter(item, decimal-leading-zero);
  color: var(--c-cyan);
  font-weight: 700;
  font-size: 1.125rem;
  min-width: 2.5rem;
}

/* ── Section cover ────────────────────────── */
.slide--section {
  background: linear-gradient(135deg, var(--c-navy), var(--c-blue));
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 0.75rem;
  overflow: hidden;
}
.slide--section .section-number {
  position: absolute;
  top: -2rem;
  right: 1rem;
  font-size: 18rem;
  font-weight: 700;
  color: var(--c-cyan);
  opacity: 0.12;
  line-height: 1;
  user-select: none;
}
.slide--section .section-label {
  font-size: var(--text-caption);
  color: var(--c-cyan);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 600;
}
.slide--section .section-title {
  font-size: var(--text-display);
  font-weight: 700;
  color: var(--c-white);
  line-height: 1.1;
  max-width: 60%;
}

/* ── Content ──────────────────────────────── */
.slide--content {
  background: var(--c-white);
  flex-direction: column;
  justify-content: center;
  gap: 1.5rem;
}
.slide--content .slide-title {
  font-size: var(--text-title);
  font-weight: 700;
  color: var(--c-navy);
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--c-cyan);
  align-self: flex-start;
}
.slide--content ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}
.slide--content ul li {
  font-size: var(--text-body);
  color: var(--c-text);
  line-height: 1.6;
  display: flex;
  gap: 0.75rem;
}
.slide--content ul li::before {
  content: '▸';
  color: var(--c-cyan);
  flex-shrink: 0;
  margin-top: 0.15em;
}

/* ── Visual ───────────────────────────────── */
.slide--visual {
  background: var(--c-gray);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}
.slide--visual .slide-title {
  font-size: var(--text-title);
  font-weight: 700;
  color: var(--c-navy);
  align-self: flex-start;
}
.slide--visual figure {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.slide--visual img {
  max-width: 80%;
  max-height: 480px;
  object-fit: contain;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}
.slide--visual figcaption {
  font-size: var(--text-caption);
  color: var(--c-text);
  font-style: italic;
}

/* ── Code ─────────────────────────────────── */
.slide--code {
  background: var(--c-navy);
  flex-direction: column;
  justify-content: center;
  gap: 1.5rem;
}
.slide--code .slide-title {
  font-size: var(--text-title);
  font-weight: 700;
  color: var(--c-cyan);
}
.slide--code pre {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1.5rem;
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 1rem;
  color: var(--c-gray);
  line-height: 1.8;
  white-space: pre;
}

/* ── Closing ──────────────────────────────── */
.slide--closing {
  background: var(--c-navy);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  text-align: center;
}
.slide--closing .logo { width: 160px; }
.slide--closing .closing-message {
  font-size: var(--text-title);
  font-weight: 700;
  color: var(--c-white);
}
.slide--closing .contact {
  font-size: var(--text-caption);
  color: var(--c-cyan);
}

/* ── Slide counter ────────────────────────── */
.slide-counter {
  position: fixed;
  bottom: 1rem;
  right: 1.5rem;
  font-size: var(--text-caption);
  color: rgba(255, 255, 255, 0.35);
  font-family: var(--font-sans);
  z-index: 100;
}
```

- [ ] **Step 1.2: Verify CSS loaded**

Create a minimal `presentation/index.html` to smoke-test the CSS:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>test</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="deck">
    <section class="slide slide--cover active">
      <h1 class="title">Test Cover</h1>
      <p class="subtitle">subtitle</p>
    </section>
  </div>
</body>
</html>
```

Open `presentation/index.html` in the browser.  
Expected: dark navy background, white "Test Cover" text, cyan subtitle. No console errors.

- [ ] **Step 1.3: Commit CSS**

```bash
git add presentation/style.css
git commit -m "feat(presentation): add Capitole design system CSS"
```

---

## Task 2: HTML Deck — Cover + Agenda

**Files:**
- Modify: `presentation/index.html`

- [ ] **Step 2.1: Replace smoke-test HTML with full deck skeleton**

Replace `presentation/index.html` with the full document below (contains all 15 slides; slides 3–15 are populated in Tasks 3–5):

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GREAT System · UX Prototype — Capitole</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="deck">

    <!-- 1. Cover -->
    <section class="slide slide--cover">
      <img class="logo" src="assets/capitole-logo.svg" alt="Capitole" />
      <h1 class="title">GREAT System<br/>UX Prototype</h1>
      <p class="subtitle">Estimación y asignación de proyectos de delivery</p>
      <div class="meta">
        Capitole Consulting · 2026<br/>
        Nadia Ujovich
      </div>
    </section>

    <!-- 2. Agenda -->
    <section class="slide slide--agenda">
      <h2 class="slide-title">Contenido</h2>
      <ol>
        <li>El problema</li>
        <li>El sistema</li>
        <li>El prototipo</li>
        <li>Próximos pasos</li>
      </ol>
    </section>

    <!-- 3–15 added in Tasks 3–5 (paste below this line) -->

  </div>

  <div class="slide-counter">
    <span id="current">1</span> / <span id="total"></span>
  </div>

  <script>
    const slides = document.querySelectorAll('.slide');
    const currentEl = document.getElementById('current');
    const totalEl   = document.getElementById('total');
    totalEl.textContent = slides.length;
    let current = 0;
    const show = i => {
      slides[current].classList.remove('active');
      current = (i + slides.length) % slides.length;
      slides[current].classList.add('active');
      currentEl.textContent = current + 1;
    };
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') show(current + 1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   show(current - 1);
    });
    show(0);
  </script>
</body>
</html>
```

- [ ] **Step 2.2: Verify cover and agenda**

Open `presentation/index.html`. Slide 1 (cover): navy background, logo placeholder (broken img OK for now), white title, cyan subtitle. Press → to go to slide 2 (agenda): white background, cyan left border, numbered list. Counter shows "1 / 2".

- [ ] **Step 2.3: Commit**

```bash
git add presentation/index.html
git commit -m "feat(presentation): cover + agenda slides + JS navigation"
```

---

## Task 3: Section Covers + Content Slides

**Files:**
- Modify: `presentation/index.html` (add slides 3–8 and 13–14)

- [ ] **Step 3.1: Add section covers and content slides**

After the `<!-- 2. Agenda -->` section and before `<!-- 3–15 added... -->`, insert:

```html
    <!-- 3. Section §1 -->
    <section class="slide slide--section">
      <span class="section-number">1</span>
      <span class="section-label">Sección 01</span>
      <h2 class="section-title">El problema</h2>
    </section>

    <!-- 4. Content: Estimación hoy -->
    <section class="slide slide--content">
      <h2 class="slide-title">Estimación de proyectos hoy</h2>
      <ul>
        <li>Proceso manual y fragmentado en múltiples herramientas</li>
        <li>Sin trazabilidad del ciclo Draft → Revisión → Definitivo</li>
        <li>Ausencia de roles y permisos diferenciados por vista</li>
        <li>Datos de estimación dispersos, difíciles de auditar</li>
      </ul>
    </section>

    <!-- 5. Content: La necesidad -->
    <section class="slide slide--content">
      <h2 class="slide-title">La necesidad</h2>
      <ul>
        <li>Trazabilidad completa: Draft → Definitivo con gate de aprobación</li>
        <li>Roles con permisos explícitos: Engineer, PMO, Admin, RCRC, CPO</li>
        <li>Validación de compatibilidad en selección múltiple de líneas</li>
        <li>Bloqueo de estimaciones aprobadas (inmutabilidad post-cierre)</li>
      </ul>
    </section>

    <!-- 6. Section §2 -->
    <section class="slide slide--section">
      <span class="section-number">2</span>
      <span class="section-label">Sección 02</span>
      <h2 class="section-title">El sistema</h2>
    </section>

    <!-- 7. Content: Vistas y roles -->
    <section class="slide slide--content">
      <h2 class="slide-title">7 vistas · 5 roles</h2>
      <ul>
        <li><strong>Pre-Estimación</strong> — Engineers proponen estimaciones por línea</li>
        <li><strong>Estimation Review</strong> — PMO y CPO aprueban o rechazan</li>
        <li><strong>Allocation</strong> — Asignación de trabajo a ingenieros</li>
        <li><strong>Final Review · Management · Admin</strong> — Cierre y operaciones</li>
        <li>Role switcher en UI para testing de todos los flujos</li>
      </ul>
    </section>

    <!-- 8. Visual: Screenshot Pre-Estimación (placeholder) -->
    <section class="slide slide--visual">
      <h2 class="slide-title">Pre-Estimación + Panel de edición</h2>
      <figure>
        <img src="assets/screenshots/pre-estimation.png" alt="Vista Pre-Estimación" />
        <figcaption>Grid de 26 líneas de proyecto con panel lateral de edición</figcaption>
      </figure>
    </section>

    <!-- 9. Section §3 -->
    <section class="slide slide--section">
      <span class="section-number">3</span>
      <span class="section-label">Sección 03</span>
      <h2 class="section-title">El prototipo</h2>
    </section>

    <!-- 10. Visual: Estimation Review (placeholder) -->
    <section class="slide slide--visual">
      <h2 class="slide-title">Estimation Review — flujo de aprobación</h2>
      <figure>
        <img src="assets/screenshots/estimation-review.png" alt="Estimation Review" />
        <figcaption>PMO y CPO revisan estimaciones Draft y las aprueban o rechazan con comentario</figcaption>
      </figure>
    </section>

    <!-- 11. Visual: Allocation (placeholder) -->
    <section class="slide slide--visual">
      <h2 class="slide-title">Allocation — asignación a ingenieros</h2>
      <figure>
        <img src="assets/screenshots/allocation.png" alt="Vista Allocation" />
        <figcaption>Distribución de workload por ingeniero, ciclo y línea de proyecto</figcaption>
      </figure>
    </section>

    <!-- 12. Code: Stack técnico -->
    <section class="slide slide--code">
      <h2 class="slide-title">Stack técnico</h2>
      <pre>React 19 · Vite · TypeScript · Zustand · Tailwind CSS

great-sdd-kit (npm)
  ├── 78 reglas de negocio  (6 vistas)
  ├── 30 módulos Python puros
  └── 257 tests de validación

OpenAPI v2 spec → tipos TypeScript generados
Sin backend — estado in-memory (fixtures + Zustand)</pre>
    </section>

    <!-- 13. Section §4 -->
    <section class="slide slide--section">
      <span class="section-number">4</span>
      <span class="section-label">Sección 04</span>
      <h2 class="section-title">Próximos pasos</h2>
    </section>

    <!-- 14. Content: Next steps -->
    <section class="slide slide--content">
      <h2 class="slide-title">Próximos pasos</h2>
      <ul>
        <li>Implementación del backend (PostgreSQL · API REST según OpenAPI v2)</li>
        <li>Validación del prototipo con equipo PMO y stakeholders</li>
        <li>Integración de datos reales de proyectos en curso</li>
        <li>Fases de allocation y management rules con SDD Kit v3</li>
      </ul>
    </section>

    <!-- 15. Closing -->
    <section class="slide slide--closing">
      <img class="logo" src="assets/capitole-logo.svg" alt="Capitole" />
      <p class="closing-message">¿Preguntas?</p>
      <p class="contact">nadiaujovich@capitole-consulting.com</p>
    </section>
```

Also remove the placeholder comment line `<!-- 3–15 added in Tasks 3–5 (paste below this line) -->`.

- [ ] **Step 3.2: Verify all 15 slides**

Open `presentation/index.html`. Navigate with ← →:
- Slides 3, 6, 9, 13: gradient navy→blue background, ghost number, white title
- Slides 4, 5, 7, 14: white background, cyan-underlined title, bullet list
- Slides 8, 10, 11: gray background, broken img placeholder (OK — screenshots added in Task 5)
- Slide 12: navy background, cyan title, monospace pre block
- Slide 15: navy background, centered logo + "¿Preguntas?"
- Counter reads "X / 15" at every slide

- [ ] **Step 3.3: Commit**

```bash
git add presentation/index.html
git commit -m "feat(presentation): add all 15 slides (section covers, content, visual, code, closing)"
```

---

## Task 4: Capitole Logo SVG

**Files:**
- Create: `presentation/assets/capitole-logo.svg`

- [ ] **Step 4.1: Create logo wordmark placeholder**

Create `presentation/assets/capitole-logo.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 44" fill="none">
  <!-- Replace with official Capitole logo when available -->
  <rect width="6" height="44" rx="3" fill="#06b6d4"/>
  <text
    x="16"
    y="32"
    font-family="Inter, system-ui, sans-serif"
    font-size="22"
    font-weight="700"
    letter-spacing="-0.5"
    fill="currentColor"
  >capitole</text>
</svg>
```

> **Note:** This is a placeholder wordmark. Replace `assets/capitole-logo.svg` with the official vector logo before any public presentation.

- [ ] **Step 4.2: Verify logo renders on cover and closing slides**

Reload `presentation/index.html`. Slide 1 (cover): small logo top-left, white text. Slide 15 (closing): larger centered logo. Both should show the cyan-bar wordmark. If the logo renders white-on-navy correctly, the `fill="currentColor"` is inheriting from `.slide--cover` (which has `color: white` — add `color: var(--c-white)` to `.slide--cover .logo` and `.slide--closing .logo` in `style.css` if the text appears black).

If logo text appears black, add to `style.css`:

```css
.slide--cover .logo,
.slide--closing .logo {
  color: var(--c-white);
}
```

- [ ] **Step 4.3: Commit**

```bash
git add presentation/assets/capitole-logo.svg presentation/style.css
git commit -m "feat(presentation): add Capitole logo SVG placeholder"
```

---

## Task 5: App Screenshots

**Files:**
- Create: `presentation/assets/screenshots/pre-estimation.png`
- Create: `presentation/assets/screenshots/estimation-review.png`
- Create: `presentation/assets/screenshots/allocation.png`

> This task is manual — screenshots must be captured from the running app.

- [ ] **Step 5.1: Start the dev server**

```bash
npm run dev
```

Expected: Vite dev server running at `http://localhost:5173` (or similar).

- [ ] **Step 5.2: Capture screenshots**

In the browser, navigate to each view. Take a full-page screenshot at 1280×720 (or 2560×1440 for retina) and save:

| View | Role to use | File to save |
|------|-------------|-------------|
| Pre-Estimación (grid + estimation panel open) | Engineer | `presentation/assets/screenshots/pre-estimation.png` |
| Estimation Review | PMO | `presentation/assets/screenshots/estimation-review.png` |
| Allocation | Admin | `presentation/assets/screenshots/allocation.png` |

Tip: use the Role Switcher in the top bar to change roles without reloading.

- [ ] **Step 5.3: Verify visual slides**

Reload `presentation/index.html`, navigate to slides 8, 10, 11. Screenshots should appear contained within the gray card area with the drop shadow.

- [ ] **Step 5.4: Commit**

```bash
git add presentation/assets/screenshots/
git commit -m "feat(presentation): add app screenshots for visual slides"
```

---

## Verification Checklist

After all tasks:

- [ ] Open `presentation/index.html` in browser — no console errors
- [ ] Navigate all 15 slides with ← → keys — counter correct at every slide
- [ ] Slide 1 (cover): navy bg, logo, white title, cyan subtitle, meta bottom-right
- [ ] Slide 2 (agenda): white bg, cyan left bar, numbered list
- [ ] Slides 3/6/9/13 (section covers): gradient bg, ghost number, white title
- [ ] Slides 4/5/7/14 (content): white bg, cyan-bordered title, bullet list with ▸ in cyan
- [ ] Slides 8/10/11 (visual): gray bg, screenshot image with shadow, caption
- [ ] Slide 12 (code): navy bg, cyan title, monospace pre
- [ ] Slide 15 (closing): navy bg, logo centered, "¿Preguntas?", cyan contact
- [ ] Font loads correctly (requires internet for Google Fonts — works offline with `system-ui` fallback)
