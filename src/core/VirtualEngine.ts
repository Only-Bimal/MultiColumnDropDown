export interface VirtualRange {
  startIndex: number;
  endIndex: number;
  offsetY: number;
}

export type RangeChangeCallback = (range: VirtualRange) => void;

export class VirtualEngine {
  private viewport: HTMLElement;
  private phantom: HTMLElement;
  private table: HTMLElement;
  private rowHeight: number;
  private bufferCount: number;
  private totalCount: number = 0;
  private onRangeChange: RangeChangeCallback;
  private rafId: number | null = null;
  private currentRange: VirtualRange = { startIndex: 0, endIndex: 0, offsetY: 0 };

  constructor(
    viewport: HTMLElement,
    phantom: HTMLElement,
    table: HTMLElement,
    rowHeight: number,
    onRangeChange: RangeChangeCallback,
    bufferCount: number = 2
  ) {
    this.viewport = viewport;
    this.phantom = phantom;
    this.table = table;
    this.rowHeight = rowHeight;
    this.bufferCount = bufferCount;
    this.onRangeChange = onRangeChange;

    this.onScroll = this.onScroll.bind(this);
    this.viewport.addEventListener('scroll', this.onScroll, { passive: true });
  }

  public setRowHeight(height: number): void {
    this.rowHeight = height;
    this.update();
  }

  public setTotalCount(count: number): void {
    this.totalCount = count;
    this.phantom.style.height = `${count * this.rowHeight}px`;
    this.update();
  }

  public getTotalCount(): number {
    return this.totalCount;
  }

  public getVisibleRowCount(): number {
    const viewportHeight = this.viewport.clientHeight || 260;
    return Math.max(1, Math.floor(viewportHeight / this.rowHeight));
  }

  public getCurrentRange(): VirtualRange {
    return this.currentRange;
  }

  private onScroll(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.calculateRange();
    });
  }

  public update(): void {
    this.calculateRange();
  }

  private calculateRange(): void {
    if (this.totalCount === 0) {
      this.currentRange = { startIndex: 0, endIndex: 0, offsetY: 0 };
      this.table.style.transform = 'translateY(0px)';
      this.onRangeChange(this.currentRange);
      return;
    }

    const scrollTop = this.viewport.scrollTop;
    const viewportHeight = this.viewport.clientHeight || (this.rowHeight * 10);

    const startIndex = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.bufferCount);
    const endIndex = Math.min(
      this.totalCount,
      Math.ceil((scrollTop + viewportHeight) / this.rowHeight) + this.bufferCount
    );

    const offsetY = startIndex * this.rowHeight;

    if (
      startIndex !== this.currentRange.startIndex ||
      endIndex !== this.currentRange.endIndex ||
      offsetY !== this.currentRange.offsetY
    ) {
      this.currentRange = { startIndex, endIndex, offsetY };
      this.table.style.transform = `translateY(${offsetY}px)`;
      this.onRangeChange(this.currentRange);
    }
  }

  public scrollToIndex(index: number): void {
    if (index < 0 || index >= this.totalCount) return;

    const rowTop = index * this.rowHeight;
    const rowBottom = rowTop + this.rowHeight;
    const currentScrollTop = this.viewport.scrollTop;
    const viewportHeight = this.viewport.clientHeight || (this.rowHeight * 10);

    if (rowTop < currentScrollTop) {
      this.viewport.scrollTop = rowTop;
    } else if (rowBottom > currentScrollTop + viewportHeight) {
      this.viewport.scrollTop = rowBottom - viewportHeight;
    }
    this.calculateRange();
  }

  public resetScroll(): void {
    this.viewport.scrollTop = 0;
    this.calculateRange();
  }

  public destroy(): void {
    this.viewport.removeEventListener('scroll', this.onScroll);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

