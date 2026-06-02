import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Package, Sun, Moon, Monitor, Smartphone, Tablet, Laptop, Monitor as MonitorIcon } from "lucide-react";
import { SurveyForm } from "../../../renderer/SurveyForm";
import { ThemeDefinition, SurveyBuilderState } from "../../../types";
import type { LayoutProps } from "../../../types";

// Theme mode type
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemePreviewProps {
  theme: ThemeDefinition;
  state: SurveyBuilderState;
  layout?: string | React.FC<LayoutProps>;
  logo?: any;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({ theme, state, layout, logo = null }) => {
  const [surveyThemeMode, setSurveyThemeMode] = useState<ThemeMode>('light');
  const [previewWidth, setPreviewWidth] = useState(400);

  // Predefined viewport sizes
  const viewportPresets = [
    { name: "Mobile", width: 375, icon: Smartphone },
    { name: "Tablet", width: 768, icon: Tablet },
    { name: "Desktop", width: 1024, icon: Laptop },
    { name: "Large", width: 1440, icon: MonitorIcon },
  ];

  // Handle system theme changes - for theme mode switcher in preview
  useEffect(() => {
    if (surveyThemeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        // Force re-render when system theme changes
        setSurveyThemeMode('system');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [surveyThemeMode]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Survey Preview</CardTitle>
          
          {/* Theme mode switcher */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Theme:</span>
            <div className="flex rounded-lg border border-border p-1">
              <Button
                variant={surveyThemeMode === 'light' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSurveyThemeMode('light')}
                className="h-7 px-3"
              >
                <Sun className="w-3 h-3 mr-1" />
                Light
              </Button>
              <Button
                variant={surveyThemeMode === 'dark' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSurveyThemeMode('dark')}
                className="h-7 px-3"
              >
                <Moon className="w-3 h-3 mr-1" />
                Dark
              </Button>
              <Button
                variant={surveyThemeMode === 'system' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSurveyThemeMode('system')}
                className="h-7 px-3"
              >
                <Monitor className="w-3 h-3 mr-1" />
                Auto
              </Button>
            </div>
          </div>
        </div>

        {/* Viewport controls */}
        {/* <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Size:</span>
          <div className="flex gap-1">
            {viewportPresets.map((preset) => {
              const IconComponent = preset.icon;
              return (
                <Button
                  key={preset.name}
                  variant={previewWidth === preset.width ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewWidth(preset.width)}
                  className="h-7 px-3 text-xs"
                >
                  <IconComponent className="w-3 h-3 mr-1" />
                  {preset.name}
                </Button>
              );
            })}
          </div>
        </div> */}
      </CardHeader>

      <CardContent className="flex-1 p-0 relative overflow-hidden">
        {/* Responsive preview wrapper */}
        <div className="max-h-screen min-h-screen overflow-auto flex items-start justify-center p-4">
          <div className="survey-preview-content transition-all duration-300 w-full">
            {state.rootNode ? (
              <SurveyForm
                survey={{ ...state, theme, rootNode: state.rootNode }}
                mode={state.mode}
                enableDebug={false}
                abTestPreviewMode={true}
                layout={layout}
                theme={theme.name}
                themeMode={surveyThemeMode}
                customData={state.customData}
                logo={logo}
                progressBar={{
                  type: 'percentage',
                  showPercentage: true,
                  showStepInfo: true,
                  position: 'top',
                }}
              />
            ) : (
              <div className="p-8 text-center rounded-xl border-2 border-dashed transition-colors">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Add some blocks to see survey in action</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemePreview;