export interface ValidationOperatorDefinition {
  value: string;
  label: string;
  description?: string;
  category: 'comparison' | 'string' | 'array' | 'logical' | 'format' | 'date';
  valueType: 'single' | 'array' | 'variable' | 'mixed' | 'none';
  supportsVariables?: boolean;
}

export const VALIDATION_OPERATORS: ValidationOperatorDefinition[] = [
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
  { value: 'isEmpty', label: 'Is empty', description: 'Field has no value', category: 'logical', valueType: 'none' },
  { value: 'isNotEmpty', label: 'Is not empty', description: 'Field has a value', category: 'logical', valueType: 'none' },
  { value: 'between', label: 'Between', description: 'Value is between two values', category: 'logical', valueType: 'array' },
  { value: 'notBetween', label: 'Not between', description: 'Value is not between two values', category: 'logical', valueType: 'array' },
  
  // Format validation operators
  { value: 'isEmail', label: 'Is valid email', description: 'Value is a valid email address', category: 'format', valueType: 'none' },
  { value: 'isUrl', label: 'Is valid URL', description: 'Value is a valid URL', category: 'format', valueType: 'none' },
  { value: 'isNumber', label: 'Is valid number', description: 'Value is a valid number', category: 'format', valueType: 'none' },
  { value: 'isInteger', label: 'Is valid integer', description: 'Value is a valid integer', category: 'format', valueType: 'none' },
  { value: 'isDate', label: 'Is valid date', description: 'Value is a valid date', category: 'format', valueType: 'none' },
  { value: 'isPhone', label: 'Is valid phone', description: 'Value is a valid phone number', category: 'format', valueType: 'none' },
  
  // Length validation operators
  { value: 'lengthEquals', label: 'Length equals', description: 'Text length equals value', category: 'string', valueType: 'single' },
  { value: 'lengthGreaterThan', label: 'Length greater than', description: 'Text length greater than value', category: 'string', valueType: 'single' },
  { value: 'lengthLessThan', label: 'Length less than', description: 'Text length less than value', category: 'string', valueType: 'single' },
  { value: 'minLength', label: 'Minimum length', description: 'Text has minimum length', category: 'string', valueType: 'single' },
  { value: 'maxLength', label: 'Maximum length', description: 'Text has maximum length', category: 'string', valueType: 'single' },
  
  // Date validation operators
  { value: 'dateEquals', label: 'Date equals', description: 'Date is exactly equal to value', category: 'date', valueType: 'single' },
  { value: 'dateNotEquals', label: 'Date not equals', description: 'Date is not equal to value', category: 'date', valueType: 'single' },
  { value: 'dateGreaterThan', label: 'Date after', description: 'Date is after the specified date', category: 'date', valueType: 'single' },
  { value: 'dateGreaterThanOrEqual', label: 'Date on or after', description: 'Date is on or after the specified date', category: 'date', valueType: 'single' },
  { value: 'dateLessThan', label: 'Date before', description: 'Date is before the specified date', category: 'date', valueType: 'single' },
  { value: 'dateLessThanOrEqual', label: 'Date on or before', description: 'Date is on or before the specified date', category: 'date', valueType: 'single' },
  { value: 'dateBetween', label: 'Date between', description: 'Date is between two dates (inclusive)', category: 'date', valueType: 'array' },
  { value: 'dateNotBetween', label: 'Date not between', description: 'Date is not between two dates', category: 'date', valueType: 'array' },
  { value: 'isToday', label: 'Is today', description: 'Date is today', category: 'date', valueType: 'none' },
  { value: 'isPastDate', label: 'Is past date', description: 'Date is in the past', category: 'date', valueType: 'none' },
  { value: 'isFutureDate', label: 'Is future date', description: 'Date is in the future', category: 'date', valueType: 'none' },
  { value: 'isWeekday', label: 'Is weekday', description: 'Date falls on a weekday (Mon-Fri)', category: 'date', valueType: 'none' },
  { value: 'isWeekend', label: 'Is weekend', description: 'Date falls on a weekend (Sat-Sun)', category: 'date', valueType: 'none' },
  { value: 'dayOfWeekEquals', label: 'Day of week equals', description: 'Date falls on specific day (0=Sunday, 1=Monday, etc.)', category: 'date', valueType: 'single' },
  { value: 'monthEquals', label: 'Month equals', description: 'Date is in specific month (1=January, 2=February, etc.)', category: 'date', valueType: 'single' },
  { value: 'yearEquals', label: 'Year equals', description: 'Date is in specific year', category: 'date', valueType: 'single' },
  { value: 'ageGreaterThan', label: 'Age greater than', description: 'Age calculated from date is greater than value', category: 'date', valueType: 'single' },
  { value: 'ageLessThan', label: 'Age less than', description: 'Age calculated from date is less than value', category: 'date', valueType: 'single' },
  { value: 'ageBetween', label: 'Age between', description: 'Age calculated from date is between two values', category: 'date', valueType: 'array' },
];

