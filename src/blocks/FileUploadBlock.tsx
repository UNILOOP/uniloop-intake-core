import React, { useRef, useState } from 'react';
import type {
  BlockData,
  BlockDefinition,
  ContentBlockItemProps,
  ThemeDefinition,
  ChatRendererProps,
} from '../types';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { FileUp, Upload, UploadCloud, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Checkbox } from '../components/ui/checkbox';
import { generateFieldName } from './utils/GenFieldName';
import { cn } from '../lib/utils';
import { themes } from '../themes';
import { FileUploadInput } from '../components/FileUploadInput';

// Form component for editing the block configuration
const FileUploadBlockForm: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  // Handle field changes
  const handleChange = (field: string, value: string | boolean | string[]) => {
    onUpdate?.({
      ...data,
      [field]: value,
    });
  };

  // Handle file extensions
  const handleFileExtensions = (extensionsStr: string) => {
    const extensions = extensionsStr
      .split(',')
      .map((ext) => ext.trim())
      .filter((ext) => ext)
      .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`));

    handleChange('acceptedFileTypes', extensions);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">

        <div className="space-y-2">
          <Label className="text-sm" htmlFor="label">
            Question Label
          </Label>
          <Input
            id="label"
            value={data.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Your question here?"
          />
          <p className="text-xs text-muted-foreground">
            Question or prompt shown to the respondent
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="description">
          Description/Help Text
        </Label>
        <Input
          id="description"
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Additional information about this question"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm" htmlFor="acceptedFileTypes">
            Accepted File Types
          </Label>
          <Input
            id="acceptedFileTypes"
            value={(data.acceptedFileTypes || []).join(', ')}
            onChange={(e) => handleFileExtensions(e.target.value)}
            placeholder=".jpg, .png, .pdf"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated file extensions
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm" htmlFor="maxFileSize">
            Maximum File Size (MB)
          </Label>
          <Input
            id="maxFileSize"
            type="number"
            value={data.maxFileSize || '5'}
            onChange={(e) => handleChange('maxFileSize', e.target.value)}
            min="0.1"
            step="0.1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm" htmlFor="maxFiles">
            Maximum Files
          </Label>
          <Input
            id="maxFiles"
            type="number"
            value={data.maxFiles || '1'}
            onChange={(e) => handleChange('maxFiles', e.target.value)}
            min="1"
            step="1"
          />
        </div>

        <div className="space-y-2 pt-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showPreview"
              checked={data.showPreview === true}
              onCheckedChange={(checked) =>
                handleChange('showPreview', !!checked)
              }
            />
            <Label className="text-sm" htmlFor="showPreview">
              Show previews for images
            </Label>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="helpText">
          Upload Instructions
        </Label>
        <Input
          id="helpText"
          value={data.helpText || ''}
          onChange={(e) => handleChange('helpText', e.target.value)}
          placeholder="Drag and drop files here or click to browse"
        />
      </div>

      <div className="space-y-2 pt-1">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="required"
            checked={data.required === true}
            onCheckedChange={(checked) => handleChange('required', !!checked)}
          />
          <Label className="text-sm" htmlFor="required">
            Required
          </Label>
        </div>
      </div>
    </div>
  );
};

// Component to render the block in the survey
const FileUploadBlockItem: React.FC<ContentBlockItemProps> = ({ data }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);

  // Handle file selection
  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const maxFiles = parseInt(String(data.maxFiles || '1'), 10);
    const maxFileSize =
      parseFloat(String(data.maxFileSize || '5')) * 1024 * 1024; // Convert MB to bytes
    const acceptedTypes = (data.acceptedFileTypes as string[]) || [];

    // Filter files based on accepted types and size
    const validFiles: File[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;

      const isValidType =
        acceptedTypes.length === 0 || acceptedTypes.includes(fileExt);
      const isValidSize = file.size <= maxFileSize;

      if (isValidType && isValidSize) {
        validFiles.push(file);
      }
    }

    // Respect maximum files limit
    const newFiles = [...files, ...validFiles].slice(0, maxFiles);
    setFiles(newFiles);
  };

  // Handle file removal
  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Create file previews
  const renderFilePreviews = () => {
    return files.map((file, index) => {
      const isImage = file.type.startsWith('image/');
      const showPreview = data.showPreview && isImage;

      return (
        <div
          key={index}
          className="flex items-center gap-2 p-2 rounded-md border bg-card mt-2"
        >
          {showPreview && (
            <div className="w-10 h-10 shrink-0 rounded overflow-hidden">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="grow truncate">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemoveFile(index)}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    });
  };

  return (
    <div className="space-y-2">
      {data.label && (
        <Label className="text-sm" htmlFor={data.fieldName}>
          {data.label}
        </Label>
      )}

      {data.description && (
        <p className="text-sm text-muted-foreground">{data.description}</p>
      )}

      <div
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <FileUp className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-sm font-medium mb-1">
          {data.helpText || 'Drag and drop files here or click to browse'}
        </p>

        <p className="text-xs text-muted-foreground">
          {data.acceptedFileTypes && data.acceptedFileTypes.length > 0
            ? `Accepted formats: ${(data.acceptedFileTypes as string[]).join(
                ', ',
              )}`
            : 'All file formats accepted'}
          {data.maxFileSize && ` • Max size: ${data.maxFileSize} MB`}
          {data.maxFiles &&
            parseInt(String(data.maxFiles), 10) > 1 &&
            ` • Max files: ${data.maxFiles}`}
        </p>

        <input
          ref={fileInputRef}
          id={data.fieldName}
          type="file"
          className="hidden"
          accept={(data.acceptedFileTypes as string[])?.join(',') || undefined}
          multiple={parseInt(String(data.maxFiles || '1'), 10) > 1}
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-1">{renderFilePreviews()}</div>
      )}
    </div>
  );
};

// Preview component shown in the block library
const FileUploadBlockPreview: React.FC = () => {
  return (
    <div className="w-full flex items-center justify-center py-1">
      <div className="flex items-center border rounded px-3 py-2 w-4/5 max-w-full text-muted-foreground">
        <Upload className="w-4 h-4 mr-2" />
        <span className="text-sm">File upload</span>
      </div>
    </div>
  );
};

interface FileUploadRendererProps {
  block: BlockData;
  value?: File[] | string; // Can accept File[] or serialized file info
  onChange?: (value: File[]) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  theme?: ThemeDefinition;
}

const FileUploadRenderer: React.FC<FileUploadRendererProps> = ({
  block,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  theme = null,
}) => {
  const themeConfig = theme ?? themes.default;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize files state, handling both File[] and serialized string inputs
  const [files, setFiles] = useState<File[]>(() => {
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  });

  const [isDragging, setIsDragging] = useState(false);

  // Parse block configuration
  const maxFiles = parseInt(String(block.maxFiles || '1'), 10);
  const maxFileSize =
    parseFloat(String(block.maxFileSize || '5')) * 1024 * 1024; // Convert MB to bytes
  const acceptedTypes = (block.acceptedFileTypes as string[]) || [];

  // Handle file selection
  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles || disabled) return;

    // Filter files based on accepted types and size
    const validFiles: File[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;

      const isValidType =
        acceptedTypes.length === 0 || acceptedTypes.includes(fileExt);
      const isValidSize = file.size <= maxFileSize;

      if (isValidType && isValidSize) {
        validFiles.push(file);
      }
    }

    // Respect maximum files limit
    const newFiles = [...files, ...validFiles].slice(0, maxFiles);
    setFiles(newFiles);

    if (onChange) {
      onChange(newFiles);
    }

    if (onBlur) {
      onBlur();
    }
  };

  // Handle file removal
  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);

    if (onChange) {
      onChange(newFiles);
    }
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!disabled) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // Render file previews
  const renderFilePreviews = () => {
    return files.map((file, index) => {
      const isImage = file.type.startsWith('image/');
      const showPreview = block.showPreview && isImage;

      return (
        <div
          key={index}
          className={`flex items-center gap-2 p-2 rounded-md mt-2 ${themeConfig.container.card}`}
        >
          {showPreview && (
            <div className="w-10 h-10 shrink-0 rounded overflow-hidden">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="grow truncate">
            <p
              className={`text-sm font-medium truncate ${themeConfig.field.label}`}
            >
              {file.name}
            </p>
            <p className={`text-xs ${themeConfig.field.description}`}>
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={() => handleRemoveFile(index)}
              className={`shrink-0 p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
              aria-label="Remove file"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      );
    });
  };

  return (
    <div className="survey-file-upload space-y-3 w-full min-w-0">
      {/* Label */}
      {block.label && (
        <Label
          htmlFor={block.fieldName}
          className={cn('text-base', themeConfig.field.label)}
        >
          {block.label}
        </Label>
      )}

      {/* Description */}
      {block.description && (
        <div
          className={cn(
            'text-sm text-muted-foreground',
            themeConfig.field.description,
          )}
        >
          {block.description}
        </div>
      )}

      {/* Upload area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-md p-6 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-input',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          error && 'border-destructive',
          themeConfig.container.border,
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <UploadCloud
          className={cn(
            'mx-auto h-10 w-10 mb-2 text-muted-foreground',
            themeConfig.field.description,
          )}
        />

        <p className={cn('text-sm font-medium mb-1', themeConfig.field.text)}>
          {block.helpText || 'Drag and drop files here or click to browse'}
        </p>

        <p
          className={cn(
            'text-xs text-muted-foreground',
            themeConfig.field.description,
          )}
        >
          {acceptedTypes && acceptedTypes.length > 0
            ? `Accepted formats: ${acceptedTypes.join(', ')}`
            : 'All file formats accepted'}
          {block.maxFileSize && ` • Max size: ${block.maxFileSize} MB`}
          {maxFiles > 1 && ` • Max files: ${maxFiles}`}
        </p>

        <input
          ref={fileInputRef}
          id={block.fieldName}
          type="file"
          className="hidden"
          accept={acceptedTypes?.join(',') || undefined}
          multiple={maxFiles > 1}
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={disabled}
        />
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => {
            const isImage = file.type.startsWith('image/');
            const showPreview = block.showPreview && isImage;

            return (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-md border',
                  themeConfig.container.card,
                )}
              >
                {showPreview && (
                  <div className="w-10 h-10 shrink-0 rounded overflow-hidden">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="grow truncate">
                  <p
                    className={cn(
                      'text-sm font-medium truncate',
                      themeConfig.field.label,
                    )}
                  >
                    {file.name}
                  </p>
                  <p
                    className={cn(
                      'text-xs text-muted-foreground',
                      themeConfig.field.description,
                    )}
                  >
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFile(index)}
                    className="h-7 w-7"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          className={cn(
            'text-sm font-medium text-destructive',
            themeConfig.field.error,
          )}
        >
          {error}
        </div>
      )}
    </div>
  );
};

/**
 * Chat renderer for File Upload - provides a streamlined chat experience
 * for uploading files with drag-and-drop support
 */
const FileUploadChatRenderer: React.FC<ChatRendererProps> = ({
  block,
  value,
  onChange,
  onSubmit,
  theme,
  disabled = false,
  error,
}) => {
  // Parse block configuration
  const config = {
    maxFiles: parseInt(String(block.maxFiles || '1'), 10),
    maxFileSize: parseFloat(String(block.maxFileSize || '5')),
    acceptedFileTypes: (block.acceptedFileTypes as string[]) || [],
    showPreview: block.showPreview as boolean,
    helpText: block.helpText as string,
  };

  return (
    <FileUploadInput
      value={Array.isArray(value) ? value : []}
      onChange={onChange}
      onSubmit={onSubmit}
      config={config}
      disabled={disabled}
      error={error}
      theme={theme}
      showSubmitButton={true}
    />
  );
};

// Export the block definition
export const FileUploadBlock: BlockDefinition = {
  type: 'fileupload',
  name: 'File Upload',
  description: 'Component for uploading files',
  icon: <Upload className="w-4 h-4" />,
  defaultData: {
    type: 'fileupload',
    fieldName: generateFieldName('file'),
    label: 'Upload files',
    description: '',
    acceptedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
    maxFileSize: '5',
    maxFiles: '1',
    helpText: 'Drag and drop files here or click to browse',
    showPreview: true,
    required: false,
  },
  generateDefaultData: () => ({
    type: 'fileupload',
    fieldName: generateFieldName('file'),
    label: 'Upload files',
    description: '',
    acceptedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
    maxFileSize: '5',
    maxFiles: '1',
    helpText: 'Drag and drop files here or click to browse',
    showPreview: true,
    required: false,
  }),
  renderItem: (props) => <FileUploadBlockItem {...props} />,
  renderFormFields: (props) => <FileUploadBlockForm {...props} />,
  renderBlock: (props: FileUploadRendererProps) => (
    <FileUploadRenderer {...props} />
  ),
  renderPreview: () => <FileUploadBlockPreview />,
  chatRenderer: (props) => <FileUploadChatRenderer {...props} />,
  validate: (data) => {
    if (!data.fieldName) return 'Field name is required';
    if (!data.label) return 'Label is required';
    return null;
  },
  validateValue: (value, data) => {
    if (
      data.required &&
      (!value || (Array.isArray(value) && value.length === 0))
    ) {
      return 'At least one file is required';
    }

    if (value) {
      const files = Array.isArray(value) ? value : [value];
      const maxFiles = parseInt(data.maxFiles || '1', 10);
      const maxFileSize = parseInt(data.maxFileSize || '5', 10) * 1024 * 1024; // Convert MB to bytes

      if (files.length > maxFiles) {
        return `Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed`;
      }

      for (const file of files) {
        if (file.size && file.size > maxFileSize) {
          return `File size must be less than ${data.maxFileSize || '5'}MB`;
        }

        if (
          data.acceptedFileTypes &&
          data.acceptedFileTypes.length > 0 &&
          file.name
        ) {
          const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
          if (!data.acceptedFileTypes.includes(fileExtension)) {
            return `File type not allowed. Accepted types: ${data.acceptedFileTypes.join(
              ', ',
            )}`;
          }
        }
      }
    }

    return null;
  },
  inputSchema: {
    type: 'array',
    items: { type: 'string' },
  },
  // Output schema - this block returns an array of strings (file URLs)
  outputSchema: {
    type: 'array',
    items: { type: 'string' },
  },
  fieldConfig: {
    enabled: true,
    label: "Field Name",
    required: true
  }
};
