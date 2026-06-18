import type React from "react";
import { createContext, useContext, useReducer, type ReactNode } from "react"
import { v4 as uuidv4 } from "uuid";
import {
  type BlockDefinition,
  type GlobalCustomField,
  type LocalizationMap,
  type NodeData,
  type NodeDefinition,
  type SurveyBuilderAction,
  type SurveyBuilderState,
  type ThemeDefinition,
  type UUID,
  type SurveyMode
} from "../types";
import { uniloop as uniTheme } from "../themes";
import { getOutputKeys, isObjectOutput } from "../utils/outputSchema";
import { DEFAULT_LANGUAGE_CODE } from "../utils/languages";

// Custom hook
export const useSurveyBuilder = () => {
  const context = useContext(SurveyBuilderContext);
  if (context === undefined) {
    throw new Error("useSurveyBuilder must be used within a SurveyBuilderProvider");
  }
  return context;
};

// Initial state
const initialState: SurveyBuilderState = {
  rootNode: null,
  definitions: {
    blocks: {},
    nodes: {},
  },
  localizations: {
    [DEFAULT_LANGUAGE_CODE]: {},
  },
  theme: uniTheme,
  selectedNode: null,
  displayMode: "list",
  enableDebug: false,
  customData: undefined,
  mode: 'pageless',
};

// Action types
export const ActionTypes = {
  INIT_SURVEY: "INIT_SURVEY",
  SET_ROOT_NODE: "SET_ROOT_NODE",
  ADD_NODE: "ADD_NODE",
  UPDATE_NODE: "UPDATE_NODE",
  REMOVE_NODE: "REMOVE_NODE",
  ADD_BLOCK_DEFINITION: "ADD_BLOCK_DEFINITION",
  ADD_NODE_DEFINITION: "ADD_NODE_DEFINITION",
  SET_SELECTED_NODE: "SET_SELECTED_NODE",
  SET_DISPLAY_MODE: "SET_DISPLAY_MODE",
  UPDATE_LOCALIZATIONS: "UPDATE_LOCALIZATIONS",
  UPDATE_THEME: "UPDATE_THEME",
  IMPORT_SURVEY: "IMPORT_SURVEY",
  SET_GLOBAL_CUSTOM_FIELDS: "SET_GLOBAL_CUSTOM_FIELDS",
  SET_CUSTOM_DATA: "SET_CUSTOM_DATA",
  SET_MODE: "SET_MODE",
};

// Ensure rootNode always has type: "section" and a uuid when present
const ensureRootNodeDefaults = (rootNode: NodeData | null): NodeData | null => {
  if (!rootNode) return null;
  const patches: Partial<NodeData> = {};
  if (!rootNode.type) patches.type = "section";
  if (!rootNode.uuid) patches.uuid = uuidv4();
  return Object.keys(patches).length > 0 ? { ...rootNode, ...patches } : rootNode;
};

