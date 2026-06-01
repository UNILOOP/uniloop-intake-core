import React, { useState, useEffect, useRef } from "react";
import { BlockDefinition, CalculatedFieldProps, ContentBlockItemProps } from "../types";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { executeCalculation } from '../utils/conditionalUtils';
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Calculator, CheckCircle, Info } from "lucide-react";
import { useSurveyForm } from '../context/SurveyFormContext';
import { themes } from '../themes';
import { cn } from '../lib/utils';
import { AlertCircle } from 'lucide-react';


// Form component for editing the block configuration
const CalculatedFieldForm: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  // Handle field changes
  const handleChange = (field: string, value: string) => {
    onUpdate?.({
      ...data,
      [field]: value,
    });
  };

  // Handle dependencies array
  const handleDependenciesChange = (value: string) => {
    const dependencies = value.split(',').map(dep => dep.trim()).filter(dep => dep.length > 0);
    onUpdate?.({
      ...data,
      dependencies: dependencies,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm" htmlFor="label">Label</Label>
        <Input
          id="label"
          value={data.label || ""}
          onChange={(e) => handleChange("label", e.target.value)}
          placeholder="Calculated Result"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={data.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="This field is automatically calculated"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="formula">Formula</Label>
        <Textarea
          id="formula"
          value={data.formula || ""}
          onChange={(e) => handleChange("formula", e.target.value)}
          placeholder={`// Simple calculation
return fieldA + fieldB * 0.5;

// Or complex logic
if (!bmiCalculator) return "Please complete BMI calculation";
const bmi = Number(bmiCalculator.bmi);
if (bmi >= 30) return "High Risk";
return "Low Risk";`}
          className="font-mono text-sm min-h-[120px]"
          rows={8}
        />
        <p className="text-xs text-muted-foreground">
          Full JavaScript code block. Can return numbers, strings, or complex objects. Use field names as variables.
        </p>
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded space-y-2">
          <strong>Examples:</strong>
          <div className="space-y-2">
            <div>
              <strong>Simple calculation:</strong>
              <code className="block mt-1 p-2 bg-background rounded">return height * weight / 10000;</code>
            </div>
            <div>
              <strong>Conditional logic:</strong>
              <code className="block mt-1 p-2 bg-background rounded text-xs whitespace-pre">{`if (!income) return "No data";
if (income > 100000) return "High earner";
return "Standard";`}</code>
            </div>
            <div>
              <strong>Complex object access:</strong>
              <code className="block mt-1 p-2 bg-background rounded text-xs whitespace-pre">{`if (!bmiCalculator?.bmi) return "Incomplete";
const bmi = bmiCalculator.bmi;
return bmi > 25 ? "Overweight" : "Normal";`}</code>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="dependencies">Dependencies</Label>
        <Input
          id="dependencies"
          value={data.dependencies?.join(', ') || ""}
          onChange={(e) => handleDependenciesChange(e.target.value)}
          placeholder="fieldA, fieldB, fieldC"
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated list of field names that this calculation depends on
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="note">Note</Label>
        <Input
          id="note"
          value={data.note || ""}
          onChange={(e) => handleChange("note", e.target.value)}
          placeholder="Based on your previous inputs"
        />
        <p className="text-xs text-muted-foreground">
          Optional note to display below the calculated value
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="displayFormat">Display Format</Label>
        <Input
          id="displayFormat"
          value={data.displayFormat || ""}
          onChange={(e) => handleChange("displayFormat", e.target.value)}
          placeholder="currency, percentage, decimal:2, or leave empty"
        />
        <p className="text-xs text-muted-foreground">
          Optional formatting for numeric results: currency, percentage, decimal:X, or leave empty for raw output
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="resultType">Expected Result Type</Label>
        <Input
          id="resultType"
          value={data.resultType || ""}
          onChange={(e) => handleChange("resultType", e.target.value)}
          placeholder="number, string, object"
        />
        <p className="text-xs text-muted-foreground">
          Expected return type from the formula (for documentation purposes)
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="className">CSS Class Names</Label>
        <Input
          id="className"
          value={data.className || ""}
          onChange={(e) => handleChange("className", e.target.value)}
          placeholder="calculated-field custom-styles"
        />
      </div>
    </div>
  );
};

// Component to render the block in the survey
const CalculatedFieldItem: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  // Note: In a real survey runtime, this component would receive 
  // calculated values from the survey engine that has access to all form data
  const [displayValue, setDisplayValue] = useState<any>(data.calculatedValue || null);

  // Format the calculated value - now supports any type
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    
    // If it's not a number, return as string
    if (typeof value !== 'number') {
      return String(value);
    }

    // Apply numeric formatting only for numbers
    if (!data.displayFormat) return value.toString();

    switch (data.displayFormat) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      
      default:
        if (data.displayFormat.startsWith('decimal:')) {
          const decimals = parseInt(data.displayFormat.split(':')[1]) || 2;
          return value.toFixed(decimals);
        }
        return value.toString();
    }
  };

  // Update the stored calculated value when it changes
  useEffect(() => {
    if (displayValue !== null && data.fieldName && onUpdate) {
      onUpdate({
        ...data,
        calculatedValue: displayValue,
        [data.fieldName]: displayValue
      });
    }
  }, [displayValue, data.fieldName]);

  const getStatusIcon = () => {
    if (displayValue !== null) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <Info className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusColor = () => {
    if (displayValue !== null) return "border-green-200 bg-green-50";
    return "border-blue-200 bg-blue-50";
  };

  return (
    <Card className={`w-full ${data.className || ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="w-5 h-5 text-primary" />
          {data.label || 'Calculated Field'}
        </CardTitle>
        {data.description && (
          <p className="text-sm text-muted-foreground">{data.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Formula Display */}
        {data.formula && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Formula:</Label>
              <div className="bg-muted rounded-lg p-3 border">
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                  {data.formula}
                </pre>
              </div>
            </div>
            
            {data.dependencies && data.dependencies.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-sm font-medium">Depends on:</Label>
                <div className="flex flex-wrap gap-1">
                  {data.dependencies.map((dep: string) => (
                    <Badge key={dep} variant="secondary" className="text-xs">
                      {dep}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {data.resultType && (
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Returns:</Label>
                <Badge variant="outline" className="text-xs font-mono">
                  {data.resultType}
                </Badge>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Result Display */}
        <div className={`p-4 rounded-lg border-2 ${getStatusColor()}`}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Result</p>
              {displayValue !== null ? (
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-green-700">
                    {formatValue(displayValue)}
                  </p>
                  {typeof displayValue === 'object' && (
                    <p className="text-xs text-muted-foreground">
                      Object result - check console for full value
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg text-muted-foreground">
                    Will be calculated automatically
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <p className="text-xs text-blue-800 font-medium mb-1">Preview Formula:</p>
                    <pre className="text-xs text-blue-700 font-mono whitespace-pre-wrap">
                      {data.formula ? data.formula.substring(0, 100) + (data.formula.length > 100 ? '...' : '') : 'Not configured'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            {getStatusIcon()}
          </div>
        </div>

        {/* Note */}
        {data.note && (
          <div className="pt-2">
            <p className="text-sm text-muted-foreground">{data.note}</p>
          </div>
        )}

        {/* Configuration Info for Preview */}
        {!displayValue && data.dependencies && data.dependencies.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>This field will be calculated from:</strong>
              <br />
              {data.dependencies.map((dep: string) => (
                <Badge key={dep} variant="outline" className="mr-1 mt-1 text-xs">
                  {dep}
                </Badge>
              ))}
              <br />
              <span className="text-muted-foreground">
                The calculation will happen automatically when the survey is filled out.
              </span>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

// Preview component shown in the block library
const CalculatedFieldPreview: React.FC = () => {
  return (
    <div className="w-full flex items-center justify-center py-3">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <span className="font-medium">Calculated Field</span>
        </div>
        <div className="space-y-1">
          <div className="bg-muted rounded px-2 py-1">
            <code className="text-xs">if (bmi {">"} 25) return "High Risk"</code>
          </div>
          <div className="text-lg font-bold text-orange-600">High Risk</div>
        </div>
        <div className="text-xs text-muted-foreground">
          Complex formula results
        </div>
      </div>
    </div>
  );
};

const CalculatedFieldRenderer: React.FC<CalculatedFieldProps> = ({
  block,
  formula,
  dependencies,
  format,
  theme = null,
}) => {
  const { values, computedValues, updateComputedValues } = useSurveyForm();
  const themeConfig = theme ?? themes.default;
  const [error, setError] = useState<string | null>(null);
  const [displayValue, setDisplayValue] = useState<string>("Waiting for inputs...");

  // Use a ref to track previous values to avoid infinite loops
  const prevDependencyValues = useRef<any[]>([]);

  useEffect(() => {
    // Get current dependency values
    const currentDependencyValues = dependencies.map(dep => values[dep]);

    // Check if dependencies have changed
    const dependenciesChanged = dependencies.some((dep, index) => {
      return prevDependencyValues.current[index] !== currentDependencyValues[index];
    });

    // Update ref with current values
    prevDependencyValues.current = currentDependencyValues;

    // Only recalculate if dependencies changed
    if (dependenciesChanged) {
      // Check if all dependencies are available
      const dependenciesReady = dependencies.every(dep => {
        const value = values[dep] !== undefined ? values[dep] : computedValues[dep];
        return value !== undefined;
      });

      if (dependenciesReady) {
        try {
          // Create a safe copy of the values to avoid issues with circular references
          const safeValues = { ...values };
          dependencies.forEach(dep => {
            if (typeof safeValues[dep] === 'object' && safeValues[dep] !== null) {
              try {
                // Make a shallow copy of the object
                safeValues[dep] = { ...safeValues[dep] };
              } catch (e) {
                // If we can't copy it, use it as is
                console.warn(`Couldn't safely copy dependency ${dep}:`, e);
              }
            }
          });

          const calculatedValue = executeCalculation(
            {
              formula,
              targetField: block.fieldName || 'calculated',
              dependencies
            },
            { ...safeValues, ...computedValues }
          );

          // Format the value if a formatter is provided
          if (calculatedValue !== null && calculatedValue !== undefined) {
            setDisplayValue(format ? format(calculatedValue) : String(calculatedValue));
            setError(null);
          } else {
            setDisplayValue("N/A");
            setError("Could not calculate value");
          }

          // Update computed values
          try {
            updateComputedValues();
          } catch (e) {
            console.error("Error updating computed values:", e);
            setError(`Error updating values: ${(e as Error).message}`);
          }
        } catch (error) {
          console.error("Error calculating value:", error);
          setDisplayValue("Error");
          setError(`Error calculating: ${(error as Error).message}`);
        }
      } else {
        setDisplayValue("Waiting for inputs...");
        setError(null);
      }
    }
     
  }, [values, computedValues, dependencies, formula, format, block.fieldName, updateComputedValues]);

  return (
    <Card className={cn("w-full min-w-0 border bg-card", block.className)}>
      <CardContent className="p-4">
        {block.label && (
          <Label className={cn("text-base block font-medium mb-2", themeConfig.field.label)}>
            {block.label}
          </Label>
        )}

        {block.description && (
          <div className={cn("text-sm text-muted-foreground mb-3", themeConfig.field.description)}>
            {block.description}
          </div>
        )}

        <div className={cn(
          "p-3 rounded-md",
          error ? "bg-destructive/10" : "bg-accent/50"
        )}>
          <div className="flex items-center gap-2">
            {error && <AlertCircle className="h-4 w-4 text-destructive" />}
            <p className={cn(
              "text-lg font-semibold",
              error ? "text-destructive" : ""
            )}>
              {displayValue}
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive mt-1">
              {error}
            </p>
          )}
        </div>

        {block.note && (
          <p className="text-sm text-muted-foreground mt-2">{block.note}</p>
        )}
      </CardContent>
    </Card>
  );
};

