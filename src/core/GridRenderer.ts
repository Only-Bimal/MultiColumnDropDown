import { ColumnDefinition, SelectionMode, SortDirection } from '../types';

export interface GridRendererCallbacks<T = any> {
  onSortClick: (field: string) => void;
  onColumnResize: (colIndex: number, newWidth: number) => void;
  onRowClick: (item: T, index: number, e: MouseEvent) => void;
  onRowHover: (index: number) => void;
  onSelectAllToggle: (checked: boolean) => void;
  onRowCheckboxToggle: (item: T, index: number, checked: boolean) => void;
}

export class GridRenderer<T = any> {
  private headerTable: HTMLTableElement;
  private bodyTable: HTMLTableElement;
  private columns: ColumnDefinition<T>[] = [];
  private selectionMode: SelectionMode = 'single';
  private sortable: boolean = true;
  private resizable: boolean = true;
  private callbacks: GridRendererCallbacks<T>;
  private colWidths: number[] = [];
  private isResizing: boolean = false;
  private resizeColIndex: number = -1;
  private resizeStartX: number = 0;
  private resizeStartWidth: number = 0;

  constructor(
    headerTable: HTMLTableElement,
    bodyTable: HTMLTableElement,
    callbacks: GridRendererCallbacks<T>
  ) {
    this.headerTable = headerTable;
    this.bodyTable = bodyTable;
    this.callbacks = callbacks;

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  public setConfig(
    columns: ColumnDefinition<T>[],
    selectionMode: SelectionMode = 'single',
    sortable: boolean = true,
    resizable: boolean = true
  ): void {
    this.columns = columns.filter((c) => c.visible !== false);
    this.selectionMode = selectionMode;
    this.sortable = sortable;
    this.resizable = resizable;

    // Calculate default widths
    this.colWidths = this.columns.map((col) => col.width || 120);
    this.renderHeader(undefined, 'none', false);
  }

  public renderHeader(
    sortField?: string,
    sortDir: SortDirection = 'none',
    isAllSelected: boolean = false
  ): void {
    let colGroupHtml = '<colgroup>';
    let headerHtml = '<thead><tr>';

    if (this.selectionMode === 'multiple') {
      colGroupHtml += '<col style="width: 36px;">';
      headerHtml += `
        <th class="omni-th omni-checkbox-cell" style="width: 36px;">
          <input type="checkbox" class="omni-checkbox omni-select-all" ${isAllSelected ? 'checked' : ''} />
        </th>
      `;
    }

    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i];
      const width = this.colWidths[i];
      const isSorted = sortField === col.field;
      const indicator = isSorted
        ? sortDir === 'asc'
          ? ' ▲'
          : sortDir === 'desc'
          ? ' ▼'
          : ''
        : '';

      const isColSortable = this.sortable && col.sortable !== false;
      const sortClass = isColSortable ? 'sortable' : '';

      colGroupHtml += `<col style="width: ${width}px;">`;
      headerHtml += `
        <th class="omni-th ${sortClass}" data-col-index="${i}" data-field="${col.field}" style="width: ${width}px; text-align: ${col.align || 'left'};">
          <span class="omni-th-title">${col.title}</span>
          <span class="omni-sort-indicator">${indicator}</span>
          ${this.resizable ? `<span class="omni-col-resizer" data-resizer-index="${i}"></span>` : ''}
        </th>
      `;
    }

    colGroupHtml += '</colgroup>';
    headerHtml += '</tr></thead>';

    this.headerTable.innerHTML = colGroupHtml + headerHtml;
    this.bodyTable.innerHTML = colGroupHtml + '<tbody></tbody>';

