import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangleIcon, CheckIcon, PackageIcon } from "@/components/icons";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`surface-card ${className}`}>{children}</div>;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  disabled,
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const variants: Record<string, string> = {
    primary: "border border-brand-700 bg-brand-700 text-white shadow-[0_1px_2px_rgba(16,40,32,.14)] hover:border-brand-800 hover:bg-brand-800 disabled:border-brand-200 disabled:bg-brand-200",
    secondary: "border border-brand-200 bg-brand-50 text-brand-800 hover:border-brand-400 hover:bg-brand-100",
    outline: "border border-slate-300 bg-white text-ink hover:border-brand-500 hover:text-brand-700",
    ghost: "border border-transparent text-brand-700 hover:bg-brand-50",
    danger: "border border-danger bg-danger text-white hover:opacity-90",
  };
  const sizes: Record<string, string> = {
    sm: "min-h-9 rounded-md px-3 py-1.5 text-sm",
    md: "min-h-11 rounded-lg px-4 py-2.5 text-sm",
    lg: "min-h-12 rounded-lg px-6 py-3 text-base",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 font-semibold ${variants[variant]} ${sizes[size]} disabled:cursor-not-allowed disabled:opacity-65 ${className}`}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: "border border-brand-700 bg-brand-700 text-white shadow-[0_1px_2px_rgba(16,40,32,.14)] hover:border-brand-800 hover:bg-brand-800",
    secondary: "border border-brand-200 bg-brand-50 text-brand-800 hover:border-brand-400 hover:bg-brand-100",
    outline: "border border-slate-300 bg-white text-ink hover:border-brand-500 hover:text-brand-700",
    ghost: "border border-transparent text-brand-700 hover:bg-brand-50",
  };
  const sizes: Record<string, string> = {
    sm: "min-h-9 rounded-md px-3 py-1.5 text-sm",
    md: "min-h-11 rounded-lg px-4 py-2.5 text-sm",
    lg: "min-h-12 rounded-lg px-6 py-3 text-base",
  };
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 text-center font-semibold ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </Link>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" | "accent" | "success" | "warning" | "danger" }) {
  const tones: Record<string, string> = {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    brand: "border-brand-100 bg-brand-50 text-brand-700",
    accent: "border-amber-200 bg-amber-50 text-amber-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-700",
  };
  return <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold leading-none ${tones[tone]}`}>{children}</span>;
}

export function Alert({ tone = "info", title, children }: { tone?: "info" | "warning" | "danger" | "success"; title?: string; children: ReactNode }) {
  const tones: Record<string, string> = {
    info: "border-brand-200 bg-brand-50/70 text-brand-800",
    warning: "border-amber-300 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  const Icon = tone === "success" ? CheckIcon : tone === "warning" || tone === "danger" ? AlertTriangleIcon : CheckIcon;
  return (
    <div
      className={`flex gap-3 rounded-lg border p-4 text-sm leading-relaxed ${tones[tone]}`}
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      aria-live={tone === "danger" || tone === "warning" ? "assertive" : "polite"}
    >
      <Icon className="mt-0.5 shrink-0" size={18} />
      <div>{title && <p className="mb-1 font-bold">{title}</p>}{children}</div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700" aria-hidden>
        {icon ? <span className="text-lg">{icon}</span> : <PackageIcon size={21} />}
      </span>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {action}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, action, align = "left" }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; align?: "left" | "center" }) {
  const center = align === "center";
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${center ? "mx-auto max-w-2xl text-center sm:block" : ""}`}>
      <div className={center ? "mx-auto" : "max-w-2xl"}>
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p>}
        <h2 className="text-balance text-2xl font-bold tracking-[-0.02em] text-ink sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-2 sm:px-5">
      <p className="text-xl font-bold tracking-[-0.025em] text-brand-800 sm:text-2xl">{value}</p>
      <p className="mt-1.5 max-w-[190px] text-xs leading-5 text-slate-600">{label}</p>
    </div>
  );
}

export function Field({ label, htmlFor, error, hint, children, required }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode; required?: boolean }) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy = [errorId, !error ? hintId : undefined].filter(Boolean).join(" ") || undefined;
  const accessibleChild = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">{label} {required && <span className="text-danger" aria-hidden>*</span>}</label>
      {accessibleChild}
      {hint && !error && <p id={hintId} className="text-xs leading-5 text-slate-500">{hint}</p>}
      {error && <p id={errorId} className="text-xs font-semibold text-danger" role="alert">{error}</p>}
    </div>
  );
}

export const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50";
