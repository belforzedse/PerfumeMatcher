"use client";

import { useRef, useState, useEffect } from "react";
import imageCompression from 'browser-image-compression';

interface MultiImageUploadProps {
  value?: (File | string)[];
  onChange: (files: (File | string)[]) => void;
  error?: string;
  label?: string;
  accept?: string;
  maxSize?: number; // in MB
  maxCount?: number;
}

export default function MultiImageUpload({
  value = [],
  onChange,
  error,
  label = "آپلود تصاویر",
  accept = "image/*",
  maxSize = 5, // 5MB default
  maxCount = 10,
}: MultiImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previews, setPreviews] = useState<Map<number, string>>(new Map());

  // Update previews when value changes
  useEffect(() => {
    const newPreviews = new Map<number, string>();
    value.forEach((item, index) => {
      if (typeof item === 'string') {
        newPreviews.set(index, item);
      } else if (item instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.set(index, e.target?.result as string);
          setPreviews(new Map(newPreviews));
        };
        reader.readAsDataURL(item);
      }
    });
    setPreviews(newPreviews);
  }, [value]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    if (value.length + files.length > maxCount) {
      alert(`حداکثر ${maxCount} تصویر می‌توانید آپلود کنید.`);
      return;
    }

    const processedFiles: File[] = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`فایل "${file.name}" یک تصویر نیست.`);
        continue;
      }

      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        alert(`حجم فایل "${file.name}" بیشتر از ${maxSize} مگابایت است.`);
        continue;
      }

      try {
        // Convert image to WebP format
        const options = {
          maxSizeMB: maxSize,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/webp',
        };

        const compressedFile = await imageCompression(file, options);

        // Create a new File object with .webp extension
        const webpFile = new File(
          [compressedFile],
          file.name.replace(/\.[^/.]+$/, '.webp'),
          { type: 'image/webp' }
        );

        processedFiles.push(webpFile);
      } catch (error) {
        console.error(`Error converting image "${file.name}" to WebP:`, error);
        alert(`خطا در تبدیل تصویر "${file.name}". لطفاً دوباره تلاش کنید.`);
      }
    }

    if (processedFiles.length > 0) {
      onChange([...value, ...processedFiles]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
    
    // Remove preview
    const newPreviews = new Map(previews);
    newPreviews.delete(index);
    // Reindex previews
    const reindexedPreviews = new Map<number, string>();
    newValue.forEach((item, newIndex) => {
      const oldIndex = value.findIndex((_, i) => i === index ? false : true);
      if (newIndex < oldIndex || oldIndex === -1) {
        const previewKey = newIndex < index ? newIndex : newIndex + 1;
        if (previews.has(previewKey)) {
          reindexedPreviews.set(newIndex, previews.get(previewKey)!);
        }
      }
    });
    setPreviews(reindexedPreviews);
  };

  const canAddMore = value.length < maxCount;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[var(--color-foreground)]">
        {label} ({value.length}/{maxCount})
      </label>

      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {value.map((item, index) => {
            const preview = previews.get(index);
            return (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-[var(--radius-base)] overflow-hidden border border-[var(--color-border)]">
                  {preview ? (
                    <img
                      src={preview}
                      alt={`تصویر ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--color-background-soft)] flex items-center justify-center">
                      <span className="text-xs text-[var(--color-foreground-muted)]">در حال بارگذاری...</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1.5 text-white shadow-md transition-all hover:bg-red-600 opacity-0 group-hover:opacity-100"
                  aria-label={`حذف تصویر ${index + 1}`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {canAddMore && (
        <div
          className={`relative rounded-[var(--radius-base)] border-2 border-dashed p-6 text-center transition-colors ${
            dragActive
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/20"
              : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple
            onChange={handleChange}
            className="hidden"
          />

          <div
            className="cursor-pointer space-y-2"
            onClick={handleClick}
          >
            <svg
              className="mx-auto h-12 w-12 text-[var(--color-foreground-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {value.length === 0 
                ? "برای انتخاب تصاویر کلیک کنید یا فایل‌ها را اینجا بکشید"
                : "افزودن تصویر بیشتر"}
            </p>
            <p className="text-xs text-[var(--color-foreground-subtle)]">
              فرمت‌های مجاز: JPG، PNG، GIF (خودکار به WebP تبدیل می‌شود - حداکثر {maxSize}MB)
            </p>
          </div>
        </div>
      )}

      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}





