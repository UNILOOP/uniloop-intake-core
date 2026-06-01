import React, { forwardRef, useRef, useState, useEffect } from "react";
import type { BlockDefinition, ContentBlockItemProps, BlockRendererProps } from "../types";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { PenTool, Trash2, Check } from "lucide-react";
import { cn } from "../lib/utils";
import { themes } from "../themes";
import { generateFieldName } from "./utils/GenFieldName";

// ============= BUILDER COMPONENTS =============

// Form component for editing the block configuration in builder
const SignatureBlockForm: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  const handleChange = (field: string, value: string | boolean | number) => {
    onUpdate?.({
      ...data,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm" htmlFor="label">Label</Label>
          <Input
            id="label"
            value={data.label || ""}
            onChange={(e) => handleChange("label", e.target.value)}
            placeholder="Sign here"
          />
          <p className="text-xs text-muted-foreground">
            Label shown above the signature area
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="description">Description/Agreement Text</Label>
        <textarea
          id="description"
          value={data.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="By signing below, I agree to..."
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          Agreement text or instructions shown above the signature pad
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm" htmlFor="canvasWidth">Canvas Width</Label>
          <Input
            id="canvasWidth"
            type="number"
            value={data.canvasWidth || 600}
            onChange={(e) => handleChange("canvasWidth", parseInt(e.target.value))}
            placeholder="600"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm" htmlFor="canvasHeight">Canvas Height</Label>
          <Input
            id="canvasHeight"
            type="number"
            value={data.canvasHeight || 200}
            onChange={(e) => handleChange("canvasHeight", parseInt(e.target.value))}
            placeholder="200"
          />
        </div>
      </div>
    </div>
  );
};

// Component to render the block in the builder's survey view
const SignatureBlockItem: React.FC<ContentBlockItemProps> = ({
  data,
}) => {
  return (
    <div className="space-y-2">
      {data.label && (
        <Label className="text-sm" htmlFor={data.fieldName}>{data.label}</Label>
      )}

      {data.description && (
        <p className="text-sm text-muted-foreground">{data.description}</p>
      )}

      <div className="border-2 border-dashed rounded-lg p-8 bg-muted/10">
        <div className="flex items-center justify-center text-muted-foreground">
          <PenTool className="w-6 h-6 mr-2" />
          <span className="text-sm">Signature pad will appear here</span>
        </div>
      </div>
    </div>
  );
};

// Preview component shown in the block library
const SignatureBlockPreview: React.FC = () => {
  return (
    <div className="w-full flex items-center justify-center py-1">
      <div className="border rounded p-3 w-4/5 flex items-center justify-center bg-muted/10">
        <PenTool className="w-5 h-5 text-muted-foreground" />
      </div>
    </div>
  );
};

// ============= RENDERER COMPONENT =============

// Main renderer component for end-user surveys
const SignatureRenderer = forwardRef<HTMLCanvasElement, BlockRendererProps>(
  ({ block, value, onChange, onBlur, error, disabled, theme }) => {
    const themeConfig = theme ?? themes.default;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    const canvasWidth = block.canvasWidth || 600;
    const canvasHeight = block.canvasHeight || 200;

    // Initialize canvas with value if exists
    useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas && value) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Fill white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            setIsEmpty(false);
          };
          img.src = value;
        }
      }
    }, [value]);

    // Set up canvas dimensions and white background
    useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Always fill with white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Restore signature if value exists
          if (value) {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0);
              setIsEmpty(false);
            };
            img.src = value;
          }
        }
      }
    }, [canvasWidth, canvasHeight]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      
      setIsDrawing(true);
      setIsEmpty(false);
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const rect = canvas.getBoundingClientRect();
      let x: number, y: number;
      
      if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
      } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = '#000000'; // Always black for signatures
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing || disabled) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const rect = canvas.getBoundingClientRect();
      let x: number, y: number;
      
      if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
      } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }
      
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      if (!isDrawing) return;
      
      setIsDrawing(false);
      
      // Save canvas as image data
      const canvas = canvasRef.current;
      if (canvas) {
        const imageData = canvas.toDataURL('image/png');
        onChange?.(imageData);
      }
    };

    const clearSignature = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Refill with white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          setIsEmpty(true);
          onChange?.('');
        }
      }
    };

    return (
      <div className="survey-signature space-y-3 w-full min-w-0">
        {/* Label */}
        {block.label && (
          <Label
            htmlFor={block.fieldName}
            className={cn("text-base font-medium", themeConfig.field.label)}
          >
            {block.label}
          </Label>
        )}

        {/* Description/Agreement Text */}
        {block.description && (
          <div className={cn(
            "text-sm rounded-lg p-4",
            "bg-muted/30 border border-border",
            themeConfig.field.description
          )}>
            {block.description}
          </div>
        )}

        {/* Signature Canvas Container */}
        <div className="space-y-3">
          {/* Canvas wrapper with proper border and focus states */}
          <div 
            className={cn(
              "rounded-lg p-1",
              "border-2 transition-colors",
              error ? "border-destructive focus-within:border-destructive" : 
                     "border-input focus-within:border-primary",
              disabled && "opacity-50 cursor-not-allowed",
              "bg-background"
            )}
          >
            {/* Inner white canvas area */}
            <div className="relative bg-white rounded overflow-hidden">
              {/* Signature guideline */}
              <div 
                className="absolute left-8 right-8 border-b border-gray-300"
                style={{ bottom: '25%' }}
              />
              
              {/* X mark for signature starting point */}
              {isEmpty && (
                <div 
                  className="absolute left-10 text-gray-400 text-sm select-none"
                  style={{ bottom: 'calc(25% - 8px)' }}
                >
                  ✕
                </div>
              )}
              
              <canvas
                ref={canvasRef}
                className={cn(
                  "w-full touch-none block",
                  !disabled && "cursor-crosshair",
                  disabled && "cursor-not-allowed"
                )}
                style={{
                  width: '100%',
                  maxWidth: `${canvasWidth}px`,
                  height: `${canvasHeight}px`
                }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                onBlur={onBlur}
                tabIndex={disabled ? -1 : 0}
              />
              
              {/* Placeholder overlay when empty */}
              {isEmpty && !disabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <PenTool className="h-8 w-8 text-gray-300 mb-2" />
                  <span className="text-gray-500 text-sm">
                    Click or touch to sign
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons and status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSignature}
                disabled={disabled || isEmpty}
                className="h-8"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Clear
              </Button>
              
              {!isEmpty && (
                <div className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <Check className="h-3 w-3 mr-1" />
                  Signed
                </div>
              )}
            </div>

            {/* Additional info text */}
            {!isEmpty && (
              <span className="text-xs text-muted-foreground">
                Signature captured
              </span>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className={cn(
            "text-sm font-medium text-destructive",
            themeConfig.field.error
          )}>
            {error}
          </div>
        )}
      </div>
    );
  }
);