// Export the block definition
export const CalculatedFieldBlock: BlockDefinition = {
  type: "calculatedField",
  name: "Calculated Field",
  description: "Display a value calculated from a formula based on other fields",
  icon: <Calculator className="w-4 h-4" />,
  defaultData: {
    type: "calculatedField",
    label: "Calculated Result",
    description: "This field is automatically calculated using custom logic",
    fieldName: "calculatedResult",
    formula: `// Example: BMI risk assessment
if (!bmiCalculator) return "Please complete BMI calculation";
const bmi = Number(bmiCalculator.bmi);
if (isNaN(bmi)) return "Invalid BMI value";
if (bmi >= 30) return "High Risk";
if (bmi >= 25) return "Moderate Risk";
return "Low Risk";`,
    dependencies: ["bmiCalculator"],
    note: "Based on your BMI calculation",
    displayFormat: "",
    resultType: "string",
    className: "",
  },
  renderItem: (props) => <CalculatedFieldItem {...props} />,
  renderFormFields: (props) => <CalculatedFieldForm {...props} />,
  renderPreview: () => <CalculatedFieldPreview />,
  renderBlock: (props: CalculatedFieldProps) => <CalculatedFieldRenderer {...props} />,
  validate: (data) => {
    if (!data.label) return "Label is required";
    if (!data.fieldName) return "Field name is required";
    if (!data.formula) return "Formula is required";
    if (!data.dependencies || data.dependencies.length === 0) return "At least one dependency is required";
    return null;
  },
  // Output schema - this block returns a calculated value (number or string based on formula)
  // Note: Actual type depends on resultType configuration
  outputSchema: {
    type: 'number'
  },
  fieldConfig: {
    enabled: true,
    label: "Field Name",
    required: true
  }
};