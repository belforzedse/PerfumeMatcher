"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { useAdminMotionVariants } from "@/components/admin/AdminMotion";
import { GlassToastProvider } from "@/components/GlassToastProvider";

const navigationLinks = [
  { href: "/admin/products", label: "محصولات" },
  { href: "/admin/brands", label: "برندها" },
  { href: "/admin/collections", label: "کالکشن‌ها" },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const {
    section: navVariants,
    listItem: itemVariants,
    transition,
    ease,
    shouldReduce,
  } = useAdminMotionVariants();

  const MotionLink = motion.create(Link);

  return (
    <GlassToastProvider>
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]" dir="rtl">
        <header className="border-b border-[var(--color-border)]/70 bg-[var(--color-surface)]/90 backdrop-blur-xl shadow-[var(--shadow-soft)]">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1.5 sm:gap-2 px-4 py-4 sm:px-5 sm:py-6 md:px-6 md:py-8">
            <p className="text-xs sm:text-sm text-[var(--color-foreground-subtle)]">مدیریت محتوا</p>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold">پنل مدیریت گندم پرفیوم</h1>
            <p className="text-xs sm:text-sm md:text-base text-[var(--color-foreground-muted)]">
              از این بخش می‌توانید محصولات، برندها و کالکشن‌ها را مدیریت کنید.
            </p>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6 md:gap-8 px-4 py-6 sm:px-5 sm:py-8 md:px-6 md:py-10 lg:flex-row">
          <motion.nav
            className="flex flex-row gap-2 sm:gap-3 overflow-x-auto rounded-xl sm:rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-2 sm:p-3 shadow-[var(--shadow-soft)] lg:h-fit lg:w-64 lg:flex-col"
            initial="hidden"
            animate="visible"
            variants={navVariants}
          >
            {navigationLinks.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);

              return (
                <MotionLink
                  key={item.href}
                  href={item.href}
                  className={`relative flex min-h-[44px] items-center justify-between gap-2 overflow-hidden whitespace-nowrap rounded-lg sm:rounded-[var(--radius-base)] px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm transition-colors duration-300 ease-out admin-nav-link${active ? " admin-nav-link--active" : ""}`}
                  variants={itemVariants}
                  layout
                  transition={transition}
                  whileHover={
                    shouldReduce
                      ? undefined
                      : {
                          y: -4,
                          transition: { duration: 0.4, ease },
                        }
                  }
                  whileTap={
                    shouldReduce
                      ? undefined
                      : {
                          scale: 0.97,
                          transition: { duration: 0.2, ease },
                        }
                  }
                >
                  {active && (
                    <motion.span
                      layoutId="admin-nav-active"
                      className="absolute inset-0 z-0 rounded-lg sm:rounded-[var(--radius-base)] bg-[var(--color-accent)] shadow-[var(--shadow-strong)]"
                      transition={{ type: "spring", stiffness: 420, damping: 38 }}
                    />
                  )}
                  <span className="relative z-10 font-medium">{item.label}</span>
                  {active && (
                    <span className="relative z-10 text-[10px] sm:text-xs text-[var(--color-surface)]">فعال</span>
                  )}
                </MotionLink>
              );
            })}
          </motion.nav>

          <main className="flex-1 rounded-xl sm:rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 shadow-[var(--shadow-soft)]">
            {children}
          </main>
        </div>
      </div>
    </GlassToastProvider>
  );
}
