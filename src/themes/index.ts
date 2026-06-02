import type { SurveyTheme, ThemeDefinition } from '../types';

// Re-export ThemeDefinition type so it can be imported from themes
export type { ThemeDefinition } from '../types';

// Default theme - clean and refined
export const defaultTheme: ThemeDefinition = {
  name: 'default',
  containerLayout: 'max-w-full mx-auto',
  header: 'mb-6',
  title: 'text-2xl font-semibold text-gray-900 mb-2',
  description: 'text-base text-gray-600',
  background: 'bg-gray-50',
  card: 'bg-white shadow-sm border border-gray-100 rounded-lg p-4 mb-4',
  field: {
    label: 'block text-sm font-medium text-gray-700 mb-2',
    input:
      'w-full rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
    description: 'mt-1 text-xs text-gray-500',
    error: 'mt-1 text-xs text-red-600',
    radio:
      'focus:ring-1 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-200',
    checkbox:
      'focus:ring-1 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-200 rounded',
    select:
      'w-full rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
    textarea:
      'w-full rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
    file: 'w-full text-sm text-gray-700 border border-gray-200 rounded-md cursor-pointer bg-white hover:bg-gray-50',
    matrix: 'border-collapse w-full text-sm',
    range:
      'accent-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500',
    text: 'text-gray-700',
    activeText: 'text-blue-600',
    placeholder: 'text-gray-400',
    boxBorder: 'border-gray-200',
    selectableBox: 'p-3 transition-all duration-150 cursor-pointer rounded-md',
    selectableBoxDefault: 'border border-gray-200 bg-white hover:bg-gray-50',
    selectableBoxSelected: 'border-2 border-blue-500 bg-blue-50',
    selectableBoxHover: 'hover:border-gray-300',
    selectableBoxFocus:
      'focus-within:ring-1 focus-within:ring-blue-500 focus-within:ring-offset-1',
    selectableBoxDisabled: 'opacity-50 cursor-not-allowed',
    selectableBoxContainer: 'space-y-2',
    selectableBoxText: 'text-gray-700 text-sm',
    selectableBoxTextSelected: 'text-blue-900 font-medium',
    selectableBoxIndicator: 'bg-blue-600 text-white',
    selectableBoxIndicatorIcon: 'text-white',
    agreementContainer: 'p-4 space-y-3',
    agreementPanel:
      'rounded-md border border-gray-100 p-3 text-sm whitespace-pre-wrap bg-gray-50',
    signatureCanvas:
      'w-full h-36 border border-gray-200 rounded-md overflow-hidden bg-white',
    signatureColor: '#111827',
  },
  container: {
    card: 'bg-white border border-gray-100 rounded-lg',
    border: 'border-gray-200',
    activeBorder: 'border-blue-500',
    activeBg: 'bg-blue-50',
    header: 'bg-gray-50',
  },
  progress: {
    bar: 'h-2 bg-blue-500 rounded-full overflow-hidden',
    dots: 'flex space-x-2',
    numbers: 'flex space-x-2',
    percentage: 'text-right text-xs text-gray-500 mb-1',
    label: 'text-xs text-gray-500 mb-1',
  },
  button: {
    primary:
      'w-full justify-center rounded-full px-8 py-4 sm:px-10 sm:py-5 bg-blue-600 text-white font-semibold text-sm sm:text-base transition-all duration-200 flex items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500',
    secondary:
      'inline-flex justify-center py-2 px-4 border border-gray-200 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors',
    text: 'text-sm font-medium text-blue-600 hover:text-blue-700',
    navigation:
      'inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors',
  },
  colors: {
    primary: '#3B82F6',
    secondary: '#6B7280',
    accent: '#F59E0B',
    background: '#F9FAFB',
    text: '#111827',
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
  },
};

