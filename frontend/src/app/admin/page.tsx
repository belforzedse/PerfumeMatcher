"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { useAdminMotionVariants } from "@/components/admin/AdminMotion";
import { fetchBrandsAdmin, fetchCollectionsAdmin, fetchPerfumesAdmin } from "@/lib/admin-api";

const quickLinks = [
  {
    href: "/admin/products",
    title: "مدیریت محصولات",
    description: "افزودن عطر جدید، به‌روزرسانی اطلاعات و مدیریت نت‌ها.",
    icon: "🌸",
  },
  {
    href: "/admin/brands",
    title: "مدیریت برندها",
    description: "ساخت برند جدید یا ویرایش برندهای موجود.",
    icon: "🏷️",
  },
  {
    href: "/admin/collections",
    title: "مدیریت کالکشن‌ها",
    description: "تعریف کالکشن‌های تازه و دسته‌بندی محصولات.",
    icon: "📦",
  },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ perfumes: 0, brands: 0, collections: 0 });
  const [loading, setLoading] = useState(true);
  const { section, listItem, stagger, transition, ease, shouldReduce } =
    useAdminMotionVariants();
  const MotionLink = motion.create(Link);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [perfumes, brands, collections] = await Promise.all([
          fetchPerfumesAdmin(),
          fetchBrandsAdmin(),
          fetchCollectionsAdmin(),
        ]);
        setStats({
          perfumes: perfumes.length,
          brands: brands.length,
          collections: collections.length,
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    };
    void loadStats();
  }, []);

  return (
    <motion.section
      className="flex flex-col gap-6 sm:gap-8 md:gap-10"
      dir="rtl"
      initial="hidden"
      animate="visible"
      variants={section}
    >
      <div className="space-y-2 sm:space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold">داشبورد مدیریتی</h2>
        <p className="text-xs sm:text-sm md:text-base text-[var(--color-foreground-muted)]">
          خوش آمدید! از اینجا می‌توانید محتوای وب‌سایت و کیوسک را به‌صورت یکپارچه مدیریت کنید.
        </p>
      </div>

      {/* Stats Cards */}
      <motion.div className="grid gap-4 grid-cols-1 sm:grid-cols-3" variants={stagger}>
        <motion.div
          className="rounded-xl border border-[var(--color-border)] bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm"
          variants={listItem}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-foreground-muted)]">تعداد عطرها</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                {loading ? "..." : stats.perfumes}
              </p>
            </div>
            <div className="text-4xl">🌸</div>
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl border border-[var(--color-border)] bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm"
          variants={listItem}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-foreground-muted)]">تعداد برندها</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {loading ? "..." : stats.brands}
              </p>
            </div>
            <div className="text-4xl">🏷️</div>
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl border border-[var(--color-border)] bg-gradient-to-br from-green-50 to-white p-5 shadow-sm"
          variants={listItem}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-foreground-muted)]">تعداد کالکشن‌ها</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {loading ? "..." : stats.collections}
              </p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </motion.div>
      </motion.div>

      {/* Quick Links */}
      <motion.div
        className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        variants={stagger}
      >
        {quickLinks.map((card) => (
          <MotionLink
            key={card.href}
            href={card.href}
            className="group relative flex h-full min-h-[140px] flex-col gap-3 overflow-hidden rounded-xl sm:rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-background-soft)]/80 p-5 md:p-6"
            variants={listItem}
            transition={transition}
            whileHover={
              shouldReduce
                ? undefined
                : {
                    y: -4,
                    boxShadow: "var(--shadow-strong)",
                    backgroundColor: "rgba(236, 234, 229, 0.9)",
                    borderColor: "rgba(183, 146, 90, 0.4)",
                    transition: { duration: 0.45, ease },
                  }
            }
            whileTap={
              shouldReduce
                ? undefined
                : {
                    scale: 0.98,
                    transition: { duration: 0.2, ease },
                  }
            }
          >
            <div className="flex h-full flex-col gap-3">
              <div className="text-3xl">{card.icon}</div>
              <h3 className="text-base sm:text-lg font-semibold text-[var(--color-foreground)] transition-colors group-hover:text-[var(--color-accent-strong)]">
                {card.title}
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-foreground-muted)]">{card.description}</p>
              <span className="mt-auto inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[var(--color-accent-strong)]">
                ورود به صفحه <span aria-hidden>↗</span>
              </span>
            </div>
            <div className="absolute top-0 left-0 h-1 w-full origin-left scale-x-0 transform bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-strong)] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
          </MotionLink>
        ))}
      </motion.div>

      {/* Guide Section */}
      <motion.div
        className="rounded-xl sm:rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-gradient-to-br from-amber-50/50 to-white p-5 md:p-6"
        variants={listItem}
      >
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div className="flex-1">
            <p className="font-medium text-sm sm:text-base text-[var(--color-foreground)] mb-3">راهنمای سریع</p>
            <ul className="space-y-2 text-xs sm:text-sm text-[var(--color-foreground-muted)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--color-accent)] mt-0.5">•</span>
                <span>برای ثبت عطر جدید ابتدا مطمئن شوید برند و کالکشن آن در سامانه وجود دارد.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color-accent)] mt-0.5">•</span>
                <span>تصاویر به صورت خودکار به فرمت WebP تبدیل می‌شوند برای بهینه‌سازی فضا.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color-accent)] mt-0.5">•</span>
                <span>پس از هر بار ثبت یا ویرایش، چند ثانیه صبر کنید تا لیست‌ها به‌روزرسانی شوند.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color-accent)] mt-0.5">•</span>
                <span>در صورت بروز خطا، اتصال به اینترنت و توکن دسترسی را بررسی کنید.</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}
