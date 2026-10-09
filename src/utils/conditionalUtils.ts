import type {
  ConditionRule,
  ConditionOperator,
  BranchingLogic,
  CalculationRule,
  NavigationRule,
  CurrentValues,
  EvaluationResult,
} from '../types';
import type { BlockData, BlockDefinition } from '../types';
import { getOutputPropertyOptions, getRuleOutputKeys } from './outputSchema';

/**
 * Evaluates a simple condition between two values using the specified operator
 */
export function evaluateSimpleCondition(
  fieldValue: any,
  operator: ConditionOperator,
  comparisonValue: any,
  valueType: 'string' | 'number' | 'boolean' | 'date' = 'string'
): boolean {
  // Handle null/undefined field values specially
  if (fieldValue === null || fieldValue === undefined) {
    if (operator === 'empty') return true;
    if (operator === 'notEmpty') return false;
    // For equality operators when checking against null/undefined
    if (operator === '==') return comparisonValue === null || comparisonValue === undefined;
    if (operator === '!=') return comparisonValue !== null && comparisonValue !== undefined;
    return false; // Most other operations on null/undefined should return false
  }

  // Type conversions based on the specified type
  let typedFieldValue = fieldValue;
  let typedComparisonValue = comparisonValue;

  if (valueType === 'number') {
    typedFieldValue = Number(fieldValue);
    typedComparisonValue = Number(comparisonValue);
  } else if (valueType === 'boolean') {
    typedFieldValue = Boolean(fieldValue);
    typedComparisonValue = Boolean(comparisonValue);
  } else if (valueType === 'date') {
    typedFieldValue = new Date(fieldValue);
    typedComparisonValue = new Date(comparisonValue);
  } else if (valueType === 'string') {
    typedFieldValue = String(fieldValue);
    typedComparisonValue = String(comparisonValue);
  }

  // Evaluate based on operator
  switch (operator) {
    case '==':
      return typedFieldValue == typedComparisonValue;
    case '!=':
      return typedFieldValue != typedComparisonValue;
    case '>':
      return typedFieldValue > typedComparisonValue;
    case '>=':
      return typedFieldValue >= typedComparisonValue;
    case '<':
      return typedFieldValue < typedComparisonValue;
    case '<=':
      return typedFieldValue <= typedComparisonValue;
    case 'contains':
      return String(typedFieldValue).includes(String(typedComparisonValue));
    case 'startsWith':
      return String(typedFieldValue).startsWith(String(typedComparisonValue));
    case 'endsWith':
      return String(typedFieldValue).endsWith(String(typedComparisonValue));
    case 'empty':
      return typedFieldValue === '' ||
             typedFieldValue === null ||
             typedFieldValue === undefined ||
             (Array.isArray(typedFieldValue) && typedFieldValue.length === 0);
    case 'notEmpty':
      return typedFieldValue !== '' &&
             typedFieldValue !== null &&
             typedFieldValue !== undefined &&
             (!Array.isArray(typedFieldValue) || typedFieldValue.length > 0);
    case 'between':
      if (Array.isArray(typedComparisonValue) && typedComparisonValue.length === 2) {
        return typedFieldValue >= typedComparisonValue[0] && typedFieldValue <= typedComparisonValue[1];
      }
      return false;
    case 'in':
      return Array.isArray(typedComparisonValue) && typedComparisonValue.includes(typedFieldValue);
    case 'notIn':
      return Array.isArray(typedComparisonValue) && !typedComparisonValue.includes(typedFieldValue);
    case 'notContains':
      return !String(typedFieldValue).includes(String(typedComparisonValue));
    case 'containsAny':
      if (Array.isArray(typedFieldValue) && Array.isArray(typedComparisonValue)) {
        return typedFieldValue.some(v => typedComparisonValue.includes(v));
      }
      return false;
    case 'containsAll':
      if (Array.isArray(typedFieldValue) && Array.isArray(typedComparisonValue)) {
        return typedComparisonValue.every(v => typedFieldValue.includes(v));
      }
      return false;
    case 'containsNone':
      if (Array.isArray(typedFieldValue) && Array.isArray(typedComparisonValue)) {
        return !typedFieldValue.some(v => typedComparisonValue.includes(v));
      }
      return false;
    case 'notBetween':
      if (Array.isArray(typedComparisonValue) && typedComparisonValue.length === 2) {
        return typedFieldValue < typedComparisonValue[0] || typedFieldValue > typedComparisonValue[1];
      }
      return false;
    case 'matches':
      try {
        return new RegExp(String(typedComparisonValue)).test(String(typedFieldValue));
      } catch {
        return false;
      }
    case 'isEmpty':
      return typedFieldValue === '' ||
             typedFieldValue === null ||
             typedFieldValue === undefined ||
             (Array.isArray(typedFieldValue) && typedFieldValue.length === 0);
    case 'isNotEmpty':
      return typedFieldValue !== '' &&
             typedFieldValue !== null &&
             typedFieldValue !== undefined &&
             (!Array.isArray(typedFieldValue) || typedFieldValue.length > 0);
    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Evaluates a complex condition rule against field values
 */
/**
 * Get a nested value from an object using dot notation
 * For example: getNestedValue(values, "authResults.email") returns values.authResults?.email
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  if (!path || !obj) return undefined;

  // Split by dots and traverse the object
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
}

export function evaluateConditionRule(
  rule: ConditionRule,
  fieldValues: Record<string, any>
): boolean {
  // Support nested field paths (e.g., "authResults.email")
  const fieldValue = getNestedValue(fieldValues, rule.field);
  return evaluateSimpleCondition(
    fieldValue,
    rule.operator,
    rule.value,
    rule.type
  );
}

function evaluateNavigationalRule(conditionalRule: NavigationRule, currentValues: CurrentValues): EvaluationResult {
  try {
    const { condition, target, isPage } = conditionalRule;
    
    
    // Try to parse enhanced operators first
    const enhancedResult = evaluateEnhancedCondition(condition, currentValues);
    if (enhancedResult !== null) {
      return {
        matched: enhancedResult,
        target: enhancedResult ? target : null,
        isPage: enhancedResult ? (isPage ? true : false) : null
      };
    }
    
    // Fallback to Function constructor evaluation for complex conditions
    const context = { ...currentValues };
    const evaluator = new Function(...Object.keys(context), `return ${condition}`);
    const result = evaluator(...Object.values(context));
    
    if (result) {
      return {
        matched: true,
        target: target,
        isPage: isPage ? true : false
      };
    }
    
    return {
      matched: false,
      target: null,
      isPage: null
    };
    
  } catch (error) {
    console.error('Error evaluating condition:', error);
    return {
      matched: false,
      target: null,
      isPage: null,
      error: error
    };
  }
}

// Helper to get value from currentValues supporting nested paths (e.g., "user.email")
function getValueFromPath(currentValues: CurrentValues, path: string): any {
  if (!path) return undefined;
  const parts = path.split('.');
  let value: any = currentValues;
  for (const part of parts) {
    if (value === null || value === undefined) return undefined;
    value = value[part];
  }
  return value;
}

// Helper function to evaluate enhanced conditions
function evaluateEnhancedCondition(condition: string, currentValues: CurrentValues): boolean | null {
  try {
    const trimmed = condition.trim();

    // 1. Date equals: new Date(field).toDateString() === new Date("value").toDateString()
    const dateEqualsMatch = trimmed.match(/^new Date\(([\w.]+)\)\.toDateString\(\) === new Date\(["']([^"']+)["']\)\.toDateString\(\)$/);
    if (dateEqualsMatch) {
      const fieldValue = getValueFromPath(currentValues, dateEqualsMatch[1]);
      return new Date(fieldValue).toDateString() === new Date(dateEqualsMatch[2]).toDateString();
    }

    // Date not equals
    const dateNotEqualsMatch = trimmed.match(/^new Date\(([\w.]+)\)\.toDateString\(\) !== new Date\(["']([^"']+)["']\)\.toDateString\(\)$/);
    if (dateNotEqualsMatch) {
      const fieldValue = getValueFromPath(currentValues, dateNotEqualsMatch[1]);
      return new Date(fieldValue).toDateString() !== new Date(dateNotEqualsMatch[2]).toDateString();
    }

    // 2. Is today: new Date(field).toDateString() === new Date().toDateString()
    const isTodayMatch = trimmed.match(/^new Date\(([\w.]+)\)\.toDateString\(\) === new Date\(\)\.toDateString\(\)$/);
    if (isTodayMatch) {
      const fieldValue = getValueFromPath(currentValues, isTodayMatch[1]);
      return new Date(fieldValue).toDateString() === new Date().toDateString();
    }

    // 3. Is weekend IIFE
    const isWeekendMatch = trimmed.match(/^\(\(\) => \{ const d = new Date\(([\w.]+)\); const day = d\.getDay\(\); return day === 0 \|\| day === 6; \}\)\(\)$/);
    if (isWeekendMatch) {
      const fieldValue = getValueFromPath(currentValues, isWeekendMatch[1]);
      const d = new Date(fieldValue);
      const day = d.getDay();
      return day === 0 || day === 6;
    }

    // 4. Is weekday IIFE
    const isWeekdayMatch = trimmed.match(/^\(\(\) => \{ const d = new Date\(([\w.]+)\); const day = d\.getDay\(\); return day >= 1 && day <= 5; \}\)\(\)$/);
    if (isWeekdayMatch) {
      const fieldValue = getValueFromPath(currentValues, isWeekdayMatch[1]);
      const d = new Date(fieldValue);
      const day = d.getDay();
      return day >= 1 && day <= 5;
    }

    // 5. Age between IIFE
    const ageBetweenMatch = trimmed.match(/^\(\(\) => \{ const age = Math\.floor\(\(new Date\(\)\.getTime\(\) - new Date\(([\w.]+)\)\.getTime\(\)\) \/ \(365\.25 \* 24 \* 60 \* 60 \* 1000\)\); return age >= (\d+) && age <= (\d+); \}\)\(\)$/);
    if (ageBetweenMatch) {
      const fieldValue = getValueFromPath(currentValues, ageBetweenMatch[1]);
      const age = Math.floor((new Date().getTime() - new Date(fieldValue).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return age >= Number(ageBetweenMatch[2]) && age <= Number(ageBetweenMatch[3]);
    }

    // 6. Age greater than
    const ageGreaterMatch = trimmed.match(/^Math\.floor\(\(new Date\(\)\.getTime\(\) - new Date\(([\w.]+)\)\.getTime\(\)\) \/ \(365\.25 \* 24 \* 60 \* 60 \* 1000\)\) > (\d+)$/);
    if (ageGreaterMatch) {
      const fieldValue = getValueFromPath(currentValues, ageGreaterMatch[1]);
      const age = Math.floor((new Date().getTime() - new Date(fieldValue).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return age > Number(ageGreaterMatch[2]);
    }

    // 7. Age less than
    const ageLessMatch = trimmed.match(/^Math\.floor\(\(new Date\(\)\.getTime\(\) - new Date\(([\w.]+)\)\.getTime\(\)\) \/ \(365\.25 \* 24 \* 60 \* 60 \* 1000\)\) < (\d+)$/);
    if (ageLessMatch) {
      const fieldValue = getValueFromPath(currentValues, ageLessMatch[1]);
      const age = Math.floor((new Date().getTime() - new Date(fieldValue).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return age < Number(ageLessMatch[2]);
    }

    // 8. Date between: new Date(field) >= new Date("min") && new Date(field) <= new Date("max")
    const dateBetweenMatch = trimmed.match(/^new Date\(([\w.]+)\) >= new Date\(["']([^"']+)["']\) && new Date\([\w.]+\) <= new Date\(["']([^"']+)["']\)$/);
    if (dateBetweenMatch) {
      const fieldValue = getValueFromPath(currentValues, dateBetweenMatch[1]);
      const date = new Date(fieldValue);
      return date >= new Date(dateBetweenMatch[2]) && date <= new Date(dateBetweenMatch[3]);
    }

    // 9. Date not between
    const dateNotBetweenMatch = trimmed.match(/^new Date\(([\w.]+)\) < new Date\(["']([^"']+)["']\) \|\| new Date\([\w.]+\) > new Date\(["']([^"']+)["']\)$/);
    if (dateNotBetweenMatch) {
      const fieldValue = getValueFromPath(currentValues, dateNotBetweenMatch[1]);
      const date = new Date(fieldValue);
      return date < new Date(dateNotBetweenMatch[2]) || date > new Date(dateNotBetweenMatch[3]);
    }

    // 10. Date comparison: new Date(field) > new Date("value")
    const dateCompareMatch = trimmed.match(/^new Date\(([\w.]+)\) (>=|<=|>|<) new Date\(["']([^"']+)["']\)$/);
    if (dateCompareMatch) {
      const fieldValue = getValueFromPath(currentValues, dateCompareMatch[1]);
      const date = new Date(fieldValue);
      const compareDate = new Date(dateCompareMatch[3]);
      switch (dateCompareMatch[2]) {
        case '>': return date > compareDate;
        case '>=': return date >= compareDate;
        case '<': return date < compareDate;
        case '<=': return date <= compareDate;
      }
    }

    // 11. Is past/future date: new Date(field) < new Date() or new Date(field) > new Date()
    const pastFutureMatch = trimmed.match(/^new Date\(([\w.]+)\) (<|>) new Date\(\)$/);
    if (pastFutureMatch) {
      const fieldValue = getValueFromPath(currentValues, pastFutureMatch[1]);
      const date = new Date(fieldValue);
      const now = new Date();
      return pastFutureMatch[2] === '<' ? date < now : date > now;
    }

    // 12. Day of week: new Date(field).getDay() === N
    const dayOfWeekMatch = trimmed.match(/^new Date\(([\w.]+)\)\.getDay\(\) === (\d+)$/);
    if (dayOfWeekMatch) {
      const fieldValue = getValueFromPath(currentValues, dayOfWeekMatch[1]);
      return new Date(fieldValue).getDay() === Number(dayOfWeekMatch[2]);
    }

    // 13. Month equals: (new Date(field).getMonth() + 1) === N
    const monthMatch = trimmed.match(/^\(new Date\(([\w.]+)\)\.getMonth\(\) \+ 1\) === (\d+)$/);
    if (monthMatch) {
      const fieldValue = getValueFromPath(currentValues, monthMatch[1]);
      return (new Date(fieldValue).getMonth() + 1) === Number(monthMatch[2]);
    }

    // 14. Year equals: new Date(field).getFullYear() === N
    const yearMatch = trimmed.match(/^new Date\(([\w.]+)\)\.getFullYear\(\) === (\d+)$/);
    if (yearMatch) {
      const fieldValue = getValueFromPath(currentValues, yearMatch[1]);
      return new Date(fieldValue).getFullYear() === Number(yearMatch[2]);
    }

    // 15. Regex matches: new RegExp("pattern").test(field)
    const regexMatch = trimmed.match(/^new RegExp\(["']([^"']+)["']\)\.test\(([\w.]+)\)$/);
    if (regexMatch) {
      const fieldValue = getValueFromPath(currentValues, regexMatch[2]);
      return new RegExp(regexMatch[1]).test(String(fieldValue || ''));
    }

    // 16. Contains any: field.some(v => ["a","b"].includes(v))
    const containsAnyMatch = trimmed.match(/^([\w.]+)\.some\(v => (\[.+\])\.includes\(v\)\)$/);
    if (containsAnyMatch) {
      const fieldValue = getValueFromPath(currentValues, containsAnyMatch[1]);
      try {
        const arrayValue = JSON.parse(containsAnyMatch[2]);
        if (Array.isArray(fieldValue) && Array.isArray(arrayValue)) {
          return fieldValue.some(v => arrayValue.includes(v));
        }
      } catch { /* fallthrough */ }
    }

    // 17. Contains all: ["a","b"].every(v => field.includes(v))
    const containsAllMatch = trimmed.match(/^(\[.+\])\.every\(v => ([\w.]+)\.includes\(v\)\)$/);
    if (containsAllMatch) {
      const fieldValue = getValueFromPath(currentValues, containsAllMatch[2]);
      try {
        const arrayValue = JSON.parse(containsAllMatch[1]);
        if (Array.isArray(fieldValue) && Array.isArray(arrayValue)) {
          return arrayValue.every(v => fieldValue.includes(v));
        }
      } catch { /* fallthrough */ }
    }

    // 18. Contains none: !field.some(v => ["a","b"].includes(v))
    const containsNoneMatch = trimmed.match(/^!([\w.]+)\.some\(v => (\[.+\])\.includes\(v\)\)$/);
    if (containsNoneMatch) {
      const fieldValue = getValueFromPath(currentValues, containsNoneMatch[1]);
      try {
        const arrayValue = JSON.parse(containsNoneMatch[2]);
        if (Array.isArray(fieldValue) && Array.isArray(arrayValue)) {
          return !fieldValue.some(v => arrayValue.includes(v));
        }
      } catch { /* fallthrough */ }
    }

    // 19. Not contains: !field.includes("value")
    const notContainsMatch = trimmed.match(/^!([\w.]+)\.includes\(["']([^"']+)["']\)$/);
    if (notContainsMatch) {
      const fieldValue = getValueFromPath(currentValues, notContainsMatch[1]);
      return !String(fieldValue || '').includes(notContainsMatch[2]);
    }

    // 20. In array: ["a","b"].includes(field)
    const inArrayMatch = trimmed.match(/^(\[.+\])\.includes\(([\w.]+)\)$/);
    if (inArrayMatch) {
      const fieldValue = getValueFromPath(currentValues, inArrayMatch[2]);
      try {
        const arrayValue = JSON.parse(inArrayMatch[1]);
        return Array.isArray(arrayValue) && arrayValue.includes(fieldValue);
      } catch { /* fallthrough */ }
    }

    // 21. Not in array: !["a","b"].includes(field)
    const notInArrayMatch = trimmed.match(/^!(\[.+\])\.includes\(([\w.]+)\)$/);
    if (notInArrayMatch) {
      const fieldValue = getValueFromPath(currentValues, notInArrayMatch[2]);
      try {
        const arrayValue = JSON.parse(notInArrayMatch[1]);
        return Array.isArray(arrayValue) && !arrayValue.includes(fieldValue);
      } catch { /* fallthrough */ }
    }

    // 22. Is empty: !field || field === ""
    const isEmptyMatch = trimmed.match(/^!([\w.]+) \|\| [\w.]+ === ""$/);
    if (isEmptyMatch) {
      const fieldValue = getValueFromPath(currentValues, isEmptyMatch[1]);
      return !fieldValue || fieldValue === "";
    }

    // 23. Is not empty: field && field !== ""
    const isNotEmptyMatch = trimmed.match(/^([\w.]+) && [\w.]+ !== ""$/);
    if (isNotEmptyMatch) {
      const fieldValue = getValueFromPath(currentValues, isNotEmptyMatch[1]);
      return fieldValue && fieldValue !== "";
    }

    // 24. Between: field >= "min" && field <= "max"
    const betweenMatch = trimmed.match(/^([\w.]+) >= ["']?([^"'&]+)["']? && [\w.]+ <= ["']?([^"']+)["']?$/);
    if (betweenMatch) {
      const fieldValue = getValueFromPath(currentValues, betweenMatch[1]);
      let min: any = betweenMatch[2];
      let max: any = betweenMatch[3];
      try { min = JSON.parse(min); } catch { /* keep as string */ }
      try { max = JSON.parse(max); } catch { /* keep as string */ }
      return fieldValue >= min && fieldValue <= max;
    }

    // 25. Not between: field < "min" || field > "max"
    const notBetweenMatch = trimmed.match(/^([\w.]+) < ["']?([^"'|]+)["']? \|\| [\w.]+ > ["']?([^"']+)["']?$/);
    if (notBetweenMatch) {
      const fieldValue = getValueFromPath(currentValues, notBetweenMatch[1]);
      let min: any = notBetweenMatch[2];
      let max: any = notBetweenMatch[3];
      try { min = JSON.parse(min); } catch { /* keep as string */ }
      try { max = JSON.parse(max); } catch { /* keep as string */ }
      return fieldValue < min || fieldValue > max;
    }

    // 26. String methods: field.contains("value"), field.startsWith("value"), field.endsWith("value")
    const stringMethodMatch = trimmed.match(/^([\w.]+)\.(contains|startsWith|endsWith)\(["']([^"']*)["']\)$/);
    if (stringMethodMatch) {
      const fieldValue = String(getValueFromPath(currentValues, stringMethodMatch[1]) || '');
      const value = stringMethodMatch[3];
      switch (stringMethodMatch[2]) {
        case 'contains': return fieldValue.includes(value);
        case 'startsWith': return fieldValue.startsWith(value);
        case 'endsWith': return fieldValue.endsWith(value);
      }
    }

    // 27. Standard comparison: field == "value", field != "value", etc.
    const comparisonMatch = trimmed.match(/^([\w.]+) (==|!=|>=|<=|>|<) ["']?([^"']*)["']?$/);
    if (comparisonMatch) {
      const fieldValue = getValueFromPath(currentValues, comparisonMatch[1]);
      let value: any = comparisonMatch[3];
      try { value = JSON.parse(comparisonMatch[3]); } catch { /* keep as string */ }

      switch (comparisonMatch[2]) {
        case '==': return fieldValue == value;
        case '!=': return fieldValue != value;
        case '>': return fieldValue > value;
        case '>=': return fieldValue >= value;
        case '<': return fieldValue < value;
        case '<=': return fieldValue <= value;
      }
    }

    return null; // Couldn't parse with enhanced operators
  } catch (error) {
    console.error('Error in enhanced condition evaluation:', error);
    return null;
  }
}

