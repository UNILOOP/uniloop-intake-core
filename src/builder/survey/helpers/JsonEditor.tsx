import type React from "react";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { useSurveyBuilder } from "../../../context/SurveyBuilderContext";
import { NodeData, BlockData } from "../../../types";
import { ensureNodeUuids } from "../../../utils/nodeUtils";
import { detectSurveyMode } from "../../../utils/surveyUtils";
import { DEFAULT_LANGUAGE_CODE } from "../../../utils/languages";

/**
 * Converts a paged survey structure to pageless by extracting all blocks from pages
 * @param rootNode The rootNode with pages (sets)
 * @returns A new rootNode with blocks directly in items (no pages)
 */
function convertPagedToPageless(rootNode: NodeData): NodeData {
  const allBlocks: BlockData[] = [];

  // Extract blocks from all pages (sets)
  if (rootNode.items && rootNode.items.length > 0) {
    for (const item of rootNode.items) {
      if (item.type === 'set' && item.items) {
        // This is a page - extract its blocks
        allBlocks.push(...item.items);
      } else {
        // This is already a block (shouldn't happen in paged mode but handle anyway)
        allBlocks.push(item as BlockData);
      }
    }
  }

  return {
    ...rootNode,
    items: allBlocks,
  };
}

/**
 * Converts a pageless survey structure to paged by wrapping all blocks in pages
 * @param rootNode The rootNode with blocks directly in items
 * @returns A new rootNode with blocks wrapped in pages (sets)
 */
function convertPagelessToPaged(rootNode: NodeData): NodeData {
  const pages: NodeData[] = [];

  // Group blocks into pages - for now, we create one page per block
  // This maintains block-by-block navigation behavior from pageless mode
  if (rootNode.items && rootNode.items.length > 0) {
    rootNode.items.forEach((block, index) => {
      pages.push({
        type: 'set',
        name: `Page ${index + 1}`,
        uuid: uuidv4(),
        items: [block],
      });
    });
  }

  return {
    ...rootNode,
    items: pages,
  };
}

export const JsonEditor: React.FC = () => {
  const { state, importSurvey, exportSurvey } = useSurveyBuilder();
  const [exportJson, setExportJson] = useState<string>("");
  const [importJson, setImportJson] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get current builder mode
  const builderMode = state.mode;

  // Export the current survey to JSON
  const handleExport = () => {
    const data = exportSurvey();
    setExportJson(JSON.stringify(data, null, 2));
    setError(null);
    setSuccess("Survey exported successfully!");

    // Clear success message after a delay
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };

  // Import survey from JSON
  const handleImport = () => {
    try {
      setError(null);
      setSuccess(null);

      if (!importJson.trim()) {
        setError("Please enter JSON data to import");
        return;
      }

      const data = JSON.parse(importJson);

      // Validate the imported data
      if (!data.rootNode || typeof data.rootNode !== "object") {
        setError("Invalid survey data: rootNode is required and must be an object");
        return;
      }

      // Detect the mode of the imported survey
      const importedMode = detectSurveyMode(data.rootNode as NodeData);

      let rootNodeToImport = data.rootNode as NodeData;

      // Convert between modes if necessary
      if (builderMode === 'pageless' && importedMode === 'paged') {
        // Builder is pageless but import is paged - convert to pageless
        rootNodeToImport = convertPagedToPageless(rootNodeToImport);
        setSuccess("Survey imported and converted from paged to pageless format!");
      } else if (builderMode === 'paged' && importedMode === 'pageless') {
        // Builder is paged but import is pageless - convert to paged
        rootNodeToImport = convertPagelessToPaged(rootNodeToImport);
        setSuccess("Survey imported and converted from pageless to paged format!");
      } else {
        setSuccess("Survey imported successfully!");
      }

      // Ensure all nodes have UUIDs
      const rootNodeWithUuids = ensureNodeUuids(rootNodeToImport);

      importSurvey({
        rootNode: rootNodeWithUuids,
        localizations: data.localizations || { [DEFAULT_LANGUAGE_CODE]: {} },
        theme: data.theme || null
      });

      // Clear success message after a delay
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(`Error importing survey: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Import Survey</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Paste a valid JSON survey definition below to import it.
                {builderMode === 'pageless' && (
                  <span className="block mt-1 text-blue-600">
                    Current mode: <strong>Pageless</strong> (blocks only, no pages).
                    Paged surveys will be automatically converted.
                  </span>
                )}
                {builderMode === 'paged' && (
                  <span className="block mt-1 text-blue-600">
                    Current mode: <strong>Paged</strong> (pages with blocks).
                    Pageless surveys will be automatically converted.
                  </span>
                )}
              </p>
              <Textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{
  "rootNode": { "type": "section", ... },
  "localizations": { "en-US": { ... } }
}'
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={handleImport}>Import</Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="default" className="bg-green-50 border-green-300 text-green-800">
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>

        <TabsContent value="export">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Export Survey</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Export the current survey definition as JSON.
              </p>
              <Textarea
                value={exportJson}
                rows={12}
                className="font-mono text-sm"
                readOnly
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" onClick={handleExport}>Refresh</Button>
              <Button type="button"
                onClick={() => {
                  navigator.clipboard.writeText(exportJson);
                  setSuccess("Copied to clipboard!");
                  setTimeout(() => setSuccess(null), 3000);
                }}
                disabled={!exportJson}
              >
                Copy to Clipboard
              </Button>
            </div>

            {success && (
              <Alert variant="default" className="bg-green-50 border-green-300 text-green-800">
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