// Reducer
const surveyBuilderReducer = (
  state: SurveyBuilderState,
  action: SurveyBuilderAction
): SurveyBuilderState => {
  switch (action.type) {
    case ActionTypes.INIT_SURVEY:
      return {
        ...state,
        rootNode: ensureRootNodeDefaults(action.payload.rootNode || null),
        localizations: action.payload.localizations || { [DEFAULT_LANGUAGE_CODE]: {} },
        theme: action.payload.theme || uniTheme,
      };
    case ActionTypes.SET_ROOT_NODE:
      return {
        ...state,
        rootNode: ensureRootNodeDefaults(action.payload),
      };

    case ActionTypes.ADD_NODE: {
      if (!state.rootNode) return state;

      const { parentUuid, nodeData } = action.payload;
      const newNode = { ...nodeData, uuid: nodeData.uuid || uuidv4() };

      // Helper function to add node to parent
      const addNodeToParent = (node: NodeData): NodeData => {
        if (node.uuid === parentUuid) {
          return {
            ...node,
            nodes: [...(node.nodes || []), newNode],
          };
        }

        // Check items array (new structure) - items contain BlockData
        if (node.items) {
          const updatedItems = node.items.map((item: any) => {
            if (typeof item === "object" && item.uuid) {
              return addNodeToParent(item);
            }
            return item;
          });
          
          // Check if any item was updated
          if (updatedItems !== node.items) {
            return { ...node, items: updatedItems };
          }
        }

        // Check nodes array (old structure)
        if (node.nodes) {
          const updatedNodes = node.nodes.map((childNode) => {
            if (typeof childNode === "string") return childNode;
            return addNodeToParent(childNode);
          });
          
          // Check if any node was updated
          if (updatedNodes !== node.nodes) {
            return { ...node, nodes: updatedNodes };
          }
        }

        return node;
      };

      return {
        ...state,
        rootNode: addNodeToParent(state.rootNode),
      };
    }

    case ActionTypes.UPDATE_NODE: {
      if (!state.rootNode) return state;

      const { uuid, nodeData } = action.payload;

      // Helper function to update node - now handles both items and nodes arrays
      const updateNode = (node: NodeData): NodeData => {
        if (node.uuid === uuid) {
          return { ...node, ...nodeData, uuid };
        }

        let updated = false;
        const updatedNode = { ...node };

        // Handle items array (new structure) - items are BlockData
        if (node.items) {
          const updatedItems = node.items.map((item: any) => {
            if (typeof item === "object" && item.uuid) {
              const updatedItem = updateNode(item);
              if (updatedItem !== item) {
                updated = true;
              }
              return updatedItem;
            }
            return item;
          });
          
          if (updated) {
            updatedNode.items = updatedItems;
          }
        }

        // Handle nodes array (old structure) - only if items didn't already update
        if (!updated && node.nodes) {
          const updatedNodes = node.nodes.map((childNode) => {
            if (typeof childNode === "string") return childNode;
            const updatedChildNode = updateNode(childNode);
            if (updatedChildNode !== childNode) {
              updated = true;
            }
            return updatedChildNode;
          });
          
          if (updated) {
            updatedNode.nodes = updatedNodes;
          }
        }

        return updated ? updatedNode : node;
      };

      return {
        ...state,
        rootNode: updateNode(state.rootNode),
      };
    }

    case ActionTypes.REMOVE_NODE: {
      if (!state.rootNode) return state;

      const uuid = action.payload;

      // Helper function to remove node - now handles both items and nodes arrays
      const removeNode = (node: NodeData): NodeData | null => {
        if (node.uuid === uuid) {
          return null;
        }

        const updatedNode = { ...node };
        let hasChanges = false;

        // Handle items array (new structure) - items are BlockData
        if (node.items) {
          const updatedItems = node.items
            .map((item: any) => {
              if (typeof item === "object" && item.uuid === uuid) {
                hasChanges = true;
                return null;
              }
              if (typeof item === "object" && item.uuid) {
                const result = removeNode(item);
                if (result !== item) {
                  hasChanges = true;
                }
                return result;
              }
              return item;
            })
            .filter(Boolean);

          if (hasChanges) {
            updatedNode.items = updatedItems;
          }
        }

        // Handle nodes array (old structure)
        if (node.nodes) {
          const updatedNodes = node.nodes
            .map((childNode) => {
              if (typeof childNode === "string") {
                if (childNode === uuid) {
                  hasChanges = true;
                  return null;
                }
                return childNode;
              }
              const result = removeNode(childNode);
              if (result !== childNode) {
                hasChanges = true;
              }
              return result;
            })
            .filter(Boolean) as Array<NodeData | UUID>;

          if (hasChanges) {
            updatedNode.nodes = updatedNodes;
          }
        }

        return hasChanges ? updatedNode : node;
      };

      return {
        ...state,
        rootNode: removeNode(state.rootNode),
      };
    }

    case ActionTypes.ADD_BLOCK_DEFINITION: {
      const { type, definition } = action.payload;
      return {
        ...state,
        definitions: {
          ...state.definitions,
          blocks: {
            ...state.definitions.blocks,
            [type]: definition,
          },
        },
      };
    }

    case ActionTypes.ADD_NODE_DEFINITION: {
      const { type, definition } = action.payload;
      return {
        ...state,
        definitions: {
          ...state.definitions,
          nodes: {
            ...state.definitions.nodes,
            [type]: definition,
          },
        },
      };
    }

    case ActionTypes.SET_SELECTED_NODE:
      return {
        ...state,
        selectedNode: action.payload,
      };

    case ActionTypes.SET_DISPLAY_MODE:
      return {
        ...state,
        displayMode: action.payload,
      };

    case ActionTypes.UPDATE_LOCALIZATIONS:
      return {
        ...state,
        localizations: action.payload,
      };

    case ActionTypes.UPDATE_THEME:
      return {
        ...state,
        theme: action.payload,
      };

    case ActionTypes.IMPORT_SURVEY:
      return {
        ...state,
        rootNode: ensureRootNodeDefaults(action.payload.rootNode || null),
        localizations: action.payload.localizations || { [DEFAULT_LANGUAGE_CODE]: {} },
        theme: action.payload.theme || uniTheme,
      };

    case ActionTypes.SET_GLOBAL_CUSTOM_FIELDS:
      return {
        ...state,
        globalCustomFields: action.payload,
      };

    case ActionTypes.SET_CUSTOM_DATA:
      return {
        ...state,
        customData: action.payload,
      };

    case ActionTypes.SET_MODE:
      return {
        ...state,
        mode: action.payload,
      };

    default:
      return state;
  }
};

