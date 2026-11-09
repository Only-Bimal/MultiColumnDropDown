# OmniCombo

> **High-Performance, Zero-Dependency, Virtualized Multi-Column Combobox Web Component** with native Win32 desktop keyboard ergonomics.

---

## ⚡ Key Highlights

- **Sub-5ms Latency for 5,000+ Rows**: Employs GPU-accelerated DOM virtualization (recycling a pool of only ~16–20 visible rows) so your UI never lags or stutters.
- **Zero Dependencies**: Pure modern TypeScript; no jQuery, no React, no external libraries. Weighs under **10 KB gzipped**.
- **Universal Multi-Framework Portability**: Built on standard W3C Web Component standards (`CustomElementRegistry` + Shadow DOM). Works natively in:
  - **Vanilla JavaScript & ASP.NET (ASPX / MVC / Razor / Blazor)**
  - **React** (via custom element or ref)
  - **Angular** (with `CUSTOM_ELEMENTS_SCHEMA`)
  - **Vue, Svelte, and Solid**
- **Win32 Desktop Power-User Keyboard Navigation**:
  - `F4` / `Alt + ↓` : Toggle dropdown open/close.
  - `Alt + ↑` : Close dropdown.
  - `↓` / `↑` : Smooth row navigation.
  - `PageDown` / `PageUp` : Jump by page (10–12 rows).
  - `Home` / `End` : Jump to first / last item in dataset.
  - `Enter` : Commit active selection and close.
  - `Esc` : Cancel / revert to previous committed value and close.
  - `Tab` : Commit selection and advance focus to next form control.
  - `Space` : Toggle row checkbox in multi-select mode.
- **Inline Auto-Complete**: Desktop-style typeahead that suggests the suffix inline and auto-selects remaining characters.
- **Advanced Grid Capabilities**:
  - Sortable column headers with visual ascending/descending indicators.
  - Draggable column resize divider handles with min-width constraints.
  - Multi-select mode with row checkboxes and header master checkbox.
- **Dual Data Modes**:
  - **Local In-Memory**: Instant sub-millisecond multi-column substring search and sorting.
  - **Remote Async API**: Debounced server-side search (`onFetchData`), asynchronous paging, and loading states.

---

## 📦 Installation & Build

```bash
# Install dependencies
npm install

# Start local interactive demo server (with hot reload)
npm run dev

# Build production bundles
npm run build
```

### 📂 Dist Bundles

The build generates named bundles for each environment:
- **`dist/omnicombo.standalone.js`**: Drop-in script for direct `<script>` tags in HTML / ASP.NET Web Forms (`.aspx`). Self-executing; attaches `OmniCombo` and `omniCombo` to `window`.
- **`dist/omnicombo.module.js`**: Standard ES module for modern bundlers and frameworks (React, Angular, Vue, Vite, Webpack).
- **`dist/omnicombo.commonjs.js`**: CommonJS module for Node.js / SSR / `require()` environments.
- **`dist/*.d.ts`**: Complete TypeScript declarations for full IntelliSense.

---

## 🚀 Quickstart Guides

### 1. Vanilla JavaScript & ASP.NET Web Forms (ASPX)

OmniCombo provides both a declarative custom element tag (`<omni-combo>`) and a concise JavaScript mount helper (`omniCombo()` / `OmniCombo.mount()`), so no hyphenated tags are required in your markup:

```html
<!-- Include the standalone browser bundle -->
<script src="dist/omnicombo.standalone.js"></script>

<!-- Target container -->
<div id="countryDropdown"></div>

<script>
  const combo = omniCombo('#countryDropdown', {
    columns: [
      { field: 'code', title: 'Code', width: 60, align: 'center', sortable: true },
      { field: 'name', title: 'Country Name', width: 180, sortable: true },
      { field: 'continent', title: 'Continent', width: 140, sortable: true },
      { field: 'dial', title: 'Dial Code', width: 90, align: 'center', sortable: true }
    ],
    dataSource: [
      { code: 'US', name: 'United States', continent: 'North America', dial: '+1' },
      { code: 'GB', name: 'United Kingdom', continent: 'Europe', dial: '+44' },
      { code: 'DE', name: 'Germany', continent: 'Europe', dial: '+49' },
      { code: 'JP', name: 'Japan', continent: 'Asia', dial: '+81' }
    ],
    displayMember: 'name',
    valueMember: 'code',
    autocomplete: true,       // Win32 inline auto-complete
    sortable: true,           // Clickable sort headers
    resizable: true           // Draggable column divider handles
  });

  // Listen to selection events
  combo.addEventListener('change', (e) => {
    console.log('Selected country code:', e.detail.value);
    console.log('Selected rows:', e.detail.selectedRows);
  });
</script>
```

---

### 2. React

