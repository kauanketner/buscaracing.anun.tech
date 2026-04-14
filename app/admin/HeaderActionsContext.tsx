'use client';

import { createContext, useContext, useEffect } from 'react';

export type HeaderActionsContextValue = {
  setActions: (node: React.ReactNode) => void;
};

export const HeaderActionsContext = createContext<HeaderActionsContextValue | null>(null);

export function useHeaderActions(node: React.ReactNode, deps: React.DependencyList) {
  const ctx = useContext(HeaderActionsContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setActions(node);
    return () => ctx.setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
