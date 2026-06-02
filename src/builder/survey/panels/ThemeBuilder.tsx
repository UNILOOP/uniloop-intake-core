import React, { useRef } from "react";
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Textarea } from "../../../components/ui/textarea";
import { Separator } from "../../../components/ui/separator";
import { Badge } from "../../../components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "../../../components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { 
  ClipboardCopy, Palette, Type, Layout, MousePointer, BarChart3, Package, 
  RefreshCw, Download, Upload, Plus, X, Info, Eye, EyeOff, Sparkles,
  Sliders, Paintbrush, Grid3X3, CheckSquare,
  ArrowLeft, ArrowRight, Settings, Brush, Wrench, Check, ChevronRight, Zap,
  PenLine,
  Copy
} from "lucide-react";
import { useSurveyBuilder } from "../../../context/SurveyBuilderContext";
import { ThemeDefinition, SurveyTheme, NodeData, LocalizationMap } from "../../../types";
import { themes } from "../../../themes";
import ThemePreview from "./ThemePreview";
import type { LayoutProps } from "../../../types";

// Theme creation steps
type ThemeStep = 'selection' | 'basics' | 'advanced' | 'review';

// Theme creation path
type ThemePath = 'preset' | 'custom' | 'modify';

// Step configuration
interface StepConfig {
  id: ThemeStep;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed?: boolean;
}

// Preset options for various styling properties
const PRESET_OPTIONS = {
  fontSize: [
    { label: "Extra Small", value: "text-xs" },
    { label: "Small", value: "text-sm" },
    { label: "Base", value: "text-base" },
    { label: "Large", value: "text-lg" },
    { label: "Extra Large", value: "text-xl" },
    { label: "2X Large", value: "text-2xl" },
    { label: "3X Large", value: "text-3xl" },
    { label: "4X Large", value: "text-4xl" },
  ],
  fontWeight: [
    { label: "Thin", value: "font-thin" },
    { label: "Light", value: "font-light" },
    { label: "Normal", value: "font-normal" },
    { label: "Medium", value: "font-medium" },
    { label: "Semibold", value: "font-semibold" },
    { label: "Bold", value: "font-bold" },
    { label: "Extra Bold", value: "font-extrabold" },
  ],
  textAlign: [
    { label: "Left", value: "text-left", icon: "⬅️" },
    { label: "Center", value: "text-center", icon: "↔️" },
    { label: "Right", value: "text-right", icon: "➡️" },
    { label: "Justify", value: "text-justify", icon: "☰" },
  ],
  borderRadius: [
    { label: "None", value: "rounded-none", preview: "◻️" },
    { label: "Small", value: "rounded-sm", preview: "⬜" },
    { label: "Default", value: "rounded", preview: "⬜" },
    { label: "Medium", value: "rounded-md", preview: "⬜" },
    { label: "Large", value: "rounded-lg", preview: "⬜" },
    { label: "XL", value: "rounded-xl", preview: "⬜" },
    { label: "2XL", value: "rounded-2xl", preview: "⬜" },
    { label: "3XL", value: "rounded-3xl", preview: "⬜" },
    { label: "Full", value: "rounded-full", preview: "⭕" },
  ],
  borderWidth: [
    { label: "None", value: "border-0" },
    { label: "1px", value: "border" },
    { label: "2px", value: "border-2" },
    { label: "4px", value: "border-4" },
    { label: "8px", value: "border-8" },
  ],
  shadow: [
    { label: "None", value: "shadow-none" },
    { label: "Small", value: "shadow-sm" },
    { label: "Default", value: "shadow" },
    { label: "Medium", value: "shadow-md" },
    { label: "Large", value: "shadow-lg" },
    { label: "XL", value: "shadow-xl" },
    { label: "2XL", value: "shadow-2xl" },
  ],
  spacing: [
    { label: "None", value: "0" },
    { label: "0.5", value: "0.5" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "6", value: "6" },
    { label: "8", value: "8" },
    { label: "10", value: "10" },
    { label: "12", value: "12" },
    { label: "16", value: "16" },
  ],
  containerWidth: [
    { label: "Small", value: "max-w-sm" },
    { label: "Medium", value: "max-w-md" },
    { label: "Large", value: "max-w-lg" },
    { label: "XL", value: "max-w-xl" },
    { label: "2XL", value: "max-w-2xl" },
    { label: "3XL", value: "max-w-3xl" },
    { label: "4XL", value: "max-w-4xl" },
    { label: "5XL", value: "max-w-5xl" },
    { label: "6XL", value: "max-w-6xl" },
    { label: "7XL", value: "max-w-7xl" },
    { label: "Full", value: "max-w-full" },
  ],
};

// Color presets for quick selection
const COLOR_PRESETS = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Purple", value: "#9333EA" },
  { name: "Pink", value: "#EC4899" },
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Yellow", value: "#F59E0B" },
  { name: "Green", value: "#10B981" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Gray", value: "#6B7280" },
  { name: "Slate", value: "#475569" },
  { name: "White", value: "#FFFFFF" },
  { name: "Black", value: "#000000" },
];

// Helper function to parse Tailwind classes
const parseTailwindClasses = (classString: string) => {
  const classes = classString.split(' ').filter(Boolean);
  const parsed: any = {
    fontSize: '',
    fontWeight: '',
    textAlign: '',
    textColor: '',
    bgColor: '',
    borderRadius: '',
    borderWidth: '',
    borderColor: '',
    hoverTextColor: '',
    hoverBackgoundColor: '',
    shadow: '',
    padding: {},
    margin: {},
    custom: []
  };

  classes.forEach(cls => {
    // Check for responsive breakpoint prefix
    const breakpointMatch = cls.match(/^(sm|md|lg|xl|2xl):(.+)$/);
    const breakpoint = breakpointMatch ? breakpointMatch[1] : '';
    const actualClass = breakpointMatch ? breakpointMatch[2] : cls;

    // Font size
    if (actualClass.startsWith('text-') && PRESET_OPTIONS.fontSize.some(opt => opt.value === actualClass)) {
      parsed.fontSize = cls;
    }
    // Font weight
    else if (actualClass.startsWith('font-')) {
      parsed.fontWeight = cls;
    }
    // Text align
    else if (['text-left', 'text-center', 'text-right', 'text-justify'].includes(actualClass)) {
      parsed.textAlign = cls;
    }
    // Text color
    else if (actualClass.startsWith('text-') && (actualClass.includes('[#') || actualClass.includes('-50') || actualClass.includes('-100') || actualClass.includes('-200') || actualClass.includes('-300') || actualClass.includes('-400') || actualClass.includes('-500') || actualClass.includes('-600') || actualClass.includes('-700') || actualClass.includes('-800') || actualClass.includes('-900'))) {
      parsed.textColor = cls;
    }
    // Background color
    else if (actualClass.startsWith('bg-')) {
      parsed.bgColor = cls;
    }
    // Hover Text color
    else if (cls.startsWith('hover:text-')) {
      parsed.hoverTextColor = cls;
    }
    // Hover Background color
    else if (cls.startsWith('hover:bg-')) {
      parsed.hoverBackgoundColor = cls;
    }
    // Border radius
    else if (actualClass.startsWith('rounded')) {
      parsed.borderRadius = cls;
    }
    // Border width
    else if (actualClass === 'border' || actualClass.match(/^border-\d+$/)) {
      parsed.borderWidth = cls;
    }
    // Border color
    else if (actualClass.startsWith('border-') && !actualClass.match(/^border-\d+$/)) {
      parsed.borderColor = cls;
    }
    // Shadow
    else if (actualClass.startsWith('shadow')) {
      parsed.shadow = cls;
    }
    // Padding (with responsive support)
    else if (actualClass.match(/^p[tlrbxy]?-/)) {
      const [type, value] = actualClass.split('-');
      const key = breakpoint ? `${breakpoint}:${type}` : type;
      parsed.padding[key] = value;
    }
    // Margin (with responsive support)
    else if (actualClass.match(/^m[tlrbxy]?-/)) {
      const [type, value] = actualClass.split('-');
      const key = breakpoint ? `${breakpoint}:${type}` : type;
      parsed.margin[key] = value;
    }
    // Custom classes
    else {
      parsed.custom.push(cls);
    }
  });

  return parsed;
};

