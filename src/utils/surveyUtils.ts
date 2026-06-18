import type { NodeData, BlockData, SurveyMode } from "../types";
import { isDefaultLanguageCode } from "./languages";

/**
 * Detects the survey mode based on the structure of rootNode
 * - If rootNode.items contains 'set' blocks, it's paged mode
 * - If rootNode.items contains non-set blocks directly, it's pageless mode
 * @param rootNode The survey root node
 * @returns The detected survey mode
 */
export function detectSurveyMode(rootNode: NodeData): SurveyMode {
  if (!rootNode.items || rootNode.items.length === 0) {
    return 'paged'; // Default to paged mode
  }

  // Check if any item is a 'set' (page) block
  const hasSetBlocks = rootNode.items.some(item => item.type === 'set');

  // If we have set blocks, it's paged mode; otherwise it's pageless mode
  return hasSetBlocks ? 'paged' : 'pageless';
}

/**
 * Extracts all pages/sections from a survey
 * @param rootNode The survey root node
 * @param mode Optional explicit mode override (if not provided, auto-detects)
 * @returns Array of page blocks
 *
 * In paged mode: Returns array where each element is an array of blocks in a page (set)
 * In pageless mode: Returns array where each element is a single-block array (each block is its own "page")
 */
export function getSurveyPages(rootNode: NodeData, mode?: SurveyMode): Array<BlockData[]> {
  const pages: Array<BlockData[]> = [];

  // If there are no nodes or items, return empty array
  if (!rootNode.nodes && !rootNode.items) {
    return pages;
  }

  // Use explicit mode if provided, otherwise auto-detect
  const surveyMode = mode ?? detectSurveyMode(rootNode);

  // Process items at the root level
  if (rootNode.items && rootNode.items.length > 0) {
    if (surveyMode === 'pageless') {
      // Pageless mode: each block is its own "page"
      // Handle case where data might have 'set' blocks from paged mode - flatten them
      rootNode.items.forEach(item => {
        if (item.type === 'set' && item.items && item.items.length > 0) {
          // Flatten set blocks: each block inside the set becomes its own page
          item.items.forEach(block => {
            pages.push([block]);
          });
        } else {
          // Regular block, treat as its own page
          pages.push([item]);
        }
      });
    } else {
      // Paged mode: check for 'set' blocks at the root level which should be treated as pages
      const setBlocks = rootNode.items.filter(item => item.type === 'set');

      if (setBlocks.length > 0) {
        // Each 'set' block becomes a separate page
        setBlocks.forEach(setBlock => {
          if (setBlock.items && setBlock.items.length > 0) {
            pages.push(setBlock.items);
          }
        });
      } else {
        // If no 'set' blocks, treat all items as a single page
        pages.push(rootNode.items);
      }
    }
  }

  // Process child nodes (sections) - only in paged mode
  if (surveyMode === 'paged' && rootNode.nodes && rootNode.nodes.length > 0) {
    rootNode.nodes.forEach(nodeRef => {
      // Handle both node reference and inline node
      const node = typeof nodeRef === 'string' ? { type: 'section', uuid: nodeRef } : nodeRef;

      // Skip if not a section
      if (node.type !== 'section') {
        return;
      }

      // Check for 'set' blocks in the section
      if (node.items && node.items.length > 0) {
        const setBlocks = node.items.filter(item => item.type === 'set');

        if (setBlocks.length > 0) {
          // Each 'set' block becomes a separate page
          setBlocks.forEach(setBlock => {
            if (setBlock.items && setBlock.items.length > 0) {
              pages.push(setBlock.items);
            }
          });
        } else {
          // If no 'set' blocks, treat all section items as a single page
          pages.push(node.items);
        }
      }

      // Recursively process child nodes
      if (node.nodes && node.nodes.length > 0) {
        const childPages = getSurveyPages(node, surveyMode);
        pages.push(...childPages);
      }
    });
  }

  // Ensure we always have at least one page to avoid NaN calculations
  if (pages.length === 0) {
    pages.push([]);
  }

  return pages;
}

/**
 * Returns an array of page UUIDs in the same order as getSurveyPages
 * @param rootNode The survey root node
 * @param mode Optional explicit mode override (if not provided, auto-detects)
 * @returns Array of UUIDs
 *
 * In paged mode: Returns UUIDs of set/page nodes
 * In pageless mode: Returns UUIDs of individual blocks (each block is its own "page")
 */
export function getSurveyPageIds(rootNode: NodeData, mode?: SurveyMode): string[] {
  const ids: string[] = [];

  // Use explicit mode if provided, otherwise auto-detect
  const surveyMode = mode ?? detectSurveyMode(rootNode);

  const processNode = (node: NodeData) => {
    if (node.items && node.items.length > 0) {
      if (surveyMode === 'pageless') {
        // Pageless mode: each block's UUID is a "page" ID
        // Handle case where data might have 'set' blocks from paged mode - flatten them
        node.items.forEach(item => {
          if (item.type === 'set' && item.items && item.items.length > 0) {
            // Flatten set blocks: each block inside becomes its own "page"
            item.items.forEach(block => {
              ids.push(block.uuid || '');
            });
          } else {
            // Regular block
            ids.push(item.uuid || '');
          }
        });
      } else {
        // Paged mode: check for set blocks
        const setBlocks = node.items.filter(item => item.type === 'set');

        if (setBlocks.length > 0) {
          setBlocks.forEach(setBlock => {
            ids.push(setBlock.uuid || '');
          });
        } else {
          ids.push(node.uuid || '');
        }
      }
    }

    // Process child nodes - only in paged mode
    if (surveyMode === 'paged' && node.nodes && node.nodes.length > 0) {
      node.nodes.forEach(n => {
        const child = typeof n === 'string' ? { type: 'section', uuid: n } : n;
        if (child.type === 'section') {
          processNode(child);
        }
      });
    }
  };

  processNode(rootNode);

  if (ids.length === 0) {
    ids.push(rootNode.uuid || '');
  }

  return ids;
}

