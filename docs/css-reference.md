# CSS Reference — Cognitive Trainer

All styles use CSS custom properties defined in `src/index.css`. No Tailwind, no CSS-in-JS.
Each component owns its own `.css` file, co-located in its folder under `src/components/`.

---

## CSS Custom Properties

Defined in `:root` in `src/index.css`. Applied globally; dark mode overrides via `@media (prefers-color-scheme: dark)`.

| Variable         | Light                        | Dark                          | Purpose                        |
|------------------|------------------------------|-------------------------------|--------------------------------|
| `--text`         | `#6b6375`                    | `#9ca3af`                     | Body / secondary text          |
| `--text-h`       | `#08060d`                    | `#f3f4f6`                     | Headings / high-contrast text  |
| `--bg`           | `#fff`                       | `#16171d`                     | Page background                |
| `--border`       | `#e5e4e7`                    | `#2e303a`                     | Dividers, input borders        |
| `--code-bg`      | `#f4f3ec`                    | `#1f2028`                     | Input fields, message bubbles  |
| `--accent`       | `#aa3bff`                    | `#c084fc`                     | Primary action color (purple)  |
| `--accent-bg`    | `rgba(170,59,255,0.1)`       | `rgba(192,132,252,0.15)`      | Subtle accent tint             |
| `--accent-border`| `rgba(170,59,255,0.5)`       | `rgba(192,132,252,0.5)`       | Accent-colored borders         |
| `--shadow`       | subtle black rgba            | stronger black rgba           | Box shadows                    |
| `--sans`         | `system-ui, Segoe UI, ...`   | same                          | Body font stack                |
| `--heading`      | same as `--sans`             | same                          | Heading font stack             |
| `--mono`         | `ui-monospace, Consolas, ...`| same                          | Monospace font stack           |

---

## Typography Scale

Base font is set on `:root`: `font: 18px/145% var(--sans)`. Responsive via media query.

| Usage                    | Size    | Weight | Notes                          |
|--------------------------|---------|--------|--------------------------------|
| Page title (h1)          | `32px`  | 500    | `letter-spacing: -0.5px`       |
| Chat header title (h1)   | `20px`  | 500    | `letter-spacing: -0.3px`       |
| Tab buttons              | `16px`  | 600    | `letter-spacing: -0.3px`       |
| Body / bubbles           | `15px`  | 400    | `line-height: 1.5`             |
| Header action buttons    | `13px`  | 500    | –                              |
| Bubble label (sender)    | `11px`  | 600    | `uppercase`, `letter-spacing: 0.5px` |
| Table headers            | `11px`  | 600    | `uppercase`, `letter-spacing: 0.5px` |
| Table body               | `14px`  | 400    | –                              |
| Status / footnotes       | `13px`  | 400    | `font-style: italic` for status |
| Key note / usage note    | `12–13px` | 400  | `opacity: 0.6`                 |

Responsive breakpoint: `@media (max-width: 1024px)` drops base to `16px`.

---

## Spacing

Consistent spacing cadence used throughout. No arbitrary values.

| Value  | Common uses                                      |
|--------|--------------------------------------------------|
| `3px`  | Gap within bubble (label + text)                 |
| `4px`  | Small padding (label, tab btn)                   |
| `5px`  | Header button vertical padding                   |
| `6px`  | Status bar vertical padding                      |
| `8px`  | Gap between header buttons; margin/padding misc  |
| `10px` | Form/input horizontal gaps; table cell padding   |
| `12px` | Message list gap; header btn horizontal padding; input padding |
| `14px` | Input field padding; margin misc                 |
| `16px` | Section padding, list padding                    |
| `20px` | Header padding, page padding                     |
| `24px` | Usage page top padding                           |
| `40px` | Empty state top margin                           |
| `60px` | Usage empty state top margin                     |

---

## Border Radius

| Value    | Used on                                         |
|----------|-------------------------------------------------|
| `4px`    | Bubble tail corner (one corner override)        |
| `8px`    | Tab buttons                                     |
| `10px`   | Key gate form input and button                  |
| `12px`   | Chat input textarea and send button             |
| `16px`   | Message bubbles                                 |
| `50%`    | Status dot (circle)                             |
| `999px`  | Pill buttons (header actions, session-done tag) |

---

## Button Patterns

Three button variants used across the app. All share `transition: opacity 0.2s` or `transition: border-color 0.2s, color 0.2s`. Disabled state is always `opacity: 0.4; cursor: not-allowed`.

### Primary (`.end-btn`, key gate submit, send button)
- Background: `var(--accent)`, text: `#fff`
- Hover: `opacity: 0.85`
- Radius: `999px` for header pill; `10–12px` for form buttons

### Secondary (`.secondary-btn`)
- Background: `transparent`, border: `1px solid var(--border)`, text: `var(--text)`
- Hover: border and text shift to `var(--accent)`
- Radius: `999px`

### Tab (`.tab-btn`)
- Background: `transparent`, text: `var(--text)`, default `opacity: 0.45`
- Hover: `opacity: 0.75`, background: `var(--code-bg)`
- Active: `opacity: 1`, text: `var(--text-h)`
- Radius: `8px`

---

## Layout Patterns

### Full-height column layout (chat screen)
```css
display: flex;
flex-direction: column;
height: 100svh;
```
Use `flex-shrink: 0` on header and footer. Use `flex: 1; overflow-y: auto` on the scrollable body.

### Centered card (key gate)
```css
display: flex;
align-items: center;
justify-content: center;
height: 100svh;
```
Card is `max-width: 440px; width: 100%` with `display: flex; flex-direction: column; gap: 16px`.

### Max-width constraint
Chat layout is capped at `max-width: 760px; margin: 0 auto` — content never stretches on wide viewports.

---

## Animation

One animation used: the status-bar pulsing dot.

```css
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 1;   }
}
/* applied as: animation: pulse 1.6s ease-in-out infinite; */
```

---

## Dark Mode

Dark mode is automatic via `@media (prefers-color-scheme: dark)` — no JS toggle, no class switching.
Only CSS variables change; component markup and class names are identical in both modes.
Do not hardcode color values in component CSS — always use `var(--...)` tokens.

---

## Adding a New Component

1. Create `src/components/MyComponent/MyComponent.tsx`
2. Create `src/components/MyComponent/MyComponent.css`
3. Import the CSS at the top of the `.tsx` file: `import './MyComponent.css'`
4. Use only `var(--...)` tokens for colors — never hardcode hex/rgb except `#fff` on colored backgrounds where contrast is guaranteed.

## Adding a New Trainer

1. Create `src/trainers/my-trainer/` with:
   - `agents.ts` — agent configs (imports `Agent` from `../../types`)
   - `useMyTrainerSession.ts` — session hook (same Promise-resolver pattern as Logic Trainer)
2. Wire up in `App.tsx` — add a trainer selector or route, call the hook, pass session to `<ChatView>`
3. Add trainer-specific tools in the hook's `startSession` (same toolbox registration pattern)
