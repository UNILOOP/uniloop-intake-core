export interface OperatorDefinition {
  value: string;
  label: string;
  description?: string;
  category: 'comparison' | 'string' | 'array' | 'logical' | 'date';
  valueType: 'single' | 'array' | 'variable' | 'mixed';
  supportsVariables?: boolean;
}

export const OPERATORS: OperatorDefinition[] = [
  // Comparison operators
  { value: '==', label: 'Equals', category: 'comparison', valueType: 'single', supportsVariables: true },
  { value: '!=', label: 'Not equals', category: 'comparison', valueType: 'single', supportsVariables: true },
  { value: '>', label: 'Greater than', category: 'comparison', valueType: 'single', supportsVariables: true },
  { value: '>=', label: 'Greater than or equal', category: 'comparison', valueType: 'single', supportsVariables: true },
  { value: '<', label: 'Less than', category: 'comparison', valueType: 'single', supportsVariables: true },
  { value: '<=', label: 'Less than or equal', category: 'comparison', valueType: 'single', supportsVariables: true },
  
  // String operators
  { value: 'contains', label: 'Contains', description: 'Text contains substring', category: 'string', valueType: 'single' },
  { value: 'notContains', label: 'Does not contain', description: 'Text does not contain substring', category: 'string', valueType: 'single' },
  { value: 'startsWith', label: 'Starts with', category: 'string', valueType: 'single' },
  { value: 'endsWith', label: 'Ends with', category: 'string', valueType: 'single' },
  { value: 'matches', label: 'Matches pattern', description: 'Matches regex pattern', category: 'string', valueType: 'single' },
  
  // Array/Set operators
  { value: 'in', label: 'In array', description: 'Value is in the list', category: 'array', valueType: 'array' },
  { value: 'notIn', label: 'Not in array', description: 'Value is not in the list', category: 'array', valueType: 'array' },
  { value: 'containsAny', label: 'Contains any of', description: 'Contains at least one value from list', category: 'array', valueType: 'array' },
  { value: 'containsAll', label: 'Contains all of', description: 'Contains all values from list', category: 'array', valueType: 'array' },
  { value: 'containsNone', label: 'Contains none of', description: 'Contains no values from list', category: 'array', valueType: 'array' },
  
  // Logical operators
  { value: 'isEmpty', label: 'Is empty', description: 'Field has no value', category: 'logical', valueType: 'single' },
  { value: 'isNotEmpty', label: 'Is not empty', description: 'Field has a value', category: 'logical', valueType: 'single' },
  { value: 'between', label: 'Between', description: 'Value is between two values', category: 'logical', valueType: 'array' },
  { value: 'notBetween', label: 'Not between', description: 'Value is not between two values', category: 'logical', valueType: 'array' },
  
  // Date operators
  { value: 'dateEquals', label: 'Date equals', description: 'Date is exactly equal to value', category: 'date', valueType: 'single' },
  { value: 'dateNotEquals', label: 'Date not equals', description: 'Date is not equal to value', category: 'date', valueType: 'single' },
  { value: 'dateGreaterThan', label: 'Date after', description: 'Date is after the specified date', category: 'date', valueType: 'single' },
  { value: 'dateGreaterThanOrEqual', label: 'Date on or after', description: 'Date is on or after the specified date', category: 'date', valueType: 'single' },
  { value: 'dateLessThan', label: 'Date before', description: 'Date is before the specified date', category: 'date', valueType: 'single' },
  { value: 'dateLessThanOrEqual', label: 'Date on or before', description: 'Date is on or before the specified date', category: 'date', valueType: 'single' },
  { value: 'dateBetween', label: 'Date between', description: 'Date is between two dates (inclusive)', category: 'date', valueType: 'array' },
  { value: 'dateNotBetween', label: 'Date not between', description: 'Date is not between two dates', category: 'date', valueType: 'array' },
  { value: 'isToday', label: 'Is today', description: 'Date is today', category: 'date', valueType: 'single' },
  { value: 'isPastDate', label: 'Is past date', description: 'Date is in the past', category: 'date', valueType: 'single' },
  { value: 'isFutureDate', label: 'Is future date', description: 'Date is in the future', category: 'date', valueType: 'single' },
  { value: 'isWeekday', label: 'Is weekday', description: 'Date falls on a weekday (Mon-Fri)', category: 'date', valueType: 'single' },
  { value: 'isWeekend', label: 'Is weekend', description: 'Date falls on a weekend (Sat-Sun)', category: 'date', valueType: 'single' },
  { value: 'dayOfWeekEquals', label: 'Day of week equals', description: 'Date falls on specific day (0=Sunday, 1=Monday, etc.)', category: 'date', valueType: 'single' },
  { value: 'monthEquals', label: 'Month equals', description: 'Date is in specific month (1=January, 2=February, etc.)', category: 'date', valueType: 'single' },
  { value: 'yearEquals', label: 'Year equals', description: 'Date is in specific year', category: 'date', valueType: 'single' },
  { value: 'ageGreaterThan', label: 'Age greater than', description: 'Age calculated from date is greater than value', category: 'date', valueType: 'single' },
  { value: 'ageLessThan', label: 'Age less than', description: 'Age calculated from date is less than value', category: 'date', valueType: 'single' },
  { value: 'ageBetween', label: 'Age between', description: 'Age calculated from date is between two values', category: 'date', valueType: 'array' },
];