SignatureRenderer.displayName = 'SignatureRenderer';

// ============= UNIFIED BLOCK DEFINITION =============

export const SignatureBlock: BlockDefinition = {
  type: "signature",
  name: "Signature",
  description: "Signature pad for agreements and consent forms",
  icon: <PenTool className="w-4 h-4" />,
  defaultData: {
    type: "signature",
    fieldName: "",
    label: "Signature",
    description: "By signing below, I agree to the terms and conditions.",
    canvasWidth: 600,
    canvasHeight: 200,
  },
  generateDefaultData: () => ({
    type: "signature",
    fieldName: generateFieldName("signature"),
    label: "Signature",
    description: "By signing below, I agree to the terms and conditions.",
    canvasWidth: 600,
    canvasHeight: 200,
  }),
  // Builder methods
  renderItem: (props) => <SignatureBlockItem {...props} />,
  renderFormFields: (props) => <SignatureBlockForm {...props} />,
  renderPreview: () => <SignatureBlockPreview />,
  // Renderer method
  renderBlock: (props) => <SignatureRenderer {...props} />,
  // Validation methods
  validate: (data) => {
    if (!data.fieldName) return "Field name is required";
    if (!data.label) return "Label is required";
    return null;
  },
  validateValue: (value, data) => {
    if (data.required && !value) return "Signature is required";
    return null;
  },
  // Output schema - this block returns a base64-encoded image string
  outputSchema: {
    type: 'string'
  },
  fieldConfig: {
    enabled: true,
    label: "Field Name",
    required: true
  }
};