    this.bindHeaderEvents();
  }

  private bindHeaderEvents(): void {
    // Sort click
    const ths = this.headerTable.querySelectorAll<HTMLTableCellElement>('.omni-th.sortable');
    ths.forEach((th) => {
      th.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('omni-col-resizer')) return;
        const field = th.getAttribute('data-field');
        if (field) this.callbacks.onSortClick(field);
      });
    });

    // Resizers
    if (this.resizable) {
      const resizers = this.headerTable.querySelectorAll<HTMLElement>('.omni-col-resizer');
      resizers.forEach((resizer) => {
        resizer.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const colIndex = parseInt(resizer.getAttribute('data-resizer-index') || '0', 10);
          this.startResize(colIndex, e.clientX);
        });
      });
    }

    // Select All Checkbox
    const selectAllBox = this.headerTable.querySelector<HTMLInputElement>('.omni-select-all');
    if (selectAllBox) {
      selectAllBox.addEventListener('change', () => {
        this.callbacks.onSelectAllToggle(selectAllBox.checked);
      });
    }
  }

  private startResize(colIndex: number, clientX: number): void {
    this.isResizing = true;
    this.resizeColIndex = colIndex;
    this.resizeStartX = clientX;
    this.resizeStartWidth = this.colWidths[colIndex];

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isResizing) return;
    const diff = e.clientX - this.resizeStartX;
    const minW = this.columns[this.resizeColIndex]?.minWidth || 40;
    const newW = Math.max(minW, this.resizeStartWidth + diff);

    this.colWidths[this.resizeColIndex] = newW;
    this.updateColWidths();
  }

  private onMouseUp(): void {
    if (!this.isResizing) return;
    this.isResizing = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.callbacks.onColumnResize(this.resizeColIndex, this.colWidths[this.resizeColIndex]);
  }

  private updateColWidths(): void {
    const headerCols = this.headerTable.querySelectorAll('col');
    const bodyCols = this.bodyTable.querySelectorAll('col');
    const offset = this.selectionMode === 'multiple' ? 1 : 0;

    for (let i = 0; i < this.columns.length; i++) {
      const widthStr = `${this.colWidths[i]}px`;
      if (headerCols[i + offset]) headerCols[i + offset].style.width = widthStr;
      if (bodyCols[i + offset]) bodyCols[i + offset].style.width = widthStr;
    }
  }

  public renderRows(
    visibleRows: { item: T; index: number }[],
    activeIndex: number,
    isSelected: (item: T) => boolean,
    rowHeight: number = 26
  ): void {
    const tbody = this.bodyTable.querySelector('tbody');
    if (!tbody) return;

    if (visibleRows.length === 0) {
      tbody.innerHTML = '';
      return;
    }

    let rowsHtml = '';
    const hasCheckbox = this.selectionMode === 'multiple';

    for (let r = 0; r < visibleRows.length; r++) {
      const { item, index } = visibleRows[r];
      const selected = isSelected(item);
      const active = index === activeIndex;
      const stripeClass = index % 2 === 0 ? 'even' : 'odd';
      const activeClass = active ? ' active' : '';
      const selectedClass = selected ? ' selected' : '';

      rowsHtml += `<tr class="omni-row ${stripeClass}${activeClass}${selectedClass}" data-index="${index}" style="height: ${rowHeight}px;">`;

      if (hasCheckbox) {
        rowsHtml += `
          <td class="omni-td omni-checkbox-cell">
            <input type="checkbox" class="omni-checkbox omni-row-checkbox" data-row-index="${index}" ${selected ? 'checked' : ''} />
          </td>
        `;
      }

      for (let c = 0; c < this.columns.length; c++) {
        const col = this.columns[c];
        const rawVal = (item as any)[col.field];
        let displayVal = rawVal !== null && rawVal !== undefined ? String(rawVal) : '';

        if (col.formatter) {
          const res = col.formatter(rawVal, item, index);
          if (typeof res === 'string') displayVal = res;
        }

        rowsHtml += `<td class="omni-td" style="text-align: ${col.align || 'left'};">${displayVal}</td>`;
      }

      rowsHtml += '</tr>';
    }

    tbody.innerHTML = rowsHtml;

    // Attach click and hover events
    const trs = tbody.querySelectorAll<HTMLTableRowElement>('.omni-row');
    trs.forEach((tr) => {
      const idx = parseInt(tr.getAttribute('data-index') || '0', 10);
      const rowItem = visibleRows.find((vr) => vr.index === idx)?.item;
      if (!rowItem) return;

      tr.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('omni-row-checkbox')) {
          const cb = target as HTMLInputElement;
          this.callbacks.onRowCheckboxToggle(rowItem, idx, cb.checked);
        } else {
          this.callbacks.onRowClick(rowItem, idx, e);
        }
      });

      tr.addEventListener('mouseenter', () => {
        this.callbacks.onRowHover(idx);
      });
    });
  }

  public getTotalWidth(): number {
    const checkboxWidth = this.selectionMode === 'multiple' ? 36 : 0;
    const colSum = this.colWidths.reduce((a, b) => a + b, 0);
    return checkboxWidth + colSum;
  }
}

