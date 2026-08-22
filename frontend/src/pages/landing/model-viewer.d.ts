import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/**
 * <model-viewer> is a web component loaded from a CDN in index.html, so TypeScript needs
 * an explicit intrinsic-element declaration. Attributes are kebab-case per the custom
 * element's API and are therefore typed loosely.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> &
        Record<string, unknown>;
    }
  }
}

export {};
