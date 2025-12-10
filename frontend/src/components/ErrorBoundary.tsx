"use client";

import { Component, ReactNode } from "react";
import Link from "next/link";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="glass-card max-w-lg space-y-4 rounded-3xl p-8 text-center">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
              مشکلی پیش آمد
            </h2>
            <p className="text-sm text-muted">
              متأسفانه خطایی رخ داده است. لطفاً صفحه را مجدداً بارگذاری کنید.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn tap-highlight touch-target touch-feedback"
              >
                بارگذاری مجدد
              </button>
              <Link href="/" className="btn-ghost tap-highlight touch-target touch-feedback">
                بازگشت به صفحه اصلی
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