export interface EnhancedNavigationRule {
  field: string;
  operator: string;
  value: string | string[] | { type: 'variable' | 'literal'; value: string }[];
  target: string;
  isPage?: boolean;
}

export interface RuleValueInput {
  type: 'text' | 'number' | 'array' | 'variable' | 'mixed' | 'date';
  value: any;
  availableVariables?: string[];
  isDateArray?: boolean; // Flag to indicate if array should use date inputs
}

// Helper to convert enhanced rule to standard NavigationRule format
export function enhancedRuleToStandard(rule: EnhancedNavigationRule): string {
  const { field, operator, value } = rule;
  if (!field.trim()) return '';
  
  // Handle different operator types
  switch (operator) {
    case 'isEmpty':
      return `!${field} || ${field} === ""`;
    
    case 'isNotEmpty':
      return `${field} && ${field} !== ""`;
    
    case 'in':
    case 'notIn': {
      const arrayValue = Array.isArray(value) ? value : [value];
      const jsonArray = JSON.stringify(arrayValue);
      return operator === 'in' 
        ? `${jsonArray}.includes(${field})`
        : `!${jsonArray}.includes(${field})`;
    }
    
    case 'containsAny':
    case 'containsAll':
    case 'containsNone': {
      const arrayValue = Array.isArray(value) ? value : [value];
      const jsonArray = JSON.stringify(arrayValue);
      if (operator === 'containsAny') {
        return `${field}.some(v => ${jsonArray}.includes(v))`;
      } else if (operator === 'containsAll') {
        return `${jsonArray}.every(v => ${field}.includes(v))`;
      } else {
        return `!${field}.some(v => ${jsonArray}.includes(v))`;
      }
    }
    
    case 'between': {
      const [min, max] = Array.isArray(value) ? value : [value, value];
      return `${field} >= ${JSON.stringify(min)} && ${field} <= ${JSON.stringify(max)}`;
    }
    
    case 'notBetween': {
      const [min, max] = Array.isArray(value) ? value : [value, value];
      return `${field} < ${JSON.stringify(min)} || ${field} > ${JSON.stringify(max)}`;
    }
    
    case 'matches':
      return `new RegExp(${JSON.stringify(value)}).test(${field})`;
    
    case 'notContains':
      return `!${field}.includes(${JSON.stringify(value)})`;
    
    // Date operators
    case 'dateEquals':
      return `new Date(${field}).toDateString() === new Date(${JSON.stringify(value)}).toDateString()`;
    
    case 'dateNotEquals':
      return `new Date(${field}).toDateString() !== new Date(${JSON.stringify(value)}).toDateString()`;
    
    case 'dateGreaterThan':
      return `new Date(${field}) > new Date(${JSON.stringify(value)})`;
    
    case 'dateGreaterThanOrEqual':
      return `new Date(${field}) >= new Date(${JSON.stringify(value)})`;
    
    case 'dateLessThan':
      return `new Date(${field}) < new Date(${JSON.stringify(value)})`;
    
    case 'dateLessThanOrEqual':
      return `new Date(${field}) <= new Date(${JSON.stringify(value)})`;
    
    case 'dateBetween': {
      const [min, max] = Array.isArray(value) ? value : [value, value];
      return `new Date(${field}) >= new Date(${JSON.stringify(min)}) && new Date(${field}) <= new Date(${JSON.stringify(max)})`;
    }
    
    case 'dateNotBetween': {
      const [min, max] = Array.isArray(value) ? value : [value, value];
      return `new Date(${field}) < new Date(${JSON.stringify(min)}) || new Date(${field}) > new Date(${JSON.stringify(max)})`;
    }
    
    case 'isToday':
      return `new Date(${field}).toDateString() === new Date().toDateString()`;
    
    case 'isPastDate':
      return `new Date(${field}) < new Date()`;
    
    case 'isFutureDate':
      return `new Date(${field}) > new Date()`;
    
    case 'isWeekday': {
      return `(() => { const d = new Date(${field}); const day = d.getDay(); return day >= 1 && day <= 5; })()`;
    }
    
    case 'isWeekend': {
      return `(() => { const d = new Date(${field}); const day = d.getDay(); return day === 0 || day === 6; })()`;
    }
    
    case 'dayOfWeekEquals':
      return `new Date(${field}).getDay() === ${JSON.stringify(Number(value))}`;
    
    case 'monthEquals':
      return `(new Date(${field}).getMonth() + 1) === ${JSON.stringify(Number(value))}`;
    
    case 'yearEquals':
      return `new Date(${field}).getFullYear() === ${JSON.stringify(Number(value))}`;
    
    case 'ageGreaterThan':
      return `Math.floor((new Date().getTime() - new Date(${field}).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) > ${JSON.stringify(Number(value))}`;
    
    case 'ageLessThan':
      return `Math.floor((new Date().getTime() - new Date(${field}).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) < ${JSON.stringify(Number(value))}`;
    
    case 'ageBetween': {
      const [minAge, maxAge] = Array.isArray(value) ? value : [value, value];
      return `(() => { const age = Math.floor((new Date().getTime() - new Date(${field}).getTime()) / (365.25 * 24 * 60 * 60 * 1000)); return age >= ${JSON.stringify(Number(minAge))} && age <= ${JSON.stringify(Number(maxAge))}; })()`;
    }
    
    default:
      // Handle standard operators and contains/startsWith/endsWith
      if (['contains', 'startsWith', 'endsWith'].includes(operator)) {
        return `${field}.${operator}(${JSON.stringify(value)})`;
      }
      // Standard comparison operators
      return `${field} ${operator} ${JSON.stringify(value)}`;
  }
}