// Minimal theme - clean and modern
export const minimalTheme: ThemeDefinition = {
  name: 'minimal',
  containerLayout: 'max-w-xl mx-auto',
  header: 'mb-6',
  title: 'text-2xl font-light text-gray-900 mb-3',
  description: 'text-base text-gray-600 mb-6',
  background: 'bg-gray-50',
  card: 'bg-white rounded-none border-0 border-gray-100 shadow-sm p-0 mb-6',
  container: {
    card: 'bg-white border border-gray-100 rounded-md shadow-sm',
    border: 'border-gray-200',
    activeBorder: 'border-gray-800',
    activeBg: 'bg-gray-50',
    header: 'bg-white',
  },
  field: {
    label: 'block text-base font-normal text-gray-700 mb-3',
    input:
      'w-full rounded-md border border-gray-200 shadow-sm focus:border-gray-800 focus:ring-1 focus:ring-gray-800 text-base py-2.5 px-3 bg-white transition-colors',
    description: 'mt-2 text-sm text-gray-500',
    error: 'mt-2 text-sm text-red-600',
    radio: 'focus:ring-gray-800 h-4 w-4 text-gray-800 border-gray-300',
    checkbox:
      'focus:ring-gray-800 h-4 w-4 text-gray-800 border-gray-300 rounded',
    select:
      'w-full rounded-md border border-gray-200 shadow-sm focus:border-gray-800 focus:ring-1 focus:ring-gray-800 text-base py-2.5 px-3 bg-white transition-colors',
    textarea:
      'w-full rounded-md border border-gray-200 shadow-sm focus:border-gray-800 focus:ring-1 focus:ring-gray-800 text-base py-2.5 px-3 bg-white transition-colors',
    file: 'w-full text-base text-gray-700 border border-gray-200 rounded-md cursor-pointer bg-white py-2.5 px-3 shadow-sm',
    matrix: 'border-collapse w-full text-base rounded-md overflow-hidden',
    range: 'accent-gray-800',
    text: 'text-gray-700',
    activeText: 'text-gray-900',
    placeholder: 'text-gray-400',
    boxBorder: 'border-gray-200',
    selectableBox: 'p-4 transition-all duration-200 cursor-pointer rounded-md',
    selectableBoxDefault:
      'border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300',
    selectableBoxSelected: 'border-2 border-gray-800 bg-gray-50',
    selectableBoxHover: 'hover:border-gray-400',
    selectableBoxFocus:
      'focus-within:ring-2 focus-within:ring-gray-800 focus-within:ring-offset-1',
    selectableBoxDisabled: 'opacity-50 cursor-not-allowed',
    selectableBoxContainer: 'space-y-3',
    selectableBoxText: 'text-gray-700 text-base font-normal',
    selectableBoxTextSelected: 'text-gray-900 font-medium',
    selectableBoxIndicator: 'bg-gray-800 text-white',
    selectableBoxIndicatorIcon: 'text-white',
    agreementContainer: 'p-4 space-y-3',
    agreementPanel:
      'rounded-md border border-gray-200 p-4 text-base whitespace-pre-wrap bg-gray-50',
    signatureCanvas:
      'w-full h-40 border border-gray-200 rounded-md overflow-hidden bg-white',
    signatureColor: '#1F2937',
  },
  progress: {
    bar: 'h-2 bg-gray-800 rounded-full overflow-hidden',
    dots: 'flex space-x-2 justify-center',
    numbers: 'flex space-x-2 justify-center',
    percentage: 'text-right text-sm text-gray-600 font-normal mb-2',
    label: 'text-sm text-gray-700 mb-2 font-normal',
  },
  button: {
    primary:
      'w-full justify-center rounded-full px-8 py-4 sm:px-10 sm:py-5 bg-gray-800 text-white font-medium text-sm sm:text-base transition-all duration-200 flex items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-gray-900 active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700',
    secondary:
      'inline-flex justify-center py-2.5 px-5 border border-gray-200 text-base font-normal rounded-md text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 transition-colors shadow-sm',
    text: 'text-base font-normal text-gray-700 hover:text-gray-900 transition-colors',
    navigation:
      'inline-flex items-center px-5 py-2.5 text-base font-normal rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 transition-colors duration-200 shadow-sm',
  },
  colors: {
    primary: '#1F2937',
    secondary: '#6B7280',
    accent: '#374151',
    background: '#F9FAFB',
    text: '#1F2937',
    border: '#E5E7EB',
    error: '#DC2626',
    success: '#059669',
  },
};

