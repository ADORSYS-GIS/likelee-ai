import React from "react";

import { cn } from "@/lib/utils";

type TabItem = {
  id: string;
  label: React.ReactNode;
  onClick: () => void;
  active?: boolean;
};

export function DashboardPageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DashboardSectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-gray-600 sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function DashboardTabRail({
  items,
  className,
}: {
  items: TabItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto no-scrollbar scroll-fade-x py-1",
        className,
      )}
    >
      <div className="flex min-w-max items-center gap-1.5 p-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap transition-all duration-200",
              item.active
                ? "bg-indigo-50/70 text-indigo-600 shadow-sm ring-1 ring-indigo-600/20"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DashboardActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DashboardTableSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-gray-200",
        className,
      )}
    >
      {children}
    </div>
  );
}
