"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";

import {
  createCollection,
  fetchBrandsAdmin,
  fetchCollectionsAdmin,
  type AdminBrand,
  type AdminCollection,
  type CreateCollectionPayload,
} from "@/lib/admin-api";
import { useAdminMotionVariants } from "@/components/admin/AdminMotion";

type FeedbackState = {
  type: "success" | "error";
  message: string;
};

interface CollectionFormValues {
  name: string;
  brandId: string;
}

const defaultValues: CollectionFormValues = {
  name: "",
  brandId: "",
};

const buildPayload = (values: CollectionFormValues): CreateCollectionPayload => ({
  name: values.name.trim(),
  brandId: values.brandId ? Number(values.brandId) : undefined,
});

export default function AdminCollectionsPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CollectionFormValues>({ defaultValues });
  const [collections, setCollections] = useState<AdminCollection[]>([]);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [status, setStatus] = useState<FeedbackState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { section, listItem, status: statusVariants, stagger, transition, ease, shouldReduce } =
    useAdminMotionVariants();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [brandData, collectionData] = await Promise.all([
        fetchBrandsAdmin(),
        fetchCollectionsAdmin(),
      ]);
      setBrands(brandData);
      setCollections(collectionData);
    } catch (error) {
      console.error("خطا در بارگذاری کالکشن‌ها", error);
      setStatus({
        type: "error",
        message: "بارگذاری داده‌ها با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onSubmit = async (values: CollectionFormValues) => {
    setStatus(null);

    try {
      const payload = buildPayload(values);
      await createCollection(payload);
      setStatus({ type: "success", message: "کالکشن جدید با موفقیت ثبت شد." });
      reset(defaultValues);
      await loadData();
    } catch (error) {
      console.error("خطا در ثبت کالکشن", error);
      setStatus({ type: "error", message: "ثبت کالکشن انجام نشد. مجدداً تلاش کنید." });
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
        <h2 className="text-2xl font-semibold">کالکشن‌ها</h2>
        <p className="text-[var(--color-foreground-muted)]">
          کالکشن‌های برندهای مختلف را مدیریت کنید و دسته‌بندی‌های تازه بسازید.
        </p>
      </div>

      <form
        className="space-y-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-background-soft)]/70 p-6 shadow-[var(--shadow-soft)]"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[var(--color-foreground)]" htmlFor="name">
            نام کالکشن <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            className="rounded-[var(--radius-base)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none"
            placeholder="مثلاً Private Blend"
            {...register("name", { required: "نام کالکشن الزامی است." })}
          />
          {errors.name && (
            <span className="text-xs text-red-500">{errors.name.message}</span>
          )}
        </div>

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

        <AnimatePresence mode="wait">
          {status && (
            <motion.div
              key={`${status.type}-${status.message}`}
              className={`rounded-[var(--radius-base)] px-4 py-3 text-sm ${
                status.type === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={statusVariants}
            >
              {status.message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-[var(--radius-base)] bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-strong)] hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
          >
            {isSubmitting ? "در حال ارسال..." : "ثبت کالکشن"}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">لیست کالکشن‌های موجود ({collections.length})</h3>
          {loading && <span className="text-sm text-[var(--color-foreground-muted)]">در حال بارگذاری...</span>}
        </div>

        {collections.length > 0 && (
          <div className="relative">
            <input
              type="text"
              placeholder="جستجوی کالکشن..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-[var(--radius-base)] border border-[var(--color-border)] bg-white px-4 py-3 pr-10 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-foreground-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}

        {collections.length === 0 && !loading ? (
          <p className="text-sm text-[var(--color-foreground-muted)]">هنوز کالکشنی ثبت نشده است.</p>
        ) : (
          <motion.ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" variants={stagger}>
            <AnimatePresence>
              {collections
                .filter((collection) => collection.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((collection) => (
                  <motion.li
                    key={collection.id}
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
                            y: -4,
                            boxShadow: "var(--shadow-strong)",
                            borderColor: "rgba(183, 146, 90, 0.4)",
                            transition: { duration: 0.4, ease },
                          }
                    }
                    transition={transition}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-semibold text-[var(--color-foreground)]">{collection.name}</p>
                      <span className="rounded bg-[var(--color-accent-soft)] px-2 py-1 text-xs text-[var(--color-foreground-subtle)]">
                        #{collection.id}
                      </span>
                    </div>
                    {collection.brand && (
                      <p className="text-xs text-[var(--color-foreground-muted)]">
                        برند: {collection.brand.name}
                      </p>
                    )}
                  </motion.li>
                ))}
            </AnimatePresence>
          </motion.ul>
        )}

        <AnimatePresence mode="wait">
          {searchTerm &&
            collections.filter((collection) => collection.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
              <motion.p
                className="py-8 text-center text-sm text-[var(--color-foreground-muted)]"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={statusVariants}
              >
                کالکشنی با این نام یافت نشد.
              </motion.p>
            )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