// Colorful theme - vibrant but refined
export const colorfulTheme: ThemeDefinition = {
  name: 'colorful',
  containerLayout: 'max-w-4xl mx-auto',
  header: 'mb-6',
  title: 'text-2xl font-bold text-purple-900 mb-2',
  description: 'text-base text-purple-700',
  background: 'bg-purple-50',
  card: 'bg-white shadow-sm border border-purple-100 rounded-xl p-5 mb-5',
  container: {
    card: 'bg-white border border-purple-100 rounded-xl',
    border: 'border-purple-200',
    activeBorder: 'border-purple-500',
    activeBg: 'bg-purple-50',
    header: 'bg-purple-50',
  },
  field: {
    label: 'block text-sm font-semibold text-purple-800 mb-2',
    input:
      'w-full rounded-lg border-purple-200 shadow-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-300',
    description: 'mt-1 text-sm text-purple-600',
    error: 'mt-1 text-sm text-pink-600 font-medium',
    radio:
      'focus:ring-1 focus:ring-purple-500 h-4 w-4 text-purple-600 border-purple-300',
    checkbox:
      'focus:ring-1 focus:ring-purple-500 h-4 w-4 text-purple-600 border-purple-300 rounded',
    select:
      'w-full rounded-lg border-purple-200 shadow-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-300',
    textarea:
      'w-full rounded-lg border-purple-200 shadow-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-300',
    file: 'w-full text-sm text-purple-900 border border-purple-200 rounded-lg cursor-pointer bg-white hover:bg-purple-50',
    matrix: 'border-collapse w-full text-sm rounded-lg overflow-hidden',
    range:
      'accent-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500',
    text: 'text-purple-700',
    activeText: 'text-purple-600',
    placeholder: 'text-purple-400',
    boxBorder: 'border-purple-300',
    selectableBox: 'p-4 transition-all duration-200 cursor-pointer rounded-lg',
    selectableBoxDefault:
      'border border-purple-200 bg-white hover:bg-purple-50',
    selectableBoxSelected: 'border-2 border-purple-500 bg-purple-50',
    selectableBoxHover: 'hover:border-purple-400',
    selectableBoxFocus:
      'focus-within:ring-1 focus-within:ring-purple-400 focus-within:ring-offset-1',
    selectableBoxDisabled: 'opacity-50 cursor-not-allowed',
    selectableBoxContainer: 'space-y-3',
    selectableBoxText: 'text-purple-700 text-sm font-medium',
    selectableBoxTextSelected: 'text-purple-900 font-semibold',
    selectableBoxIndicator:
      'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
    selectableBoxIndicatorIcon: 'text-white',
    agreementContainer: 'p-4 space-y-4',
    agreementPanel:
      'rounded-lg border border-purple-200 p-3 text-sm whitespace-pre-wrap bg-purple-50',
    signatureCanvas:
      'w-full h-36 border border-purple-200 rounded-lg overflow-hidden bg-white',
    signatureColor: '#8B5CF6',
  },
  progress: {
    bar: 'bg-gradient-to-r from-purple-600 to-pink-600 rounded-full',
    dots: 'flex space-x-2',
    numbers: 'flex space-x-2',
    percentage: 'text-right text-sm text-purple-600 font-medium mb-1',
    label: 'text-sm text-purple-600 mb-1',
  },
  button: {
    primary:
      'w-full justify-center rounded-full px-8 py-4 sm:px-10 sm:py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm sm:text-base transition-all duration-200 flex items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500',
    secondary:
      'inline-flex justify-center py-2 px-5 border border-purple-200 text-sm font-medium rounded-full text-purple-700 bg-white hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500 transition-all',
    text: 'text-sm font-medium text-purple-600 hover:text-purple-800',
    navigation:
      'inline-flex items-center px-5 py-2 text-sm font-medium rounded-full text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500 transition-all',
  },
  colors: {
    primary: '#8B5CF6',
    secondary: '#EC4899',
    accent: '#F59E0B',
    background: '#FAF5FF',
    text: '#6D28D9',
    border: '#E9D5FF',
    error: '#DB2777',
    success: '#10B981',
  },
};

