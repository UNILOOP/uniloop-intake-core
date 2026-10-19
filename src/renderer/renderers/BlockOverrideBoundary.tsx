import React from 'react';
import type { JSX } from 'react';

interface RenderWithProps<P> {
  render: (props: P) => JSX.Element | null;
  props: P;
}

/**
 * Calls a block renderer inside its own component, so the hooks it calls
 * belong to a stable component and a boundary above it can catch its errors.
 */
export function RenderWith<P>({ render, props }: RenderWithProps<P>) {
  return render(props);
}

interface BlockOverrideBoundaryProps {
  systemType: string;
  overrideType: string;
  /** What to render if the override throws: the system block's renderer, or nothing. */
  fallback: React.ReactNode;
  children?: React.ReactNode;
}

interface BlockOverrideBoundaryState {
  failed: boolean;
}

// Overrides that have thrown while rendering, as "systemType->overrideType".
const failedOverrides = new Set<string>();
const failureListeners = new Set<() => void>();
let failureVersion = 0;

const pairKey = (systemType: string, overrideType: string) => `${systemType}->${overrideType}`;

function notifyFailureListeners() {
  failureVersion++;
  for (const listener of failureListeners) listener();
}

function subscribeToFailures(listener: () => void): () => void {
  failureListeners.add(listener);
  return () => {
    failureListeners.delete(listener);
  };
}

const getFailureVersion = () => failureVersion;

/**
 * Re-renders the calling component when an override fails or is registered
 * again, so it looks up the block definition afresh.
 */
export function useBlockOverrideFailures(): number {
  return React.useSyncExternalStore(subscribeToFailures, getFailureVersion, getFailureVersion);
}

/** Whether the override for `systemType` has thrown while rendering. */
export function hasBlockOverrideFailed(systemType: string, overrideType: string): boolean {
  return failedOverrides.has(pairKey(systemType, overrideType));
}

/** Forgets the failures of `overrideType`, so a re-registered block is tried again. */
export function clearBlockOverrideFailures(overrideType: string): void {
  let cleared = false;
  for (const key of failedOverrides) {
    if (key.endsWith(`->${overrideType}`)) {
      failedOverrides.delete(key);
      cleared = true;
    }
  }
  if (cleared) notifyFailureListeners();
}

/**
 * Renders a block override, and the system block it replaces if the override
 * throws while rendering, so a broken override never leaves an empty step.
 * Once an override has thrown, every block it replaces shows the system block,
 * matching the system validation the resolver then returns.
 */
export class BlockOverrideBoundary extends React.Component<
  BlockOverrideBoundaryProps,
  BlockOverrideBoundaryState
> {
  state: BlockOverrideBoundaryState = {
    failed: hasBlockOverrideFailed(this.props.systemType, this.props.overrideType),
  };

  private unsubscribe?: () => void;

  static getDerivedStateFromError(): BlockOverrideBoundaryState {
    return { failed: true };
  }

  private showSystemBlockIfFailed = () => {
    if (!this.state.failed && hasBlockOverrideFailed(this.props.systemType, this.props.overrideType)) {
      this.setState({ failed: true });
    }
  };

  componentDidMount() {
    this.unsubscribe = subscribeToFailures(this.showSystemBlockIfFailed);
    this.showSystemBlockIfFailed();
  }

  componentWillUnmount() {
    this.unsubscribe?.();
  }

  componentDidCatch(error: unknown) {
    const { systemType, overrideType } = this.props;
    const key = pairKey(systemType, overrideType);
    if (failedOverrides.has(key)) return;
    failedOverrides.add(key);
    console.error(
      `[blockOverrides] "${overrideType}" failed to render in place of "${systemType}", so the system block is shown instead.`,
      error
    );
    notifyFailureListeners();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
