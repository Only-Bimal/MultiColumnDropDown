import {
  AsyncFetchCallback,
  ColumnDefinition,
  OmniComboOptions,
  SelectionMode
} from './types';
import { VirtualEngine } from './core/VirtualEngine';
import { DataController } from './core/DataController';
import { KeyboardMachine } from './core/KeyboardMachine';
import { GridRenderer } from './core/GridRenderer';
import themeStyles from './styles/theme.css?inline';

export class OmniCombo<T = any> extends HTMLElement {
  public static readonly TAG_NAME = 'omni-combo';

  private root: ShadowRoot;
  private containerEl!: HTMLElement;
  private inputEl!: HTMLInputElement;
  private toggleBtnEl!: HTMLButtonElement;
  private clearBtnEl!: HTMLButtonElement;
  private dropdownEl!: HTMLElement;
  private headerTableEl!: HTMLTableElement;
  private viewportEl!: HTMLElement;
  private phantomEl!: HTMLElement;
  private bodyTableEl!: HTMLTableElement;
  private footerEl!: HTMLElement;

  private virtualEngine!: VirtualEngine;
  private dataController!: DataController<T>;
  private keyboardMachine!: KeyboardMachine;
  private gridRenderer!: GridRenderer<T>;

  private _columns: ColumnDefinition<T>[] = [];
  private _displayMember: string = 'name';
  private _valueMember: string = 'id';
  private _selectionMode: SelectionMode = 'single';
  private _autocomplete: boolean = false;
  private _sortable: boolean = true;
  private _resizable: boolean = true;
  private _rowHeight: number = 26;
  private _visibleRowsCount: number = 10;
  private _disabled: boolean = false;
  private _placeholder: string = 'Select an item...';
  private _showClearButton: boolean = true;
  private _emptyText: string = 'No matching items found';
  private _loadingText: string = 'Loading...';

  private activeIndex: number = -1;
  private committedRow: T | null = null;
  private isDropdownOpen: boolean = false;
  private lastCommittedText: string = '';