// Modern theme - clean and sophisticated
export const modernTheme: ThemeDefinition = {
  name: 'modern',
  containerLayout: 'max-w-2xl mx-auto',
  header: 'mb-6',
  title: 'text-3xl font-light text-[#E67E4D] mb-4 leading-tight',
  description: 'text-lg text-gray-700 leading-relaxed',
  background: 'bg-white',
  card: 'bg-white rounded-none border-0 border-slate-100 shadow-none p-0 mb-6',
  container: {
    card: 'bg-white border-0',
    border: 'border-gray-100',
    activeBorder: 'border-[#E67E4D]',
    activeBg: 'bg-[#E67E4D]/5',
    header: 'bg-white',
  },
  field: {
    label: 'block text-lg font-normal text-[#C48A66] mb-3',
    input:
      'w-full rounded-xl border-gray-200 shadow-sm focus:border-[#E67E4D] focus:ring-1 focus:ring-[#E67E4D] text-base py-3 px-4',
    description: 'mt-2 text-sm text-gray-600',
    error: 'mt-2 text-sm text-red-600 font-medium',
    radio:
      'focus:ring-1 focus:ring-[#E67E4D] h-4 w-4 text-[#E67E4D] border-gray-300',
    checkbox:
      'focus:ring-1 focus:ring-[#E67E4D] h-4 w-4 text-[#E67E4D] border-gray-300 rounded',
    select:
      'w-full rounded-xl border-gray-200 shadow-sm focus:border-[#E67E4D] focus:ring-1 focus:ring-[#E67E4D] text-base py-3 px-4',
    textarea:
      'w-full rounded-xl border-gray-200 shadow-sm focus:border-[#E67E4D] focus:ring-1 focus:ring-[#E67E4D] text-base py-3 px-4',
    file: 'w-full text-base text-gray-700 border border-gray-200 rounded-xl cursor-pointer bg-white py-3 px-4 hover:bg-gray-50',
    matrix: 'border-collapse w-full text-base rounded-lg overflow-hidden',
    range:
      'accent-[#E67E4D] focus:outline-none focus:ring-1 focus:ring-[#E67E4D]',
    text: 'text-gray-700 text-sm',
    activeText: 'text-[#E67E4D]',
    placeholder: 'text-gray-400',
    boxBorder: 'border-[#C48A66]',
    selectableBox: 'p-4 transition-all duration-200 cursor-pointer rounded-xl',
    selectableBoxDefault:
      'border border-gray-200 bg-white hover:bg-[#E67E4D]/5',
    selectableBoxSelected: 'border-2 border-[#E67E4D] bg-[#E67E4D]/10',
    selectableBoxHover: 'hover:border-[#E67E4D]/50',
    selectableBoxFocus:
      'focus-within:ring-1 focus-within:ring-[#E67E4D] focus-within:ring-offset-1',
    selectableBoxDisabled: 'opacity-50 cursor-not-allowed',
    selectableBoxContainer: 'space-y-3',
    selectableBoxText: 'text-gray-700 text-base',
    selectableBoxTextSelected: 'text-[#E67E4D] font-medium',
    selectableBoxIndicator: 'bg-[#E67E4D] text-white',
    selectableBoxIndicatorIcon: 'text-white',
    agreementContainer: 'p-4 space-y-4',
    agreementPanel:
      'rounded-xl p-3 text-sm whitespace-pre-wrap bg-[#E67E4D]/5 border border-[#E67E4D]/20',
    signatureCanvas:
      'w-full h-36 border border-gray-200 rounded-xl overflow-hidden bg-white',
    signatureColor: '#E67E4D',
  },
  progress: {
    bar: 'h-2 bg-[#E67E4D] rounded-full overflow-hidden',
    dots: 'flex space-x-2 justify-center',
    numbers: 'flex space-x-2 justify-center',
    percentage: 'text-right text-sm text-gray-700 font-medium mb-1',
    label: 'text-sm text-gray-600 mb-1',
  },
  button: {
    primary:
      'w-full justify-center rounded-full px-8 py-4 sm:px-10 sm:py-5 bg-black text-white font-semibold text-sm sm:text-base transition-all duration-200 flex items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-gray-800 active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900',
    secondary:
      'inline-flex justify-center py-2.5 px-6 border border-gray-200 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#E67E4D] transition-all',
    text: 'text-sm font-medium text-[#E67E4D] hover:text-[#D86B3C]',
    navigation:
      'inline-flex items-center px-6 py-3 text-sm font-medium rounded-full text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900 transition-all',
  },
  colors: {
    primary: '#E67E4D',
    secondary: '#6B7280',
    accent: '#D86B3C',
    background: '#FFFFFF',
    text: '#111827',
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
  },
};

