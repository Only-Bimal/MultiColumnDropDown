import { OmniCombo } from './OmniCombo';
import { OmniComboOptions } from './types';

// Auto-register Custom Element in browser environments
if (typeof customElements !== 'undefined' && !customElements.get(OmniCombo.TAG_NAME)) {
  customElements.define(OmniCombo.TAG_NAME, OmniCombo);
}

// Factory function for concise instantiation
export function omniCombo<T = any>(
  target: string | HTMLElement,
  options?: OmniComboOptions<T>
): OmniCombo<T> {
  return OmniCombo.mount<T>(target, options);
}

// Global window attachment for ASPX / Vanilla <script> tags
if (typeof window !== 'undefined') {
  (window as any).OmniCombo = OmniCombo;
  (window as any).omniCombo = omniCombo;
}

export * from './types';
export { OmniCombo };
export default OmniCombo;

