# CEMIG Design System (`/css`)

Scalable, modular CSS architecture for the **progressive migration** of the
forms portal to the official CEMIG visual identity. Built to support
incremental, phase-by-phase delivery with **independent Desktop and Mobile**
experiences and **minimal regression risk**.

## Why this exists

The portal is migrating to the CEMIG production design standards. The redesign
ships in phases, so the styling must evolve component-by-component without large
refactors and **without breaking screens that have not been redesigned yet**.
This folder is the shared foundation every future design package builds on.

## Structure

```
css/
├── base/
│   ├── variables.css   Design tokens (colors, type, radius, shadow, spacing, breakpoints)
│   ├── reset.css       Scoped reset (portal only — never global during migration)
│   ├── typography.css  Open Sans + CEMIG type scale + .cmg-text-* helpers
│   └── utilities.css   Small single-purpose helpers
├── components/
│   ├── cards.css       ✅ Modality selector cards + accordion + info notice
│   ├── buttons.css     ▢ placeholder (future phase)
│   ├── forms.css       ▢ placeholder
│   ├── tables.css      ▢ placeholder
│   ├── modals.css      ▢ placeholder
│   └── navigation.css  ▢ placeholder (shared/global header/footer component — see note)
├── layouts/
│   ├── desktop.css     ✅ Landing/portal desktop layout
│   └── mobile.css      ▢ stub — inherits legacy responsive rules until mobile spec arrives
├── pages/
│   └── home.css        ✅ Page-specific: landing green header + dark footer
└── themes/
    ├── cemig-desktop.css  Entry point (links the layers via @import) — used now
    └── cemig-mobile.css   Entry point stub for the future mobile identity
```

✅ populated this phase ▢ scaffolded for future phases

## Design tokens

All tokens live in `base/variables.css` on `:root`, namespaced **`--cmg-*`** so
they coexist with the legacy variables (`--verde`, `--borda`, `--raio`, …) still
used by the module stylesheets. Defining custom properties is side-effect free,
so this file is safe to load globally. Categories: colors, typography, border
radius, shadows, spacing (4px grid), layout, breakpoints.

> CSS variables cannot be used inside `@media` queries. Breakpoint **values** are
> documented as tokens but hard-coded in the layout files — keep them in sync.

## Scoping & override strategy (critical)

During migration the new portal shares the document with legacy components (the
BT form renders in the same page as the modality selector). To restyle the
selector without disturbing the form:

1. **Scope every populated rule** under the portal root `.modalidade-screen`.
   This both prevents leakage into legacy screens and raises specificity to
   `0,2,0`, beating the legacy single-class rules (`0,1,0`) in
   `bt/css/styles.css` regardless of load order.
2. **Load the theme after the legacy stylesheet.** Same-specificity *container*
   rules (e.g. `.modalidade-screen` itself) are then won by load order. In
   `index.html`, `css/themes/cemig-desktop.css` is linked after
   `bt/css/styles.css`.
3. **No global reset.** `base/reset.css` is scoped to `.modalidade-screen`.

## Phase status (Desktop)

**Phase 1 — architecture + selector**
- New modular architecture + tokens (this folder).
- Desktop redesign of the **modality selector** (home), restyling the existing
  `SecaoModalidade` markup (`bt/js/components.js`) — no behavior change; the
  accordion already existed.
- Open Sans wired into `index.html`; an info notice (`.modalidade-aviso`) added
  to the selector head (`bt/js/app.js`).

**Phase 2 — full landing identity (current)**
- Institutional **green header** (#0F6C58, logo + title) and **dark footer**
  (#041E18, logo + copyright) added in `pages/home.css`.
- Scoped to the landing via the `.cemig-portal` class, applied to the app-shell
  wrapper only while the selector is visible
  (`bt/js/app.js` → `modalidade ? "" : "cemig-portal"`). The BT form steps reuse
  the same `.topbar` markup but render without `.cemig-portal`, so their header
  is **unchanged**.
- Selector copy aligned to the design (title, intro, info notice); existing
  navigation links and the "Termo de Desistência" link are preserved.
- Mobile + other components scaffolded only; legacy styling preserved everywhere
  else.

### Note: shared/global navigation

`pages/home.css` styles the header/footer **only on the landing**. A reusable
header/footer applied across the BT form steps and the other modules (MT, GD,
Loteamento) is a separate, larger change (those screens are not in the current
delivery) and remains reserved for `components/navigation.css`.

## How to extend in future phases

1. Add/extend tokens in `base/variables.css`.
2. Implement the delivered component in its `components/*.css` file, consuming
   `--cmg-*` tokens and scoping to the target surface until that page is fully
   migrated.
3. Register new files in the theme entry (`themes/cemig-desktop.css`).
4. Preserve previously approved implementations unless explicitly told to
   replace them.

## Verify

Serve the repo over HTTP (`python3 -m http.server 8000`) and open
`http://localhost:8000/`:

- The landing shows the CEMIG identity: green header (logo + title), Open Sans,
  info notice with the circular "i", bold 18px accordion rows with hairline
  dividers, card grid with image + title + subtitle, green hover (border +
  `--cmg-green-50` info panel), and the dark footer (logo + copyright).
- Expand/collapse still works (unchanged behavior); selecting a card still
  prefills/links exactly as before.
- Pick any modality and confirm the **BT form is visually unchanged** (DM Sans,
  legacy topbar, no green header/footer) — proving the new CSS did not leak.