// Corporate theme - professional and clean
export const corporateTheme: ThemeDefinition = {
  name: 'corporate',
  containerLayout: 'max-w-xl mx-auto',
  header: 'mb-6',
  title: 'text-xl font-bold text-gray-800 mb-2',
  description: 'text-sm text-gray-600',
  background: 'bg-gray-50',
  card: 'bg-white shadow-sm border-l-4 border-blue-700 p-5 mb-5',
  container: {
    card: 'bg-white border border-gray-200',
    border: 'border-gray-200',
    activeBorder: 'border-blue-700',
    activeBg: 'bg-blue-50',
    header: 'bg-gray-50',
  },
  field: {
    label: 'block text-sm font-semibold text-gray-700 mb-1.5',
    input:
      'w-full rounded-sm border-gray-300 shadow-sm focus:border-blue-700 focus:ring-1 focus:ring-blue-700',
    description: 'mt-1 text-xs text-gray-500',
    error: 'mt-1 text-xs text-red-700',
    radio:
      'focus:ring-1 focus:ring-blue-700 h-4 w-4 text-blue-700 border-gray-300',
    checkbox:
      'focus:ring-1 focus:ring-blue-700 h-4 w-4 text-blue-700 border-gray-300 rounded',
    select:
      'w-full rounded-sm border-gray-300 shadow-sm focus:border-blue-700 focus:ring-1 focus:ring-blue-700',
    textarea:
      'w-full rounded-sm border-gray-300 shadow-sm focus:border-blue-700 focus:ring-1 focus:ring-blue-700',
    file: 'w-full text-sm text-gray-700 border border-gray-300 rounded-sm cursor-pointer bg-white hover:bg-gray-50',
    matrix: 'border-collapse w-full text-sm border-gray-200',
    range:
      'accent-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700',
    text: 'text-gray-700',
    activeText: 'text-blue-700',
    placeholder: 'text-gray-400',
    boxBorder: 'border-blue-700',
    selectableBox: 'p-3 transition-all duration-150 cursor-pointer rounded-sm',
    selectableBoxDefault: 'border border-gray-300 bg-white hover:bg-gray-50',
    selectableBoxSelected: 'border-2 border-blue-700 bg-blue-50',
    selectableBoxHover: 'hover:border-gray-400',
    selectableBoxFocus: 'focus-within:ring-1 focus-within:ring-blue-700',
    selectableBoxDisabled: 'opacity-50 cursor-not-allowed',
    selectableBoxContainer: 'space-y-2',
    selectableBoxText: 'text-gray-700 text-sm',
    selectableBoxTextSelected: 'text-blue-900 font-semibold',
    selectableBoxIndicator: 'bg-blue-700 text-white',
    selectableBoxIndicatorIcon: 'text-white',
    agreementContainer: 'p-4 space-y-3',
    agreementPanel:
      'rounded-sm border border-gray-300 p-3 text-sm whitespace-pre-wrap bg-gray-50',
    signatureCanvas:
      'w-full h-36 border border-gray-300 rounded-sm overflow-hidden bg-white',
    signatureColor: '#1D4ED8',
  },
  progress: {
    bar: 'h-2 bg-gray-900 overflow-hidden',
    dots: 'flex space-x-1',
    numbers: 'flex space-x-1',
    percentage: 'text-right text-xs text-gray-600 mb-1',
    label: 'text-xs text-gray-600 mb-1',
  },
  button: {
    primary:
      'w-full justify-center rounded-md px-8 py-4 sm:px-10 sm:py-5 bg-blue-700 text-white font-semibold text-sm sm:text-base transition-all duration-200 flex items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-800 active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-700',
    secondary:
      'w-full inline-flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-sm text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-700 transition-colors',
    text: 'text-sm font-medium text-blue-700 hover:text-blue-800',
    navigation:
      'w-full inline-flex items-center px-4 py-2 text-sm font-medium rounded-sm text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-700 transition-colors',
  },
  colors: {
    primary: '#1D4ED8',
    secondary: '#4B5563',
    accent: '#0369A1',
    background: '#F9FAFB',
    text: '#1F2937',
    border: '#D1D5DB',
    error: '#B91C1C',
    success: '#047857',
  },
};