export interface ValidationRule {
  field?: string;
  operator: string;
  value?: string | string[] | { type: 'variable' | 'literal'; value: string }[];
  message: string;
  severity?: 'error' | 'warning';
  dependencies?: string[];
  condition?: string; // Optional condition when this validation should apply
}

export interface ValidationRuleInput {
  type: 'text' | 'number' | 'array' | 'variable' | 'mixed' | 'date';
  value: any;
  availableVariables?: string[];
  isDateArray?: boolean; // Flag to indicate if array should use date inputs
}

// Helper to convert enhanced validation rule to executable function
export function validationRuleToFunction(rule: ValidationRule): (value: any, formValues: Record<string, any>) => string | null {
  const { field, operator, value: ruleValue, message } = rule;
  
  return (currentValue: any, formValues: Record<string, any>): string | null => {
    // If there's a field reference, use that field's value, otherwise use currentValue
    const valueToValidate = field ? formValues[field] : currentValue;
    
    try {
      // Handle different operator types
      switch (operator) {
        case 'isEmpty':
          return (!valueToValidate || valueToValidate === "" || (Array.isArray(valueToValidate) && valueToValidate.length === 0)) ? null : message;
        
        case 'isNotEmpty':
          return (valueToValidate && valueToValidate !== "" && !(Array.isArray(valueToValidate) && valueToValidate.length === 0)) ? null : message;
        
        case 'isEmail': {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(String(valueToValidate)) ? null : message;
        }
        
        case 'isUrl': {
          try {
            new URL(String(valueToValidate));
            return null;
          } catch {
            return message;
          }
        }
        
        case 'isNumber':
          return (!isNaN(Number(valueToValidate)) && isFinite(Number(valueToValidate))) ? null : message;
        
        case 'isInteger':
          return Number.isInteger(Number(valueToValidate)) ? null : message;
        
        case 'isDate': {
          const date = new Date(valueToValidate);
          return !isNaN(date.getTime()) ? null : message;
        }
        
        case 'isPhone': {
          const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
          return phoneRegex.test(String(valueToValidate)) ? null : message;
        }
        
        case 'minLength':
          return String(valueToValidate).length >= Number(ruleValue) ? null : message;
        
        case 'maxLength':
          return String(valueToValidate).length <= Number(ruleValue) ? null : message;
        
        case 'lengthEquals':
          return String(valueToValidate).length === Number(ruleValue) ? null : message;
        
        case 'lengthGreaterThan':
          return String(valueToValidate).length > Number(ruleValue) ? null : message;
        
        case 'lengthLessThan':
          return String(valueToValidate).length < Number(ruleValue) ? null : message;
        
        case 'in':
        case 'notIn': {
          const arrayValue = Array.isArray(ruleValue) ? ruleValue : [ruleValue];
          if (Array.isArray(valueToValidate)) {
            // A multi select answer is in the list when all its choices are, and not in it when none are
            const passes = operator === 'in'
              ? valueToValidate.every(v => arrayValue.includes(v))
              : !valueToValidate.some(v => arrayValue.includes(v));
            return passes ? null : message;
          }
          const isIn = arrayValue.includes(valueToValidate);
          return (operator === 'in' ? isIn : !isIn) ? null : message;
        }
        
        case 'containsAny':
        case 'containsAll':
        case 'containsNone': {
          if (!Array.isArray(valueToValidate)) return message;
          const arrayValue = Array.isArray(ruleValue) ? ruleValue : [ruleValue];
          
          if (operator === 'containsAny') {
            return valueToValidate.some(v => arrayValue.includes(v)) ? null : message;
          } else if (operator === 'containsAll') {
            return arrayValue.every(v => valueToValidate.includes(v)) ? null : message;
          } else {
            return !valueToValidate.some(v => arrayValue.includes(v)) ? null : message;
          }
        }
        
        case 'between': {
          const [min, max] = Array.isArray(ruleValue) ? ruleValue : [ruleValue, ruleValue];
          const numValue = Number(valueToValidate);
          return (numValue >= Number(min) && numValue <= Number(max)) ? null : message;
        }
        
        case 'notBetween': {
          const [min, max] = Array.isArray(ruleValue) ? ruleValue : [ruleValue, ruleValue];
          const numValue = Number(valueToValidate);
          return (numValue < Number(min) || numValue > Number(max)) ? null : message;
        }
        
        case 'matches': {
          const regex = new RegExp(String(ruleValue));
          return regex.test(String(valueToValidate)) ? null : message;
        }
        
        case 'contains':
          return String(valueToValidate).includes(String(ruleValue)) ? null : message;
        
        case 'notContains':
          return !String(valueToValidate).includes(String(ruleValue)) ? null : message;
        
        case 'startsWith':
          return String(valueToValidate).startsWith(String(ruleValue)) ? null : message;
        
        case 'endsWith':
          return String(valueToValidate).endsWith(String(ruleValue)) ? null : message;
        
        // Date validation operators
        case 'dateEquals': {
          const date1 = new Date(valueToValidate);
          const date2 = new Date(String(ruleValue));
          if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return message;
          return date1.toDateString() === date2.toDateString() ? null : message;
        }
        
        case 'dateNotEquals': {
          const date1 = new Date(valueToValidate);
          const date2 = new Date(String(ruleValue));
          if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return message;
          return date1.toDateString() !== date2.toDateString() ? null : message;
        }
        
        case 'dateGreaterThan': {
          const date1 = new Date(valueToValidate);
          const date2 = new Date(String(ruleValue));
          if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return message;
          return date1 > date2 ? null : message;
        }
        
        case 'dateGreaterThanOrEqual': {
          const date1 = new Date(valueToValidate);
          const date2 = new Date(String(ruleValue));
          if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return message;
          return date1 >= date2 ? null : message;
        }
        
        case 'dateLessThan': {
          const date1 = new Date(valueToValidate);
          const date2 = new Date(String(ruleValue));
          if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return message;
          return date1 < date2 ? null : message;
        }
        
        case 'dateLessThanOrEqual': {
          const date1 = new Date(valueToValidate);
          const date2 = new Date(String(ruleValue));
          if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return message;
          return date1 <= date2 ? null : message;
        }
        
        case 'dateBetween': {
          const date = new Date(valueToValidate);
          const [min, max] = Array.isArray(ruleValue) ? ruleValue : [ruleValue, ruleValue];
          const minDate = new Date(String(min));
          const maxDate = new Date(String(max));
          if (isNaN(date.getTime()) || isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) return message;
          return (date >= minDate && date <= maxDate) ? null : message;
        }
        
        case 'dateNotBetween': {
          const date = new Date(valueToValidate);
          const [min, max] = Array.isArray(ruleValue) ? ruleValue : [ruleValue, ruleValue];
          const minDate = new Date(String(min));
          const maxDate = new Date(String(max));
          if (isNaN(date.getTime()) || isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) return message;
          return (date < minDate || date > maxDate) ? null : message;
        }
        
        case 'isToday': {
          const date = new Date(valueToValidate);
          const today = new Date();
          if (isNaN(date.getTime())) return message;
          return date.toDateString() === today.toDateString() ? null : message;
        }
        
        case 'isPastDate': {
          const date = new Date(valueToValidate);
          const today = new Date();
          if (isNaN(date.getTime())) return message;
          return date < today ? null : message;
        }
        
        case 'isFutureDate': {
          const date = new Date(valueToValidate);
          const today = new Date();
          if (isNaN(date.getTime())) return message;
          return date > today ? null : message;
        }
        
        case 'isWeekday': {
          const date = new Date(valueToValidate);
          if (isNaN(date.getTime())) return message;
          const dayOfWeek = date.getDay();
          return (dayOfWeek >= 1 && dayOfWeek <= 5) ? null : message;
        }
        
        case 'isWeekend': {
          const date = new Date(valueToValidate);
          if (isNaN(date.getTime())) return message;
          const dayOfWeek = date.getDay();
          return (dayOfWeek === 0 || dayOfWeek === 6) ? null : message;
        }
        
        case 'dayOfWeekEquals': {
          const date = new Date(valueToValidate);
          if (isNaN(date.getTime())) return message;
          const dayOfWeek = date.getDay();
          return dayOfWeek === Number(ruleValue) ? null : message;
        }
        
        case 'monthEquals': {
          const date = new Date(valueToValidate);
          if (isNaN(date.getTime())) return message;
          const month = date.getMonth() + 1; // JavaScript months are 0-indexed
          return month === Number(ruleValue) ? null : message;
        }
        
        case 'yearEquals': {
          const date = new Date(valueToValidate);
          if (isNaN(date.getTime())) return message;
          const year = date.getFullYear();
          return year === Number(ruleValue) ? null : message;
        }
        
        case 'ageGreaterThan': {
          const birthDate = new Date(valueToValidate);
          if (isNaN(birthDate.getTime())) return message;
          const today = new Date();
          const ageInYears = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          return ageInYears > Number(ruleValue) ? null : message;
        }
        
        case 'ageLessThan': {
          const birthDate = new Date(valueToValidate);
          if (isNaN(birthDate.getTime())) return message;
          const today = new Date();
          const ageInYears = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          return ageInYears < Number(ruleValue) ? null : message;
        }
        
        case 'ageBetween': {
          const birthDate = new Date(valueToValidate);
          if (isNaN(birthDate.getTime())) return message;
          const today = new Date();
          const ageInYears = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          const [minAge, maxAge] = Array.isArray(ruleValue) ? ruleValue : [ruleValue, ruleValue];
          return (ageInYears >= Number(minAge) && ageInYears <= Number(maxAge)) ? null : message;
        }
        
        default: {
          // Handle standard comparison operators
          // '==' is a TRIGGER: if value matches, validation FAILS (e.g. disqualify specific value)
          // All others are CONSTRAINTS: condition must be true for validation to PASS
          const compareValue = ruleValue;
          // A multi select answer equals X when X is one of its choices, so picking
          // another option alongside a disqualifying one doesn't get past the rule
          const equals = Array.isArray(valueToValidate)
            ? valueToValidate.some(v => v == compareValue)
            : valueToValidate == compareValue;
          switch (operator) {
            case '==':
              // Trigger: "if value equals X, show error" (e.g. disqualify "yes")
              return equals ? message : null;
            case '!=':
              // Constraint: "value must not equal X" (e.g. must not be "Pregnant")
              return !equals ? null : message;
            case '>':
              return Number(valueToValidate) > Number(compareValue) ? null : message;
            case '>=':
              return Number(valueToValidate) >= Number(compareValue) ? null : message;
            case '<':
              return Number(valueToValidate) < Number(compareValue) ? null : message;
            case '<=':
              return Number(valueToValidate) <= Number(compareValue) ? null : message;
            default:
              return null;
          }
        }
      }
    } catch (error) {
      console.error('Validation rule error:', error);
      return message;
    }
  };
}

// Helper to parse validation rule from string format (if needed for backwards compatibility)
export function parseValidationRule(ruleString: string): Partial<ValidationRule> {
  // Basic parsing - can be extended based on needs
  const parts = ruleString.split('|');
  if (parts.length >= 2) {
    const [operator, value, ...messageParts] = parts;
    return {
      operator: operator.trim(),
      value: value.trim(),
      message: messageParts.join('|').trim() || 'Validation failed'
    };
  }
  
  return {
    operator: '==',
    value: '',
    message: 'Validation failed'
  };
}

// Helper to convert validation rule to string format (if needed)
export function validationRuleToString(rule: ValidationRule): string {
  const { operator, value, message } = rule;
  return `${operator}|${Array.isArray(value) ? value.join(',') : value}|${message}`;
}