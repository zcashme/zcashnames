# Table And Search UI Guidelines

This document records the current design decisions for table-driven pages so the same UI can be reused without visual drift.

Current canonical references:

- `/explorer`
- `/waitlist/view`
- `/verify`
- `/verify?token=...`
- `/faq`

## Rule Zero

Do not re-implement the table search bar, results summary, tabs, sort menu, or rows menu locally.

Use the shared components:

- `components/search/InlineSearchField.tsx`
- `components/table/SearchResultsSummary.tsx`
- `components/table/DataViewTabs.tsx`
- `components/table/TableIconMenus.tsx`

If a new page needs similar UI, extend the shared component first instead of adding per-page styling overrides.

## Curvature

Use `rounded-2xl` as the default curvature for the following shared surface types:

- Site header bar
- Hero cards
- Search field outer shell
- Table shell
- Table-adjacent cards and modal shells when they belong to the same visual family

Current applied examples:

- `components/Header.tsx`
- `app/(site)/faq/page.tsx`
- `app/(site)/verify/page.tsx`
- `components/waitlist/WaitlistViewClient.tsx`
- `components/verify/WaitlistVerifyClient.tsx`
- `app/(site)/explorer/ExplorerListPane.tsx`

Notes:

- Inner table control buttons can still use smaller radii where appropriate.
- Circular icon buttons remain `rounded-full`.

## Search Field

The canonical table search renderer is:

```tsx
<InlineSearchField variant="table" />
```

Do not pass low-level visual props to imitate table styling elsewhere.

### Table Search Geometry

Defined in `components/search/InlineSearchField.tsx`:

- Outer field shell: `rounded-2xl`
- Left icon cluster: search mode toggle + search icon
- Right action cluster inset: `4px` from top, right, and bottom
- Table input right padding: sized to leave stable space for clear + submit controls
- Submit button radius: `rounded-[13px]`
- Clear button radius: `rounded-[13px]`
- Search mode trigger in table variant: borderless

### Table Search States

- Active submit button:
  - `background: var(--home-result-primary-bg)`
  - `color: var(--home-result-primary-fg)`
  - `boxShadow: var(--home-result-primary-shadow)`
- Disabled submit button:
  - muted fill
  - muted text
  - no elevated shadow

### Search Field Consistency Requirements

All table search bars should match on:

- right inset between submit button and outer field border
- top and bottom inset around the submit button
- clear button and submit button alignment
- borderless search mode trigger
- input shell radius
- internal button radii

If a page appears different, assume the surrounding layout is wrong before changing the shared search component.

## Results Summary

Use `SearchResultsSummary` for:

- `Results for "..."`
- match count
- `Clear results` action

The `X` icon next to `Clear results` is already centered in the shared component and should not be locally adjusted.

## Tabs And Table Controls

Use `DataViewTabs` for the tab strip above tables.

Use:

- `TableSortMenu`
- `TableRowsMenu`

from `components/table/TableIconMenus.tsx`.

### Tab Behavior

- Active tab text: `var(--fg-heading)`
- Inactive tab text: `var(--fg-muted)`
- Inactive hover: `var(--color-accent-interactive)`
- Active underline: `2px`, `var(--fg-heading)`

### Icon Menu Behavior

- Trigger buttons are circular
- Trigger hover uses accent color shift, not opacity fade
- Menus use the same rounded, bordered floating surface language as other table controls
- Selected rows/sort item gets accent-tinted active background

## Vertical Rhythm

For table/search pages, use one explicit spacing chain.

Canonical structure:

```tsx
<div className="space-y-4">
  <InlineSearchField variant="table" />
  <SearchResultsSummary />
  <DataViewTabs />
  <TableShell />
</div>
```

Rules:

- Search bar to results summary: `1rem`
- Results summary to tabs: `1rem`
- Tabs to table shell: `1rem`
- `DataViewTabs` should not carry its own top margin

This is why `DataViewTabs` should stay margin-neutral and rely on the parent stack.

## Table Shell

The table shell should generally be:

- `rounded-2xl`
- `overflow-hidden`
- bordered
- background tinted from the page theme token set

Column header rows and footer pagination should feel like one family, but avoid inventing a second visual language in the footer.

## Hover Language

For non-disabled actionable controls on these surfaces, prefer color-shift hover behavior over opacity-only hover behavior.

Preferred pattern:

- base text/icon color: muted or heading token
- hover text/icon color: `var(--color-accent-interactive)`

Apply this consistently to:

- table tabs
- pagination arrows and page numbers
- sort/rows icon buttons
- dropdown menu items
- `Clear results`
- similar lightweight utility actions

Exceptions can exist for intentionally different brand actions, but they should be deliberate.

## Current Shared Ownership

These files are the current source of truth for the shared system:

- `components/search/InlineSearchField.tsx`
- `components/table/SearchResultsSummary.tsx`
- `components/table/DataViewTabs.tsx`
- `components/table/TableIconMenus.tsx`

These files are current consumers and should remain aligned:

- `app/(site)/explorer/ExplorerToolbar.tsx`
- `app/(site)/explorer/ExplorerView.tsx`
- `app/(site)/explorer/ExplorerListPane.tsx`
- `components/waitlist/WaitlistViewClient.tsx`

## When Applying Elsewhere

Before building a new table/search page:

1. Start with the shared components.
2. Use `rounded-2xl` for the main surface family unless there is a deliberate exception.
3. Keep the search/results/tabs/table stack on `space-y-4`.
4. Do not add page-specific nudges to the search field geometry.
5. If a new requirement cannot be expressed cleanly, add a shared variant rather than a one-off override.

## Anti-Patterns

Avoid these:

- local copies of rows/sort menus
- local copies of results summary markup
- per-page search button spacing hacks
- built-in margins inside shared structural components when parent stacking should control spacing
- mixing opacity-hover and color-shift-hover arbitrarily across sibling controls