// Helper functions for containerLayout spacing
const parseContainerLayoutSpacing = (containerLayout: string) => {
  const classes = containerLayout.split(' ').filter(Boolean);
  const spacing: { padding: Record<string, string>; margin: Record<string, string> } = {
    padding: {},
    margin: {}
  };

  classes.forEach(cls => {
    // Check for responsive breakpoint prefix
    const breakpointMatch = cls.match(/^(sm|md|lg|xl|2xl):(.+)$/);
    const breakpoint = breakpointMatch ? breakpointMatch[1] : '';
    const actualClass = breakpointMatch ? breakpointMatch[2] : cls;

    // Padding
    if (actualClass.match(/^p[tlrbxy]?-/)) {
      const [type, value] = actualClass.split('-');
      const key = breakpoint ? `${breakpoint}:${type}` : type;
      spacing.padding[key] = value;
    }
    // Margin
    else if (actualClass.match(/^m[tlrbxy]?-/)) {
      const [type, value] = actualClass.split('-');
      const key = breakpoint ? `${breakpoint}:${type}` : type;
      spacing.margin[key] = value;
    }
  });

  return spacing;
};

const updateContainerLayoutSpacing = (
  containerLayout: string,
  newPadding: Record<string, string>,
  newMargin: Record<string, string>
) => {
  const classes = containerLayout.split(' ').filter(Boolean);

  // Remove existing spacing classes
  const nonSpacingClasses = classes.filter(cls => {
    const actualClass = cls.includes(':') ? cls.split(':')[1] : cls;
    return !actualClass.match(/^[pm][tlrbxy]?-/);
  });

  // Add new padding classes
  Object.entries(newPadding).forEach(([key, val]) => {
    if (val !== '0') {
      if (key.includes(':')) {
        const [breakpoint, type] = key.split(':');
        nonSpacingClasses.push(`${breakpoint}:${type}-${val}`);
      } else {
        nonSpacingClasses.push(`${key}-${val}`);
      }
    }
  });

  // Add new margin classes
  Object.entries(newMargin).forEach(([key, val]) => {
    if (val !== '0') {
      if (key.includes(':')) {
        const [breakpoint, type] = key.split(':');
        nonSpacingClasses.push(`${breakpoint}:${type}-${val}`);
      } else {
        nonSpacingClasses.push(`${key}-${val}`);
      }
    }
  });

  return nonSpacingClasses.join(' ');
};

// Helper to extract color from Tailwind class
const extractColorFromClass = (colorClass: string): string => {
  if (!colorClass) return '#000000';
  const match = colorClass.match(/\[(#[0-9a-fA-F]{6})\]/);
  if (match) return match[1];
  
  // Map common Tailwind colors to hex
  const colorMap: Record<string, string> = {
    'gray-50': '#F9FAFB', 'gray-100': '#F3F4F6', 'gray-200': '#E5E7EB', 'gray-300': '#D1D5DB', 
    'gray-400': '#9CA3AF', 'gray-500': '#6B7280', 'gray-600': '#4B5563', 'gray-700': '#374151',
    'gray-800': '#1F2937', 'gray-900': '#111827',
    'blue-50': '#EFF6FF', 'blue-100': '#DBEAFE', 'blue-200': '#BFDBFE', 'blue-300': '#93C5FD',
    'blue-400': '#60A5FA', 'blue-500': '#3B82F6', 'blue-600': '#2563EB', 'blue-700': '#1D4ED8',
    'blue-800': '#1E40AF', 'blue-900': '#1E3A8A',
    'red-50': '#FEF2F2', 'red-100': '#FEE2E2', 'red-200': '#FECACA', 'red-300': '#FCA5A5',
    'red-400': '#F87171', 'red-500': '#EF4444', 'red-600': '#DC2626', 'red-700': '#B91C1C',
    'red-800': '#991B1B', 'red-900': '#7F1D1D',
    'green-50': '#F0FDF4', 'green-100': '#DCFCE7', 'green-200': '#BBF7D0', 'green-300': '#86EFAC',
    'green-400': '#4ADE80', 'green-500': '#22C55E', 'green-600': '#16A34A', 'green-700': '#15803D',
    'green-800': '#166534', 'green-900': '#14532D',
    'purple-50': '#FAF5FF', 'purple-100': '#F3E8FF', 'purple-200': '#E9D5FF', 'purple-300': '#D8B4FE',
    'purple-400': '#C084FC', 'purple-500': '#A855F7', 'purple-600': '#9333EA', 'purple-700': '#7C3AED',
    'purple-800': '#6B21A8', 'purple-900': '#581C87',
  };
  
  for (const [key, value] of Object.entries(colorMap)) {
    if (colorClass.includes(key)) return value;
  }
  
  return '#000000';
};

// Updated HexColorPicker component
const HexColorPicker: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label: string;
}> = ({ value, onChange, label }) => {
  const hexColor = value?.startsWith('#') ? value : '#000000';
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Popover >
          <PopoverTrigger asChild>
            <Button
              ref={buttonRef}
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setOpen(!open)}
            >
              <div 
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: hexColor }}
              />
              <span className="text-sm">{hexColor}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-80 z-50" 
            align="start" 
            sideOffset={5}
          >
            <div className="space-y-4">
              <div>
                <Label className="text-foreground">Quick Colors</Label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      className="w-10 h-10 rounded border-2 hover:scale-110 transition-transform"
                      style={{ backgroundColor: preset.value }}
                      onClick={() => {
                        onChange(preset.value);
                        setOpen(false);
                      }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground">Custom Color</Label>
                <div className="flex gap-2 mt-2">
                  <input
                    type="color"
                    value={hexColor}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-20 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={hexColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.match(/^#[0-9A-Fa-f]{6}$/) || val === '' || val.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                        onChange(val);
                      }
                    }}
                    placeholder="#000000"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setOpen(false);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