// Context
interface SurveyBuilderContextType {
  state: SurveyBuilderState;
  dispatch: React.Dispatch<SurveyBuilderAction>;

  // Helper functions
  addBlockDefinition: (type: string, definition: BlockDefinition) => void;
  addNodeDefinition: (type: string, definition: NodeDefinition) => void;
  initSurvey: () => void;
  createNode: (parentUuid: UUID, type: string, initialData?: Partial<NodeData>) => void;
  updateNode: (uuid: UUID, data: Partial<NodeData>) => void;
  removeNode: (uuid: UUID) => void;
  setSelectedNode: (uuid: UUID | null) => void;
  setDisplayMode: (mode: "list" | "graph" | "flow" | "lang" | "theme") => void;
  updateLocalizations: (localizations: LocalizationMap) => void;
  updateTheme: (theme: ThemeDefinition) => void;
  importSurvey: (data: { rootNode: NodeData; localizations?: LocalizationMap; theme?: ThemeDefinition }) => void;
  exportSurvey: () => { rootNode: NodeData | null; localizations: LocalizationMap; theme: ThemeDefinition };
  setGlobalCustomFields: (customFields: GlobalCustomField[]) => void;
  setCustomData: (customData: any) => void;
  customData: any;
  // Field collection utilities (includes nested fields from output schemas)
  getAvailableFields: (currentBlockId: string) => string[];
  getAvailableFieldsBefore: (currentBlockId: string) => string[];
  getAvailableFieldsUptoCurrent: (currentBlockId: string) => string[];
  getAvailableFieldsExcludingCurrent: (currentBlockId: string) => string[];
}

export const SurveyBuilderContext = createContext<SurveyBuilderContextType | undefined>(
  undefined
);

// Provider
interface SurveyBuilderProviderProps {
  children: ReactNode;
  initialData?: {
    rootNode?: NodeData;
    localizations?: LocalizationMap;
    theme?: ThemeDefinition;
  };
  enableDebug?: boolean;
  customData?: any;
  /**
   * Survey structure mode - determines how the survey data is organized
   * - 'paged': Traditional mode with rootNode -> pages (sets) -> blocks
   * - 'pageless': Simplified mode with rootNode -> blocks directly (no pages)
   * @default 'pageless'
   */
  mode?: SurveyMode;
}