// Alternative safer method using manual parsing for simple conditions
function evaluateNavigationalRuleSafe(conditionalRule: NavigationRule, currentValues: CurrentValues): EvaluationResult {
  try {
    const { condition, target, isPage } = conditionalRule;
    
    // Parse simple conditions like "field == value" or "field != value"
    const operatorRegex: RegExp = /(.*?)\s*(==|!=|>|<|>=|<=)\s*(.*)/;
    const match: RegExpMatchArray | null = condition.match(operatorRegex);
    
    if (!match) {
      throw new Error('Unsupported condition format');
    }
    
    const [, leftSide, operator, rightSide]: string[] = match;
    const fieldName: string = leftSide.trim();
    
    // Remove quotes from string values
    let expectedValue: string = rightSide.trim();
    if ((expectedValue.startsWith('"') && expectedValue.endsWith('"')) ||
        (expectedValue.startsWith("'") && expectedValue.endsWith("'"))) {
      expectedValue = expectedValue.slice(1, -1);
    }
    
    const currentValue: string | number | boolean = currentValues[fieldName];
    let result: boolean = false;
    
    switch (operator) {
      case '==':
        result = currentValue == expectedValue;
        break;
      case '!=':
        result = currentValue != expectedValue;
        break;
      case '>':
        result = Number(currentValue) > Number(expectedValue);
        break;
      case '<':
        result = Number(currentValue) < Number(expectedValue);
        break;
      case '>=':
        result = Number(currentValue) >= Number(expectedValue);
        break;
      case '<=':
        result = Number(currentValue) <= Number(expectedValue);
        break;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
    
    if (result) {
      return {
        matched: true,
        target: target,
        isPage: isPage ? true : false,
      };
    }
    
    return {
      matched: false,
      target: null,
      isPage: null
    };
    
  } catch (error) {
    console.error('Error evaluating condition:', error);
    return {
      matched: false,
      target: null,
      isPage: null,
      error: error
    };
  }
}

/**
 * Evaluates a condition expression or rule against field values
 */
export function evaluateCondition(
  condition: string | ConditionRule | ConditionRule[],
  fieldValues: Record<string, any>
): boolean {
  // If condition is a string, evaluate it as a JavaScript expression
  if (typeof condition === 'string') {
    try {
      // Basic sanitization
      const sanitizedCondition = condition
        .replace(/import\s*\{/g, '')
        .replace(/require\s*\(/g, '')
        .replace(/process/g, '')
        .replace(/global/g, '')
        .replace(/window/g, '')
        .replace(/document/g, '')
        .replace(/eval\s*\(/g, '')
        .trim();

      // Allow conditions written as "return x > 0;" by stripping leading return
      const normalized = sanitizedCondition
        .replace(/^return\s+/i, '')
        .replace(/;?\s*$/,'');

      // Create a function that references values by using a parameter object instead of 'with'
      const conditionFn = new Function('values', `
        "use strict";
        try {
          // Access values directly from the values object
          // Example: If condition is "age > 18", we'll reference values.age
          const result = (${translateConditionToExplicitReferences(normalized)});
          return result;
        } catch (e) {
          console.error("Error evaluating condition:", e);
          return false;
        }
      `);

      // Execute the function with the field values
      return Boolean(conditionFn(fieldValues));
    } catch (error) {
      console.error('Error parsing condition expression:', error);
      return false;
    }
  }

  // If condition is a single rule object, evaluate it
  if (!Array.isArray(condition)) {
    return evaluateConditionRule(condition as ConditionRule, fieldValues);
  }

  // If condition is an array of rules, evaluate each rule and return true if all are true
  return (condition as ConditionRule[]).every(rule =>
    evaluateConditionRule(rule, fieldValues)
  );
}

/**
 * Translates a condition string to use explicit references to the values object
 * For example, converts "age > 18" to "values.age > 18"
 * Also handles nested fields like "authResults.email" → "values.authResults.email"
 */
function translateConditionToExplicitReferences(condition: string): string {
  // Replace variable names with values object references
  // This regex looks for identifiers that:
  // 1. Are not preceded by a dot (to avoid matching nested property names)
  // 2. Are not followed by : or ( (to avoid function calls and object literals)
  return condition.replace(/(?<!\.)(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\b(?!\s*:|\s*\()/g, (match, name) => {
    // Extract the root identifier (first part before any dots)
    const rootName = name.split('.')[0];

    // Don't replace JavaScript keywords and common values
    const keywords = [
      'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
      'if', 'else', 'return', 'function', 'var', 'let', 'const',
      'new', 'this', 'typeof', 'instanceof', 'in'
    ];

    if (keywords.includes(rootName)) {
      return name;
    }

    // Replace the entire dotted path with values. prefix
    return `values.${name}`;
  });
}

/**
 * Determines the next page index based on branching logic
 */
export function getNextPageIndex(
  currentPage: number,
  branchingLogic: BranchingLogic | undefined,
  fieldValues: Record<string, any>,
  totalPages: number
): number {
  // If no branching logic is defined, go to the next page
  if (!branchingLogic || !branchingLogic.condition) {
    return currentPage + 1 < totalPages ? currentPage + 1 : currentPage;
  }

  // Evaluate the condition for this branching logic
  const conditionMet = evaluateCondition(branchingLogic.condition, fieldValues);

  // If condition is not met, proceed to the next page
  if (!conditionMet) {
    return currentPage + 1 < totalPages ? currentPage + 1 : currentPage;
  }

  // If condition is met, determine the target page
  const { targetPage } = branchingLogic;

  if (typeof targetPage === 'number') {
    // Validate the page index
    if (targetPage >= 0 && targetPage < totalPages) {
      return targetPage;
    }
  } else if (targetPage === 'next') {
    return currentPage + 1 < totalPages ? currentPage + 1 : currentPage;
  } else if (targetPage === 'prev') {
    return currentPage - 1 >= 0 ? currentPage - 1 : currentPage;
  } else if (targetPage === 'submit') {
    // Return a special value to indicate submission
    return -1;
  }

  // Default to next page
  return currentPage + 1 < totalPages ? currentPage + 1 : currentPage;
}

/**
 * Evaluate navigation rules defined on blocks to determine next page
 */
export function getNextPageFromNavigationRules(
  blocks: BlockData[],
  pages: Array<BlockData[]>,
  pageIds: string[],
  fieldValues: Record<string, any>
): number | null {
  for (const block of blocks) {
    if (!block.navigationRules) continue;
    for (const rule of block.navigationRules) {
      if (evaluateCondition(rule.condition, fieldValues)) {
        if (rule.target === "submit") {
          return -1;
        }
        if (rule.isPage) {
          const idx = pageIds.indexOf(String(rule.target));
          if (idx >= 0) return idx;
        } else {
          const idx = pages.findIndex((p) =>
            p.some((b) => b.uuid === rule.target)
          );
          if (idx >= 0) return idx;
        }
      }
    }
  }
  return null;
}

/**
 * Find the page and block index for a block UUID
 */
export function findBlockPosition(
  pages: Array<BlockData[]>,
  target: string
): { pageIndex: number; blockIndex: number } | null {
  for (let pIndex = 0; pIndex < pages.length; pIndex++) {
    const bIndex = pages[pIndex].findIndex((b) => b.uuid === target);
    if (bIndex >= 0) {
      return { pageIndex: pIndex, blockIndex: bIndex };
    }
  }
  return null;
}

/**
 * Evaluate navigation rules on a single block and return the target position
 */
export function getNextStepFromNavigationRules(
  block: BlockData,
  pages: Array<BlockData[]>,
  pageIds: string[],
  fieldValues: Record<string, any>
): { pageIndex: number; blockIndex: number } | 'submit' | null {
  if (!block.navigationRules) return null;

  for (const rule of block.navigationRules) {
    // evaluateNavigationalRule(rule, fieldValues)
    const evaluate = evaluateNavigationalRule(rule, fieldValues);
    if(evaluate.matched) {
      if (evaluate.target === 'submit') {
        return 'submit';
      }
      if (evaluate.isPage) {
        const idx = pageIds.indexOf(String(evaluate.target));
        if (idx >= 0) return { pageIndex: idx, blockIndex: 0 };
      } else {
        const pos = findBlockPosition(pages, String(evaluate.target));
        if (pos) return pos;
      }
    }
    // if (evaluateCondition(rule.condition, fieldValues)) {
    //   if (rule.target === 'submit') {
    //     return 'submit';
    //   }
    //   if (rule.isPage) {
    //     const idx = pageIds.indexOf(String(rule.target));
    //     if (idx >= 0) return { pageIndex: idx, blockIndex: 0 };
    //   } else {
    //     const pos = findBlockPosition(pages, String(rule.target));
    //     if (pos) return pos;
    //   }
    // }
  }

  // Check for explicit next block (overrides sequential flow)
  if (block.nextBlockId) {
    if (block.nextBlockId === 'submit') {
      return 'submit';
    }
    const pos = findBlockPosition(pages, block.nextBlockId);
    if (pos) return pos;
  }

  return null;
}

/**
 * Executes a calculation rule to compute a field value
 */
export function executeCalculation(
  calculationRule: CalculationRule,
  fieldValues: Record<string, any>
): any {
  try {
    // Basic sanitization
    const sanitizedFormula = calculationRule.formula
      .replace(/import\s*\{/g, '')
      .replace(/require\s*\(/g, '')
      .replace(/process/g, '')
      .replace(/global/g, '')
      .replace(/window/g, '')
      .replace(/document/g, '')
      .replace(/eval\s*\(/g, '');

    // Simple direct execution approach
    const functionBody = `
      "use strict";

      try {
        // Make all fields directly available
        ${Object.keys(fieldValues).map(key =>
          `const ${key} = ${JSON.stringify(fieldValues[key])};`
        ).join('\n')}

        // Execute formula
        ${sanitizedFormula}
      } catch (error) {
        console.error("Error in formula execution:", error);
        return null;
      }
    `;

    // Create and execute the function
    const fn = new Function(functionBody);
    return fn();
  } catch (error) {
    console.error('Error executing calculation:', error);
    return null;
  }
}

/**
 * Evaluates if a block should be visible based on its visibility condition
 */
export function isBlockVisible(
  block: { visibleIf?: string | ConditionRule | ConditionRule[] },
  fieldValues: Record<string, any>
): boolean {
  // If no visibility condition, the block is always visible
  if (!block.visibleIf) {
    return true;
  }

  // Evaluate the visibility condition
  return evaluateCondition(block.visibleIf, fieldValues);
}

/**
 * Simple BMI calculator example
 */
export function calculateBMI(
  weightInKg: number,
  heightInCm: number
): { bmi: number; category: string } {
  // Convert height to meters
  const heightInM = heightInCm / 100;

  // Calculate BMI
  const bmi = weightInKg / (heightInM * heightInM);

  // Determine BMI category
  let category = '';
  if (bmi < 18.5) {
    category = 'Underweight';
  } else if (bmi >= 18.5 && bmi < 25) {
    category = 'Normal weight';
  } else if (bmi >= 25 && bmi < 30) {
    category = 'Overweight';
  } else {
    category = 'Obese';
  }

  return { bmi: parseFloat(bmi.toFixed(1)), category };
}

/**
 * Gets the navigation target for a specific option value by evaluating navigation rules
 * Returns the target UUID if a rule matches, or null if no rule matches
 * @param key - For an object output, the property the option belongs to
 */
export function getNavigationTargetForOption(
  block: BlockData,
  optionValue: string,
  key?: string
): string | null {
  if (!block.navigationRules || block.navigationRules.length === 0) {
    return null;
  }

  const fieldName = block.fieldName;
  if (!fieldName) return null;

  // Create simulated currentValues with the option value
  const simulatedValues = {
    [fieldName]: key ? { [key]: optionValue } : optionValue
  } as CurrentValues;

  // Evaluate each navigation rule
  for (const rule of block.navigationRules) {
    try {
      const { condition, target } = rule;

      // Try enhanced condition evaluation first
      const enhancedResult = evaluateEnhancedCondition(condition, simulatedValues);
      if (enhancedResult === true) {
        return target;
      }

      // Fallback to Function constructor evaluation for complex conditions
      if (enhancedResult === null) {
        const context = { ...simulatedValues };
        const evaluator = new Function(...Object.keys(context), `return ${condition}`);
        const result = evaluator(...Object.values(context));
        if (result) {
          return target;
        }
      }
    } catch {
      // Skip rules that fail to evaluate
      continue;
    }
  }

  return null;
}

/**
 * Checks if all options in a block with options (like selectablebox) are covered
 * by navigation rules that point to non-sequential targets.
 * Blocks without their own options are checked against the options their output
 * schema lists for a property (like a Yes/No `answer`), when the definition is given.
 *
 * @param block - The block to check
 * @param sequentialTargetId - The next block in sequential order (or "submit")
 * @param blockDefinition - The block's definition, for options listed in its output schema
 * @returns true if ALL options are covered by rules pointing to different targets than sequential
 */
export function areAllOptionsCoveredByRules(
  block: BlockData,
  sequentialTargetId: string,
  blockDefinition?: BlockDefinition
): boolean {
  // Check if block has navigation rules
  if (!block.navigationRules || block.navigationRules.length === 0) {
    return false;
  }

  // For each option, check if there's a navigation rule that matches
  // and points to a target different from the sequential target
  const coversAll = (optionValues: unknown[], key?: string): boolean => {
    if (optionValues.length === 0) return false;

    for (const optionValue of optionValues) {
      if (optionValue === undefined || optionValue === null) {
        // Option without value - can't be evaluated
        return false;
      }

      const target = getNavigationTargetForOption(block, String(optionValue), key);

      // If no rule matches this option, or the rule points to sequential target,
      // we still need the fallback edge
      if (!target || target === sequentialTargetId) {
        return false;
      }
    }

    // All options are covered by rules pointing to non-sequential targets
    return true;
  };

  // Check if block has options
  const options = block.options;
  if (Array.isArray(options) && options.length > 0) {
    return coversAll(options.map((option) => option.value));
  }

  // Otherwise, one output property whose options are all covered is enough
  if (!blockDefinition) return false;

  return getRuleOutputKeys(blockDefinition, block).some((key) =>
    coversAll(
      getOutputPropertyOptions(blockDefinition, block, key).map((option) => option.value),
      key
    )
  );
}
