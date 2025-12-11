"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";

import {
  createPerfume,
  updatePerfume,
  deletePerfume,
  fetchBrandsAdmin,
  fetchCollectionsAdmin,
  fetchPerfumesAdmin,
  fetchAvailableNotes,
  uploadFile,
  convertToEnglish,
  type AdminBrand,
  type AdminCollection,
  type AdminPerfume,
  type CreatePerfumePayload,
  type UpdatePerfumePayload,
  type PerfumeNotes,
} from "@/lib/admin-api";

import ImageUpload from "@/components/ImageUpload";
import { useAdminMotionVariants } from "@/components/admin/AdminMotion";

type FeedbackState = {
  type: "success" | "error" | "warning";
  message: string;
};

interface PerfumeFormValues {
  nameFa: string;
  nameEn: string;
  description: string;
  brandId: string;
  collectionId: string;
  gender: string[];
  season: string[]; // legacy - kept for backward compatibility
  seasons: string[]; // multiple seasons (preferred)
  family: string[];
  character: string[];
  strength: string; // single select
  intensity: string;
  notes: PerfumeNotes;
  image?: File | string | null; // single image
}

const genderOptions = ["زنانه", "مردانه", "یونیسکس"];
const seasonOptions = ["بهار", "تابستان", "پاییز", "زمستان", "چهارفصل"];
const familyOptions = ["گلی", "چوبی", "شرقی", "مرکباتی", "آروماتیک", "مشکدار"];
const characterOptions = ["رسمی", "روزمره", "رمانتیک", "اسپرت", "جذاب", "کلاسیک"];
const strengthOptions = ["ملایم", "متوسط", "قوی", "خیلی قوی"];

const createDefaultValues = (): PerfumeFormValues => ({
  nameFa: "",
  nameEn: "",
  description: "",
  brandId: "",
  collectionId: "",
  gender: [],
  season: [], // legacy
  seasons: [], // preferred
  family: [],
  character: [],
  strength: "",
  intensity: "",
  notes: {
    top: [],
    middle: [],
    base: [],
  },
  image: null,
});

const normaliseNotes = (items: string[]): string[] =>
  Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .map((item) => item.replace(/\s+/g, " ")),
    ),
  );

const normaliseText = (value?: string | null) => value?.toLowerCase() ?? "";

const statusStyleMap: Record<FeedbackState["type"], string> = {
  success: "border-green-300 bg-green-100 text-green-800",
  error: "border-red-300 bg-red-100 text-red-800",
  warning: "border-amber-300 bg-amber-100 text-amber-800",
};

interface NotesFieldProps {
  label: string;
  helper: string;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  availableNotes: string[];
}

