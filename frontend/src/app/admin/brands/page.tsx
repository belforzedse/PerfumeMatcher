"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";

import {
  createBrand,
  fetchBrandsAdmin,
  updateBrand,
  deleteBrand,
  type AdminBrand,
  type CreateBrandPayload,
} from "@/lib/admin-api";
import { useAdminMotionVariants } from "@/components/admin/AdminMotion";

type FeedbackState = {
  type: "success" | "error";
  message: string;
};

interface BrandFormValues {
  name: string;
}

type EditingBrandId = string | null;

const defaultValues: BrandFormValues = {
  name: "",
};

const buildPayload = (values: BrandFormValues): CreateBrandPayload => ({
  name: values.name.trim(),
});

export default function AdminBrandsPage() {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BrandFormValues>({ defaultValues });
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [status, setStatus] = useState<FeedbackState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingId, setEditingId] = useState<EditingBrandId>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { section, listItem, status: statusVariants, stagger, transition, ease, shouldReduce } =
    useAdminMotionVariants();

  const loadBrands = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBrandsAdmin();
      setBrands(data);
    } catch (error) {
      console.error("خطا در بارگذاری برندها", error);
      setStatus({
        type: "error",
        message: "بارگذاری برندها با خطا مواجه شد. اتصال و توکن را بررسی کنید.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

  const onSubmit = async (values: BrandFormValues) => {
    setStatus(null);

    try {
      const payload = buildPayload(values);

      if (editingId) {
        // Update existing brand
        await updateBrand(editingId, payload);
        setStatus({ type: "success", message: "برند با موفقیت بروزرسانی شد." });
        setEditingId(null);
      } else {
        // Create new brand
        await createBrand(payload);
        setStatus({ type: "success", message: "برند جدید با موفقیت ثبت شد." });
      }

      reset(defaultValues);
      await loadBrands();
    } catch (error) {
      console.error("خطا در ثبت برند", error);
      setStatus({ type: "error", message: "عملیات انجام نشد. لطفاً دوباره تلاش کنید." });
    }
  };

  const handleEdit = (brand: AdminBrand) => {
    setEditingId(brand.id.toString());
    setValue("name", brand.name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    reset(defaultValues);
    setStatus(null);
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm("آیا از حذف این برند اطمینان دارید؟")) {
      return;
    }

    setDeletingId(documentId);
    setStatus(null);

    try {
      await deleteBrand(documentId);
      setStatus({ type: "success", message: "برند با موفقیت حذف شد." });
      await loadBrands();
    } catch (error) {
      console.error("خطا در حذف برند", error);
      setStatus({ type: "error", message: "حذف برند انجام نشد. لطفاً دوباره تلاش کنید." });
    } finally {
      setDeletingId(null);
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
        <h2 className="text-2xl font-semibold">برندها</h2>
        <p className="text-[var(--color-foreground-muted)]">
          لیست برندهای موجود را مشاهده کنید و برند تازه‌ای به سامانه اضافه نمایید.
        </p>
      </div>

      <form
        className="space-y-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-background-soft)]/70 p-6 shadow-[var(--shadow-soft)]"
        onSubmit={handleSubmit(onSubmit)}
      >
        {editingId && (
          <motion.div
            className="rounded-[var(--radius-base)] bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 flex items-center justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span>در حال ویرایش برند</span>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-blue-600 hover:text-blue-800 font-medium text-xs"
            >
              لغو
            </button>
          </motion.div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[var(--color-foreground)]" htmlFor="name">
            نام برند <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            className="rounded-[var(--radius-base)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none"
            placeholder="مثلاً شنل"
            {...register("name", { required: "نام برند الزامی است." })}
          />
          {errors.name && (
            <span className="text-xs text-red-500">{errors.name.message}</span>
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

        <div className="flex items-center justify-end gap-3">
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="inline-flex items-center justify-center rounded-[var(--radius-base)] bg-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-gray-400 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              لغو
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-[var(--radius-base)] bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-strong)] hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
          >
            {isSubmitting ? "در حال ارسال..." : editingId ? "بروزرسانی برند" : "ثبت برند"}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">لیست برندهای موجود ({brands.length})</h3>
          {loading && <span className="text-sm text-[var(--color-foreground-muted)]">در حال بارگذاری...</span>}
        </div>

        {brands.length > 0 && (
          <div className="relative">
            <input
              type="text"
              placeholder="جستجوی برند..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-[var(--radius-base)] border border-[var(--color-border)] bg-white px-4 py-3 pr-10 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-foreground-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}

        {brands.length === 0 && !loading ? (
          <p className="text-sm text-[var(--color-foreground-muted)]">هنوز برندی ثبت نشده است.</p>
        ) : (
          <motion.ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" variants={stagger}>
            <AnimatePresence>
              {brands
                .filter((brand) => brand.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((brand) => (
                  <motion.li
                    key={brand.id}
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
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[var(--color-foreground)]">{brand.name}</p>
                        <span className="rounded bg-[var(--color-accent-soft)] px-2 py-1 text-xs text-[var(--color-foreground-subtle)]">
                          #{brand.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => handleEdit(brand)}
                          disabled={deletingId === brand.id.toString()}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-[var(--radius-base)] bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          ویرایش
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(brand.id.toString())}
                          disabled={deletingId === brand.id.toString() || isSubmitting}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-[var(--radius-base)] bg-red-500 px-3 py-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-red-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === brand.id.toString() ? (
                            <>
                              <span className="inline-block h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              حذف...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              حذف
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.li>
                ))}
            </AnimatePresence>
          </motion.ul>
        )}

        <AnimatePresence mode="wait">
          {searchTerm &&
            brands.filter((brand) => brand.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
              <motion.p
                className="py-8 text-center text-sm text-[var(--color-foreground-muted)]"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={statusVariants}
              >
                برندی با این نام یافت نشد.
              </motion.p>
            )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