/**
 * Safely evaluate logic script in a survey
 *
 * @param script The logic script to evaluate
 * @param context The context object with form data and helper functions
 */
export function evaluateLogic(script: string, context: {
  fieldValues: Record<string, any>;
  setValue?: (field: string, value: any) => void;
  setError?: (field: string, error: string | null) => void;
  currentPage?: number;
  getFieldValue?: (fieldName: string) => any;
  showAlert?: (message: string) => void;
}) {
  try {
    // Basic sanitization - remove potentially harmful parts of script
    const sanitizedScript = script
      .replace(/import\s*\{/g, "")
      .replace(/require\s*\(/g, "")
      .replace(/process/g, "")
      .replace(/global/g, "")
      .replace(/window/g, "")
      .replace(/document/g, "")
      .replace(/eval\s*\(/g, "");

    // Create a function from the script
    const fn = new Function('context', `
      "use strict";
      // Extract context values
      const fieldValues = context.fieldValues || {};
      const setValue = context.setValue;
      const setError = context.setError;
      const currentPage = context.currentPage;
      const getFieldValue = context.getFieldValue || ((fieldName) => fieldValues[fieldName]);
      const showAlert = context.showAlert || ((message) => console.log(message));

      try {
        ${sanitizedScript}
        return { isValid: true };
      } catch (error) {
        return { isValid: false, errorMessage: error.message };
      }
    `);

    // Execute the function with the provided context
    return fn(context);
  } catch (error) {
    console.error("Error executing logic script:", error);
    return { isValid: false, errorMessage: "Error in logic script" };
  }
}

/**
 * Gets a localized label for a block
 */
export function getLocalized(
  block: BlockData,
  field: string,
  language: string,
  localizations?: Record<string, Record<string, string>>
) {
  if (!localizations || !language || isDefaultLanguageCode(language)) {
    return block[field];
  }

  const langMap = localizations[language];
  if (!langMap) {
    return block[field];
  }

  const originalValue = block[field];
  if (typeof originalValue === 'string' && langMap[originalValue] !== undefined) {
    return langMap[originalValue] || originalValue;
  }

  const blockId = block.uuid;
  if (!blockId) {
    return originalValue;
  }

  const key = `${blockId}.${field}`;
  return langMap[key] || originalValue;
}

const LOCALIZABLE_FIELDS = ['name', 'label', 'description', 'text', 'html', 'placeholder'] as const;

function localizeText(
  value: unknown,
  language: string,
  localizations?: Record<string, Record<string, string>>
): unknown {
  if (typeof value !== 'string' || !localizations || !language || isDefaultLanguageCode(language)) {
    return value;
  }

  const langMap = localizations[language];

  return langMap?.[value] || value;
}

/**
 * Applies text-key localization to a block before rendering.
 *
 * The builder stores localizations by source text, while older package exports
 * may use UUID.field keys. This supports both formats without changing saved
 * survey JSON.
 */
export function localizeBlockForRendering(
  block: BlockData,
  language: string,
  localizations?: Record<string, Record<string, string>>
): BlockData {
  if (!localizations || !language || isDefaultLanguageCode(language)) {
    return block;
  }

  const localizedBlock: BlockData = { ...block };

  for (const field of LOCALIZABLE_FIELDS) {
    localizedBlock[field] = getLocalized(block, field, language, localizations);
  }

  if (Array.isArray(block.options)) {
    localizedBlock.options = block.options.map((option: any) => ({
      ...option,
      label: localizeText(option.label, language, localizations),
      text: localizeText(option.text, language, localizations),
    }));
  }

  if (Array.isArray(block.labels)) {
    localizedBlock.labels = block.labels.map((label: string) =>
      localizeText(label, language, localizations) as string
    );
  }

  if (Array.isArray(block.validationRules)) {
    localizedBlock.validationRules = block.validationRules.map((rule: any) => ({
      ...rule,
      message: localizeText(rule.message, language, localizations),
    }));
  }

  if (block.childBlock && typeof block.childBlock === 'object') {
    localizedBlock.childBlock = localizeBlockForRendering(
      block.childBlock as BlockData,
      language,
      localizations
    );
  }

  return localizedBlock;
}

/**
 * Generate a className based on theme and customization options
 */
export function getThemeClass(theme: string, baseClass: string, customClass?: string): string {
  const themeClass = `theme-${theme}`;
  return `${baseClass} ${themeClass} ${customClass || ''}`.trim();
}

/**
 * Formats a field name into a human-readable label
 */
export function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1') // insert a space before all capital letters
    .replace(/([0-9]+)/g, ' $1 ') // space before and after numbers
    .replace(/^./, char => char.toUpperCase()) // uppercase the first character
    .replace(/_/g, ' ') // replace underscores with spaces
    .replace(/\s+/g, ' ') // remove multiple spaces
    .trim();
}
