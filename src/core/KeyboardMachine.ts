export interface KeyboardMachineCallbacks {
  isOpen: () => boolean;
  open: () => void;
  close: (commit?: boolean) => void;
  getActiveIndex: () => number;
  setActiveIndex: (index: number, scrollIntoView?: boolean) => void;
  getTotalCount: () => number;
  getVisibleRowCount: () => number;
  commitSelection: () => void;
  toggleActiveCheckbox: () => void;
  revertValue: () => void;
  isMultiSelect: () => boolean;
}

export class KeyboardMachine {
  private callbacks: KeyboardMachineCallbacks;

  constructor(callbacks: KeyboardMachineCallbacks) {
    this.callbacks = callbacks;
  }

  public handleKeyDown(e: KeyboardEvent): boolean {
    const { key, altKey } = e;
    const isOpen = this.callbacks.isOpen();
    const count = this.callbacks.getTotalCount();
    const currentIndex = this.callbacks.getActiveIndex();
    const pageSize = this.callbacks.getVisibleRowCount();

    // 1. F4: Toggle Dropdown
    if (key === 'F4') {
      e.preventDefault();
      if (isOpen) {
        this.callbacks.close(true);
      } else {
        this.callbacks.open();
      }
      return true;
    }

    // 2. Alt + Down: Open Dropdown
    if (altKey && key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) this.callbacks.open();
      return true;
    }

    // 3. Alt + Up: Close Dropdown
    if (altKey && key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) this.callbacks.close(true);
      return true;
    }

    // If dropdown is NOT open, ArrowDown opens it
    if (!isOpen) {
      if (key === 'ArrowDown') {
        e.preventDefault();
        this.callbacks.open();
        return true;
      }
      return false;
    }

    // Dropdown IS open:
    switch (key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextIndex = Math.min(count - 1, currentIndex + 1);
        this.callbacks.setActiveIndex(nextIndex, true);
        return true;
      }

      case 'ArrowUp': {
        e.preventDefault();
        const prevIndex = Math.max(0, currentIndex - 1);
        this.callbacks.setActiveIndex(prevIndex, true);
        return true;
      }

      case 'PageDown': {
        e.preventDefault();
        const nextIndex = Math.min(count - 1, currentIndex + pageSize);
        this.callbacks.setActiveIndex(nextIndex, true);
        return true;
      }

      case 'PageUp': {
        e.preventDefault();
        const prevIndex = Math.max(0, currentIndex - pageSize);
        this.callbacks.setActiveIndex(prevIndex, true);
        return true;
      }

      case 'Home': {
        e.preventDefault();
        this.callbacks.setActiveIndex(0, true);
        return true;
      }

      case 'End': {
        e.preventDefault();
        this.callbacks.setActiveIndex(Math.max(0, count - 1), true);
        return true;
      }

      case 'Enter': {
        e.preventDefault();
        this.callbacks.commitSelection();
        this.callbacks.close(true);
        return true;
      }

      case 'Escape': {
        e.preventDefault();
        this.callbacks.revertValue();
        this.callbacks.close(false);
        return true;
      }

      case 'Tab': {
        // Tab commits current selection, closes dropdown, and allows normal tab navigation
        this.callbacks.commitSelection();
        this.callbacks.close(true);
        return false; // don't prevent default so focus advances
      }

      case ' ': {
        // Space toggles checkbox if in multi-select mode
        if (this.callbacks.isMultiSelect()) {
          e.preventDefault();
          this.callbacks.toggleActiveCheckbox();
          return true;
        }
        return false;
      }

      default:
        return false;
    }
  }

  /**
   * Win32 Inline Auto-Complete helper
   */
  public applyAutocomplete(
    input: HTMLInputElement,
    fullText: string,
    typedPrefix: string
  ): void {
    if (!fullText.toLowerCase().startsWith(typedPrefix.toLowerCase())) return;

    input.value = typedPrefix + fullText.slice(typedPrefix.length);
    input.setSelectionRange(typedPrefix.length, input.value.length);
  }
}

