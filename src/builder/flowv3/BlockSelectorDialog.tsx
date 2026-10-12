import React, { useMemo, useCallback, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { useSurveyBuilder } from "../../context/SurveyBuilderContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { CircleDot } from "lucide-react";

interface BlockSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (blockType: string) => void;
  /** Limits the list to these block types. Lists every block when omitted. */
  blockTypes?: string[];
  title?: string;
  /** Shown above the list */
  description?: React.ReactNode;
}

// Memoized block item component to prevent re-renders
const BlockItem = memo(({ type, definition, onSelect }: {
  type: string;
  definition: any;
  onSelect: (type: string) => void;
}) => {
  const handleClick = useCallback(() => onSelect(type), [type, onSelect]);

  return (
    <div
      onClick={handleClick}
      className="
        flex items-center gap-3 px-4 py-3
        bg-white dark:bg-slate-800
        border border-slate-200 dark:border-slate-700
        rounded-lg cursor-pointer
        hover:border-primary hover:ring-1 hover:ring-primary/20 hover:shadow-sm
        transition-all duration-150
      "
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
        {definition.icon || <CircleDot className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
          {definition.name}
        </div>
        {definition.description && (
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {definition.description}
          </div>
        )}
      </div>
    </div>
  );
});

BlockItem.displayName = "BlockItem";

const BlockSelectorDialogInner: React.FC<BlockSelectorDialogProps> = ({
  open,
  onOpenChange,
  onSelect,
  blockTypes,
  title = "Select Block Type",
  description,
}) => {
  const { state } = useSurveyBuilder();

  // Memoize block filtering - only recalculate when definitions or the allowed types change
  const { defaultBlocks, customBlocks, hasCustomBlocks } = useMemo(() => {
    const blocks = Object.entries(state.definitions.blocks).filter(
      ([type]) => !blockTypes || blockTypes.includes(type)
    );

    const defaultBlocks = blocks.filter(
      ([_, definition]) => {
        const defaultData = definition.generateDefaultData
          ? definition.generateDefaultData()
          : definition.defaultData;
        return !defaultData?.isCustom;
      }
    );

    const customBlocks = blocks.filter(
      ([_, definition]) => {
        const defaultData = definition.generateDefaultData
          ? definition.generateDefaultData()
          : definition.defaultData;
        return defaultData?.isCustom === true;
      }
    );

    return {
      defaultBlocks,
      customBlocks,
      hasCustomBlocks: customBlocks.length > 0
    };
  }, [state.definitions.blocks, blockTypes]);

  // Stable render function using memoized component
  const renderBlockItem = useCallback(([type, definition]: [string, any]) => (
    <BlockItem key={type} type={type} definition={definition} onSelect={onSelect} />
  ), [onSelect]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {description && (
          <div className="text-sm text-slate-500 dark:text-slate-400">{description}</div>
        )}

        <div className="flex-1 overflow-y-auto p-1">
          {defaultBlocks.length === 0 && !hasCustomBlocks ? (
            <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No blocks to choose from.
            </div>
          ) : hasCustomBlocks ? (
            <Tabs defaultValue={defaultBlocks.length > 0 ? "default" : "custom"} className="w-full">
              <TabsList className="w-full mb-4 grid grid-cols-2">
                <TabsTrigger value="default">Standard Blocks</TabsTrigger>
                <TabsTrigger value="custom">Custom Blocks</TabsTrigger>
              </TabsList>

              <TabsContent value="default" className="mt-0">
                <div className="grid grid-cols-2 gap-3">
                  {defaultBlocks.map(renderBlockItem)}
                </div>
              </TabsContent>

              <TabsContent value="custom" className="mt-0">
                 <div className="grid grid-cols-2 gap-3">
                  {customBlocks.map(renderBlockItem)}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {defaultBlocks.map(renderBlockItem)}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Export memoized component to prevent re-renders when parent state changes
export const BlockSelectorDialog = memo(BlockSelectorDialogInner);