```tsx
import 'omnicombo';
import { useRef, useEffect } from 'react';

export function ProductSelector({ onSelect }) {
  const comboRef = useRef(null);

  useEffect(() => {
    const combo = comboRef.current;
    if (!combo) return;

    combo.columns = [
      { field: 'id', title: 'ID', width: 60, align: 'center' },
      { field: 'name', title: 'Product', width: 200, sortable: true },
      { field: 'price', title: 'Price', width: 80, align: 'right', formatter: (v) => `$${v}` }
    ];
    combo.dataSource = productsList;
    combo.displayMember = 'name';
    combo.valueMember = 'id';

    const handler = (e) => onSelect(e.detail.value);
    combo.addEventListener('change', handler);
    return () => combo.removeEventListener('change', handler);
  }, [onSelect]);

  return (
    <omni-combo
      ref={comboRef}
      autocomplete="true"
      sortable="true"
      resizable="true"
      placeholder="Search products..."
    />
  );
}
```

---

### 3. Angular

In your module or standalone component, enable custom elements support:

```typescript
// app.module.ts
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {}
```

Template:
```html
<omni-combo
  #combo
  [columns]="columns"
  [dataSource]="items"
  display-member="name"
  value-member="id"
  autocomplete="true"
  sortable="true"
  resizable="true"
  (change)="onProductSelected($event.detail.value)">
</omni-combo>
```

---

## 🌐 Remote Async API & Server-Side Paging

When dealing with massive enterprise datasets, provide an `onFetchData` callback:

```javascript
const combo = omniCombo('#apiDropdown', {
  columns: [
    { field: 'id', title: 'ID', width: 60 },
    { field: 'title', title: 'Customer Name', width: 220 },
    { field: 'city', title: 'City', width: 140 }
  ],
  displayMember: 'title',
  valueMember: 'id',
  onFetchData: async ({ query, page, pageSize, sortField, sortOrder }) => {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      pageSize: pageSize.toString(),
      sort: sortField || '',
      dir: sortOrder || ''
    });

    const response = await fetch(`/api/customers?${params}`);
    const data = await response.json();

    return {
      items: data.items,
      totalCount: data.totalCount
    };
  }
});
```

---

## ⌨️ Keyboard Reference

| Key / Shortcut | Action | Description |
| :--- | :--- | :--- |
| **`F4`** or **`Alt + ↓`** | Toggle Dropdown | Opens or closes the dropdown grid immediately. |
| **`Alt + ↑`** | Close Dropdown | Closes the dropdown and retains current selection. |
| **`↓` / `↑`** | Row Navigation | Moves active selection by 1 row, scrolling the viewport smoothly. |
| **`PageDown` / `PageUp`** | Page Jump | Jumps active selection up/down by visible page capacity (10–12 rows). |
| **`Home` / `End`** | Extremes | Moves selection to the very first or very last record in the table. |
| **`Enter`** | Commit | Commits current active row, updates input text, and closes popup. |
| **`Esc`** | Cancel / Revert | Reverts input to prior committed text, cancels edits, and closes popup. |
| **`Tab`** | Commit & Advance | Commits active selection and naturally moves focus to the next form field. |
| **`Space`** | Checkbox Toggle | In `multiple` selection mode, toggles checkbox on highlighted row. |

---

## 📖 Component API Reference

### Properties & Attributes

| Property | Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `columns` | — | `ColumnDefinition[]` | `[]` | Array of column configurations. |
| `dataSource` | — | `T[]` | `[]` | Local in-memory dataset. |
| `onFetchData`| — | `AsyncFetchCallback` | `undefined` | Asynchronous remote data fetching function. |
| `displayMember` | `display-member` | `string` | `'name'` | Field shown in input box upon selection. |
| `valueMember` | `value-member` | `string` | `'id'` | Unique key representing item value. |
| `selectionMode`| `selection-mode`| `'single' \| 'multiple'` | `'single'` | Selection mode. In `'multiple'`, renders checkboxes. |
| `autocomplete` | `autocomplete` | `boolean` | `false` | Enables Win32 desktop inline typeahead auto-complete. |
| `sortable` | `sortable` | `boolean` | `true` | Enables clickable sort column headers. |
| `resizable` | `resizable` | `boolean` | `true` | Enables draggable column divider resize handles. |
| `rowHeight` | `row-height` | `number` | `26` | Row height in pixels for virtual calculations. |
| `visibleRowsCount`| `visible-rows-count`| `number` | `10` | Height in rows of the dropdown viewport. |
| `disabled` | `disabled` | `boolean` | `false` | Disables user interaction. |
| `placeholder` | `placeholder` | `string` | `'Select an item...'` | Input placeholder text. |

### Methods

- `open()`: Opens the dropdown popup.
- `close(commit?: boolean)`: Closes the dropdown popup.
- `toggle()`: Toggles popup open/closed.
- `setValue(val: any)`: Sets selection by matching item `valueMember`.
- `getValue()`: Returns selected item value (or array of values for multi-select).
- `getSelectedRows()`: Returns array of selected item objects.
- `clear()`: Clears current selection, input text, and search filter.

### Events

- `beforeSelect`: Fired before selection is committed. Cancelable via `e.preventDefault()` or `e.detail.cancel()`.
- `afterSelect`: Fired immediately after an item is selected.
- `change`: Fired whenever the value or selected items change.
- `open` / `close`: Fired when the dropdown opens or closes.
- `search`: Fired during typing with `{ query: string }`.

---

## 🏛️ Legacy Project Archive

The original 10-year-old ASP.NET / jQuery codebase (`MCC`) has been preserved in the [`legacy/`](./legacy/) directory.

