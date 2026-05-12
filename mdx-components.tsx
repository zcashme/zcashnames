// Nextra MDX component override hook. Merges the docs theme's
// built-in components with any page-level overrides, so custom
// MDX elements propagate through the entire docs section.
import { useMDXComponents as getDocsMDXComponents } from "nextra-theme-docs";

const docsComponents = getDocsMDXComponents();

export function useMDXComponents(components?: Record<string, React.ComponentType>) {
  return {
    ...docsComponents,
    ...components,
  };
}