export const SurveyBuilderProvider: React.FC<SurveyBuilderProviderProps> = ({
  children,
  initialData,
  enableDebug = false,
  customData,
  mode = 'pageless',
}) => {
  const [state, dispatch] = useReducer(
    surveyBuilderReducer,
    {
      ...initialState,
      rootNode: ensureRootNodeDefaults(initialData?.rootNode || null),
      localizations: initialData?.localizations || { [DEFAULT_LANGUAGE_CODE]: {} },
      theme: initialData?.theme || uniTheme,
      enableDebug,
      customData,
      mode,
    }
  );

  // Helper functions
  const addBlockDefinition = (type: string, definition: BlockDefinition) => {
    dispatch({
      type: ActionTypes.ADD_BLOCK_DEFINITION,
      payload: { type, definition },
    });
  };

  const addNodeDefinition = (type: string, definition: NodeDefinition) => {
    dispatch({
      type: ActionTypes.ADD_NODE_DEFINITION,
      payload: { type, definition },
    });
  };

  const createId = () => uuidv4();

  const initSurvey = () => {
    // Create root node structure based on mode
    const rootNode = state.mode === 'pageless'
      ? {
          // Pageless mode: blocks directly in rootNode.items (no pages/sets)
          type: "section",
          name: "New Form",
          uuid: createId(),
          items: [], // Blocks go directly here
          navigationLogic: "",
          entryLogic: "",
          exitLogic: "",
          backLogic: ""
        }
      : {
          // Paged mode: traditional structure with pages (sets)
          type: "section",
          name: "New Form",
          uuid: createId(),
          items: [], // Pages (sets) go here
          navigationLogic: "return 0;",
          entryLogic: "",
          exitLogic: "",
          backLogic: ""
        };

    const data = {
      rootNode,
      localizations: {
        [DEFAULT_LANGUAGE_CODE]: {}
      },
      theme: uniTheme
    };
    dispatch({
      type: ActionTypes.INIT_SURVEY,
      payload: data,
    });
  }

  const createNode = (parentUuid: UUID, type: string, initialData: Partial<NodeData> = {}) => {
    const nodeDefinition = state.definitions.nodes[type];

    if (!nodeDefinition) return;

    if (state.enableDebug) {
      console.log(nodeDefinition);
    }

    const nodeData = {
      ...nodeDefinition.defaultData,
      ...initialData,
      type,
    };

    dispatch({
      type: ActionTypes.ADD_NODE,
      payload: { parentUuid, nodeData },
    });
  };

  const updateNode = (uuid: UUID, data: Partial<NodeData>) => {
    dispatch({
      type: ActionTypes.UPDATE_NODE,
      payload: { uuid, nodeData: data },
    });
  };

  const removeNode = (uuid: UUID) => {
    dispatch({
      type: ActionTypes.REMOVE_NODE,
      payload: uuid,
    });
  };

  const setSelectedNode = (uuid: UUID | null) => {
    dispatch({
      type: ActionTypes.SET_SELECTED_NODE,
      payload: uuid,
    });
  };

  const setDisplayMode = (mode: "list" | "graph" | "flow" | "lang" | "theme") => {
    dispatch({
      type: ActionTypes.SET_DISPLAY_MODE,
      payload: mode,
    });
  };

  const updateLocalizations = (localizations: LocalizationMap) => {
    dispatch({
      type: ActionTypes.UPDATE_LOCALIZATIONS,
      payload: localizations,
    });
  };

  const updateTheme = (theme: ThemeDefinition) => {
    dispatch({
      type: ActionTypes.UPDATE_THEME,
      payload: theme,
    });
  };

  const importSurvey = (data: { rootNode: NodeData; localizations?: LocalizationMap; theme?: ThemeDefinition }) => {
    dispatch({
      type: ActionTypes.IMPORT_SURVEY,
      payload: data,
    });
  };

  const exportSurvey = () => {
    return {
      rootNode: state.rootNode,
      localizations: state.localizations,
      theme: state.theme,
    };
  };

  const setGlobalCustomFields = (customFields: GlobalCustomField[]) => {
    dispatch({
      type: ActionTypes.SET_GLOBAL_CUSTOM_FIELDS,
      payload: customFields,
    });
  };

  const setCustomData = (customData: any) => {
    dispatch({
      type: ActionTypes.SET_CUSTOM_DATA,
      payload: customData,
    });
  };

  // Helper: Find the path from root to a specific block
  const findBlockPath = (node: any, targetUuid: string, currentPath: any[] = []): any[] | null => {
    if (!node) return null;

    const newPath = [...currentPath, node];

    // Check if this node has the target block in its items
    if (Array.isArray(node.items)) {
      for (const item of node.items) {
        if (item.uuid === targetUuid || item.fieldName === targetUuid) {
          return [...newPath, item];
        }
      }
    }

    // Check if this node has items and recurse into them
    if (Array.isArray(node.items)) {
      for (const item of node.items) {
        const result = findBlockPath(item, targetUuid, newPath);
        if (result) return result;
      }
    }

    // Check if this node has child nodes and recurse into them
    if (Array.isArray(node.nodes)) {
      for (const childNode of node.nodes) {
        if (typeof childNode !== "string") {
          const result = findBlockPath(childNode, targetUuid, newPath);
          if (result) return result;
        }
      }
    }

    return null;
  };

  // Helper: Collect field names from blocks, including nested fields from output schemas
  const collectFieldsFromBlocks = (
    blocks: any[],
    options: {
      stopAt?: string;  // Stop collecting when reaching this block ID
      excludeBlock?: string;  // Exclude this block from collection
    } = {}
  ): string[] => {
    const names: string[] = [];

    for (const item of blocks) {
      // Stop if we've reached the stop block
      if (options.stopAt && (item.uuid === options.stopAt || item.fieldName === options.stopAt)) {
        break;
      }

      // Skip if this is the excluded block
      if (options.excludeBlock && (item.uuid === options.excludeBlock || item.fieldName === options.excludeBlock)) {
        continue;
      }

      if (item.fieldName) {
        names.push(item.fieldName);

        // Check if this block has an output schema with nested fields
        const blockDefinition = state.definitions?.blocks?.[item.type];
        if (blockDefinition && item.fieldName) {
          // Check if block outputs an object (which may have nested fields)
          if (isObjectOutput(blockDefinition, item)) {
            const outputKeys = getOutputKeys(blockDefinition, item);
            // Add nested field accessors (e.g., "authResults.email")
            for (const key of outputKeys) {
              names.push(`${item.fieldName}.${key}`);
            }
          }
        }
      }

      // Recurse into subitems if they exist
      if (Array.isArray(item.items)) {
        names.push(...collectFieldsFromBlocks(item.items, options));
      }
    }

    return names;
  };

  // Get all available fields up to and including the current block
  const getAvailableFields = (currentBlockId: string): string[] => {
    if (!state.rootNode || !currentBlockId) {
      return [];
    }

    const path = findBlockPath(state.rootNode, currentBlockId);
    if (!path) {
      return [];
    }

    const fieldNames: string[] = [];

    // Collect fields from all nodes in the path
    for (let i = 0; i < path.length; i++) {
      const node = path[i];

      if (node.fieldName) {
        fieldNames.push(node.fieldName);
      }

      if (Array.isArray(node.items)) {
        // For the last node in path, collect all items (including current block)
        if (i === path.length - 1) {
          fieldNames.push(...collectFieldsFromBlocks(node.items, {}));
        } else {
          fieldNames.push(...collectFieldsFromBlocks(node.items, {}));
        }
      }
    }

    return [...new Set(fieldNames)];
  };

  // Get available fields from blocks that exist before the current block
  const getAvailableFieldsBefore = (currentBlockId: string): string[] => {
    if (!state.rootNode || !currentBlockId) {
      return [];
    }

    // Simple linear traversal: collect fields until we hit the current block
    const fieldNames: string[] = [];
    let found = false;

    const traverse = (node: any): void => {
      if (found) return;  // Stop traversing once we've found the current block

      // Check if this is the current block
      if (node.uuid === currentBlockId || node.fieldName === currentBlockId) {
        found = true;
        return;  // Don't include the current block
      }

      // Add this node's field name if it exists
      if (node.fieldName) {
        fieldNames.push(node.fieldName);

        // Add nested fields from output schema
        const blockDefinition = state.definitions?.blocks?.[node.type];
        if (blockDefinition) {
          if (isObjectOutput(blockDefinition, node)) {
            const outputKeys = getOutputKeys(blockDefinition, node);
            for (const key of outputKeys) {
              fieldNames.push(`${node.fieldName}.${key}`);
            }
          }
        }
      }

      // Recursively traverse child items
      if (Array.isArray(node.items)) {
        for (const item of node.items) {
          if (found) break;
          traverse(item);
        }
      }

      // Recursively traverse child nodes
      if (Array.isArray(node.nodes)) {
        for (const childNode of node.nodes) {
          if (found) break;
          if (typeof childNode !== "string") {
            traverse(childNode);
          }
        }
      }
    };

    traverse(state.rootNode);
    return [...new Set(fieldNames)];
  };

  // Get available fields up to and including the current block
  // Get available fields from blocks that exist before the current block
  const getAvailableFieldsUptoCurrent = (currentBlockId: string): string[] => {
    if (!state.rootNode || !currentBlockId) {
      return [];
    }

    // Simple linear traversal: collect fields until we hit the current block
    const fieldNames: string[] = [];
    let found = false;

    const traverse = (node: any): void => {
      if (found) return;  // Stop traversing once we've found the current block

      // Check if this is the current block
      if (node.uuid === currentBlockId || node.fieldName === currentBlockId) {
        found = true;
      }

      // Add this node's field name if it exists
      if (node.fieldName) {
        fieldNames.push(node.fieldName);

        // Add nested fields from output schema
        const blockDefinition = state.definitions?.blocks?.[node.type];
        if (blockDefinition) {
          if (isObjectOutput(blockDefinition, node)) {
            const outputKeys = getOutputKeys(blockDefinition, node);
            for (const key of outputKeys) {
              fieldNames.push(`${node.fieldName}.${key}`);
            }
          }
        }
      }

      // Recursively traverse child items
      if (Array.isArray(node.items)) {
        for (const item of node.items) {
          if (found) break;
          traverse(item);
        }
      }

      // Recursively traverse child nodes
      if (Array.isArray(node.nodes)) {
        for (const childNode of node.nodes) {
          if (found) break;
          if (typeof childNode !== "string") {
            traverse(childNode);
          }
        }
      }
    };

    traverse(state.rootNode);
    return [...new Set(fieldNames)];
  };

  // Get available fields excluding the current block (all fields in survey except current)
  const getAvailableFieldsExcludingCurrent = (currentBlockId: string): string[] => {
    if (!state.rootNode || !currentBlockId) {
      return [];
    }

    // Linear traversal: collect all fields except the current block
    const fieldNames: string[] = [];

    const traverse = (node: any): void => {
      // Skip the current block
      if (node.uuid === currentBlockId || node.fieldName === currentBlockId) {
        return;
      }

      // Add this node's field name if it exists
      if (node.fieldName) {
        fieldNames.push(node.fieldName);

        // Add nested fields from output schema
        const blockDefinition = state.definitions?.blocks?.[node.type];
        if (blockDefinition) {
          if (isObjectOutput(blockDefinition, node)) {
            const outputKeys = getOutputKeys(blockDefinition, node);
            for (const key of outputKeys) {
              fieldNames.push(`${node.fieldName}.${key}`);
            }
          }
        }
      }

      // Recursively traverse child items
      if (Array.isArray(node.items)) {
        for (const item of node.items) {
          traverse(item);
        }
      }

      // Recursively traverse child nodes
      if (Array.isArray(node.nodes)) {
        for (const childNode of node.nodes) {
          if (typeof childNode !== "string") {
            traverse(childNode);
          }
        }
      }
    };

    traverse(state.rootNode);
    return [...new Set(fieldNames)];
  };

  const value = {
    state,
    dispatch,
    addBlockDefinition,
    addNodeDefinition,
    initSurvey,
    createNode,
    updateNode,
    removeNode,
    setSelectedNode,
    setDisplayMode,
    updateLocalizations,
    updateTheme,
    importSurvey,
    exportSurvey,
    setGlobalCustomFields,
    setCustomData,
    customData: state.customData,
    getAvailableFields,
    getAvailableFieldsBefore,
    getAvailableFieldsUptoCurrent,
    getAvailableFieldsExcludingCurrent,
  };

  return (
    <SurveyBuilderContext.Provider value={value}>
      {children}
    </SurveyBuilderContext.Provider>
  );
};