function NotesField({ label, helper, value, onChange, error, availableNotes }: NotesFieldProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredNotes, setFilteredNotes] = useState<string[]>([]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value;
    setInputValue(val);
    
    if (val.trim()) {
      const filtered = availableNotes.filter(
        (note) => note.includes(val) && !value.includes(note)
      );
      setFilteredNotes(filtered.slice(0, 10)); // Show top 10 matches
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleAdd = (note?: string) => {
    const noteToAdd = note || inputValue.trim();
    if (!noteToAdd) {
      return;
    }

    // Validate against predefined list
    if (!availableNotes.includes(noteToAdd)) {
      return; // Don't add invalid notes
    }

    if (!value.includes(noteToAdd)) {
      onChange([...value, noteToAdd]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const handleRemove = (note: string) => {
    onChange(value.filter((item) => item !== note));
  };

  const handleSuggestionClick = (note: string) => {
    handleAdd(note);
  };

  return (
    <div className="flex flex-col gap-2 relative">
      <label className="text-sm font-medium text-[var(--color-foreground)]">{label}</label>
      <div className="flex gap-2 relative">
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (filteredNotes.length > 0) {
                  handleAdd(filteredNotes[0]);
                } else {
                  handleAdd();
                }
              }
            }}
            onFocus={() => {
              if (inputValue.trim()) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              // Delay to allow click on suggestions
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            className="w-full rounded-[var(--radius-base)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none"
            placeholder="مثلاً ترنج (از لیست انتخاب کنید)"
          />
          {showSuggestions && filteredNotes.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--color-border)] rounded-[var(--radius-base)] shadow-lg max-h-60 overflow-y-auto">
              {filteredNotes.map((note, index) => (
                <button
                  key={`${note}-${index}`}
                  type="button"
                  onClick={() => handleSuggestionClick(note)}
                  className="w-full text-right px-4 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-accent-soft)] transition-colors"
                >
                  {note}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleAdd()}
          className="rounded-[var(--radius-base)] bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-accent-strong)]"
        >
          افزودن
        </button>
      </div>
      <p className="text-xs text-[var(--color-foreground-muted)]">{helper}</p>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((note, index) => (
            <span
              key={`${note}-${index}`}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs text-[var(--color-accent-contrast)]"
            >
              {note}
              <button
                type="button"
                onClick={() => handleRemove(note)}
                className="text-[var(--color-accent-contrast)]/70 transition hover:text-[var(--color-accent-contrast)]"
                aria-label={`حذف ${note}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

interface MultiSelectFieldProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

function MultiSelectField({ label, options, value, onChange, error }: MultiSelectFieldProps) {
  const handleToggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[var(--color-foreground)]">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => handleToggle(option)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              value.includes(option)
                ? "bg-[var(--color-accent)] text-white shadow-md"
                : "bg-white border border-[var(--color-border)] text-[var(--color-foreground)] hover:border-[var(--color-accent)]"
            }`}
          >
            {value.includes(option) && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {option}
          </button>
        ))}
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

export default function AdminProductsPage() {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PerfumeFormValues>({ defaultValues: createDefaultValues() });

  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [collections, setCollections] = useState<AdminCollection[]>([]);
  const [perfumes, setPerfumes] = useState<AdminPerfume[]>([]);
  const [availableNotes, setAvailableNotes] = useState<string[]>([]);
  const [status, setStatus] = useState<FeedbackState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingPerfume, setEditingPerfume] = useState<AdminPerfume | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { section, listItem, status: statusVariants, stagger, transition, ease, shouldReduce } =
    useAdminMotionVariants();

  const trimmedSearchTerm = searchTerm.trim();

  const filteredPerfumes = useMemo(() => {
    if (!trimmedSearchTerm) {
      return perfumes;
    }

    const normalisedSearch = trimmedSearchTerm.toLowerCase();

    return perfumes.filter((perfume) => {
      const nameFa = normaliseText(perfume.name_fa);
      const nameEn = normaliseText(perfume.name_en);
      const brandName = normaliseText(perfume.brand?.name);
      const collectionName = normaliseText(perfume.collection?.name);

      return (
        nameFa.includes(normalisedSearch) ||
        nameEn.includes(normalisedSearch) ||
        brandName.includes(normalisedSearch) ||
        collectionName.includes(normalisedSearch)
      );
    });
  }, [perfumes, trimmedSearchTerm]);

  const hasSearchTerm = trimmedSearchTerm.length > 0;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const perfumePromise = fetchPerfumesAdmin();
      const notesPromise = fetchAvailableNotes();
      const [brandResult, collectionResult] = await Promise.allSettled([
        fetchBrandsAdmin(),
        fetchCollectionsAdmin(),
      ]);

      const perfumeData = await perfumePromise;
      const notesData = await notesPromise;
      setPerfumes(perfumeData);
      setAvailableNotes(Array.isArray(notesData) ? notesData : []);

      const warnings: string[] = [];

      if (brandResult.status === "fulfilled") {
        setBrands(brandResult.value);
      } else {
        console.error("خطا در بارگذاری برندها", brandResult.reason);
        warnings.push("بارگذاری برندها با مشکل مواجه شد. برخی فیلترها در دسترس نخواهند بود.");
      }

      if (collectionResult.status === "fulfilled") {
        setCollections(collectionResult.value);
      } else {
        console.error("خطا در بارگذاری کالکشن‌ها", collectionResult.reason);
        warnings.push("بارگذاری کالکشن‌ها با مشکل مواجه شد. برخی فیلترها در دسترس نخواهند بود.");
      }

      if (warnings.length > 0) {
        setStatus({
          type: "warning",
          message: warnings.join(" "),
        });
      } else {
        setStatus((current) => (current?.type === "warning" ? null : current));
      }
    } catch (error) {
      console.error("خطا در بارگذاری لیست عطرها", error);
      setStatus({
        type: "error",
        message: "بارگذاری عطرها با خطا مواجه شد. دوباره تلاش کنید.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedBrandId = watch("brandId");
  const selectedCollectionId = watch("collectionId");

  const availableCollections = useMemo(() => {
    if (!selectedBrandId) {
      return collections;
    }

    return collections.filter((collection) =>
      collection.brand ? collection.brand.id.toString() === selectedBrandId : false,
    );
  }, [collections, selectedBrandId]);

  useEffect(() => {
    if (!selectedCollectionId) {
      return;
    }

    const exists = availableCollections.some(
      (collection) => collection.id.toString() === selectedCollectionId,
    );

    if (!exists) {
      setValue("collectionId", "");
    }
  }, [availableCollections, selectedCollectionId, setValue]);

  const handleEdit = useCallback((perfume: AdminPerfume) => {
    setEditingPerfume(perfume);
    setIsEditing(true);

    // Populate form with existing data (values are already in Persian from the API mapping)
    reset({
      nameFa: perfume.name_fa,
      nameEn: perfume.name_en,
      brandId: perfume.brand?.id.toString() || "",
      collectionId: perfume.collection?.id.toString() || "",
      gender: perfume.gender ? perfume.gender.split(", ").filter(v => v.length > 0) : [],
      season: perfume.season ? perfume.season.split(", ").filter(v => v.length > 0) : [],
      family: perfume.family ? perfume.family.split(", ").filter(v => v.length > 0) : [],
      character: perfume.character ? perfume.character.split(", ").filter(v => v.length > 0) : [],
      notes: perfume.notes,
      image: null, // Don't populate image field when editing (user must upload a new file to change it)
    });
  }, [reset]);

  const exitEditMode = useCallback(
    ({ preserveStatus = false }: { preserveStatus?: boolean } = {}) => {
      setEditingPerfume(null);
      setIsEditing(false);
      reset(createDefaultValues());

      if (!preserveStatus) {
        setStatus(null);
      }
    },
    [reset, setStatus, setEditingPerfume, setIsEditing],
  );

  const handleCancelEdit = useCallback(() => {
    exitEditMode({ preserveStatus: true });
  }, [exitEditMode]);

  const handleDelete = useCallback(async (perfume: AdminPerfume) => {
    if (!confirm(`آیا مطمئن هستید که می‌خواهید عطر "${perfume.name_fa}" را حذف کنید؟`)) {
      return;
    }

    if (!perfume.id) {
      setStatus({
        type: "error",
        message: "شناسه محصول یافت نشد. لطفاً صفحه را رفرش کنید.",
      });
      return;
    }

    try {
      await deletePerfume(perfume.id.toString());
      setStatus({ type: "success", message: "محصول با موفقیت حذف شد." });
      await loadData();
    } catch (error) {
      console.error("خطا در حذف محصول", error);
      setStatus({
        type: "error",
        message: "حذف محصول با خطا مواجه شد. دوباره تلاش کنید.",
      });
    }
  }, [loadData]);

  const onSubmit = async (values: PerfumeFormValues) => {
    setStatus(null);

    try {
      let imageUrl: string | undefined;

      // Handle single image: upload File objects, keep URLs as-is
      if (values.image && values.image instanceof File) {
        try {
          const uploadResult = await uploadFile(values.image);
          imageUrl = uploadResult.url;
        } catch (uploadError) {
          console.error("خطا در آپلود تصویر", uploadError);
          setStatus({
            type: "error",
            message: "آپلود تصویر با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
          });
          return;
        }
      } else if (values.image && typeof values.image === "string") {
        // If it's already a URL string, use it directly
        imageUrl = values.image;
      }

      // Convert to array format for backend (but only one image)
      const imageUrls = imageUrl ? [imageUrl] : [];

      // Convert seasons array to English array
      const seasonsEnglish = values.seasons && values.seasons.length > 0
        ? values.seasons.map(s => {
            const english = convertToEnglish("season", [s]);
            return english || s;
          })
        : undefined;

      // Backward compatibility: populate legacy season from first seasons value
      const legacySeason = values.seasons && values.seasons.length > 0
        ? convertToEnglish("season", [values.seasons[0]])
        : (values.season.length > 0 ? convertToEnglish("season", values.season) : undefined);

      const payload: CreatePerfumePayload | UpdatePerfumePayload = {
        name_fa: values.nameFa.trim(),
        name_en: values.nameEn.trim(),
        description: values.description.trim() || undefined,
        // Convert Persian values to English for backend
        gender: values.gender.length > 0 ? convertToEnglish("gender", values.gender) : undefined,
        season: legacySeason, // legacy single season
        seasons: seasonsEnglish, // multiple seasons as array
        family: values.family.length > 0 ? convertToEnglish("family", values.family) : undefined,
        character: values.character.length > 0 ? convertToEnglish("character", values.character) : undefined,
        strength: values.strength ? convertToEnglish("strength", [values.strength]) : undefined,
        intensity: values.intensity.trim() || undefined,
        notes: {
          top: normaliseNotes(values.notes.top),
          middle: normaliseNotes(values.notes.middle),
          base: normaliseNotes(values.notes.base),
        },
        brand: Number(values.brandId),
        collection: values.collectionId ? Number(values.collectionId) : undefined,
        cover: imageUrls.length > 0 ? imageUrls[0] : undefined, // backward compatibility
        images: imageUrls.length > 0 ? imageUrls : undefined, // send as array for backend compatibility
      };

      if (isEditing && editingPerfume) {
        if (!editingPerfume.id) {
          setStatus({
            type: "error",
            message: "شناسه محصول یافت نشد. لطفاً صفحه را رفرش کنید.",
          });
          return;
        }
        await updatePerfume(editingPerfume.id.toString(), payload);
        setStatus({ type: "success", message: "محصول با موفقیت به‌روزرسانی شد." });
        exitEditMode({ preserveStatus: true });
      } else {
        await createPerfume(payload);
        setStatus({ type: "success", message: "محصول جدید با موفقیت ثبت شد." });
        reset(createDefaultValues());
      }

      await loadData();
    } catch (error) {
      console.error("خطا در ثبت/ویرایش محصول", error);
      setStatus({
        type: "error",
        message: isEditing
          ? "ویرایش محصول با خطا مواجه شد. مقادیر فرم را بررسی و مجدداً تلاش کنید."
          : "ثبت محصول با خطا مواجه شد. مقادیر فرم را بررسی و مجدداً تلاش کنید.",
      });
    }
  };

  return (
    <motion.section
      className="flex flex-col gap-10"
      dir="rtl"
      initial="hidden"
      animate="visible"
      variants={section}
    >
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">
          {isEditing ? `ویرایش عطر: ${editingPerfume?.name_fa}` : "محصولات / عطرها"}
        </h2>
        <p className="text-[var(--color-foreground-muted)]">
          {isEditing
            ? "اطلاعات عطر را ویرایش کنید و تغییرات را ذخیره نمایید."
            : "اطلاعات کامل عطرهای فروشگاه را وارد کنید و ارتباط آن‌ها را با برند و کالکشن مشخص نمایید."}
        </p>
      </div>

      <form
        className="space-y-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-background-soft)]/70 p-6 shadow-[var(--shadow-soft)]"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--color-foreground)]" htmlFor="nameFa">
              نام فارسی <span className="text-red-500">*</span>
            </label>
            <input
              id="nameFa"
              type="text"
              className="rounded-[var(--radius-base)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none"
              placeholder="مثلاً افسانه شرقی"
              {...register("nameFa", { required: "نام فارسی الزامی است." })}
            />
            {errors.nameFa && (
              <span className="text-xs text-red-500">{errors.nameFa.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--color-foreground)]" htmlFor="nameEn">
              نام انگلیسی <span className="text-red-500">*</span>
            </label>
            <input
              id="nameEn"
              type="text"
              className="rounded-[var(--radius-base)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none"
              placeholder="مثلاً Oriental Tale"
              {...register("nameEn", { required: "نام انگلیسی الزامی است." })}
            />
            {errors.nameEn && (
              <span className="text-xs text-red-500">{errors.nameEn.message}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[var(--color-foreground)]" htmlFor="description">
            توضیحات محصول
          </label>
          <textarea
            id="description"
            rows={4}
            className="rounded-[var(--radius-base)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none resize-y"
            placeholder="توضیحات کامل محصول را اینجا وارد کنید..."
            {...register("description")}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--color-foreground)]" htmlFor="brandId">
              برند مرتبط <span className="text-red-500">*</span>
            </label>
            <select
              id="brandId"
              className="rounded-[var(--radius-base)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none"
              {...register("brandId", { required: "انتخاب برند الزامی است." })}
            >
              <option value="">یک برند را انتخاب کنید</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            {errors.brandId && (
              <span className="text-xs text-red-500">{errors.brandId.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--color-foreground)]" htmlFor="collectionId">
              کالکشن مرتبط
            </label>
            <select
              id="collectionId"
              className="rounded-[var(--radius-base)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none"
              {...register("collectionId")}
            >
              <option value="">انتخاب نشده</option>
              {availableCollections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
            {selectedBrandId && availableCollections.length === 0 && (
              <span className="text-xs text-[var(--color-foreground-muted)]">
                برای این برند کالکشنی ثبت نشده است.
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Controller
            control={control}
            name="gender"
            render={({ field, fieldState }) => (
              <MultiSelectField
                label="جنسیت هدف"
                options={genderOptions}
                value={field.value ?? []}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="seasons"
            render={({ field, fieldState }) => (
              <MultiSelectField
                label="فصول پیشنهادی"
                options={seasonOptions}
                value={field.value ?? []}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Controller
            control={control}
            name="family"
            render={({ field, fieldState }) => (
              <MultiSelectField
                label="خانواده عطری"
                options={familyOptions}
                value={field.value ?? []}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="character"
            render={({ field, fieldState }) => (
              <MultiSelectField
                label="کاراکتر / حس کلی"
                options={characterOptions}
                value={field.value ?? []}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--color-foreground)]" htmlFor="strength">
              شدت عطر
            </label>
            <select
              id="strength"
              className="rounded-[var(--radius-base)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none"
              {...register("strength")}
            >
              <option value="">انتخاب نشده</option>
              {strengthOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--color-foreground)]" htmlFor="intensity">
              شدت بویایی
            </label>
            <input
              id="intensity"
              type="text"
              className="rounded-[var(--radius-base)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none"
              placeholder="مثلاً قوی، متوسط، ملایم"
              {...register("intensity")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Controller
            control={control}
            name="image"
            render={({ field, fieldState }) => (
              <ImageUpload
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                label="تصویر محصول"
                accept="image/*"
                maxSize={5}
              />
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Controller
            control={control}
            name="notes.top"
            rules={{ validate: (value) => value.length > 0 || "حداقل یک نت بالایی وارد کنید." }}
            render={({ field, fieldState }) => (
              <NotesField
                label="نت‌های آغازین"
                helper="نام نت را تایپ کرده و از لیست انتخاب کنید."
                value={field.value ?? []}
                onChange={field.onChange}
                error={fieldState.error?.message}
                availableNotes={availableNotes}
              />
            )}
          />

          <Controller
            control={control}
            name="notes.middle"
            rules={{ validate: (value) => value.length > 0 || "حداقل یک نت میانی وارد کنید." }}
            render={({ field, fieldState }) => (
              <NotesField
                label="نت‌های میانی"
                helper="از لیست نت‌های پیشنهادی انتخاب کنید."
                value={field.value ?? []}
                onChange={field.onChange}
                error={fieldState.error?.message}
                availableNotes={availableNotes}
              />
            )}
          />

          <Controller
            control={control}
            name="notes.base"
            rules={{ validate: (value) => value.length > 0 || "حداقل یک نت پایانی وارد کنید." }}
            render={({ field, fieldState }) => (
              <NotesField
                label="نت‌های پایانی"
                helper="از لیست نت‌های پیشنهادی انتخاب کنید."
                value={field.value ?? []}
                onChange={field.onChange}
                error={fieldState.error?.message}
                availableNotes={availableNotes}
              />
            )}
          />
        </div>

        <AnimatePresence mode="wait">
          {status && (
            <motion.div
              key={`${status.type}-${status.message}`}
              className={`rounded-[var(--radius-base)] border px-4 py-3 text-sm ${statusStyleMap[status.type]}`}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={statusVariants}
            >
              {status.message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-end gap-3">
          {isEditing && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="inline-flex items-center justify-center rounded-[var(--radius-base)] border border-[var(--color-border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--color-foreground)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-background-soft)] hover:scale-[1.01] active:scale-[0.99]"
            >
              انصراف
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-[var(--radius-base)] bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-strong)] hover:scale-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
          >
            {isSubmitting
              ? "در حال ارسال..."
              : isEditing
                ? "ذخیره تغییرات"
                : "ثبت محصول"
            }
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">آخرین محصولات ثبت‌شده ({perfumes.length})</h3>
          {loading && <span className="text-sm text-[var(--color-foreground-muted)]">در حال بارگذاری...</span>}
        </div>

        {perfumes.length > 0 && (
          <div className="relative">
            <input
              type="text"
              placeholder="جستجوی محصول..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-[var(--radius-base)] border border-[var(--color-border)] bg-white px-4 py-3 pr-10 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-foreground-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}

        {perfumes.length === 0 && !loading ? (
          <p className="text-sm text-[var(--color-foreground-muted)]">هنوز محصولی ثبت نشده است.</p>
        ) : (
          <motion.ul className="grid gap-4 md:grid-cols-2" variants={stagger}>
            <AnimatePresence>
              {filteredPerfumes.map((perfume) => (
                <motion.li
                  key={perfume.id}
                  className="rounded-[var(--radius-base)] border border-[var(--color-border)] bg-[var(--color-background-soft)]/70 p-4 text-sm shadow-[var(--shadow-soft)]"
                  layout
                  variants={listItem}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  whileHover={
                    shouldReduce
                      ? undefined
                      : {
                          scale: 1.01,
                          boxShadow: "var(--shadow-strong)",
                          borderColor: "rgba(183, 146, 90, 0.4)",
                          transition: { duration: 0.4, ease },
                        }
                  }
                  whileTap={
                    shouldReduce
                      ? undefined
                      : {
                          scale: 0.99,
                          transition: { duration: 0.2, ease },
                        }
                  }
                  transition={transition}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {perfume.image && (
                        <img
                          src={perfume.image}
                          alt={perfume.name_fa}
                          className="h-16 w-16 rounded-[var(--radius-base)] object-cover"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-[var(--color-foreground)]">{perfume.name_fa}</p>
                        <p className="text-xs text-[var(--color-foreground-subtle)]">{perfume.name_en}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="text-xs text-[var(--color-foreground-muted)]">
                        {perfume.brand && <p>برند: {perfume.brand.name}</p>}
                        {perfume.collection && <p>کالکشن: {perfume.collection.name}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(perfume)}
                          className="rounded px-3 py-1 text-xs font-medium text-blue-600 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-blue-100 hover:scale-[1.02] active:scale-[0.98]"
                          title="ویرایش"
                        >
                          ویرایش
                        </button>
                        <button
                          onClick={() => handleDelete(perfume)}
                          className="rounded px-3 py-1 text-xs font-medium text-red-600 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-red-100 hover:scale-[1.02] active:scale-[0.98]"
                          title="حذف"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-[var(--color-foreground-muted)]">
                    {perfume.description && (
                      <p className="text-[var(--color-foreground)] italic line-clamp-2">
                        {perfume.description}
                      </p>
                    )}
                    <p>
                      جنسیت: {perfume.gender ?? "---"} | فصول: {perfume.seasons && perfume.seasons.length > 0 ? perfume.seasons.join("، ") : (perfume.season ?? "---")}
                    </p>
                    <p>
                      خانواده: {perfume.family ?? "---"} | کاراکتر: {perfume.character ?? "---"} | شدت: {perfume.strength ?? "---"}
                    </p>
                    {perfume.intensity && (
                      <p>شدت بویایی: {perfume.intensity}</p>
                    )}
                    {perfume.occasions && perfume.occasions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[var(--color-foreground-muted)] text-[10px]">مناسبت‌ها:</span>
                        {perfume.occasions.map((occ, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded">
                            {occ}
                          </span>
                        ))}
                      </div>
                    )}
                    {perfume.main_accords && perfume.main_accords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[var(--color-foreground-muted)] text-[10px]">اکوردها:</span>
                        {perfume.main_accords.map((acc, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded">
                            {acc}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="font-medium text-[var(--color-foreground)]">نت‌ها</p>
                      <div className="grid gap-1 md:grid-cols-3">
                        <div>
                          <p className="text-[var(--color-foreground)]">آغازی</p>
                          <p>{perfume.notes.top.join("، ") || "---"}</p>
                        </div>
                        <div>
                          <p className="text-[var(--color-foreground)]">میانی</p>
                          <p>{perfume.notes.middle.join("، ") || "---"}</p>
                        </div>
                        <div>
                          <p className="text-[var(--color-foreground)]">پایانی</p>
                          <p>{perfume.notes.base.join("، ") || "---"}</p>
                        </div>
                      </div>
                      {perfume.all_notes && perfume.all_notes.length > 0 && (
                        <p className="text-[10px] text-[var(--color-foreground-muted)] mt-1">
                          تمام نت‌ها ({perfume.all_notes.length}): {perfume.all_notes.slice(0, 5).join("، ")}{perfume.all_notes.length > 5 ? "..." : ""}
                        </p>
                      )}
                    </div>
                    {(perfume.created_at || perfume.updated_at) && (
                      <div className="text-[10px] text-[var(--color-foreground-subtle)] pt-1 border-t border-[var(--color-border)]">
                        {perfume.created_at && <p>ایجاد شده: {new Date(perfume.created_at).toLocaleDateString('fa-IR')}</p>}
                        {perfume.updated_at && <p>آخرین بروزرسانی: {new Date(perfume.updated_at).toLocaleDateString('fa-IR')}</p>}
                      </div>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}

        <AnimatePresence mode="wait">
          {hasSearchTerm && filteredPerfumes.length === 0 && (
            <motion.p
              className="py-8 text-center text-sm text-[var(--color-foreground-muted)]"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={statusVariants}
            >
              محصولی با این نام یافت نشد.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