  static get observedAttributes() {
    return [
      'display-member',
      'value-member',
      'selection-mode',
      'autocomplete',
      'sortable',
      'resizable',
      'disabled',
      'placeholder',
      'row-height',
      'visible-rows-count'
    ];
  }

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.buildDOM();
    this.initControllers();
    this.bindEvents();
  }

  private buildDOM(): void {
    const styleEl = document.createElement('style');
    styleEl.textContent = themeStyles;

    this.containerEl = document.createElement('div');
    this.containerEl.className = 'omni-container';

    this.containerEl.innerHTML = `
      <div class="omni-input-group">
        <input type="text" class="omni-input" placeholder="${this._placeholder}" autocomplete="off" spellcheck="false" />
        <div class="omni-btn-group">
          <button type="button" class="omni-btn omni-clear-btn" title="Clear selection" style="display: none;">✕</button>
          <button type="button" class="omni-btn omni-toggle-btn" title="Open dropdown">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </div>
      <div class="omni-dropdown">
        <div class="omni-header-wrapper">
          <table class="omni-table omni-header-table"></table>
        </div>
        <div class="omni-viewport">
          <div class="omni-phantom"></div>
          <table class="omni-table omni-virtual-table"></table>
        </div>
        <div class="omni-footer">
          <span class="omni-footer-count">0 items</span>
          <span class="omni-footer-status"></span>
        </div>
      </div>
    `;

    this.root.appendChild(styleEl);
    this.root.appendChild(this.containerEl);

    this.inputEl = this.containerEl.querySelector('.omni-input')!;
    this.toggleBtnEl = this.containerEl.querySelector('.omni-toggle-btn')!;
    this.clearBtnEl = this.containerEl.querySelector('.omni-clear-btn')!;
    this.dropdownEl = this.containerEl.querySelector('.omni-dropdown')!;
    this.headerTableEl = this.containerEl.querySelector('.omni-header-table')!;
    this.viewportEl = this.containerEl.querySelector('.omni-viewport')!;
    this.phantomEl = this.containerEl.querySelector('.omni-phantom')!;
    this.bodyTableEl = this.containerEl.querySelector('.omni-virtual-table')!;
    this.footerEl = this.containerEl.querySelector('.omni-footer')!;

    this.updateViewportDimensions();
  }

  private initControllers(): void {
    // 1. Data Controller
    this.dataController = new DataController<T>({
      onDataChanged: (totalCount: number) => {
        this.virtualEngine.setTotalCount(totalCount);
        this.updateFooterCount(totalCount);
        this.renderVirtualSlice();
      },
      onLoadingChanged: (loading: boolean) => {
        this.updateLoadingState(loading);
      },
      onError: (err: any) => {
        console.error('OmniCombo Data Error:', err);
        const statusEl = this.footerEl.querySelector('.omni-footer-status')!;
        statusEl.textContent = 'Error loading data';
      }
    });

    // 2. Virtual Engine
    this.virtualEngine = new VirtualEngine(
      this.viewportEl,
      this.phantomEl,
      this.bodyTableEl,
      this._rowHeight,
      () => {
        this.renderVirtualSlice();
      }
    );

    // 3. Grid Renderer
    this.gridRenderer = new GridRenderer<T>(
      this.headerTableEl,
      this.bodyTableEl,
      {
        onSortClick: (field) => {
          this.dataController.setSort(field);
          const sortState = this.dataController.getSortState();
          this.gridRenderer.renderHeader(sortState.field, sortState.direction);
        },
        onColumnResize: () => {
          this.syncDropdownWidth();
        },
        onRowClick: (item, index) => {
          this.selectAndCommit(item, index);
        },
        onRowHover: (index) => {
          this.activeIndex = index;
          this.renderVirtualSlice();
        },
        onSelectAllToggle: (checked) => {
          if (checked) {
            this.dataController.selectAll();
          } else {
            this.dataController.clearSelection();
          }
          this.updateInputTextForMulti();
          this.renderVirtualSlice();
          this.dispatchChangeEvent();
        },
        onRowCheckboxToggle: (item) => {
          this.dataController.toggleSelect(item, true);
          this.updateInputTextForMulti();
          this.renderVirtualSlice();
          this.dispatchChangeEvent();
        }
      }
    );

    // 4. Keyboard Machine
    this.keyboardMachine = new KeyboardMachine({
      isOpen: () => this.isDropdownOpen,
      open: () => this.open(),
      close: (commit) => this.close(commit),
      getActiveIndex: () => this.activeIndex,
      setActiveIndex: (index, scrollIntoView) => {
        this.activeIndex = index;
        if (scrollIntoView) {
          this.virtualEngine.scrollToIndex(index);
        }
        this.renderVirtualSlice();
      },
      getTotalCount: () => this.dataController.getCount(),
      getVisibleRowCount: () => this.virtualEngine.getVisibleRowCount(),
      commitSelection: () => {
        const item = this.dataController.getItem(this.activeIndex);
        if (item) this.selectAndCommit(item, this.activeIndex);
      },
      toggleActiveCheckbox: () => {
        const item = this.dataController.getItem(this.activeIndex);
        if (item) {
          this.dataController.toggleSelect(item, true);
          this.updateInputTextForMulti();
          this.renderVirtualSlice();
          this.dispatchChangeEvent();
        }
      },
      revertValue: () => {
        this.inputEl.value = this.lastCommittedText;
      },
      isMultiSelect: () => this._selectionMode === 'multiple'
    });
  }

  private bindEvents(): void {
    // Input typing & filter
    this.inputEl.addEventListener('input', (e) => {
      const query = this.inputEl.value;
      this.updateClearBtnVisibility();

      if (!this.isDropdownOpen) {
        this.open();
      }

      // Inline Win32 Auto-complete check
      if (this._autocomplete && (e as InputEvent).inputType !== 'deleteContentBackward') {
        const match = this.dataController.getFirstMatch(query, this._displayMember);
        if (match) {
          const fullText = String((match.item as any)[this._displayMember] || '');
          this.keyboardMachine.applyAutocomplete(this.inputEl, fullText, query);
          this.activeIndex = match.index;
          this.virtualEngine.scrollToIndex(match.index);
        }
      }

      this.dataController.setQuery(query);
      this.dispatchEvent(new CustomEvent('search', { detail: { query } }));
    });

    // Keyboard navigation
    this.inputEl.addEventListener('keydown', (e) => {
      this.keyboardMachine.handleKeyDown(e);
    });

    // Toggle button click
    this.toggleBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Clear button click
    this.clearBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clear();
      this.inputEl.focus();
    });

    // Open on input click
    this.inputEl.addEventListener('click', () => {
      if (!this.isDropdownOpen) this.open();
    });

    // Outside click closes dropdown
    document.addEventListener('click', (e) => {
      if (!this.isDropdownOpen) return;
      const path = e.composedPath();
      if (!path.includes(this)) {
        this.close(true);
      }
    });
  }

  private updateViewportDimensions(): void {
    const height = this._rowHeight * this._visibleRowsCount;
    this.viewportEl.style.height = `${height}px`;
    if (this.virtualEngine) {
      this.virtualEngine.setRowHeight(this._rowHeight);
    }
  }

  private syncDropdownWidth(): void {
    const totalW = this.gridRenderer.getTotalWidth();
    const minW = Math.max(totalW, this.containerEl.clientWidth);
    this.dropdownEl.style.width = `${minW}px`;
  }

  private renderVirtualSlice(): void {
    const range = this.virtualEngine.getCurrentRange();
    const visibleRows = this.dataController.getVisibleItems(range.startIndex, range.endIndex);

    if (visibleRows.length === 0 && !this.dataController.getLoading()) {
      const tbody = this.bodyTableEl.querySelector('tbody');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="${this._columns.length + (this._selectionMode === 'multiple' ? 1 : 0)}" class="omni-message">${this._emptyText}</td></tr>`;
      }
      return;
    }

    this.gridRenderer.renderRows(
      visibleRows,
      this.activeIndex,
      (item) => this.dataController.isSelected(item),
      this._rowHeight
    );
  }

  private selectAndCommit(item: T, index: number): void {
    const key = (item as any)[this._valueMember];
    const displayText = String((item as any)[this._displayMember] || '');

    // Fire beforeSelect event (cancelable)
    let isCancelled = false;
    const beforeEvt = new CustomEvent('beforeSelect', {
      bubbles: true,
      cancelable: true,
      detail: {
        currentRow: this.committedRow,
        rowToSelect: item,
        currentValue: this.committedRow ? (this.committedRow as any)[this._valueMember] : null,
        newValue: key,
        isCancelled: false,
        cancel: () => { isCancelled = true; }
      }
    });

    this.dispatchEvent(beforeEvt);
    if (beforeEvt.defaultPrevented || isCancelled) {
      return;
    }

    if (this._selectionMode === 'single') {
      this.committedRow = item;
      this.activeIndex = index;
      this.dataController.select(item, false);
      this.inputEl.value = displayText;
      this.lastCommittedText = displayText;
      this.close(true);
    } else {
      this.dataController.toggleSelect(item, true);
      this.updateInputTextForMulti();
    }

    this.updateClearBtnVisibility();

    // Fire afterSelect and change
    this.dispatchEvent(new CustomEvent('afterSelect', {
      bubbles: true,
      detail: { selectedRow: item, value: key }
    }));

    this.dispatchChangeEvent();
  }

  private updateInputTextForMulti(): void {
    const items = this.dataController.getSelectedItems();
    if (items.length === 0) {
      this.inputEl.value = '';
    } else if (items.length === 1) {
      this.inputEl.value = String((items[0] as any)[this._displayMember] || '');
    } else {
      this.inputEl.value = `(${items.length} items selected)`;
    }
    this.lastCommittedText = this.inputEl.value;
    this.updateClearBtnVisibility();
  }

  private dispatchChangeEvent(): void {
    const selected = this.dataController.getSelectedItems();
    const value = this._selectionMode === 'single'
      ? (selected[0] ? (selected[0] as any)[this._valueMember] : null)
      : selected.map((s) => (s as any)[this._valueMember]);

    this.dispatchEvent(new CustomEvent('change', {
      bubbles: true,
      detail: { value, selectedRows: selected }
    }));
  }

  private updateFooterCount(count: number): void {
    const countEl = this.footerEl.querySelector('.omni-footer-count')!;
    countEl.textContent = `${count.toLocaleString()} items`;
  }

  private updateLoadingState(loading: boolean): void {
    const statusEl = this.footerEl.querySelector('.omni-footer-status')!;
    if (loading) {
      statusEl.innerHTML = `<span class="omni-spinner"></span> ${this._loadingText}`;
    } else {
      statusEl.innerHTML = '';
    }
  }

  private updateClearBtnVisibility(): void {
    if (!this._showClearButton || this._disabled) {
      this.clearBtnEl.style.display = 'none';
      return;
    }
    this.clearBtnEl.style.display = this.inputEl.value.length > 0 ? 'inline-flex' : 'none';
  }

  // --- Public API ---

  public open(): void {
    if (this._disabled || this.isDropdownOpen) return;
    this.isDropdownOpen = true;
    this.containerEl.classList.add('open');
    this.syncDropdownWidth();

    // If async data is not loaded yet and has fetch callback, trigger initial fetch
    if (this.dataController.getCount() === 0) {
      this.dataController.fetchRemoteData(1);
    }

    this.virtualEngine.update();
    if (this.activeIndex >= 0) {
      this.virtualEngine.scrollToIndex(this.activeIndex);
    }

    this.dispatchEvent(new CustomEvent('open', { bubbles: true }));
  }

  public close(commit: boolean = false): void {
    if (!this.isDropdownOpen) return;
    this.isDropdownOpen = false;
    this.containerEl.classList.remove('open');

    if (!commit) {
      this.inputEl.value = this.lastCommittedText;
    }

    this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
  }

  public toggle(): void {
    if (this.isDropdownOpen) this.close(true);
    else this.open();
  }

  public clear(): void {
    this.committedRow = null;
    this.activeIndex = -1;
    this.dataController.clearSelection();
    this.inputEl.value = '';
    this.lastCommittedText = '';
    this.dataController.setQuery('', true);
    this.updateClearBtnVisibility();
    this.renderVirtualSlice();
    this.dispatchChangeEvent();
  }

  public getSelectedRows(): T[] {
    return this.dataController.getSelectedItems();
  }

  public getValue(): any {
    const selected = this.dataController.getSelectedItems();
    if (this._selectionMode === 'single') {
      return selected[0] ? (selected[0] as any)[this._valueMember] : null;
    }
    return selected.map((s) => (s as any)[this._valueMember]);
  }

  public setValue(val: any): void {
    if (val === null || val === undefined) {
      this.clear();
      return;
    }
    // Search in loaded items
    const count = this.dataController.getLoadedCount();
    for (let i = 0; i < count; i++) {
      const item = this.dataController.getItem(i);
      if (item && (item as any)[this._valueMember] === val) {
        this.selectAndCommit(item, i);
        return;
      }
    }
  }

  // --- Property Getters / Setters ---

  public get columns(): ColumnDefinition<T>[] {
    return this._columns;
  }

  public set columns(cols: ColumnDefinition<T>[]) {
    this._columns = cols || [];
    this.gridRenderer.setConfig(this._columns, this._selectionMode, this._sortable, this._resizable);
    this.dataController.setConfig(this._columns, this._valueMember);
    this.syncDropdownWidth();
  }

  public get dataSource(): T[] {
    return [];
  }

  public set dataSource(data: T[]) {
    this.dataController.setLocalData(data);
  }

  public set onFetchData(callback: AsyncFetchCallback<T>) {
    this.dataController.setConfig(this._columns, this._valueMember, callback);
  }

  public get displayMember(): string {
    return this._displayMember;
  }

  public set displayMember(val: string) {
    this._displayMember = val;
  }

  public get valueMember(): string {
    return this._valueMember;
  }

  public set valueMember(val: string) {
    this._valueMember = val;
    this.dataController.setConfig(this._columns, this._valueMember);
  }

  public get selectionMode(): SelectionMode {
    return this._selectionMode;
  }

  public set selectionMode(val: SelectionMode) {
    this._selectionMode = val;
    this.gridRenderer.setConfig(this._columns, this._selectionMode, this._sortable, this._resizable);
  }

  public get autocomplete(): boolean {
    return this._autocomplete;
  }

  public set autocomplete(val: boolean) {
    this._autocomplete = val;
  }

  public get sortable(): boolean {
    return this._sortable;
  }

  public set sortable(val: boolean) {
    this._sortable = val;
    this.gridRenderer.setConfig(this._columns, this._selectionMode, this._sortable, this._resizable);
  }

  public get resizable(): boolean {
    return this._resizable;
  }

  public set resizable(val: boolean) {
    this._resizable = val;
    this.gridRenderer.setConfig(this._columns, this._selectionMode, this._sortable, this._resizable);
  }

  public get rowHeight(): number {
    return this._rowHeight;
  }

  public set rowHeight(val: number) {
    this._rowHeight = val;
    this.updateViewportDimensions();
  }

  public get visibleRowsCount(): number {
    return this._visibleRowsCount;
  }

  public set visibleRowsCount(val: number) {
    this._visibleRowsCount = val;
    this.updateViewportDimensions();
  }

  public get disabled(): boolean {
    return this._disabled;
  }

  public set disabled(val: boolean) {
    this._disabled = val;
    this.inputEl.disabled = val;
    this.toggleBtnEl.disabled = val;
    if (val) {
      this.containerEl.querySelector('.omni-input-group')!.classList.add('disabled');
      this.close();
    } else {
      this.containerEl.querySelector('.omni-input-group')!.classList.remove('disabled');
    }
    this.updateClearBtnVisibility();
  }

  public get emptyText(): string {
    return this._emptyText;
  }

  public set emptyText(val: string) {
    this._emptyText = val;
  }

  public get loadingText(): string {
    return this._loadingText;
  }

  public set loadingText(val: string) {
    this._loadingText = val;
  }

  public get placeholder(): string {
    return this._placeholder;
  }

  public set placeholder(val: string) {
    this._placeholder = val;
    this.inputEl.placeholder = val;
  }

  public attributeChangedCallback(name: string, _oldVal: string, newVal: string): void {
    switch (name) {
      case 'display-member':
        this.displayMember = newVal;
        break;
      case 'value-member':
        this.valueMember = newVal;
        break;
      case 'selection-mode':
        this.selectionMode = newVal as SelectionMode;
        break;
      case 'autocomplete':
        this.autocomplete = newVal !== null && newVal !== 'false';
        break;
      case 'sortable':
        this.sortable = newVal !== 'false';
        break;
      case 'resizable':
        this.resizable = newVal !== 'false';
        break;
      case 'disabled':
        this.disabled = newVal !== null && newVal !== 'false';
        break;
      case 'placeholder':
        this.placeholder = newVal;
        break;
      case 'row-height':
        this.rowHeight = parseInt(newVal, 10) || 26;
        break;
      case 'visible-rows-count':
        this.visibleRowsCount = parseInt(newVal, 10) || 10;
        break;
    }
  }

  /**
   * Static helper to mount an OmniCombo instance inside any DOM element (Vanilla JS / ASPX / React / Angular)
   */
  public static mount<T = any>(
    target: string | HTMLElement,
    options?: OmniComboOptions<T>
  ): OmniCombo<T> {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) throw new Error(`OmniCombo mount target not found: ${target}`);

    const combo = document.createElement(OmniCombo.TAG_NAME) as OmniCombo<T>;
    el.innerHTML = '';
    el.appendChild(combo);

    if (options) {
      if (options.displayMember) combo.displayMember = options.displayMember;
      if (options.valueMember) combo.valueMember = options.valueMember;
      if (options.selectionMode) combo.selectionMode = options.selectionMode;
      if (options.autocomplete !== undefined) combo.autocomplete = options.autocomplete;
      if (options.sortable !== undefined) combo.sortable = options.sortable;
      if (options.resizable !== undefined) combo.resizable = options.resizable;
      if (options.rowHeight) combo.rowHeight = options.rowHeight;
      if (options.visibleRowsCount) combo.visibleRowsCount = options.visibleRowsCount;
      if (options.placeholder) combo.placeholder = options.placeholder;
      if (options.disabled !== undefined) combo.disabled = options.disabled;
      if (options.columns) combo.columns = options.columns;
      if (options.dataSource) combo.dataSource = options.dataSource;
      if (options.onFetchData) combo.onFetchData = options.onFetchData;
    }

    return combo;
  }
}
