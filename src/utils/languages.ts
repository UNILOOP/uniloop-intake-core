export type LanguageOption = {
  code: string;
  label: string;
};

export const DEFAULT_LANGUAGE_CODE = 'en-US';
export const LEGACY_DEFAULT_LANGUAGE_CODE = 'en';

export const COMMON_LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en-US', label: 'English (United States)' },
  { code: 'en-GB', label: 'English (United Kingdom)' },
  { code: 'en-IN', label: 'English (India)' },

  { code: 'es-ES', label: 'Spanish (Spain)' },
  { code: 'es-MX', label: 'Spanish (Mexico)' },
  { code: 'es-US', label: 'Spanish (United States)' },
  { code: 'es-AR', label: 'Spanish (Argentina)' },
  { code: 'es-CO', label: 'Spanish (Colombia)' },
  { code: 'es-CL', label: 'Spanish (Chile)' },
  { code: 'es-PE', label: 'Spanish (Peru)' },
  { code: 'es-VE', label: 'Spanish (Venezuela)' },

  { code: 'fr-FR', label: 'French (France)' },
  { code: 'fr-CA', label: 'French (Canada)' },
  { code: 'fr-BE', label: 'French (Belgium)' },
  { code: 'fr-CH', label: 'French (Switzerland)' },

  { code: 'de-DE', label: 'German (Germany)' },
  { code: 'de-AT', label: 'German (Austria)' },
  { code: 'de-CH', label: 'German (Switzerland)' },

  { code: 'it-IT', label: 'Italian (Italy)' },
  { code: 'it-CH', label: 'Italian (Switzerland)' },

  { code: 'pt-PT', label: 'Portuguese (Portugal)' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },

  { code: 'nl-NL', label: 'Dutch (Netherlands)' },
  { code: 'nl-BE', label: 'Dutch (Belgium)' },

  { code: 'zh-CN', label: 'Chinese (Simplified, China)' },
  { code: 'zh-TW', label: 'Chinese (Traditional, Taiwan)' },
  { code: 'zh-HK', label: 'Chinese (Traditional, Hong Kong)' },
  { code: 'zh-SG', label: 'Chinese (Simplified, Singapore)' },

  { code: 'ja-JP', label: 'Japanese (Japan)' },
  { code: 'ko-KR', label: 'Korean (South Korea)' },

  { code: 'ar-SA', label: 'Arabic (Saudi Arabia)' },
  { code: 'ar-AE', label: 'Arabic (United Arab Emirates)' },
  { code: 'ar-EG', label: 'Arabic (Egypt)' },
  { code: 'ar-MA', label: 'Arabic (Morocco)' },
  { code: 'ar-DZ', label: 'Arabic (Algeria)' },
  { code: 'ar-IQ', label: 'Arabic (Iraq)' },
  { code: 'ar-JO', label: 'Arabic (Jordan)' },
  { code: 'ar-KW', label: 'Arabic (Kuwait)' },
  { code: 'ar-LB', label: 'Arabic (Lebanon)' },
  { code: 'ar-QA', label: 'Arabic (Qatar)' },

  { code: 'hi-IN', label: 'Hindi (India)' },
  { code: 'bn-IN', label: 'Bengali (India)' },
  { code: 'bn-BD', label: 'Bengali (Bangladesh)' },
  { code: 'ta-IN', label: 'Tamil (India)' },
  { code: 'ta-LK', label: 'Tamil (Sri Lanka)' },
  { code: 'te-IN', label: 'Telugu (India)' },
  { code: 'ml-IN', label: 'Malayalam (India)' },
  { code: 'mr-IN', label: 'Marathi (India)' },
  { code: 'gu-IN', label: 'Gujarati (India)' },
  { code: 'kn-IN', label: 'Kannada (India)' },
  { code: 'pa-IN', label: 'Punjabi (India)' },
  { code: 'ur-IN', label: 'Urdu (India)' },
  { code: 'ur-PK', label: 'Urdu (Pakistan)' },

  { code: 'ru-RU', label: 'Russian (Russia)' },
  { code: 'uk-UA', label: 'Ukrainian (Ukraine)' },
  { code: 'pl-PL', label: 'Polish (Poland)' },
  { code: 'cs-CZ', label: 'Czech (Czechia)' },
  { code: 'sk-SK', label: 'Slovak (Slovakia)' },
  { code: 'hu-HU', label: 'Hungarian (Hungary)' },
  { code: 'ro-RO', label: 'Romanian (Romania)' },
  { code: 'bg-BG', label: 'Bulgarian (Bulgaria)' },
  { code: 'hr-HR', label: 'Croatian (Croatia)' },
  { code: 'sr-RS', label: 'Serbian (Serbia)' },
  { code: 'sl-SI', label: 'Slovenian (Slovenia)' },

  { code: 'tr-TR', label: 'Turkish (Türkiye)' },
  { code: 'he-IL', label: 'Hebrew (Israel)' },
  { code: 'fa-IR', label: 'Persian (Iran)' },

  { code: 'id-ID', label: 'Indonesian (Indonesia)' },
  { code: 'ms-MY', label: 'Malay (Malaysia)' },
  { code: 'ms-SG', label: 'Malay (Singapore)' },
  { code: 'th-TH', label: 'Thai (Thailand)' },
  { code: 'vi-VN', label: 'Vietnamese (Vietnam)' },
  { code: 'fil-PH', label: 'Filipino (Philippines)' },

  { code: 'sv-SE', label: 'Swedish (Sweden)' },
  { code: 'da-DK', label: 'Danish (Denmark)' },
  { code: 'no-NO', label: 'Norwegian (Norway)' },
  { code: 'nb-NO', label: 'Norwegian Bokmål (Norway)' },
  { code: 'nn-NO', label: 'Norwegian Nynorsk (Norway)' },
  { code: 'fi-FI', label: 'Finnish (Finland)' },
  { code: 'is-IS', label: 'Icelandic (Iceland)' },

  { code: 'el-GR', label: 'Greek (Greece)' },

  { code: 'af-ZA', label: 'Afrikaans (South Africa)' },
  { code: 'sw-KE', label: 'Swahili (Kenya)' },
  { code: 'sw-TZ', label: 'Swahili (Tanzania)' },
  { code: 'zu-ZA', label: 'Zulu (South Africa)' },
  { code: 'xh-ZA', label: 'Xhosa (South Africa)' },

  { code: 'en-AU', label: 'English (Australia)' },
  { code: 'en-CA', label: 'English (Canada)' },
  { code: 'en-NZ', label: 'English (New Zealand)' },
  { code: 'en-ZA', label: 'English (South Africa)' },
  { code: 'en-SG', label: 'English (Singapore)' },
  { code: 'en-IE', label: 'English (Ireland)' },
];

