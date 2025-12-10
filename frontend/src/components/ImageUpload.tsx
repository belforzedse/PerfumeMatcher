"use client";

import { useRef, useState } from "react";
import imageCompression from 'browser-image-compression';

interface ImageUploadProps {
  value?: File | string | null;
  onChange: (file: File | null) => void;
  error?: string;
  label?: string;
  accept?: string;
  maxSize?: number; // in MB
}

export default function ImageUpload({
  value,
  onChange,
  error,
  label = "آپلود تصویر",
  accept = "image/*",
  maxSize = 5, // 5MB default
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files[0]);
    }
  };

  const handleFiles = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('لطفاً فقط فایل‌های تصویری انتخاب کنید.');
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`حجم فایل نباید بیشتر از ${maxSize} مگابایت باشد.`);
      return;
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

      onChange(webpFile);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(webpFile);
    } catch (error) {
      console.error('Error converting image to WebP:', error);
      alert('خطا در تبدیل تصویر. لطفاً دوباره تلاش کنید.');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    onChange(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // If value is a string (existing image URL), use it for preview
  const displayPreview = preview || (typeof value === 'string' ? value : null);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[var(--color-foreground)]">
        {label}
      </label>

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
          onChange={handleChange}
          className="hidden"
        />

        {displayPreview ? (
          <div className="relative">
            <img
              src={displayPreview}
              alt="پیش‌نمایش تصویر"
              className="mx-auto max-h-48 rounded-[var(--radius-base)] object-cover"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-md transition-all hover:bg-red-600"
              aria-label="حذف تصویر"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
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
              برای انتخاب تصویر کلیک کنید یا فایل را اینجا بکشید
            </p>
            <p className="text-xs text-[var(--color-foreground-subtle)]">
              فرمت‌های مجاز: JPG، PNG، GIF (خودکار به WebP تبدیل می‌شود - حداکثر {maxSize}MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}