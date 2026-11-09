import {
  AsyncFetchCallback,
  ColumnDefinition,
  SortDirection
} from '../types';

export interface DataControllerEvents {
  onDataChanged: (totalCount: number) => void;
  onLoadingChanged: (loading: boolean) => void;
  onError: (error: any) => void;
}

export class DataController<T = any> {
  private rawItems: T[] = [];
  private filteredItems: T[] = [];
  private columns: ColumnDefinition<T>[] = [];
  private onFetchData?: AsyncFetchCallback<T>;
  private debounceMs: number = 250;
  private debounceTimer: any = null;
  private requestId: number = 0;
  private isLoading: boolean = false;
  private currentQuery: string = '';
  private sortField?: string;
  private sortDirection: SortDirection = 'none';
  private valueMember: string = 'id';
  private selectedKeys: Set<any> = new Set();
  private selectedItemsMap: Map<any, T> = new Map();
  private events: DataControllerEvents;
  private asyncTotalCount: number = 0;
  private currentPage: number = 1;
  private pageSize: number = 50;

  constructor(events: DataControllerEvents) {
    this.events = events;
  }

  public setConfig(
    columns: ColumnDefinition<T>[],
    valueMember: string,
    onFetchData?: AsyncFetchCallback<T>,
    debounceMs: number = 250
  ): void {
    this.columns = columns;
    this.valueMember = valueMember;
    this.onFetchData = onFetchData;
    this.debounceMs = debounceMs;
  }

  public setLocalData(items: T[]): void {
    this.rawItems = items || [];
    this.applyLocalFilterAndSort();
  }

  public setQuery(query: string, immediate: boolean = false): void {
    this.currentQuery = query.trim();

    if (this.onFetchData) {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      if (immediate) {
        this.fetchRemoteData(1);
      } else {
        this.debounceTimer = setTimeout(() => {
          this.fetchRemoteData(1);
        }, this.debounceMs);
      }
    } else {
      this.applyLocalFilterAndSort();
    }
  }

  public setSort(field: string): void {
    if (this.sortField === field) {
      if (this.sortDirection === 'asc') this.sortDirection = 'desc';
      else if (this.sortDirection === 'desc') {
        this.sortDirection = 'none';
        this.sortField = undefined;
      }
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    if (this.onFetchData) {
      this.fetchRemoteData(1);
    } else {
      this.applyLocalFilterAndSort();
    }
  }

  public getSortState(): { field?: string; direction: SortDirection } {
    return { field: this.sortField, direction: this.sortDirection };
  }

  public async fetchRemoteData(page: number = 1): Promise<void> {
    if (!this.onFetchData) return;

    this.currentPage = page;
    const currentReq = ++this.requestId;
    this.setLoading(true);

    try {
      const result = await this.onFetchData({
        query: this.currentQuery,
        page: this.currentPage,
        pageSize: this.pageSize,
        sortField: this.sortField,
        sortOrder: this.sortDirection === 'none' ? undefined : this.sortDirection
      });

      // Ignore stale response
      if (currentReq !== this.requestId) return;

      this.filteredItems = result.items || [];
      this.asyncTotalCount = result.totalCount || this.filteredItems.length;
      this.setLoading(false);
      this.events.onDataChanged(this.asyncTotalCount);
    } catch (err) {
      if (currentReq === this.requestId) {
        this.setLoading(false);
        this.events.onError(err);
      }
    }
  }

  private applyLocalFilterAndSort(): void {
    const t0 = performance.now();
    let result = this.rawItems;

    // Filter
    if (this.currentQuery) {
      const q = this.currentQuery.toLowerCase();
      const searchableFields = this.columns
        .filter((c) => c.visible !== false)
        .map((c) => c.field);

      result = result.filter((item) => {
        for (let i = 0; i < searchableFields.length; i++) {
          const val = (item as any)[searchableFields[i]];
          if (val !== null && val !== undefined) {
            if (String(val).toLowerCase().includes(q)) return true;
          }
        }
        return false;
      });
    }

    // Sort
    if (this.sortField && this.sortDirection !== 'none') {
      const field = this.sortField;
      const asc = this.sortDirection === 'asc';

      result = [...result].sort((a, b) => {
        const valA = (a as any)[field];
        const valB = (b as any)[field];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return asc ? -1 : 1;
        if (valB === null || valB === undefined) return asc ? 1 : -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return asc ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return asc ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    this.filteredItems = result;
    const duration = performance.now() - t0;
    // Log latency if needed for performance tracking
    if (duration > 5) {
      console.warn(`Local filter/sort took ${duration.toFixed(2)}ms for ${result.length} items`);
    }

    this.events.onDataChanged(this.filteredItems.length);
  }

  public getItem(index: number): T | undefined {
    return this.filteredItems[index];
  }

  public getCount(): number {
    return this.onFetchData ? this.asyncTotalCount : this.filteredItems.length;
  }

  public getLoadedCount(): number {
    return this.filteredItems.length;
  }

  public getVisibleItems(startIndex: number, endIndex: number): { item: T; index: number }[] {
    const slice: { item: T; index: number }[] = [];
    const max = Math.min(endIndex, this.filteredItems.length);
    for (let i = startIndex; i < max; i++) {
      slice.push({ item: this.filteredItems[i], index: i });
    }
    return slice;
  }

  public isSelected(item: T): boolean {
    const key = (item as any)[this.valueMember];
    return this.selectedKeys.has(key);
  }

  public select(item: T, isMulti: boolean = false): void {
    const key = (item as any)[this.valueMember];
    if (!isMulti) {
      this.selectedKeys.clear();
      this.selectedItemsMap.clear();
    }
    this.selectedKeys.add(key);
    this.selectedItemsMap.set(key, item);
  }

  public deselect(item: T): void {
    const key = (item as any)[this.valueMember];
    this.selectedKeys.delete(key);
    this.selectedItemsMap.delete(key);
  }

  public toggleSelect(item: T, isMulti: boolean = false): boolean {
    const key = (item as any)[this.valueMember];
    if (this.selectedKeys.has(key)) {
      if (isMulti) {
        this.deselect(item);
        return false;
      }
      return true; // Already selected in single-select
    } else {
      this.select(item, isMulti);
      return true;
    }
  }

  public selectAll(): void {
    for (let i = 0; i < this.filteredItems.length; i++) {
      const item = this.filteredItems[i];
      const key = (item as any)[this.valueMember];
      this.selectedKeys.add(key);
      this.selectedItemsMap.set(key, item);
    }
  }

  public clearSelection(): void {
    this.selectedKeys.clear();
    this.selectedItemsMap.clear();
  }

  public getSelectedItems(): T[] {
    return Array.from(this.selectedItemsMap.values());
  }

  public getFirstMatch(query: string, displayMember: string): { item: T; index: number } | null {
    if (!query) return null;
    const q = query.toLowerCase();
    for (let i = 0; i < this.filteredItems.length; i++) {
      const item = this.filteredItems[i];
      const val = String((item as any)[displayMember] || '').toLowerCase();
      if (val.startsWith(q)) {
        return { item, index: i };
      }
    }
    return null;
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.events.onLoadingChanged(loading);
  }

  public getLoading(): boolean {
    return this.isLoading;
  }
}
