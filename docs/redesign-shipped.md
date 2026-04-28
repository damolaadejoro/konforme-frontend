# Consistency Pass — Shipped

**Date:** 2026-04-28

## What shipped

A 4-phase consistency pass across all 10 authenticated pages in the Konforme dashboard.

### Phases

1. **Audit** — walked every page, documented inconsistencies in `docs/audit.md`
2. **Shared primitives** — built 7 reusable components + design token system
3. **Page migration** — refactored all 10 pages to use the primitives
4. **QA** — grep checks, semantic color migration, responsive fixes, accessibility pass

## Primitives (`src/components/ui/`)

| Component | File | Purpose |
|-----------|------|---------|
| `Button` | `Button.tsx` | 4 variants (primary, secondary, ghost, destructive), 3 sizes, icon + loading support |
| `PageHeader` | `PageHeader.tsx` | White header band with breadcrumbs, title, description, actions. Responsive stacking. |
| `PageContainer` | `PageContainer.tsx` | `PageContainer` + `PageContent` — page layout shell with max-width and padding |
| `MetricCard` | `MetricCard.tsx` | Stat card with semantic coloring (zero = navy, non-zero = semantic color), trend, helper text |
| `EmptyState` | `EmptyState.tsx` | Centered icon + title + description + optional CTA |
| `DataTable` | `DataTable.tsx` | `Table`, `TableHead`, `TableHeaderCell`, `TableBody`, `TableRow`, `TableCell` sub-components. Semantic HTML (`<th>`, `<td>`). |
| `Badge` | `Badge.tsx` | 6 variants (default, success, warning, danger, info, muted), pill-shaped |

### Showcase

All primitives are demoed at `/dev/components`.

## CSS variable conventions

All colors are defined as space-separated RGB channels in `:root` (in `src/index.css`), consumed via Tailwind's `rgb(var(--token) / <alpha-value>)` pattern.

| Token | RGB | Usage |
|-------|-----|-------|
| `--navy` | `13 30 58` | Brand primary |
| `--cyan` | `37 194 211` | Accent / interactive |
| `--green` | `16 185 129` | Success |
| `--off-white` | `244 247 251` | Page background |
| `--background` | `244 247 251` | `bg-background` |
| `--foreground` | `13 30 58` | `text-foreground` (navy) |
| `--card` | `255 255 255` | Card surfaces |
| `--card-foreground` | `13 30 58` | Card text |
| `--muted` | `241 245 249` | Muted surfaces (slate-100) |
| `--muted-foreground` | `100 116 139` | Secondary text (slate-500) |
| `--primary` | `13 30 58` | Primary button bg |
| `--primary-foreground` | `255 255 255` | Primary button text |
| `--secondary` | `241 245 249` | Secondary button bg |
| `--secondary-foreground` | `13 30 58` | Secondary button text |
| `--accent` | `37 194 211` | Accent color |
| `--accent-foreground` | `255 255 255` | Accent text |
| `--border` | `226 232 240` | All borders |
| `--input` | `226 232 240` | Form input borders |
| `--ring` | `37 194 211` | Focus rings |
| `--destructive` | `220 38 38` | Error / danger |
| `--destructive-foreground` | `255 255 255` | Destructive button text |
| `--warning` | `217 119 6` | Warning state |
| `--success` | `16 185 129` | Success state |

## Rules for future pages

1. **Every page** must use `PageContainer > PageHeader > PageContent` layout
2. **No inline hex colors** — use Tailwind token classes (`text-foreground`, `bg-muted`, etc.)
3. **No custom buttons** — use `<Button>` with the correct variant
4. **No custom stat cards** — use `<MetricCard>`
5. **No custom tables** — use `DataTable` sub-components
6. **No custom empty states** — use `<EmptyState>`
7. **Status indicators** must use `<Badge>` (pill-shaped, not raw colored text)
8. **Font** is Geist throughout — no serif, no Syne, no Switzer
9. Copy the pattern from any existing page (e.g., `PeopleTasks.tsx` or `Team.tsx`)

## Out of scope (separate work)

- Onboarding flow (GetStarted)
- Assessment multi-step interaction UX
- Modals and dialogs
- Email templates
- Mobile native experience
- i18n verification across new components
- Sidebar and topbar redesign
