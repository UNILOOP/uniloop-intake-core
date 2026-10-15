import type React from "react";
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../../components/ui/tabs";
import {
  Root as Sortable,
  Content as SortableContent,
  Item as SortableItem,
  ItemHandle as SortableItemHandle,
} from "../../../components/ui/sortable";
import { arrayMove } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { ContentBlockItem } from "./ContentBlockItem";
import { v4 as uuidv4 } from "uuid";
import { useSurveyBuilder } from "../../../context/SurveyBuilderContext";
import { BlockData } from "../../../types";
import { containsLockedBlock } from "../../../utils/blockLock";

interface ContentBlockPageProps {
  data: BlockData;
  onUpdate: (data: BlockData) => void;
  onRemove: () => void;
}

export const ContentBlockPage: React.FC<ContentBlockPageProps> = ({
  data,
  onUpdate,
  onRemove,
}) => {
  const { state } = useSurveyBuilder();
  const [collapsed, setCollapsed] = useState(false);
  const hasLockedBlock = containsLockedBlock(data);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...data,
      name: e.target.value,
    });
  };

  const handleAddBlockItem = (blockType: string) => {
    if (state.enableDebug) {
      console.log(blockType);
    }
    const blockDefinition = state.definitions.blocks[blockType];
    if (!blockDefinition) return;

    // Use generateDefaultData function if available, otherwise fall back to defaultData
    const blockData = blockDefinition.generateDefaultData 
      ? blockDefinition.generateDefaultData()
      : blockDefinition.defaultData;

    onUpdate({
      ...data,
      items: [
        ...(data.items || []),
        {
          ...blockData,
          uuid: uuidv4(),
        },
      ],
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

  return (
    <Card className="mb-4 content-block-page">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2">
        {/* Name field */}
        <div className="w-full sm:w-auto">
          <Input
            value={data.name || ""}
            onChange={handleNameChange}
            placeholder="Page Name"
            className="w-full sm:w-[300px]"
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="grow sm:grow-0"
          >
            {collapsed ? "Expand" : "Collapse"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            disabled={hasLockedBlock}
            title={hasLockedBlock ? "This page has a locked block" : undefined}
            className="grow sm:grow-0"
          >
            Remove
          </Button>
        </div>
      </CardHeader>


      {!collapsed && (
        <CardContent>
          <div className="space-y-4">
            {/* Render the content block items */}
            <Sortable<BlockData>
              value={data.items || []}
              onMove={({ activeIndex, overIndex }) =>
                handleBlockMove(activeIndex, overIndex)
              }
              getItemValue={(item) => item.uuid as string}
            >
              <SortableContent
                className="space-y-4"
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes("application/x-block-type")) {
                    e.preventDefault();
                  }
                }}
                onDrop={(e) => {
                  const type = e.dataTransfer.getData("application/x-block-type");
                  if (type) {
                    handleAddBlockItem(type);
                  }
                }}
              >
                {(data.items || []).map((block, index) => (
                  <SortableItem key={block.uuid || index} value={block.uuid as string}>
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
                ))}
              </SortableContent>
            </Sortable>
            {/* Menu to add new blocks */}
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Add Item</h4>
              {(() => {
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
                    className="justify-start"
                  >
                    {definition.icon && <span className="mr-2">{definition.icon}</span>}
                    <span className="truncate">{definition.name}</span>
                  </Button>
                );

                // If no custom blocks, just show default blocks without tabs
                if (!hasCustomBlocks) {
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {defaultBlocks.map(renderBlockButton)}
                    </div>
                  );
                }

                // If custom blocks exist, show tabs
                return (
                  <Tabs defaultValue="default" className="w-full">
                    <TabsList>
                      <TabsTrigger value="default">Default Blocks</TabsTrigger>
                      <TabsTrigger value="custom">Custom Blocks</TabsTrigger>
                    </TabsList>

                    <TabsContent value="default">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {defaultBlocks.map(renderBlockButton)}
                      </div>
                    </TabsContent>

                    <TabsContent value="custom">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {customBlocks.map(renderBlockButton)}
                      </div>
                    </TabsContent>
                  </Tabs>
                );
              })()}
            </div>
          </div>
        </CardContent>
      )}

      <CardFooter className="bg-muted/50 flex justify-between">
        <div className="text-xs text-muted-foreground">
          {`Items: ${data.items?.length || 0}`}
        </div>
        <div className="text-xs text-muted-foreground">
          {data.uuid ? `ID: ${data.uuid}` : "New Page"}
        </div>
      </CardFooter>
    </Card>
  );
};
