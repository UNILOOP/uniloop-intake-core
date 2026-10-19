export function hexToRgba(hex: string, alpha = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const VARIANT_PSEUDOS: Record<string, string> = {
  hover: ':hover',
  focus: ':focus',
  active: ':active',
  disabled: ':disabled',
  'focus-visible': ':focus-visible',
  'focus-within': ':focus-within',
  checked: ':checked',
};

// Rules only match inside a rendered survey, so a host page that uses the same
// class keeps its own styles. :where() adds no specificity, so inside the survey
// the rules cascade exactly as they did before they were scoped.
const SURVEY_SCOPE = ':where(.survey-theme-container)';

const STYLE_ID = 'dynamic-color-styles';

// Rules already inserted, per stylesheet. The sheet's own rules can't be
// checked instead: the browser normalises cssText, so rgba(..., 1) reads back
// as rgb(...). Moving the style tag gives it a new, empty sheet, which starts
// with no entries here.
const insertedRules = new WeakMap<CSSStyleSheet, Set<string>>();

// Properly escape CSS class name special characters
function escapeCSSSelector(className: string): string {
  return className
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/#/g, '\\#')
    .replace(/\//g, '\\/');
}

// Adds CSS for the theme's arbitrary hex colour classes (bg-[#1C1C1C],
// hover:text-[#948EC4]) that the host's Tailwind build may not include.
export function applyDynamicColors(theme: any) {
  if (typeof document === 'undefined' || !theme) return;

  let styleTag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = STYLE_ID;
    document.head.appendChild(styleTag);
  }

  const sheet = styleTag.sheet as CSSStyleSheet;
  let inserted = insertedRules.get(sheet);
  if (!inserted) {
    inserted = new Set();
    insertedRules.set(sheet, inserted);
  }

  const addRule = (selector: string, rule: string) => {
    const text = `${selector}{${rule}}`;
    if (inserted.has(text)) return;
    try {
      sheet.insertRule(text, sheet.cssRules.length);
      inserted.add(text);
    } catch (error) {
      console.warn(`Failed to insert CSS rule: ${text}`, error);
    }
  };

  const parseClasses = (classes: string) => {
    classes.split(/\s+/).forEach((cls) => {
      const match = cls.match(/^(?:([a-zA-Z-]+):)?(text|bg|border|ring|accent)-\[(#[0-9a-fA-F]{6})\](?:\/(\d{1,3}))?$/);
      if (match) {
        const variant = match[1];
        const type = match[2];
        const color = match[3];
        const alpha = match[4] ? parseInt(match[4], 10) / 100 : 1;
        const rgba = hexToRgba(color, alpha);

        // A prefix that isn't a plain pseudo-class (dark:, md:, group-hover:) is
        // left to the host's Tailwind build instead of being applied always.
        const pseudo = variant ? VARIANT_PSEUDOS[variant] : '';
        if (typeof pseudo !== 'string') return;

        const selector = `${SURVEY_SCOPE} .${escapeCSSSelector(cls)}${pseudo}`;

        const prop =
          type === 'text'
            ? `color: ${rgba}`
            : type === 'bg'
            ? `background-color: ${rgba}`
            : type === 'border'
            ? `border-color: ${rgba}`
            : type === 'ring'
            ? `--tw-ring-color: ${rgba}`
            : `accent-color: ${rgba}`;

        addRule(selector, prop);
      }
    });
  };

  const traverse = (obj: any) => {
    if (!obj) return;
    if (typeof obj === 'string') {
      parseClasses(obj);
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach(traverse);
    }
  };

  traverse(theme);
}