// Dark theme - sleek and modern
export const darkTheme: ThemeDefinition = {
  name: 'dark',
  containerLayout: 'max-w-full mx-auto',
  header: 'mb-5',
  title: 'text-2xl font-semibold text-gray-100 mb-2',
  description: 'text-sm text-gray-300',
  background: 'bg-gray-900',
  card: 'bg-gray-800 shadow-xl border border-gray-700 rounded-lg p-5 mb-5',
  field: {
    label: 'block text-sm font-medium text-gray-200 mb-1.5',
    input:
      'w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
    description: 'mt-1 text-xs text-gray-400',
    error: 'mt-1 text-xs text-red-400',
    radio:
      'focus:ring-1 focus:ring-blue-500 h-4 w-4 text-blue-500 bg-gray-700 border-gray-600',
    checkbox:
      'focus:ring-1 focus:ring-blue-500 h-4 w-4 text-blue-500 bg-gray-700 border-gray-600 rounded',
    select:
      'w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
    textarea:
      'w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
    file: 'w-full text-sm text-gray-200 border border-gray-600 rounded-md cursor-pointer bg-gray-700 hover:bg-gray-600',
    matrix: 'border-collapse w-full text-sm border-gray-600',
    range: 'accent-blue-500 bg-gray-700',
    text: 'text-gray-200',
    activeText: 'text-blue-400',
    placeholder: 'text-gray-500',
    boxBorder: 'border-gray-600',
    selectableBox:
      'p-3.5 transition-all duration-200 cursor-pointer rounded-lg',
    selectableBoxDefault:
      'border border-gray-600 bg-gray-800 hover:bg-gray-700',
    selectableBoxSelected: 'border-2 border-blue-500 bg-gray-700',
    selectableBoxHover: 'hover:border-gray-500',
    selectableBoxFocus:
      'focus-within:ring-1 focus-within:ring-blue-500 focus-within:ring-offset-1 focus-within:ring-offset-gray-900',
    selectableBoxDisabled: 'opacity-50 cursor-not-allowed',
    selectableBoxContainer: 'space-y-2.5',
    selectableBoxText: 'text-gray-200 text-sm',
    selectableBoxTextSelected: 'text-blue-400 font-medium',
    selectableBoxIndicator: 'bg-blue-500 text-white',
    selectableBoxIndicatorIcon: 'text-white',
    agreementContainer: 'p-4 space-y-3',
    agreementPanel:
      'rounded-md border border-gray-600 p-3 text-sm whitespace-pre-wrap bg-gray-700 text-gray-100',
    signatureCanvas:
      'w-full h-36 border border-gray-600 rounded-md overflow-hidden bg-gray-800',
    signatureColor: '#60A5FA',
  },
  container: {
    card: 'bg-gray-800 text-gray-100 border-gray-700',
    border: 'border-gray-700',
    activeBorder: 'border-blue-500',
    activeBg: 'bg-blue-500/10',
    header: 'bg-gray-700',
  },
  progress: {
    bar: 'bg-blue-500 rounded-full',
    dots: 'flex space-x-2',
    numbers: 'flex space-x-2',
    percentage: 'text-right text-xs text-gray-400 mb-1',
    label: 'text-xs text-gray-400 mb-1',
  },
  button: {
    primary:
      'w-full justify-center rounded-full px-8 py-4 sm:px-10 sm:py-5 bg-blue-600 text-white font-semibold text-sm sm:text-base transition-all duration-200 flex items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-800 focus:ring-blue-500',
    secondary:
      'inline-flex justify-center py-2 px-4 border border-gray-600 text-sm font-medium rounded-md text-gray-200 bg-gray-700 hover:bg-gray-600 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-800 focus:ring-gray-500 transition-colors',
    text: 'text-sm font-medium text-blue-400 hover:text-blue-300',
    navigation:
      'inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors',
  },
  colors: {
    primary: '#3B82F6',
    secondary: '#6B7280',
    accent: '#60A5FA',
    background: '#111827',
    text: '#F3F4F6',
    border: '#374151',
    error: '#F87171',
    success: '#34D399',
  },
};