// Helper to parse standard rule to enhanced format
export function standardRuleToEnhanced(condition: string): Partial<EnhancedNavigationRule> {
  const trimmed = condition.trim();

  // 1. Date equals: new Date(field).toDateString() === new Date("value").toDateString()
  const dateEqualsMatch = trimmed.match(/^new Date\(([\w.]+)\)\.toDateString\(\) === new Date\(["']([^"']+)["']\)\.toDateString\(\)$/);
  if (dateEqualsMatch) {
    return { field: dateEqualsMatch[1], operator: 'dateEquals', value: dateEqualsMatch[2] };
  }

  // Date not equals
  const dateNotEqualsMatch = trimmed.match(/^new Date\(([\w.]+)\)\.toDateString\(\) !== new Date\(["']([^"']+)["']\)\.toDateString\(\)$/);
  if (dateNotEqualsMatch) {
    return { field: dateNotEqualsMatch[1], operator: 'dateNotEquals', value: dateNotEqualsMatch[2] };
  }

  // 2. Is today: new Date(field).toDateString() === new Date().toDateString()
  const isTodayMatch = trimmed.match(/^new Date\(([\w.]+)\)\.toDateString\(\) === new Date\(\)\.toDateString\(\)$/);
  if (isTodayMatch) {
    return { field: isTodayMatch[1], operator: 'isToday', value: '' };
  }

  // 3. Is weekend IIFE: (() => { const d = new Date(field); const day = d.getDay(); return day === 0 || day === 6; })()
  const isWeekendMatch = trimmed.match(/^\(\(\) => \{ const d = new Date\(([\w.]+)\); const day = d\.getDay\(\); return day === 0 \|\| day === 6; \}\)\(\)$/);
  if (isWeekendMatch) {
    return { field: isWeekendMatch[1], operator: 'isWeekend', value: '' };
  }

  // 4. Is weekday IIFE: (() => { const d = new Date(field); const day = d.getDay(); return day >= 1 && day <= 5; })()
  const isWeekdayMatch = trimmed.match(/^\(\(\) => \{ const d = new Date\(([\w.]+)\); const day = d\.getDay\(\); return day >= 1 && day <= 5; \}\)\(\)$/);
  if (isWeekdayMatch) {
    return { field: isWeekdayMatch[1], operator: 'isWeekday', value: '' };
  }

  // 5. Age between IIFE
  const ageBetweenMatch = trimmed.match(/^\(\(\) => \{ const age = Math\.floor\(\(new Date\(\)\.getTime\(\) - new Date\(([\w.]+)\)\.getTime\(\)\) \/ \(365\.25 \* 24 \* 60 \* 60 \* 1000\)\); return age >= (\d+) && age <= (\d+); \}\)\(\)$/);
  if (ageBetweenMatch) {
    return { field: ageBetweenMatch[1], operator: 'ageBetween', value: [ageBetweenMatch[2], ageBetweenMatch[3]] };
  }

  // 6. Age greater than
  const ageGreaterMatch = trimmed.match(/^Math\.floor\(\(new Date\(\)\.getTime\(\) - new Date\(([\w.]+)\)\.getTime\(\)\) \/ \(365\.25 \* 24 \* 60 \* 60 \* 1000\)\) > (\d+)$/);
  if (ageGreaterMatch) {
    return { field: ageGreaterMatch[1], operator: 'ageGreaterThan', value: ageGreaterMatch[2] };
  }

  // 7. Age less than
  const ageLessMatch = trimmed.match(/^Math\.floor\(\(new Date\(\)\.getTime\(\) - new Date\(([\w.]+)\)\.getTime\(\)\) \/ \(365\.25 \* 24 \* 60 \* 60 \* 1000\)\) < (\d+)$/);
  if (ageLessMatch) {
    return { field: ageLessMatch[1], operator: 'ageLessThan', value: ageLessMatch[2] };
  }

  // 8. Date between: new Date(field) >= new Date("min") && new Date(field) <= new Date("max")
  const dateBetweenMatch = trimmed.match(/^new Date\(([\w.]+)\) >= new Date\(["']([^"']+)["']\) && new Date\([\w.]+\) <= new Date\(["']([^"']+)["']\)$/);
  if (dateBetweenMatch) {
    return { field: dateBetweenMatch[1], operator: 'dateBetween', value: [dateBetweenMatch[2], dateBetweenMatch[3]] };
  }

  // 9. Date not between
  const dateNotBetweenMatch = trimmed.match(/^new Date\(([\w.]+)\) < new Date\(["']([^"']+)["']\) \|\| new Date\([\w.]+\) > new Date\(["']([^"']+)["']\)$/);
  if (dateNotBetweenMatch) {
    return { field: dateNotBetweenMatch[1], operator: 'dateNotBetween', value: [dateNotBetweenMatch[2], dateNotBetweenMatch[3]] };
  }

  // 10. Date comparison (greater/less): new Date(field) > new Date("value")
  const dateCompareMatch = trimmed.match(/^new Date\(([\w.]+)\) (>=|<=|>|<) new Date\(["']([^"']+)["']\)$/);
  if (dateCompareMatch) {
    const opMap: Record<string, string> = { '>': 'dateGreaterThan', '>=': 'dateGreaterThanOrEqual', '<': 'dateLessThan', '<=': 'dateLessThanOrEqual' };
    return { field: dateCompareMatch[1], operator: opMap[dateCompareMatch[2]], value: dateCompareMatch[3] };
  }

  // 11. Is past/future date: new Date(field) < new Date() or new Date(field) > new Date()
  const pastFutureMatch = trimmed.match(/^new Date\(([\w.]+)\) (<|>) new Date\(\)$/);
  if (pastFutureMatch) {
    return { field: pastFutureMatch[1], operator: pastFutureMatch[2] === '<' ? 'isPastDate' : 'isFutureDate', value: '' };
  }

  // 12. Day of week: new Date(field).getDay() === N
  const dayOfWeekMatch = trimmed.match(/^new Date\(([\w.]+)\)\.getDay\(\) === (\d+)$/);
  if (dayOfWeekMatch) {
    return { field: dayOfWeekMatch[1], operator: 'dayOfWeekEquals', value: dayOfWeekMatch[2] };
  }

  // 13. Month equals: (new Date(field).getMonth() + 1) === N
  const monthMatch = trimmed.match(/^\(new Date\(([\w.]+)\)\.getMonth\(\) \+ 1\) === (\d+)$/);
  if (monthMatch) {
    return { field: monthMatch[1], operator: 'monthEquals', value: monthMatch[2] };
  }

  // 14. Year equals: new Date(field).getFullYear() === N
  const yearMatch = trimmed.match(/^new Date\(([\w.]+)\)\.getFullYear\(\) === (\d+)$/);
  if (yearMatch) {
    return { field: yearMatch[1], operator: 'yearEquals', value: yearMatch[2] };
  }

  // 15. Regex matches: new RegExp("pattern").test(field)
  const regexMatch = trimmed.match(/^new RegExp\(["']([^"']+)["']\)\.test\(([\w.]+)\)$/);
  if (regexMatch) {
    return { field: regexMatch[2], operator: 'matches', value: regexMatch[1] };
  }

  // 16. Contains any: field.some(v => ["a","b"].includes(v))
  const containsAnyMatch = trimmed.match(/^([\w.]+)\.some\(v => (\[.+\])\.includes\(v\)\)$/);
  if (containsAnyMatch) {
    try {
      const arrayValue = JSON.parse(containsAnyMatch[2]);
      return { field: containsAnyMatch[1], operator: 'containsAny', value: arrayValue };
    } catch { /* fallthrough */ }
  }

  // 17. Contains all: ["a","b"].every(v => field.includes(v))
  const containsAllMatch = trimmed.match(/^(\[.+\])\.every\(v => ([\w.]+)\.includes\(v\)\)$/);
  if (containsAllMatch) {
    try {
      const arrayValue = JSON.parse(containsAllMatch[1]);
      return { field: containsAllMatch[2], operator: 'containsAll', value: arrayValue };
    } catch { /* fallthrough */ }
  }

  // 18. Contains none: !field.some(v => ["a","b"].includes(v))
  const containsNoneMatch = trimmed.match(/^!([\w.]+)\.some\(v => (\[.+\])\.includes\(v\)\)$/);
  if (containsNoneMatch) {
    try {
      const arrayValue = JSON.parse(containsNoneMatch[2]);
      return { field: containsNoneMatch[1], operator: 'containsNone', value: arrayValue };
    } catch { /* fallthrough */ }
  }

  // 19. Not contains: !field.includes("value")
  const notContainsMatch = trimmed.match(/^!([\w.]+)\.includes\(["']([^"']+)["']\)$/);
  if (notContainsMatch) {
    return { field: notContainsMatch[1], operator: 'notContains', value: notContainsMatch[2] };
  }

  // 20. In array: ["a","b"].includes(field)
  const inArrayMatch = trimmed.match(/^(\[.+\])\.includes\(([\w.]+)\)$/);
  if (inArrayMatch) {
    try {
      const arrayValue = JSON.parse(inArrayMatch[1]);
      return { field: inArrayMatch[2], operator: 'in', value: arrayValue };
    } catch { /* fallthrough */ }
  }

  // 21. Not in array: !["a","b"].includes(field)
  const notInArrayMatch = trimmed.match(/^!(\[.+\])\.includes\(([\w.]+)\)$/);
  if (notInArrayMatch) {
    try {
      const arrayValue = JSON.parse(notInArrayMatch[1]);
      return { field: notInArrayMatch[2], operator: 'notIn', value: arrayValue };
    } catch { /* fallthrough */ }
  }

  // 22. Is empty: !field || field === ""
  const isEmptyMatch = trimmed.match(/^!([\w.]+) \|\| [\w.]+ === ""$/);
  if (isEmptyMatch) {
    return { field: isEmptyMatch[1], operator: 'isEmpty', value: '' };
  }

  // 23. Is not empty: field && field !== ""
  const isNotEmptyMatch = trimmed.match(/^([\w.]+) && [\w.]+ !== ""$/);
  if (isNotEmptyMatch) {
    return { field: isNotEmptyMatch[1], operator: 'isNotEmpty', value: '' };
  }

  // 24. Between: field >= "min" && field <= "max"
  const betweenMatch = trimmed.match(/^([\w.]+) >= ["']?([^"'&]+)["']? && [\w.]+ <= ["']?([^"']+)["']?$/);
  if (betweenMatch) {
    return { field: betweenMatch[1], operator: 'between', value: [betweenMatch[2], betweenMatch[3]] };
  }

  // 25. Not between: field < "min" || field > "max"
  const notBetweenMatch = trimmed.match(/^([\w.]+) < ["']?([^"'|]+)["']? \|\| [\w.]+ > ["']?([^"']+)["']?$/);
  if (notBetweenMatch) {
    return { field: notBetweenMatch[1], operator: 'notBetween', value: [notBetweenMatch[2], notBetweenMatch[3]] };
  }

  // 26. String methods: field.contains("value"), field.startsWith("value"), field.endsWith("value")
  const stringMethodMatch = trimmed.match(/^([\w.]+)\.(contains|startsWith|endsWith)\(["']([^"']*)["']\)$/);
  if (stringMethodMatch) {
    return { field: stringMethodMatch[1], operator: stringMethodMatch[2], value: stringMethodMatch[3] };
  }

  // 27. Standard comparison: field == "value", field != "value", etc.
  const comparisonMatch = trimmed.match(/^([\w.]+) (==|!=|>=|<=|>|<) ["']?([^"']*)["']?$/);
  if (comparisonMatch) {
    let value: string = comparisonMatch[3];
    // Try to parse as JSON and convert back to string if needed
    try {
      const parsed = JSON.parse(comparisonMatch[3]);
      value = String(parsed);
    } catch {
      // Keep as string
    }
    return { field: comparisonMatch[1], operator: comparisonMatch[2], value };
  }

  // Fallback - return empty values to avoid breaking the UI
  return { field: '', operator: '==', value: '' };
}
