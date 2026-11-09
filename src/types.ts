export type SortDirection = 'asc' | 'desc' | 'none';

export type SelectionMode = 'single' | 'multiple';

export interface ColumnDefinition<T = any> {
  field: string;
  title: string;
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any, row: T, index: number) => string | HTMLElement;
  visible?: boolean;
}

export interface AsyncFetchParams {
  query: string;
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AsyncFetchResult<T = any> {
  items: T[];
  totalCount: number;
}

export type AsyncFetchCallback<T = any> = (
  params: AsyncFetchParams
) => Promise<AsyncFetchResult<T>>;

export interface BeforeSelectDetail<T = any> {
  currentRow: T | null;
  rowToSelect: T;
  currentValue: any;
  newValue: any;
  isCancelled: boolean;
  cancel: () => void;
}

export interface AfterSelectDetail<T = any> {
  selectedRow: T;
  value: any;
}

export interface ChangeDetail<T = any> {
  value: any;
  selectedRows: T[];
}

export interface OmniComboOptions<T = any> {
  columns: ColumnDefinition<T>[];
  dataSource?: T[];
  onFetchData?: AsyncFetchCallback<T>;
  displayMember: string;
  valueMember: string;
  selectionMode?: SelectionMode;
  autocomplete?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  resizable?: boolean;
  rowHeight?: number;
  visibleRowsCount?: number;
  placeholder?: string;
  disabled?: boolean;
  debounceMs?: number;
  showClearButton?: boolean;
  emptyText?: string;
  loadingText?: string;
}