// Component for color picker with presets
const ColorPicker: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label: string;
  prefix?: string;
}> = ({ value, onChange, label, prefix = 'text' }) => {
  const hexColor = extractColorFromClass(value);
  
  const handleColorChange = (color: string) => {
    onChange(`${prefix}-[${color}]`);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <div 
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: hexColor }}
              />
              <span className="text-sm">{hexColor}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start" sideOffset={5}>
            <div className="space-y-4">
              <div>
                <Label className="text-foreground">Quick Colors</Label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      className="w-10 h-10 rounded border-2 hover:scale-110 transition-transform"
                      style={{ backgroundColor: preset.value }}
                      onClick={() => handleColorChange(preset.value)}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground">Custom Color</Label>
                <div className="flex gap-2 mt-2">
                  <input
                    type="color"
                    value={hexColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-20 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={hexColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${prefix}-<tailwind-color>`}
          className="flex-1"
        />
      </div>
    </div>
  );
};

// Component for spacing controls
const SpacingControl: React.FC<{
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  type: 'padding' | 'margin';
}> = ({ value, onChange, type }) => {
  const prefix = type === 'padding' ? 'p' : 'm';
  const breakpoints = ['', 'sm', 'md', 'lg', 'xl', '2xl'];

  const updateSpacing = (breakpoint: string, side: string, val: string) => {
    const newValue = { ...value };
    const key = breakpoint ? `${breakpoint}:${prefix}${side}` : `${prefix}${side}`;

    if (val === '0') {
      delete newValue[key];
    } else {
      newValue[key] = val;
    }
    onChange(newValue);
  };

  const getSpacingValue = (breakpoint: string, side: string) => {
    const key = breakpoint ? `${breakpoint}:${prefix}${side}` : `${prefix}${side}`;
    return value[key] || '0';
  };

  const renderBreakpointControls = (breakpoint: string) => {
    const allValue = getSpacingValue(breakpoint, '');
    const xValue = getSpacingValue(breakpoint, 'x');
    const yValue = getSpacingValue(breakpoint, 'y');

    return (
      <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
        {/* All sides */}
        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs">All</Label>
          <Select value={allValue} onValueChange={(val) => updateSpacing(breakpoint, '', val)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_OPTIONS.spacing.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Axis controls */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <Label className="w-20 text-xs">X (H)</Label>
            <Select value={xValue} onValueChange={(val) => updateSpacing(breakpoint, 'x', val)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_OPTIONS.spacing.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-20 text-xs">Y (V)</Label>
            <Select value={yValue} onValueChange={(val) => updateSpacing(breakpoint, 'y', val)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_OPTIONS.spacing.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Individual sides */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { side: 't', label: 'Top' },
            { side: 'r', label: 'Right' },
            { side: 'b', label: 'Bottom' },
            { side: 'l', label: 'Left' }
          ].map(({ side, label }) => (
            <div key={side} className="flex items-center gap-2">
              <Label className="w-20 text-xs">{label}</Label>
              <Select
                value={getSpacingValue(breakpoint, side)}
                onValueChange={(val) => updateSpacing(breakpoint, side, val)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_OPTIONS.spacing.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="capitalize">{type}</Label>
        <Badge variant="outline" className="bg-background text-foreground">{Object.keys(value).length} rules</Badge>
      </div>

      <Tabs defaultValue="" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="" className="text-xs">Base</TabsTrigger>
          <TabsTrigger value="sm" className="text-xs">SM</TabsTrigger>
          <TabsTrigger value="md" className="text-xs">MD</TabsTrigger>
          <TabsTrigger value="lg" className="text-xs">LG</TabsTrigger>
          <TabsTrigger value="xl" className="text-xs">XL</TabsTrigger>
          <TabsTrigger value="2xl" className="text-xs">2XL</TabsTrigger>
        </TabsList>
        {breakpoints.map(bp => (
          <TabsContent key={bp} value={bp}>
            {renderBreakpointControls(bp)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

// Visual style builder component
const VisualStyleBuilder: React.FC<{
  value: string;
  onChange: (value: string) => void;
  presetType: keyof typeof FIELD_PRESETS;
}> = ({ value, onChange, presetType }) => {
  const parsed = parseTailwindClasses(value);
  const [customClassesInput, setCustomClassesInput] = useState(parsed.custom.join(' '));

  // Update local state when parsed.custom changes from external updates
  React.useEffect(() => {
    setCustomClassesInput(parsed.custom.join(' '));
  }, [value]); // Re-sync when the full value changes

  const updateClasses = (updates: Partial<typeof parsed>) => {
    const newParsed = { ...parsed, ...updates };
    
    // Reconstruct the class string
    const classes = [];
    
    if (newParsed.fontSize) classes.push(newParsed.fontSize);
    if (newParsed.fontWeight) classes.push(newParsed.fontWeight);
    if (newParsed.textAlign) classes.push(newParsed.textAlign);
    if (newParsed.textColor) classes.push(newParsed.textColor);
    if (newParsed.bgColor) classes.push(newParsed.bgColor);
    if (newParsed.borderRadius) classes.push(newParsed.borderRadius);
    if (newParsed.borderWidth) classes.push(newParsed.borderWidth);
    if (newParsed.borderColor) classes.push(newParsed.borderColor);
    if (newParsed.shadow) classes.push(newParsed.shadow);
    if (newParsed.hoverTextColor) classes.push(newParsed.hoverTextColor);
    if (newParsed.hoverBackgoundColor) classes.push(newParsed.hoverBackgoundColor);
    
    // Add spacing classes
    Object.entries(newParsed.padding).forEach(([key, val]) => {
      // Handle responsive classes (e.g., "sm:p" -> "sm:p-4")
      if (key.includes(':')) {
        const [breakpoint, type] = key.split(':');
        classes.push(`${breakpoint}:${type}-${val}`);
      } else {
        classes.push(`${key}-${val}`);
      }
    });
    Object.entries(newParsed.margin).forEach(([key, val]) => {
      // Handle responsive classes (e.g., "md:m" -> "md:m-2")
      if (key.includes(':')) {
        const [breakpoint, type] = key.split(':');
        classes.push(`${breakpoint}:${type}-${val}`);
      } else {
        classes.push(`${key}-${val}`);
      }
    });

    // Add custom classes (filter empty strings to prevent double spaces)
    classes.push(...newParsed.custom.filter(Boolean));

    onChange(classes.join(' '));
  };

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4 border-green-300 border-2 rounded-lg p-2">
      {/* Quick presets */}
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4" />
          Quick Presets
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {FIELD_PRESETS[presetType].map(preset => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => onChange(preset.value)}
              className="justify-start text-xs"
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Visual builders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Typography */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Type className="w-4 h-4" />
            Typography
          </h4>
          
          <Select value={parsed.fontSize} onValueChange={(val) => updateClasses({ fontSize: val })}>
            <SelectTrigger>
              <SelectValue placeholder="Font Size" />
            </SelectTrigger>
            <SelectContent>
              {PRESET_OPTIONS.fontSize.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={parsed.fontWeight} onValueChange={(val) => updateClasses({ fontWeight: val })}>
            <SelectTrigger>
              <SelectValue placeholder="Font Weight" />
            </SelectTrigger>
            <SelectContent>
              {PRESET_OPTIONS.fontWeight.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToggleGroup 
            type="single" 
            value={parsed.textAlign} 
            onValueChange={(val) => updateClasses({ textAlign: val })}
          >
            {PRESET_OPTIONS.textAlign.map(opt => (
              <ToggleGroupItem key={opt.value} value={opt.value} className="data-[state=on]:bg-blue-100">
                <span className="text-xs">{opt.icon}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Appearance */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Paintbrush className="w-4 h-4" />
            Appearance
          </h4>

          <Select value={parsed.borderRadius} onValueChange={(val) => updateClasses({ borderRadius: val })}>
            <SelectTrigger>
              <SelectValue placeholder="Border Radius" />
            </SelectTrigger>
            <SelectContent>
              {PRESET_OPTIONS.borderRadius.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <span>{opt.preview}</span>
                    <span>{opt.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={parsed.shadow} onValueChange={(val) => updateClasses({ shadow: val })}>
            <SelectTrigger>
              <SelectValue placeholder="Shadow" />
            </SelectTrigger>
            <SelectContent>
              {PRESET_OPTIONS.shadow.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={parsed.borderWidth} onValueChange={(val) => updateClasses({ borderWidth: val })}>
            <SelectTrigger>
              <SelectValue placeholder="Border Width" />
            </SelectTrigger>
            <SelectContent>
              {PRESET_OPTIONS.borderWidth.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ColorPicker 
          value={parsed.textColor} 
          onChange={(val) => updateClasses({ textColor: val })}
          label="Text Color"
          prefix="text"
        />
        <ColorPicker 
          value={parsed.bgColor} 
          onChange={(val) => updateClasses({ bgColor: val })}
          label="Background Color"
          prefix="bg"
        />
        <ColorPicker 
            value={parsed.borderColor} 
            onChange={(val) => updateClasses({ borderColor: val })}
            label="Border Color"
            prefix="border"
        />
        <ColorPicker 
          value={parsed.hoverTextColor} 
          onChange={(val) => updateClasses({ hoverTextColor: val })}
          label="Hover Text Color"
          prefix="hover:text"
        />
        <ColorPicker 
          value={parsed.hoverBackgoundColor} 
          onChange={(val) => updateClasses({ hoverBackgoundColor: val })}
          label="Hover Background Color"
          prefix="hover:bg"
        />
      </div>

      {/* Advanced spacing */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            Advanced Spacing
          </span>
          {showAdvanced ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </Button>
        
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
            <SpacingControl 
              value={parsed.padding} 
              onChange={(val) => updateClasses({ padding: val })}
              type="padding"
            />
            <SpacingControl 
              value={parsed.margin} 
              onChange={(val) => updateClasses({ margin: val })}
              type="margin"
            />
          </div>
        )}
      </div>

      {/* Custom classes */}
      <div className="space-y-2">
        <Label>Custom Classes</Label>
        <Textarea
          value={customClassesInput}
          onChange={(e) => setCustomClassesInput(e.target.value)}
          onBlur={(e) => {
            const filtered = e.target.value.split(' ').filter(Boolean);
            setCustomClassesInput(filtered.join(' '));
            updateClasses({ custom: filtered });
          }}
          placeholder="Add any additional Tailwind classes here..."
          rows={2}
        />
      </div>

      {/* Full class string preview */}
      <div className="p-3 bg-gray-100 rounded-lg">
        <code className="text-xs text-gray-700 break-all">{value}</code>
      </div>
    </div>
  );
};

// Field-specific presets
const FIELD_PRESETS = {
  label: [
    { name: "Default", value: "block text-sm font-medium text-gray-700 mb-2" },
    { name: "Bold", value: "block text-base font-semibold text-gray-900 mb-3" },
    { name: "Uppercase", value: "block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2" },
    { name: "Minimal", value: "block text-sm font-normal text-gray-600 mb-1" },
  ],
  input: [
    { name: "Default", value: "w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" },
    { name: "Modern", value: "w-full rounded-xl border-gray-200 bg-muted/50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-colors" },
    { name: "Minimal", value: "w-full border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:ring-0 px-0 py-2" },
    { name: "Floating", value: "w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none" },
  ],
  select: [
    { name: "Default", value: "w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" },
    { name: "Modern", value: "w-full rounded-xl border-gray-200 bg-muted/50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-colors" },
    { name: "Minimal", value: "w-full border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:ring-0 px-0 py-2" },
    { name: "Floating", value: "w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none appearance-none" },
  ],
  checkbox: [
    { name: "Default", value: "focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded" },
    { name: "Large", value: "focus:ring-blue-500 h-5 w-5 text-blue-600 border-gray-300 rounded-md" },
    { name: "Square", value: "focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded-none" },
    { name: "Minimal", value: "focus:ring-gray-500 h-4 w-4 text-gray-600 border-gray-400 rounded" },
  ],
  radio: [
    { name: "Default", value: "focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300" },
    { name: "Large", value: "focus:ring-blue-500 h-5 w-5 text-blue-600 border-gray-300" },
    { name: "Colorful", value: "focus:ring-purple-500 h-5 w-5 text-purple-600 border-purple-300" },
    { name: "Minimal", value: "focus:ring-gray-500 h-4 w-4 text-gray-600 border-gray-400" },
  ],
  textarea: [
    { name: "Default", value: "w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" },
    { name: "Modern", value: "w-full rounded-xl border-gray-200 bg-muted/50 focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-colors" },
    { name: "Minimal", value: "w-full border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:ring-0 px-0 py-2 resize-none" },
    { name: "Large", value: "w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none min-h-[120px]" },
  ],
  button: [
    { name: "Default", value: "inline-flex justify-center py-2 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700" },
    { name: "Pill", value: "inline-flex justify-center py-3 px-8 text-base font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700" },
    { name: "Gradient", value: "inline-flex justify-center py-3 px-6 text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" },
    { name: "Outline", value: "inline-flex justify-center py-2 px-4 text-sm font-medium rounded-md border-2 border-blue-600 text-blue-600 hover:bg-blue-50" },
  ],
  card: [
    { name: "Default", value: "bg-white shadow-sm rounded-lg p-6 mb-6" },
    { name: "Bordered", value: "bg-white border-2 border-gray-200 rounded-xl p-8 mb-6" },
    { name: "Floating", value: "bg-white shadow-lg rounded-2xl p-8 mb-8 hover:shadow-xl transition-shadow" },
    { name: "Minimal", value: "bg-transparent border-b border-gray-200 pb-6 mb-6" },
  ],
  selectableBox: [
    { name: "Default", value: "p-4 transition-all duration-200 hover:shadow-sm cursor-pointer border border-gray-300 bg-white rounded-md" },
    { name: "Modern", value: "p-6 transition-all duration-300 cursor-pointer rounded-xl border border-gray-200 bg-white shadow-sm hover:scale-[1.02]" },
    { name: "Minimal", value: "p-6 transition-all duration-200 cursor-pointer border-b border-gray-100 bg-white hover:bg-muted/50" },
    { name: "Card Style", value: "p-6 transition-all duration-300 cursor-pointer rounded-2xl border-2 border-purple-200 bg-white shadow-sm hover:scale-105" },
    { name: "Corporate", value: "p-5 transition-all duration-200 cursor-pointer rounded-lg border border-slate-300 bg-white shadow-sm" },
    { name: "Dark", value: "p-5 transition-all duration-200 cursor-pointer rounded-lg border border-gray-600 bg-gray-800" },
  ],
  agreementContainer: [
    { name: "Default", value: "p-5 space-y-4" },
    { name: "Compact", value: "p-4 space-y-3" },
    { name: "Spacious", value: "p-8 space-y-6" },
    { name: "Minimal", value: "p-3 space-y-2" },
  ],
  agreementPanel: [
    { name: "Default", value: "rounded-md border p-3 text-sm whitespace-pre-wrap bg-muted/30" },
    { name: "Formal", value: "rounded-lg border-2 p-4 text-sm whitespace-pre-wrap bg-gray-50 border-gray-300" },
    { name: "Modern", value: "rounded-xl p-4 text-sm whitespace-pre-wrap bg-gradient-to-br from-gray-50 to-gray-100" },
    { name: "Minimal", value: "border-b pb-3 text-sm whitespace-pre-wrap" },
  ],
  signatureCanvas: [
    { name: "Default", value: "w-full h-40 border rounded-md overflow-hidden bg-background" },
    { name: "Large", value: "w-full h-48 border-2 rounded-lg overflow-hidden bg-white shadow-inner" },
    { name: "Minimal", value: "w-full h-36 border-b-2 bg-transparent" },
    { name: "Bordered", value: "w-full h-40 border-2 border-dashed rounded-md overflow-hidden bg-gray-50" },
  ],
};

// Resize Handle Component for the main layout
const ResizeHandle: React.FC = () => {
  const [isResizing, setIsResizing] = useState(false);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const containerWidth = window.innerWidth - 48; // Account for padding
      const leftWidth = Math.max(384, Math.min(containerWidth - 320, e.clientX - 24)); // Min 384px, max container - 320px
      const rightWidth = containerWidth - leftWidth;
      
      // Update CSS custom properties to control the flex layout
      document.documentElement.style.setProperty('--left-panel-width', `${leftWidth}px`);
      document.documentElement.style.setProperty('--right-panel-width', `${rightWidth}px`);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div
      className={`hidden lg:flex items-center justify-center w-6 cursor-col-resize bg-background hover:bg-blue-100 transition-colors relative group ${
        isResizing ? 'bg-blue-200 shadow-md' : ''
      }`}
      onMouseDown={handleMouseDown}
    >
      {/* Visual indicator */}
      <div className={`w-1 h-8 rounded-full transition-colors ${
        isResizing ? 'bg-blue-600' : 'bg-gray-400 group-hover:bg-blue-500'
      }`}>
      </div>
      
      {/* Tooltip */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 -mt-8">
        Drag to resize panels
      </div>
    </div>
  );
};

// Define the props
interface ThemeBuilderProps {
  onDataChange?: (data: { rootNode: NodeData | null; localizations: LocalizationMap; theme?: ThemeDefinition }) => void;
  customThemes?: Record<string, ThemeDefinition>;
  layout?: string | React.FC<LayoutProps>;
  logo?: any;
}

export const ThemeBuilder: React.FC<ThemeBuilderProps> = ({onDataChange, customThemes = {}, layout, logo = null}) => {
  const { state, updateTheme, exportSurvey } = useSurveyBuilder();
  const [currentTheme, setCurrentTheme] = useState<ThemeDefinition>(state.theme);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>(state.theme.name as string);
  const [showPreview, setShowPreview] = useState(true);
  const [editMode, setEditMode] = useState<'visual' | 'code'>('visual');

  
  // Step-based navigation state
  const [currentStep, setCurrentStep] = useState<ThemeStep>(state.theme.name === 'custom' ? 'basics' : 'selection');
  const [selectedPath, setSelectedPath] = useState<ThemePath | null>(null);

  // Initialize default layout widths
  useEffect(() => {
    const handleResize = () => {
      // Use requestAnimationFrame to ensure resize happens after layout
      requestAnimationFrame(() => {
        if (typeof window !== 'undefined') {
          const containerWidth = window.innerWidth - 48;
          
          if (window.innerWidth < 1024) {
            document.documentElement.style.setProperty('--left-panel-width', `${containerWidth}px`);
            document.documentElement.style.setProperty('--right-panel-width', '0px');
          } else {
            const defaultLeftWidth = Math.max(384, containerWidth * 0.6);
            const defaultRightWidth = containerWidth - defaultLeftWidth;
            document.documentElement.style.setProperty('--left-panel-width', `${defaultLeftWidth}px`);
            document.documentElement.style.setProperty('--right-panel-width', `${defaultRightWidth}px`);
          }
        }
      });
    };
  
    // Debounce function
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };
  
    // Set initial values
    handleResize();
  
    // Add multiple event listeners for better coverage
    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', handleResize);
  
    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Update local state when global theme changes
  useEffect(() => {
    setCurrentTheme(state.theme);
    setSelectedPreset(state.theme.name);
  }, [state.theme]);

  React.useEffect(() => {
    onDataChange?.(exportSurvey());
  }, [state.rootNode, state.localizations, onDataChange, currentTheme]);

  // Apply theme changes
  const handleThemeUpdate = (updatedTheme: Partial<ThemeDefinition>) => {
    const newTheme = { ...currentTheme, ...updatedTheme };
    setCurrentTheme(newTheme);
    updateTheme(newTheme);
  };

  // Apply a preset theme
  const handlePresetChange = (presetName: SurveyTheme) => {
    const preset = themes[presetName];
    if (preset) {
      setSelectedPreset(presetName);
      setCurrentTheme(preset);
      updateTheme(preset);
    }
  };

  // Update nested properties
  const updateNestedProperty = (section: keyof ThemeDefinition, key: string, value: string) => {
    if (section === 'colors' || section === 'field' || section === 'container' || section === 'progress' || section === 'button') {
      const updatedSection = {
        ...currentTheme[section],
        [key]: value,
      };
      handleThemeUpdate({ [section]: updatedSection });
    } else {
      handleThemeUpdate({ [section]: value });
    }
  };

  // Copy theme to clipboard
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(currentTheme, null, 2));
    setCopySuccess("Theme copied to clipboard!");
    setTimeout(() => setCopySuccess(null), 3000);
  };

  // Export theme as JSON file
  const handleExportTheme = () => {
    const dataStr = JSON.stringify(currentTheme, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentTheme.name}-theme.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import theme from JSON file
  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedTheme = JSON.parse(e.target?.result as string);
          setCurrentTheme(importedTheme);
          updateTheme(importedTheme);
          setSelectedPreset(importedTheme.name || "custom");
        } catch (error) {
          console.error('Error parsing theme file:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  // Reset to preset
  const handleResetToPreset = () => {
    if (selectedPreset !== "custom" && selectedPreset in themes) {
      handlePresetChange(selectedPreset as SurveyTheme);
    }
  };

  // Step configuration
  const steps: StepConfig[] = [
    {
      id: 'selection',
      title: 'Choose Approach',
      description: 'Select how you want to create your theme',
      icon: <Zap className="w-5 h-5" />,
      completed: selectedPath !== null
    },
    {
      id: 'basics',
      title: 'Basic Settings',
      description: 'Configure colors and basic styling',
      icon: <Palette className="w-5 h-5" />,
      completed: currentStep === 'advanced' || currentStep === 'review'
    },
    {
      id: 'advanced',
      title: 'Advanced Customization',
      description: 'Fine-tune all theme elements',
      icon: <Settings className="w-5 h-5" />,
      completed: currentStep === 'review'
    },
    {
      id: 'review',
      title: 'Review & Finalize',
      description: 'Preview and save your theme',
      icon: <Check className="w-5 h-5" />,
      completed: false
    }
  ];

  // Handle step navigation
  const goToStep = (step: ThemeStep) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  // Handle path selection
  const handlePathSelection = (path: ThemePath) => {
    setSelectedPath(path);
    
    switch (path) {
      case 'preset':
        // Will select preset in next step
        nextStep();
        break;
      case 'custom':
        // Start with a clean custom theme
        const customTheme: ThemeDefinition = {
          ...themes.default,
          name: 'custom'
        };
        setCurrentTheme(customTheme);
        updateTheme(customTheme);
        setSelectedPreset('custom');
        nextStep();
        break;
      case 'modify':
        // Continue with current theme
        nextStep();
        break;
    }
  };

  // Step Indicator Component
  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.completed;
        const isAccessible = index <= steps.findIndex(s => s.id === currentStep);
        
        return (
          <div key={step.id} className="flex items-center flex-1">
            <button
              onClick={() => isAccessible ? goToStep(step.id) : null}
              disabled={!isAccessible}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors w-full text-left ${
                isActive
                  ? 'bg-blue-50 border-2 border-blue-200 text-blue-900'
                  : isCompleted
                  ? 'bg-green-50 border-2 border-green-200 text-green-900 hover:bg-green-100'
                  : isAccessible
                  ? 'border-2 border-gray-200 hover:bg-gray-50'
                  : 'border-2 border-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <div className={`flex-shrink-0 p-2 rounded-full ${
                isActive
                  ? 'bg-blue-200'
                  : isCompleted
                  ? 'bg-green-200'
                  : 'bg-gray-200'
              }`}>
                {isCompleted ? <Check className="w-4 h-4" /> : step.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm">{step.title}</h3>
                <p className="text-xs opacity-70 mt-1">{step.description}</p>
              </div>
            </button>
            {index < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-400 mx-2 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );

  // Navigation Buttons Component
  const NavigationButtons = () => (
    <div className="flex items-center justify-between pt-6 border-t">
      <Button
        variant="outline"
        onClick={prevStep}
        disabled={currentStep === 'selection'}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Previous
      </Button>
      
      <div className="flex items-center gap-2">
        {currentStep === 'review' ? (
          <Button
            onClick={handleCopyToClipboard}
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy Theme
          </Button>
        ) : (
          <Button
            onClick={nextStep}
            className="flex items-center gap-2"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'selection':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Choose Your Approach
              </CardTitle>
              <CardDescription>
                How would you like to create your theme?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handlePathSelection('preset')}
                  className={`p-6 rounded-lg border-2 transition-all hover:scale-105 text-left ${
                    selectedPath === 'preset'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Sparkles className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Start with Preset</h3>
                  <p className="text-sm text-gray-600">
                    Choose from our professional theme presets and customize as needed
                  </p>
                </button>
                
                <button
                  onClick={() => handlePathSelection('custom')}
                  className={`p-6 rounded-lg border-2 transition-all hover:scale-105 text-left ${
                    selectedPath === 'custom'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Brush className="w-8 h-8 text-purple-600 mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Create Custom</h3>
                  <p className="text-sm text-gray-600">
                    Build a completely custom theme from scratch with full control
                  </p>
                </button>
                
                <button
                  onClick={() => handlePathSelection('modify')}
                  className={`p-6 rounded-lg border-2 transition-all hover:scale-105 text-left ${
                    selectedPath === 'modify'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Wrench className="w-8 h-8 text-green-600 mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Modify Current</h3>
                  <p className="text-sm text-gray-600">
                    Continue editing your current theme with advanced options
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>
        );
        
      case 'basics':
        return (
          <div className="space-y-6">
            {selectedPath === 'preset' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Choose Preset Theme
                  </CardTitle>
                  <CardDescription>
                    Select a professional theme as your starting point
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Default Themes */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">Default Themes</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      {Object.entries(themes)
                        .filter(([_, preset]) => preset !== undefined)
                        .map(([key, preset]) => (
                          <button
                            key={key}
                            onClick={() => handlePresetChange(key as SurveyTheme)}
                            className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                              selectedPreset === key
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                : 'border-border hover:border-muted-foreground'
                            }`}
                          >
                            <div className="text-sm font-medium text-start capitalize text-foreground">{preset.name}</div>
                            <div className="mt-2 flex gap-1">
                              <div
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: preset.colors.primary }}
                              />
                              <div
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: preset.colors.secondary }}
                              />
                              <div
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: preset.colors.accent }}
                              />
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Custom Themes */}
                  {Object.keys(customThemes).length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center gap-2">
                        <Brush className="w-4 h-4" />
                        Saved Custom Themes
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {Object.entries(customThemes).map(([key, preset]) => (
                          <button
                            key={key}
                            onClick={() => {
                              setSelectedPreset(key);
                              const themeWithName = { ...preset, name: key as any };
                              setCurrentTheme(themeWithName);
                              updateTheme(themeWithName);
                            }}
                            className={`p-4 rounded-lg border-2 transition-all hover:scale-105 relative ${
                              selectedPreset === key
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
                                : 'border-border hover:border-muted-foreground'
                            }`}
                          >
                            <Badge
                              variant="secondary"
                              className="absolute -top-2 -right-2 text-xs bg-purple-600 text-white hover:bg-purple-600"
                            >
                              Custom
                            </Badge>
                            <div className="text-sm font-medium text-start text-foreground truncate">{key}</div>
                            <div className="mt-2 flex gap-1">
                              <div
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: preset.colors.primary }}
                              />
                              <div
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: preset.colors.secondary }}
                              />
                              <div
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: preset.colors.accent }}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>Color Palette</CardTitle>
                <CardDescription>
                  Customize the main colors for your theme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.entries(currentTheme.colors).slice(0, 4).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label className="capitalize flex items-center gap-2">
                        {key}
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full h-12 justify-between"
                          >
                            <span className="text-sm font-mono">{value}</span>
                            <div 
                              className="w-8 h-8 rounded border"
                              style={{ backgroundColor: value }}
                            />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-4">
                            <div>
                              <Label>Quick Colors</Label>
                              <div className="grid grid-cols-6 gap-2 mt-2">
                                {COLOR_PRESETS.map(preset => (
                                  <button
                                    key={preset.value}
                                    className="w-10 h-10 rounded border-2 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: preset.value }}
                                    onClick={() => updateNestedProperty('colors', key, preset.value)}
                                    title={preset.name}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label>Custom Color</Label>
                              <div className="flex gap-2 mt-2">
                                <input
                                  type="color"
                                  value={value}
                                  onChange={(e) => updateNestedProperty('colors', key, e.target.value)}
                                  className="w-20 h-10 rounded cursor-pointer"
                                />
                                <Input
                                  value={value}
                                  onChange={(e) => updateNestedProperty('colors', key, e.target.value)}
                                  placeholder="#000000"
                                />
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 'advanced':
        return (
          editMode === 'visual' ? (
            <Tabs defaultValue="colors" className="space-y-4">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="colors" className="flex items-center gap-1">
                  <Palette className="w-4 h-4" />
                  <span className="hidden sm:inline">Colors</span>
                </TabsTrigger>
                <TabsTrigger value="layout" className="flex items-center gap-1">
                  <Layout className="w-4 h-4" />
                  <span className="hidden sm:inline">Layout</span>
                </TabsTrigger>
                <TabsTrigger value="typography" className="flex items-center gap-1">
                  <Type className="w-4 h-4" />
                  <span className="hidden sm:inline">Typography</span>
                </TabsTrigger>
                <TabsTrigger value="fonts" className="flex items-center gap-1">
                  <PenLine className="w-4 h-4" />
                  <span className="hidden sm:inline">Fonts</span>
                </TabsTrigger>
                <TabsTrigger value="fields" className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">Fields</span>
                </TabsTrigger>
                <TabsTrigger value="buttons" className="flex items-center gap-1">
                  <MousePointer className="w-4 h-4" />
                  <span className="hidden sm:inline">Buttons</span>
                </TabsTrigger>
                <TabsTrigger value="progress" className="flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Progress</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="colors" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Color Palette</CardTitle>
                    <CardDescription>
                      Click on any color to customize it with the visual picker
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {Object.entries(currentTheme.colors).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <Label className="capitalize flex items-center gap-2">
                            {key}
                            <Popover>
                              <PopoverTrigger>
                                <Info className="w-3 h-3 text-gray-400" />
                              </PopoverTrigger>
                              <PopoverContent className="text-sm">
                                {key === 'primary' && "Main brand color used for primary actions"}
                                {key === 'secondary' && "Supporting color for secondary elements"}
                                {key === 'accent' && "Highlight color for special elements"}
                                {key === 'background' && "Main background color"}
                                {key === 'text' && "Primary text color"}
                                {key === 'border' && "Default border color"}
                                {key === 'error' && "Color for error messages"}
                                {key === 'success' && "Color for success messages"}
                              </PopoverContent>
                            </Popover>
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full h-12 justify-between"
                              >
                                <span className="text-sm font-mono">{value}</span>
                                <div 
                                  className="w-8 h-8 rounded border"
                                  style={{ backgroundColor: value }}
                                />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-4">
                                <div>
                                  <Label>Quick Colors</Label>
                                  <div className="grid grid-cols-6 gap-2 mt-2">
                                    {COLOR_PRESETS.map(preset => (
                                      <button
                                        key={preset.value}
                                        className="w-10 h-10 rounded border-2 hover:scale-110 transition-transform"
                                        style={{ backgroundColor: preset.value }}
                                        onClick={() => updateNestedProperty('colors', key, preset.value)}
                                        title={preset.name}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <Label>Custom Color</Label>
                                  <div className="flex gap-2 mt-2">
                                    <input
                                      type="color"
                                      value={value}
                                      onChange={(e) => updateNestedProperty('colors', key, e.target.value)}
                                      className="w-20 h-10 rounded cursor-pointer"
                                    />
                                    <Input
                                      value={value}
                                      onChange={(e) => updateNestedProperty('colors', key, e.target.value)}
                                      placeholder="#000000"
                                    />
                                  </div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="layout" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Container & Layout</CardTitle>
                    <CardDescription>
                      Configure the overall structure and spacing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Grid3X3 className="w-4 h-4" />
                          Container Width
                        </Label>
                        <Select
                          value={currentTheme.containerLayout.match(/max-w-\w+/)?.[0] || 'max-w-2xl'}
                          onValueChange={(val) => {
                            const hasWidth = /max-w-\w+/.test(currentTheme.containerLayout);
                            const newLayout = hasWidth
                              ? currentTheme.containerLayout.replace(/max-w-\w+/, val)
                              : `${currentTheme.containerLayout} ${val}`.trim();
                            handleThemeUpdate({ containerLayout: newLayout });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRESET_OPTIONS.containerWidth.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="mb-2">Container Padding</Label>
                        <SpacingControl
                          type="padding"
                          value={parseContainerLayoutSpacing(currentTheme.containerLayout).padding}
                          onChange={(newPadding) => {
                            const currentSpacing = parseContainerLayoutSpacing(currentTheme.containerLayout);
                            const newLayout = updateContainerLayoutSpacing(
                              currentTheme.containerLayout,
                              newPadding,
                              currentSpacing.margin
                            );
                            handleThemeUpdate({ containerLayout: newLayout });
                          }}
                        />
                      </div>

                      <div>
                        <Label className="mb-2">Container Margin</Label>
                        <SpacingControl
                          type="margin"
                          value={parseContainerLayoutSpacing(currentTheme.containerLayout).margin}
                          onChange={(newMargin) => {
                            const currentSpacing = parseContainerLayoutSpacing(currentTheme.containerLayout);
                            const newLayout = updateContainerLayoutSpacing(
                              currentTheme.containerLayout,
                              currentSpacing.padding,
                              newMargin
                            );
                            handleThemeUpdate({ containerLayout: newLayout });
                          }}
                        />
                      </div>

                      <Separator />

                      <div>
                        <Label>Background Style</Label>
                        <VisualStyleBuilder
                          value={currentTheme.background}
                          onChange={(val) => handleThemeUpdate({ background: val })}
                          presetType="card"
                        />
                      </div>

                      <div>
                        <Label>Card Style</Label>
                        <VisualStyleBuilder
                          value={currentTheme.card}
                          onChange={(val) => handleThemeUpdate({ card: val })}
                          presetType="card"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="typography" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Typography Settings</CardTitle>
                    <CardDescription>
                      Customize text styles for headers and descriptions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="mb-2">Title Style</Label>
                      <VisualStyleBuilder
                        value={currentTheme.title}
                        onChange={(val) => handleThemeUpdate({ title: val })}
                        presetType="label"
                      />
                    </div>

                    <Separator />

                    <div>
                      <Label className="mb-2">Description Style</Label>
                      <VisualStyleBuilder
                        value={currentTheme.description}
                        onChange={(val) => handleThemeUpdate({ description: val })}
                        presetType="label"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fields" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Form Field Styles</CardTitle>
                    <CardDescription>
                      Customize each form element type with visual tools
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="label" className="space-y-4">
                      <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-1">
                        <TabsTrigger value="label">Label</TabsTrigger>
                        <TabsTrigger value="input">Input</TabsTrigger>
                        <TabsTrigger value="select">Select</TabsTrigger>
                        <TabsTrigger value="checkbox">Checkbox</TabsTrigger>
                        <TabsTrigger value="radio">Radio</TabsTrigger>
                        <TabsTrigger value="textarea">Textarea</TabsTrigger>
                        <TabsTrigger value="selectableBox" className="flex items-center gap-1">
                          <CheckSquare className="w-3 h-3" />
                          <span className="hidden lg:inline">Box</span>
                        </TabsTrigger>
                        <TabsTrigger value="agreement" className="flex items-center gap-1">
                          <PenLine className="w-3 h-3" />
                          <span className="hidden lg:inline">Agreement</span>
                        </TabsTrigger>
                      </TabsList>

                      {Object.entries({
                        label: 'label',
                        input: 'input',
                        select: 'select',
                        checkbox: 'checkbox',
                        radio: 'radio',
                        textarea: 'textarea',
                        selectableBox: 'selectableBox'
                      }).map(([key, presetKey]) => (
                        <TabsContent key={key} value={key}>
                          {key === 'selectableBox' ? (
                            <div className="space-y-6">
                              <Alert>
                                <CheckSquare className="w-4 h-4" />
                                <AlertDescription>
                                  Customize the appearance of selectable box questions. These settings affect the overall container, selected state, hover effects, and more.
                                </AlertDescription>
                              </Alert>
                              
                              <div className="grid grid-cols-1 gap-6">
                                <div>
                                  <Label className="text-base font-semibold mb-3 block">Base Box Style</Label>
                                  <VisualStyleBuilder
                                    value={currentTheme.field.selectableBox || ""}
                                    onChange={(val) => updateNestedProperty('field', 'selectableBox', val)}
                                    presetType="selectableBox"
                                  />
                                </div>
                                
                                <Separator />
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">Default State</Label>
                                    <VisualStyleBuilder
                                      value={currentTheme.field.selectableBoxDefault || ""}
                                      onChange={(val) => updateNestedProperty('field', 'selectableBoxDefault', val)}
                                      presetType="selectableBox"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">Selected State</Label>
                                    <VisualStyleBuilder
                                      value={currentTheme.field.selectableBoxSelected || ""}
                                      onChange={(val) => updateNestedProperty('field', 'selectableBoxSelected', val)}
                                      presetType="selectableBox"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">Hover Style</Label>
                                    <VisualStyleBuilder
                                      value={currentTheme.field.selectableBoxHover || ""}
                                      onChange={(val) => updateNestedProperty('field', 'selectableBoxHover', val)}
                                      presetType="selectableBox"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">Focus Style</Label>
                                    <VisualStyleBuilder
                                      value={currentTheme.field.selectableBoxFocus || ""}
                                      onChange={(val) => updateNestedProperty('field', 'selectableBoxFocus', val)}
                                      presetType="selectableBox"
                                    />
                                  </div>
                                </div>
                                
                                <Separator />
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">Text Style</Label>
                                    <VisualStyleBuilder
                                      value={currentTheme.field.selectableBoxText || ""}
                                      onChange={(val) => updateNestedProperty('field', 'selectableBoxText', val)}
                                      presetType="label"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">Selected Text Style</Label>
                                    <VisualStyleBuilder
                                      value={currentTheme.field.selectableBoxTextSelected || ""}
                                      onChange={(val) => updateNestedProperty('field', 'selectableBoxTextSelected', val)}
                                      presetType="label"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">Selection Indicator</Label>
                                    <VisualStyleBuilder
                                      value={currentTheme.field.selectableBoxIndicator || ""}
                                      onChange={(val) => updateNestedProperty('field', 'selectableBoxIndicator', val)}
                                      presetType="button"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">Indicator Icon</Label>
                                    <VisualStyleBuilder
                                      value={currentTheme.field.selectableBoxIndicatorIcon || ""}
                                      onChange={(val) => updateNestedProperty('field', 'selectableBoxIndicatorIcon', val)}
                                      presetType="label"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <VisualStyleBuilder
                              value={currentTheme.field[key as keyof typeof currentTheme.field] ?? ''}
                              onChange={(val) => updateNestedProperty('field', key, val)}
                              presetType={presetKey as keyof typeof FIELD_PRESETS}
                            />
                          )}
                        </TabsContent>
                      ))}
                      <TabsContent key="agreement" value="agreement">
                        <div className="space-y-6">
                          <Alert>
                            <PenLine className="w-4 h-4" />
                            <AlertDescription>
                              Customize the appearance of agreement blocks with name input and signature canvas.
                            </AlertDescription>
                          </Alert>
                          
                          <div className="grid grid-cols-1 gap-6">
                            <div>
                              <Label className="text-base font-semibold mb-3 block">Agreement Container</Label>
                              <VisualStyleBuilder
                                value={currentTheme.field.agreementContainer || "p-5 space-y-4"}
                                onChange={(val) => updateNestedProperty('field', 'agreementContainer', val)}
                                presetType="agreementContainer"
                              />
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <Label className="text-base font-semibold mb-3 block">Agreement Text Panel</Label>
                              <VisualStyleBuilder
                                value={currentTheme.field.agreementPanel || "rounded-md border p-3 text-sm whitespace-pre-wrap bg-muted/30"}
                                onChange={(val) => updateNestedProperty('field', 'agreementPanel', val)}
                                presetType="agreementPanel"
                              />
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <Label className="text-base font-semibold mb-3 block">Signature Canvas</Label>
                              <VisualStyleBuilder
                                value={currentTheme.field.signatureCanvas || "w-full h-40 border rounded-md overflow-hidden bg-background"}
                                onChange={(val) => updateNestedProperty('field', 'signatureCanvas', val)}
                                presetType="signatureCanvas"
                              />
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <Label className="text-base font-semibold mb-3 block">Signature Color</Label>
                              <HexColorPicker 
                                value={currentTheme.field.signatureColor || "#000000"} 
                                onChange={(val) => updateNestedProperty('field', 'signatureColor', val)}
                                label="Signature Stroke Color"
                              />
                              <p className="text-xs text-muted-foreground mt-2">
                                The color of the signature stroke when drawing. Should be a hex color value.
                              </p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="buttons" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Button Styles</CardTitle>
                    <CardDescription>
                      Design your buttons with visual customization tools
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="primary" className="space-y-4">
                      <TabsList className="grid grid-cols-4">
                        <TabsTrigger value="primary">Primary</TabsTrigger>
                        <TabsTrigger value="secondary">Secondary</TabsTrigger>
                        <TabsTrigger value="text">Text</TabsTrigger>
                        <TabsTrigger value="navigation">Navigation</TabsTrigger>
                      </TabsList>

                      {Object.entries(currentTheme.button).map(([key]) => (
                        <TabsContent key={key} value={key}>
                          <VisualStyleBuilder
                            value={currentTheme.button[key as keyof typeof currentTheme.button]}
                            onChange={(val) => updateNestedProperty('button', key, val)}
                            presetType="button"
                          />
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="progress" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Progress Indicators</CardTitle>
                    <CardDescription>
                      Style progress bars and navigation elements
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-6">
                      {Object.entries(currentTheme.progress).map(([key, value]) => (
                        <div key={key}>
                          <Label className="capitalize mb-2">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </Label>
                          <VisualStyleBuilder
                            value={value}
                            onChange={(val) => updateNestedProperty('progress', key, val)}
                            presetType="label"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fonts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Custom Fonts</CardTitle>
                    <CardDescription>
                      Load custom fonts from CDN URLs and configure font families
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Font CDN URLs */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Font CDN URLs</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const urls = currentTheme.fonts?.urls || [];
                            const newTheme = {
                              ...currentTheme,
                              fonts: {
                                ...currentTheme.fonts,
                                urls: [...urls, '']
                              }
                            };
                            setCurrentTheme(newTheme);
                            updateTheme(newTheme);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add URL
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Add URLs from Google Fonts, Adobe Fonts, or any other CDN
                      </p>

                      {(currentTheme.fonts?.urls || []).length === 0 ? (
                        <Alert>
                          <Info className="w-4 h-4" />
                          <AlertDescription>
                            No font URLs configured. Click "Add URL" to load custom fonts from a CDN.
                            <br />
                            <br />
                            Example: https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-2">
                          {(currentTheme.fonts?.urls || []).map((url, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={url}
                                onChange={(e) => {
                                  const urls = [...(currentTheme.fonts?.urls || [])];
                                  urls[index] = e.target.value;
                                  const newTheme = {
                                    ...currentTheme,
                                    fonts: {
                                      ...currentTheme.fonts,
                                      urls
                                    }
                                  };
                                  setCurrentTheme(newTheme);
                                  updateTheme(newTheme);
                                }}
                                placeholder="https://fonts.googleapis.com/css2?family=..."
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const urls = (currentTheme.fonts?.urls || []).filter((_, i) => i !== index);
                                  const newTheme = {
                                    ...currentTheme,
                                    fonts: {
                                      ...currentTheme.fonts,
                                      urls
                                    }
                                  };
                                  setCurrentTheme(newTheme);
                                  updateTheme(newTheme);
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Font Families */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-semibold">Font Families</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Configure font families for different text elements
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {/* Primary Font */}
                        <div className="space-y-2">
                          <Label>Primary Font</Label>
                          <Input
                            value={currentTheme.fonts?.primary || ''}
                            onChange={(e) => {
                              const newTheme = {
                                ...currentTheme,
                                fonts: {
                                  ...currentTheme.fonts,
                                  primary: e.target.value
                                }
                              };
                              setCurrentTheme(newTheme);
                              updateTheme(newTheme);
                            }}
                            placeholder='Inter, sans-serif'
                          />
                          <p className="text-xs text-muted-foreground">
                            Main font family used across the survey (spaces will be auto-quoted)
                          </p>
                        </div>

                        {/* Heading Font */}
                        <div className="space-y-2">
                          <Label>Heading Font</Label>
                          <Input
                            value={currentTheme.fonts?.heading || ''}
                            onChange={(e) => {
                              const newTheme = {
                                ...currentTheme,
                                fonts: {
                                  ...currentTheme.fonts,
                                  heading: e.target.value
                                }
                              };
                              setCurrentTheme(newTheme);
                              updateTheme(newTheme);
                            }}
                            placeholder='Playfair Display, serif'
                          />
                          <p className="text-xs text-muted-foreground">
                            Font family for headings (h1-h6)
                          </p>
                        </div>

                        {/* Body Font */}
                        <div className="space-y-2">
                          <Label>Body Font</Label>
                          <Input
                            value={currentTheme.fonts?.body || ''}
                            onChange={(e) => {
                              const newTheme = {
                                ...currentTheme,
                                fonts: {
                                  ...currentTheme.fonts,
                                  body: e.target.value
                                }
                              };
                              setCurrentTheme(newTheme);
                              updateTheme(newTheme);
                            }}
                            placeholder='Inter, sans-serif'
                          />
                          <p className="text-xs text-muted-foreground">
                            Font family for body text
                          </p>
                        </div>

                        {/* Secondary Font */}
                        <div className="space-y-2">
                          <Label>Secondary Font (Optional)</Label>
                          <Input
                            value={currentTheme.fonts?.secondary || ''}
                            onChange={(e) => {
                              const newTheme = {
                                ...currentTheme,
                                fonts: {
                                  ...currentTheme.fonts,
                                  secondary: e.target.value
                                }
                              };
                              setCurrentTheme(newTheme);
                              updateTheme(newTheme);
                            }}
                            placeholder='Roboto, sans-serif'
                          />
                        </div>

                        {/* Monospace Font */}
                        <div className="space-y-2">
                          <Label>Monospace Font (Optional)</Label>
                          <Input
                            value={currentTheme.fonts?.monospace || ''}
                            onChange={(e) => {
                              const newTheme = {
                                ...currentTheme,
                                fonts: {
                                  ...currentTheme.fonts,
                                  monospace: e.target.value
                                }
                              };
                              setCurrentTheme(newTheme);
                              updateTheme(newTheme);
                            }}
                            placeholder='Courier New, monospace'
                          />
                          <p className="text-xs text-muted-foreground">
                            Font family for code and pre elements
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Font Weights */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-semibold">Font Weights</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Configure font weights for different text styles
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Normal Weight */}
                        <div className="space-y-2">
                          <Label>Normal</Label>
                          <Input
                            type="number"
                            value={currentTheme.fonts?.weights?.normal || 400}
                            onChange={(e) => {
                              const newTheme = {
                                ...currentTheme,
                                fonts: {
                                  ...currentTheme.fonts,
                                  weights: {
                                    ...currentTheme.fonts?.weights,
                                    normal: parseInt(e.target.value) || 400
                                  }
                                }
                              };
                              setCurrentTheme(newTheme);
                              updateTheme(newTheme);
                            }}
                            min="100"
                            max="900"
                            step="100"
                          />
                        </div>

                        {/* Medium Weight */}
                        <div className="space-y-2">
                          <Label>Medium</Label>
                          <Input
                            type="number"
                            value={currentTheme.fonts?.weights?.medium || 500}
                            onChange={(e) => {
                              const newTheme = {
                                ...currentTheme,
                                fonts: {
                                  ...currentTheme.fonts,
                                  weights: {
                                    ...currentTheme.fonts?.weights,
                                    medium: parseInt(e.target.value) || 500
                                  }
                                }
                              };
                              setCurrentTheme(newTheme);
                              updateTheme(newTheme);
                            }}
                            min="100"
                            max="900"
                            step="100"
                          />
                        </div>

                        {/* Semibold Weight */}
                        <div className="space-y-2">
                          <Label>Semibold</Label>
                          <Input
                            type="number"
                            value={currentTheme.fonts?.weights?.semibold || 600}
                            onChange={(e) => {
                              const newTheme = {
                                ...currentTheme,
                                fonts: {
                                  ...currentTheme.fonts,
                                  weights: {
                                    ...currentTheme.fonts?.weights,
                                    semibold: parseInt(e.target.value) || 600
                                  }
                                }
                              };
                              setCurrentTheme(newTheme);
                              updateTheme(newTheme);
                            }}
                            min="100"
                            max="900"
                            step="100"
                          />
                        </div>

                        {/* Bold Weight */}
                        <div className="space-y-2">
                          <Label>Bold</Label>
                          <Input
                            type="number"
                            value={currentTheme.fonts?.weights?.bold || 700}
                            onChange={(e) => {
                              const newTheme = {
                                ...currentTheme,
                                fonts: {
                                  ...currentTheme.fonts,
                                  weights: {
                                    ...currentTheme.fonts?.weights,
                                    bold: parseInt(e.target.value) || 700
                                  }
                                }
                              };
                              setCurrentTheme(newTheme);
                              updateTheme(newTheme);
                            }}
                            min="100"
                            max="900"
                            step="100"
                          />
                        </div>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Advanced Code Editor</CardTitle>
                <CardDescription>
                  Edit the theme JSON directly for full control
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      Changes made here will be applied immediately. Make sure your JSON is valid!
                    </AlertDescription>
                  </Alert>
                  <Textarea
                    value={JSON.stringify(currentTheme, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setCurrentTheme(parsed);
                        updateTheme(parsed);
                      } catch (error) {
                        // Invalid JSON, don't update
                      }
                    }}
                    className="font-mono text-sm min-h-[400px]"
                    spellCheck={false}
                  />
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyToClipboard}
                      className="flex items-center gap-2"
                    >
                      <ClipboardCopy className="w-4 h-4" />
                      Copy JSON
                    </Button>
                    <div className="text-sm text-gray-500">
                      {Object.keys(currentTheme).length} properties
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        );
        
      case 'review':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  Theme Review
                </CardTitle>
                <CardDescription>
                  Review your theme settings and make final adjustments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-lg font-semibold">Theme Summary</Label>
                    <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Theme Name:</span> {currentTheme.name}
                        </div>
                        <div>
                          <span className="font-medium">Primary Color:</span>
                          <div className="inline-flex items-center gap-2 ml-2">
                            <div 
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: currentTheme.colors.primary }}
                            />
                            {currentTheme.colors.primary}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={handleCopyToClipboard}
                      className="flex items-center gap-2"
                    >
                      <ClipboardCopy className="w-4 h-4" />
                      Copy JSON
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportTheme}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export Theme
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {editMode === 'code' && (
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Code Editor</CardTitle>
                  <CardDescription>
                    Edit the theme JSON directly for full control
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        Changes made here will be applied immediately. Make sure your JSON is valid!
                      </AlertDescription>
                    </Alert>
                    <Textarea
                      value={JSON.stringify(currentTheme, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setCurrentTheme(parsed);
                          updateTheme(parsed);
                        } catch (error) {
                          // Invalid JSON, don't update
                        }
                      }}
                      className="font-mono text-sm min-h-[400px]"
                      spellCheck={false}
                    />
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyToClipboard}
                        className="flex items-center gap-2"
                      >
                        <ClipboardCopy className="w-4 h-4" />
                        Copy JSON
                      </Button>
                      <div className="text-sm text-gray-500">
                        {Object.keys(currentTheme).length} properties
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Layout - Resizable Two Column Layout on Desktop, Single Column on Mobile */}
      <div className="flex flex-col lg:flex-row lg:h-screen min-h-full">
        
        {/* Theme Builder Column - Flexible width */}
        <div 
          className="flex-1 lg:min-w-96 space-y-6 p-4 lg:p-2 rounded-md lg:pr-3 overflow-y-auto relative"
          style={{
            width: 'var(--left-panel-width, auto)',
            maxWidth: 'var(--left-panel-width, none)',
            flexShrink: 0
          }}
        >
          
          {/* Step Indicator */}
          <StepIndicator />

          {/* Header Controls - Only show on advanced/review steps */}
          {(currentStep === 'advanced' || currentStep === 'review') && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetToPreset}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportTheme}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
                <label className="cursor-pointer">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex items-center gap-2"
                  >
                    <span>
                      <Upload className="w-4 h-4" />
                      Import
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportTheme}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <ToggleGroup 
                  type="single" 
                  value={editMode} 
                  onValueChange={(val) => val && setEditMode(val as 'visual' | 'code')}
                >
                  <ToggleGroupItem value="visual" className="data-[state=on]:bg-blue-100 dark:bg-blue-800">
                    <Palette className="w-4 h-4 mr-1" />
                    Visual
                  </ToggleGroupItem>
                  <ToggleGroupItem value="code" className="data-[state=on]:bg-blue-100 data-[state=on]:dark:bg-blue-800">
                    <Type className="w-4 h-4 mr-1" />
                    Code
                  </ToggleGroupItem>
                </ToggleGroup>
                {/* Preview toggle - only show on mobile */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex lg:hidden items-center gap-2"
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  Preview
                </Button>
              </div>
            </div>
          )}

          {copySuccess && (
            <Alert variant="default" className="bg-green-50 border-green-300 text-green-800">
              <AlertDescription>{copySuccess}</AlertDescription>
            </Alert>
          )}

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation */}
          {currentStep !== 'selection' && <NavigationButtons />}

          {/* Mobile Preview */}
          {showPreview && (
            <div className="lg:hidden rounded-xl">
              <ThemePreview theme={currentTheme} state={state} />
            </div>
          )}
        </div>

        {/* Resize Handle - Only visible on desktop */}
        <ResizeHandle />

        {/* Preview Column - Resizable width on desktop */}
        <div 
          className="hidden lg:block lg:min-w-80 lg:max-w-2xl overflow-hidden rounded-xl"
          style={{
            width: 'var(--right-panel-width, auto)',
            maxWidth: 'var(--right-panel-width, none)',
            flexShrink: 0
          }}
        >
          <ThemePreview theme={currentTheme} state={state} layout={layout} logo={logo}/>
        </div>
      </div>
    </div>
  );
};