// Hims theme - clean medical aesthetic
export const himsTheme: ThemeDefinition = {
  name: 'hims',
  containerLayout: 'max-w-2xl mx-auto',
  header: 'mb-8 text-start',
  title: 'text-2xl font-normal text-gray-900 mb-8 text-start',
  description: 'text-base text-gray-600 mb-6 text-start',
  background: 'bg-white',
  card: 'bg-white rounded-none border-0 border-slate-100 shadow-none p-0 mb-6',
  container: {
    card: 'bg-white',
    border: 'border-gray-300',
    activeBorder: 'border-[#E67E4D]',
    activeBg: 'bg-white',
    header: 'bg-white',
  },
  field: {
    label: 'block text-xl font-normal text-gray-900 mb-6 text-center',
    input:
      'w-full rounded-xl border border-gray-300 focus:border-[#E67E4D] focus:ring-0 text-base py-4 px-5 bg-white hover:border-[#E67E4D]/50 transition-colors',
    description: 'mt-2 text-sm text-gray-600 text-start',
    error: 'mt-2 text-sm text-red-600 text-start',
    radio: 'focus:ring-0 h-4 w-4 text-[#E67E4D] border-gray-300',
    checkbox: 'focus:ring-0 h-4 w-4 text-[#E67E4D] border-gray-300 rounded',
    select:
      'w-full rounded-xl border border-gray-300 focus:border-[#E67E4D] focus:ring-0 text-base py-4 px-5 bg-white hover:border-[#E67E4D]/50 transition-colors',
    textarea:
      'w-full rounded-xl border border-gray-300 focus:border-[#E67E4D] focus:ring-0 text-base py-4 px-5 bg-white hover:border-[#E67E4D]/50 transition-colors',
    file: 'w-full text-base text-gray-700 border border-gray-300 rounded-xl cursor-pointer bg-white py-4 px-5 hover:border-[#E67E4D]/50 transition-colors',
    matrix: 'border-collapse w-full text-base rounded-xl overflow-hidden',
    range: 'accent-[#E67E4D]',
    text: 'text-gray-900',
    activeText: 'text-[#E67E4D]',
    placeholder: 'text-gray-500',
    boxBorder: 'border-gray-300',
    selectableBox:
      'py-4 px-5 transition-all duration-200 cursor-pointer rounded-xl text-left',
    selectableBoxDefault:
      'border border-gray-300 bg-white hover:border-[#E67E4D]/50',
    selectableBoxSelected: 'border-2 border-[#E67E4D] bg-white',
    selectableBoxHover: 'hover:border-[#E67E4D]/50',
    selectableBoxFocus: 'focus-within:ring-0 focus-within:border-[#E67E4D]',
    selectableBoxDisabled: 'opacity-50 cursor-not-allowed',
    selectableBoxContainer: 'space-y-4 mx-auto',
    selectableBoxText: 'text-gray-900 text-base font-normal',
    selectableBoxTextSelected: 'text-gray-900 font-normal',
    selectableBoxIndicator: 'bg-[#E67E4D] text-white',
    selectableBoxIndicatorIcon: 'text-white',
    agreementContainer: 'p-5 space-y-4',
    agreementPanel:
      'rounded-xl border border-gray-300 p-4 text-base whitespace-pre-wrap bg-white hover:border-[#E67E4D]/50 transition-colors',
    signatureCanvas:
      'w-full h-40 border border-gray-300 rounded-xl overflow-hidden bg-white hover:border-[#E67E4D]/50 transition-colors',
    signatureColor: '#E67E4D',
  },
  progress: {
    bar: 'h-2 bg-[#E67E4D] rounded-full overflow-hidden',
    dots: 'flex space-x-2 justify-center',
    numbers: 'flex space-x-2 justify-center',
    percentage: 'text-right text-sm text-gray-600 mb-2',
    label: 'text-sm text-gray-600 mb-2',
  },
  button: {
    primary:
      'w-full justify-center rounded-full px-8 py-4 sm:px-10 sm:py-5 bg-[#E67E4D] text-white font-semibold text-sm sm:text-base transition-all duration-200 flex items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#D86B3C] active:scale-[0.98] cursor-pointer focus:outline-none',
    secondary:
      'inline-flex justify-center py-3 px-8 border border-gray-300 text-base font-medium rounded-full text-gray-900 bg-white hover:bg-gray-50 hover:text-gray-900 hover:border-[#E67E4D]/50 focus:outline-none focus:ring-0 transition-colors',
    text: 'text-base font-medium text-[#E67E4D] hover:text-[#D86B3C]',
    navigation:
      'inline-flex items-center px-8 py-3 text-base font-medium rounded-full text-white bg-[#E67E4D] hover:bg-[#D86B3C] focus:outline-none focus:ring-0 transition-colors',
  },
  colors: {
    primary: '#E67E4D', // Coral orange for brand
    secondary: '#6B7280', // Gray for secondary elements
    accent: '#D86B3C', // Darker coral for hover states
    background: '#FFFFFF',
    text: '#111827',
    border: '#D1D5DB',
    error: '#EF4444',
    success: '#10B981',
  },
};

