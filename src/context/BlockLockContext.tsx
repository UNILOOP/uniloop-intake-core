import type React from "react";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { BlockData, BlockDefinition } from "../types";
import { isBlockLocked, isBlockPathLocked } from "../utils/blockLock";

interface BlockLockContextValue {
  /** Whether the block being edited is locked. */
  locked: boolean;
  /** Whether the lock fixes every setting, because its definition has no `lockAccess`. */
  fullyLocked: boolean;
  /**
   * Whether the lock fixes a setting, by a path in the form `lockAccess.locked`
   * uses: `'fieldName'`, `'options[].value'`, or `'options'` for adding,
   * removing or reordering options.
   */
  isLocked: (path: string) => boolean;
}

const BlockLockContext = createContext<BlockLockContextValue>({
  locked: false,
  fullyLocked: false,
  isLocked: () => false,
});

/**
 * The lock state of the block whose settings are open in the builder. A
 * block's `renderFormFields` can use it to disable the inputs its lock fixes;
 * the builder refuses those changes either way. Outside block settings, such
 * as in a block's `renderItem` preview, it reports an unlocked block.
 */
export const useBlockLock = () => useContext(BlockLockContext);

export const BlockLockProvider: React.FC<{
  block: BlockData;
  definition: BlockDefinition | undefined;
  children: ReactNode;
}> = ({ block, definition, children }) => {
  const value = useMemo(() => {
    const locked = isBlockLocked(block);
    return {
      locked,
      fullyLocked: locked && !definition?.lockAccess,
      isLocked: (path: string) => isBlockPathLocked(block, definition, path),
    };
  }, [block, definition]);
  return <BlockLockContext.Provider value={value}>{children}</BlockLockContext.Provider>;
};