export function normalizeLanguageCode(code: string): string {
  return code.trim().replace('_', '-').toLowerCase();
}

export function canonicalLanguageCode(code: string): string {
  const normalizedCode = normalizeLanguageCode(code);

  if (normalizedCode === normalizeLanguageCode(LEGACY_DEFAULT_LANGUAGE_CODE)) {
    return DEFAULT_LANGUAGE_CODE;
  }

  return COMMON_LANGUAGE_OPTIONS.find((option) => (
    normalizeLanguageCode(option.code) === normalizedCode
  ))?.code ?? code.trim().replace('_', '-');
}

export function isDefaultLanguageCode(code: string): boolean {
  const normalizedCode = normalizeLanguageCode(code);

  return normalizedCode === normalizeLanguageCode(DEFAULT_LANGUAGE_CODE)
    || normalizedCode === normalizeLanguageCode(LEGACY_DEFAULT_LANGUAGE_CODE);
}

export function getLanguageLabel(code: string): string {
  const normalizedCode = normalizeLanguageCode(code);
  const language = COMMON_LANGUAGE_OPTIONS.find((option) => (
    normalizeLanguageCode(option.code) === normalizedCode
  ));

  if (language) {
    return language.label;
  }

  return normalizedCode.toUpperCase();
}

export function getLanguageOptionsForLocalizations(
  localizations?: Record<string, Record<string, string>>
): LanguageOption[] {
  if (!localizations) {
    return [];
  }

  const options = Object.keys(localizations)
    .filter((code) => code.trim().length > 0)
    .map((code) => {
      const languageCode = canonicalLanguageCode(code);

      return {
        code: languageCode,
        label: getLanguageLabel(languageCode),
      };
    })
    .filter((option, index, options) => (
      options.findIndex((candidate) => (
        normalizeLanguageCode(candidate.code) === normalizeLanguageCode(option.code)
      )) === index
    ));

  if (options.length === 0) {
    return [];
  }

  if (options.some((option) => isDefaultLanguageCode(option.code))) {
    return options;
  }

  return [
    {
      code: DEFAULT_LANGUAGE_CODE,
      label: getLanguageLabel(DEFAULT_LANGUAGE_CODE),
    },
    ...options,
  ];
}

export function getBestLanguageCodeForLocalizations(
  localizations?: Record<string, Record<string, string>>,
  preferredCodes: string[] = []
): string {
  const options = getLanguageOptionsForLocalizations(localizations);
  const defaultOption = options.find((option) => isDefaultLanguageCode(option.code));

  if (options.length === 0) {
    return DEFAULT_LANGUAGE_CODE;
  }

  for (const preferredCode of preferredCodes) {
    const canonicalPreferredCode = canonicalLanguageCode(preferredCode);
    const exactMatch = options.find((option) => (
      normalizeLanguageCode(option.code) === normalizeLanguageCode(canonicalPreferredCode)
    ));

    if (exactMatch) {
      return exactMatch.code;
    }
  }

  for (const preferredCode of preferredCodes) {
    const preferredLanguage = normalizeLanguageCode(preferredCode).split('-')[0];
    const languageMatch = options.find((option) => (
      normalizeLanguageCode(option.code).split('-')[0] === preferredLanguage
    ));

    if (languageMatch && !isDefaultLanguageCode(languageMatch.code)) {
      return languageMatch.code;
    }
  }

  return defaultOption?.code ?? DEFAULT_LANGUAGE_CODE;
}