// Uniloop theme - medical-friendly subtle version (unchanged as you already fixed it)
export const uniloop: ThemeDefinition = {
  card: 'bg-white rounded-none border-0 border-slate-100 shadow-none p-0 mb-6',
  name: 'uniloop',
  field: {
    file: 'w-full text-base text-gray-700 border border-gray-300 rounded-3xl cursor-pointer bg-white px-5 py-4 hover:border-[#948EC47F] transition-colors',
    text: 'text-gray-900',
    error: 'mt-2 text-sm text-red-600 text-start',
    input:
      'text-base text-[#1C1C1C] bg-white rounded-3xl border border-[#1C1C1C1F] px-5 py-4 w-full focus:border-[#948EC4] focus:ring-0 focus:outline-none hover:border-[#948EC47F] transition-colors placeholder:font-medium placeholder:-tracking-[1%] min-h-[64px] shadow-none placeholder:text-[#1C1C1CB2] ring-0',
    label: 'text-base font-semibold text-[#1C1C1C] mb-0 block relative',
    radio:
      'text-[#1C1C1C] border-[#1C1C1C1F] px-5 py-4 mb-4 transition-colors focus:border-[#948EC4] focus:ring-0 hover:border-[#948EC4] h-4 w-4 shadow-none',
    range: 'accent-[#E67E4D]',
    matrix: 'border-collapse w-full text-base rounded-3xl overflow-hidden',
    select:
      'text-base text-[#1C1C1C] bg-white rounded-3xl border border-[#1C1C1C1F] min-h-[64px] px-5 py-4 w-full focus:border-[#948EC4] focus:ring-0 hover:border-[#948EC47F] transition-colors shadow-none placeholder:text-[#1C1C1CB2] ring-0 data-[placeholder]:text-base data-[placeholder]:sm:text-sm data-[placeholder]:text-[#1C1C1CB2]',
    checkbox:
      'text-[#1C1C1C] rounded border border-[#1C1C1C1F] focus:ring-0 h-[1.75rem] w-[1.75rem] !bg-white rounded-full shadow-none',
    textarea:
      'h-[120px] w-full text-base bg-white rounded-3xl border border-[#1C1C1C1F] px-5 py-4 focus:border-[#948EC4] focus:ring-0 hover:border-[#948EC47F] focus:outline-none transition-colors placeholder:font-medium placeholder:-tracking-[1%] shadow-none placeholder:text-[#1C1C1CB2] ring-0',
    boxBorder: 'border-gray-300',
    activeText: 'text-[#E67E4D]',
    description: 'mt-2 text-sm text-gray-600 text-start',
    placeholder: 'text-gray-500',
    selectableBox:
      'px-5 py-4 n-all duration-200 cursor-pointer rounded-3xl text-left',
    agreementPanel:
      'rounded-3xl border border-gray-300 px-5 py-4 text-base whitespace-pre-wrap bg-white hover:border-[#948EC47F] transition-colors',
    signatureColor: '#E67E4D',
    signatureCanvas:
      'w-full h-40 border border-gray-300 rounded-3xl overflow-hidden bg-white hover:border-[#948EC47F] transition-colors',
    selectableBoxText: 'text-gray-900 text-base font-normal',
    agreementContainer: 'px-5 py-4 space-y-4',
    selectableBoxFocus: 'focus-within:ring-0 focus-within:border-[#948EC4]',
    selectableBoxHover: 'hover:border-[#948EC47F]',
    selectableBoxDefault:
      'border border-gray-300 bg-white hover:border-[#948EC47F]',
    selectableBoxDisabled: 'opacity-50 cursor-not-allowed',
    selectableBoxSelected: 'border-2 border-[#948EC4] bg-white',
    selectableBoxContainer: 'space-y-4 max-w-full w-full mx-auto',
    selectableBoxIndicator: 'bg-[#E67E4D] text-white',
    selectableBoxTextSelected: 'text-gray-900 font-normal',
    selectableBoxIndicatorIcon: 'text-white',
  },
  fonts: {
    body: 'Manrope, sans-serif',
    urls: [
      'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap',
      'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&display=swap',
    ],
    heading: 'DM Sans, sans-serif',
    primary: 'Manrope, sans-serif',
  },
  title:
    'font-normal text-[1.25rem] text-center text-[#1C1C1C] -tracking-[4%] sm:text-[2rem]',
  button: {
    text: 'text-base font-medium text-[#948EC4] hover:text-[#948EC4]',
    primary:
      'w-full bg-[#1C1C1C] hover:bg-[#1E1E1E] justify-center rounded-full px-8 py-4 sm:px-10 sm:py-5 text-white font-semibold text-sm sm:text-base transition-all duration-200 focus:outline-none',
    secondary:
      'inline-flex justify-center py-3 px-8 border border-[#1C1C1C1F] text-base font-medium rounded-full bg-white hover:bg-neutral-200 text-[#1C1C1C] focus:outline-none focus:ring-0 transition-colors',
    navigation:
      'text-base font-normal bg-[#000000] rounded-full hover:bg-[#000000] py-3 px-8 inline-flex justify-center text-white fixed bottom-1 sm:bottom-4 3xl:bottom-12 sm:left-0 sm:right-0',
  },
  colors: {
    text: '#1C1C1C',
    error: '#FF0000',
    accent: '#00B67A',
    border: '#1C1C1C1F',
    primary: '#948EC4',
    success: '#10B981',
    secondary: '#DC9EA8',
    background: '#FAFAFA',
  },
  header: 'mb-8 text-start',
  progress: {
    bar: '',
    dots: 'flex space-x-2 justify-center',
    label: 'text-sm text-gray-600 mb-2',
    numbers: 'flex space-x-2 justify-center',
    percentage: 'text-right text-sm text-gray-600 mb-2',
  },
  container: {
    card: 'bg-white',
    border: 'border-gray-300',
    header: 'bg-white',
    activeBg: 'bg-white',
    activeBorder: 'border-[#948EC4]',
  },
  background: 'bg-white',
  description:
    'text-base font-medium text-center text-[#1C1C1C] sm:text-lg -tracking-[1%]',
  containerLayout: 'w-full max-w-4xl flex-1 mx-auto h-full min-h-screen',
};

// Map of all themes
export const themes: Record<SurveyTheme, ThemeDefinition> = {
  uniloop: uniloop,
  default: defaultTheme,
  minimal: minimalTheme,
  colorful: colorfulTheme,
  modern: modernTheme,
  corporate: corporateTheme,
  dark: darkTheme,
  hims: himsTheme,
  custom: undefined as unknown as ThemeDefinition,
};
