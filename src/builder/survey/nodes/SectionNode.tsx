import type React from "react";
import { useState, Suspense, lazy, useRef, Fragment } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import { v4 as uuidv4 } from "uuid";
import { useSurveyBuilder } from "../../../context/SurveyBuilderContext";
import { NodeData, BlockData } from "../../../types";
import { containsLockedBlock } from "../../../utils/blockLock";
import {
  Root as Sortable,
  Content as SortableContent,
  Item as SortableItem,
  ItemHandle as SortableItemHandle,
} from "../../../components/ui/sortable";
import { arrayMove } from "@dnd-kit/sortable";
import { GripVertical, Plus } from "lucide-react";
import { ContentBlockItem } from "../blocks/ContentBlockItem";

// Lazy load ContentBlockPage - only used in tabs for paged mode
const ContentBlockPage = lazy(() => import("../blocks/ContentBlockPage").then(m => ({ default: m.ContentBlockPage })));

interface SectionNodeProps {
  data: NodeData;
  onUpdate: (data: NodeData) => void;
  onRemove: () => void;
}

export const SectionNode: React.FC<SectionNodeProps> = ({
  data,
  onUpdate,
  onRemove,
}) => {
  const { createNode, state } = useSurveyBuilder();
  const [collapsed, setCollapsed] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Determine if we're in pageless mode
  const isPagelessMode = state.mode === 'pageless';
  const hasLockedBlock = containsLockedBlock(data);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...data,
      name: e.target.value,
    });
  };

  const handleScriptChange = (
    type: "entryLogic" | "exitLogic" | "navigationLogic" | "backLogic",
    value: string
  ) => {
    onUpdate({
      ...data,
      [type]: value,
    });
  };

  // === Paged mode handlers ===
  const handleAddPage = () => {
    // Add a new page (content block) to the section
    onUpdate({
      ...data,
      items: [
        ...(data.items || []),
        {
          type: "set",
          name: `Page ${(data.items?.length || 0) + 1}`,
          uuid: uuidv4(),
          items: [],
        },
      ],
    });
  };

  const handleUpdatePage = (index: number, pageData: any) => {
    const newItems = [...(data.items || [])];
    newItems[index] = pageData;
    onUpdate({
      ...data,
      items: newItems,
    });
  };

  const handleRemovePage = (index: number) => {
    if (containsLockedBlock(data.items?.[index])) return;
    const newItems = [...(data.items || [])];
    newItems.splice(index, 1);
    onUpdate({
      ...data,
      items: newItems,
    });
  };

  const handlePageMove = (
    activeIndex: number,
    overIndex: number,
  ) => {
    if (activeIndex === overIndex) return;
    const newItems = arrayMove(data.items || [], activeIndex, overIndex);
    onUpdate({
      ...data,
      items: newItems,
    });
  };

  // === Pageless mode handlers (blocks directly in section) ===
  const handleAddBlockItem = (blockType: string, insertAtIndex?: number) => {
    if (state.enableDebug) {
      console.log('Adding block:', blockType, 'at index:', insertAtIndex);
    }
    const blockDefinition = state.definitions.blocks[blockType];
    if (!blockDefinition) return;

    // Use generateDefaultData function if available, otherwise fall back to defaultData
    const blockData = blockDefinition.generateDefaultData
      ? blockDefinition.generateDefaultData()
      : blockDefinition.defaultData;

    const newBlock = {
      ...blockData,
      uuid: uuidv4(),
    };

    const currentItems = data.items || [];
    let newItems: BlockData[];

    if (insertAtIndex !== undefined && insertAtIndex >= 0) {
      // Insert at specific position
      newItems = [
        ...currentItems.slice(0, insertAtIndex),
        newBlock,
        ...currentItems.slice(insertAtIndex),
      ];
    } else {
      // Append to end
      newItems = [...currentItems, newBlock];
    }

    onUpdate({
      ...data,
      items: newItems,
    });
  };

  const handleBlockUpdate = (index: number, blockData: BlockData) => {
    const newItems = [...(data.items || [])];
    newItems[index] = blockData;
    onUpdate({
      ...data,
      items: newItems,
    });
  };

  const handleBlockRemove = (index: number) => {
    const newItems = [...(data.items || [])];
    newItems.splice(index, 1);
    onUpdate({
      ...data,
      items: newItems,
    });
  };

  const handleBlockMove = (
    activeIndex: number,
    overIndex: number,
  ) => {
    if (activeIndex === overIndex) return;
    const newItems = arrayMove(data.items || [], activeIndex, overIndex);
    onUpdate({
      ...data,
      items: newItems,
    });
  };

  // === Common handlers ===
  const handleAddChildSection = () => {
    if (data.uuid) {
      createNode(data.uuid, "section");
    }
  };

  // Render the block sidebar (for pageless mode)
  const renderBlockSidebar = () => {
    // Separate blocks into default and custom
    const defaultBlocks = Object.entries(state.definitions.blocks).filter(
      ([_, definition]) => {
        const defaultData = definition.generateDefaultData
          ? definition.generateDefaultData()
          : definition.defaultData;
        return !defaultData?.isCustom;
      }
    );

    const customBlocks = Object.entries(state.definitions.blocks).filter(
      ([_, definition]) => {
        const defaultData = definition.generateDefaultData
          ? definition.generateDefaultData()
          : definition.defaultData;
        return defaultData?.isCustom === true;
      }
    );

    const hasCustomBlocks = customBlocks.length > 0;

    // Render function for block buttons
    const renderBlockButton = ([type, definition]: [string, any]) => (
      <Button
        type="button"
        key={type}
        variant="outline"
        size="sm"
        onClick={() => handleAddBlockItem(type)}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-block-type", type);
        }}
        className="justify-start w-full text-xs"
      >
        {definition.icon && <span className="mr-1.5">{definition.icon}</span>}
        <span className="truncate">{definition.name}</span>
      </Button>
    );

    return (
      <div className="w-56 flex-shrink-0 rounded-xl border-1 bg-muted/30 p-3 overflow-y-auto max-h-[70vh] sticky top-0">
        <h4 className="text-sm font-semibold mb-3">Add Block</h4>

        {hasCustomBlocks ? (
          <Tabs defaultValue="default" className="w-full">
            <TabsList className="w-full mb-2">
              <TabsTrigger value="default" className="text-xs flex-1">Default</TabsTrigger>
              <TabsTrigger value="custom" className="text-xs flex-1">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="default" className="mt-0">
              <div className="flex flex-col gap-1.5">
                {defaultBlocks.map(renderBlockButton)}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="mt-0">
              <div className="flex flex-col gap-1.5">
                {customBlocks.map(renderBlockButton)}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-col gap-1.5">
            {defaultBlocks.map(renderBlockButton)}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-3">
          Click to add or drag blocks to the form
        </p>
      </div>
    );
  };

  // Drop zone component for inserting blocks at specific positions
  const DropZone: React.FC<{ index: number; isActive: boolean }> = ({ index, isActive }) => (
    <div
      className={`
        transition-all duration-200 ease-in-out
        ${isActive
          ? 'h-16 border-2 border-dashed border-primary bg-primary/10 rounded-lg flex items-center justify-center'
          : 'h-2 hover:h-8 hover:border-2 hover:border-dashed hover:border-muted-foreground/50 hover:bg-muted/50 hover:rounded-lg'
        }
      `}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-block-type")) {
          e.preventDefault();
          e.stopPropagation();
          setDragOverIndex(index);
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        // Only clear if we're leaving to outside the drop zone
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragOverIndex(null);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const type = e.dataTransfer.getData("application/x-block-type");
        if (type) {
          handleAddBlockItem(type, index);
        }
        setDragOverIndex(null);
      }}
    >
      {isActive && (
        <span className="text-xs text-primary font-medium flex items-center gap-1">
          <Plus className="h-3 w-3" />
          Drop here to insert
        </span>
      )}
    </div>
  );

  // Render blocks list (for pageless mode - just the blocks, no add section)
  const renderBlocksList = () => {
    const items = (data.items || []) as BlockData[];

    return (
      <div
        className="flex-1 min-w-0"
        onDragLeave={(e) => {
          // Clear drag index when leaving the entire list
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverIndex(null);
          }
        }}
      >
        <Sortable<BlockData>
          value={items}
          onMove={({ activeIndex, overIndex }) =>
            handleBlockMove(activeIndex, overIndex)
          }
          getItemValue={(item) => item.uuid as string}
        >
          <SortableContent className="space-y-1">
            {/* Initial drop zone at the top */}
            <DropZone index={0} isActive={dragOverIndex === 0} />

            {items.map((block, index) => (
              <Fragment key={block.uuid || index}>
                <SortableItem value={block.uuid as string}>
                  <div className="relative">
                    <SortableItemHandle className="absolute -left-5 top-2 cursor-grab text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                    </SortableItemHandle>
                    <ContentBlockItem
                      data={block}
                      onUpdate={(updatedBlock) =>
                        handleBlockUpdate(index, updatedBlock)
                      }
                      onRemove={() => handleBlockRemove(index)}
                    />
                  </div>
                </SortableItem>
                {/* Drop zone after each block */}
                <DropZone index={index + 1} isActive={dragOverIndex === index + 1} />
              </Fragment>
            ))}
          </SortableContent>
        </Sortable>

        {/* Empty state */}
        {items.length === 0 && (
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center"
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("application/x-block-type")) {
                e.preventDefault();
                setDragOverIndex(0);
              }
            }}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => {
              const type = e.dataTransfer.getData("application/x-block-type");
              if (type) {
                handleAddBlockItem(type, 0);
              }
              setDragOverIndex(null);
            }}
          >
            <p className="text-muted-foreground">
              No blocks yet. Click or drag blocks from the sidebar to add them.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render blocks content with sidebar (for pageless mode)
  const renderBlocksContent = () => (
    <div className="flex gap-4">
      {/* Main blocks list */}
      {renderBlocksList()}

      {/* Sidebar with block types */}
      {renderBlockSidebar()}
    </div>
  );

  // Render pages (for paged mode)
  const renderPagesContent = () => (
    <div className="space-y-4">
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading pages...</div>}>
        <Sortable<NodeData>
          value={data.items || []}
          onMove={({ activeIndex, overIndex }) =>
            handlePageMove(activeIndex, overIndex)
          }
          getItemValue={(item) => item.uuid as string}
        >
          <SortableContent className="space-y-4">
            {(data.items || []).map((page, index) => (
              <SortableItem key={page.uuid || index} value={page.uuid as string}>
                <div className="relative">
                  <SortableItemHandle className="absolute -left-5 top-2 cursor-grab text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </SortableItemHandle>
                  <ContentBlockPage
                    key={page.uuid || index}
                    data={page}
                    onUpdate={(updatedPage) => handleUpdatePage(index, updatedPage)}
                    onRemove={() => handleRemovePage(index)}
                  />
                </div>
              </SortableItem>
            ))}
          </SortableContent>
        </Sortable>
      </Suspense>
      <Button type="button" onClick={handleAddPage}>Add Page</Button>
    </div>
  );

  return (
    <Card className="mb-4 section-node">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div className="w-full sm:w-auto">
          <Input
            value={data.name || ""}
            onChange={handleNameChange}
            placeholder="Section Name"
            className="w-[300px]"
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? "Expand" : "Collapse"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onRemove}
            disabled={hasLockedBlock}
            title={hasLockedBlock ? "This section has a locked block" : undefined}
          >
            Remove
          </Button>
        </div>
      </CardHeader>      {!collapsed && (
        <CardContent>
          <Tabs defaultValue={isPagelessMode ? "blocks" : "pages"}>
            <TabsList className="mb-4">
              {isPagelessMode ? (
                <TabsTrigger value="blocks">Blocks</TabsTrigger>
              ) : (
                <TabsTrigger value="pages">Pages</TabsTrigger>
              )}
              <TabsTrigger value="scripts">Scripts</TabsTrigger>
              {!isPagelessMode && (
                <TabsTrigger value="children">Child Nodes</TabsTrigger>
              )}
            </TabsList>

            {/* Pageless mode: show blocks directly */}
            {isPagelessMode && (
              <TabsContent value="blocks">
                {renderBlocksContent()}
              </TabsContent>
            )}

            {/* Paged mode: show pages */}
            {!isPagelessMode && (
              <TabsContent value="pages">
                {renderPagesContent()}
              </TabsContent>
            )}

            <TabsContent value="scripts">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="entryLogic">On Entry Script</Label>
                  <Textarea
                    id="entryLogic"
                    value={data.entryLogic || ""}
                    onChange={(e) => handleScriptChange("entryLogic", e.target.value)}
                    placeholder="(formData, pageData, renderer, navigation) => { /* Initialize section */ }"
                    className="font-mono text-sm h-24"
                  />
                </div>

                <div>
                  <Label htmlFor="exitLogic">On Exit Script</Label>
                  <Textarea
                    id="exitLogic"
                    value={data.exitLogic || ""}
                    onChange={(e) => handleScriptChange("exitLogic", e.target.value)}
                    placeholder="(formData, pageData, renderer, navigation) => { /* Cleanup section */ }"
                    className="font-mono text-sm h-24"
                  />
                </div>

                <div>
                  <Label htmlFor="backLogic">On Back Navigation Script</Label>
                  <Textarea
                    id="backLogic"
                    value={data.backLogic || ""}
                    onChange={(e) => handleScriptChange("backLogic", e.target.value)}
                    placeholder="(formData, pageData, renderer, stack) => { /* Handle back navigation logic */ }"
                    className="font-mono text-sm h-24"
                  />
                </div>

                <div>
                  <Label htmlFor="navigationLogic">Navigation Script</Label>
                  <Textarea
                    id="navigationLogic"
                    value={data.navigationLogic || ""}
                    onChange={(e) => handleScriptChange("navigationLogic", e.target.value)}
                    placeholder="(formData, pageData, renderer) => { return 0; }"
                    className="font-mono text-sm h-24"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Child nodes tab - only in paged mode */}
            {!isPagelessMode && (
              <TabsContent value="children">
                <div className="space-y-4">
                  {(data.nodes || []).map((nodeRef, index) => {
                    // Display child node references here
                    return (
                      <div key={typeof nodeRef === "string" ? nodeRef : nodeRef.uuid || index} className="p-2 border rounded-md">
                        {typeof nodeRef === "string"
                          ? `Child Node Reference: ${nodeRef}`
                          : `Child Node: ${nodeRef.name || 'Unnamed Node'}`}
                      </div>
                    );
                  })}

                  <Button type="button" onClick={handleAddChildSection}>Add Child Section</Button>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      )}

      <CardFooter className="bg-muted/50 flex justify-end">
        <div className="text-xs text-muted-foreground">
          {data.uuid ? `ID: ${data.uuid}` : "New Section"}
        </div>
      </CardFooter>
    </Card>
  );
};
