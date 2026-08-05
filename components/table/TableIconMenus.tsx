"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type TableMenuOption<T extends string | number> = {
  value: T;
  label: string;
};

type TableIconButtonProps = {
  ariaLabel: string;
  borderColor: string;
  icon: ReactNode;
  onClick: () => void;
  triggerBackground?: string;
};

type TableIconMenuProps<T extends string | number> = {
  ariaLabel: string;
  value: T;
  options: readonly TableMenuOption<T>[];
  onChange: (next: T) => void;
  icon: ReactNode;
  borderColor: string;
  menuBackground?: string;
  triggerBackground?: string;
  activeBackground?: string;
  menuWidthPx: number;
  selectedSuffix?: ReactNode;
};

type TableRowsMenuProps = {
  value: number;
  options: readonly number[];
  onChange: (next: number) => void;
  borderColor: string;
  menuBackground?: string;
  triggerBackground?: string;
  activeBackground?: string;
};

type TableSortMenuOption<T extends string> = {
  key: T;
  label: string;
};

type TableSortMenuProps<T extends string> = {
  value: T;
  options: readonly TableSortMenuOption<T>[];
  onChange: (next: T) => void;
  borderColor: string;
  menuBackground?: string;
  triggerBackground?: string;
  activeBackground?: string;
  selectedSuffix?: ReactNode;
  menuWidthPx?: number;
};

function SortIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M8 18V6" />
      <path d="m5 9 3-3 3 3" />
      <path d="M16 6v12" />
      <path d="m13 15 3 3 3-3" />
    </svg>
  );
}

function RowsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 6h14" />
      <path d="M5 12h14" />
      <path d="M5 18h14" />
      <circle cx="8" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TableIconButton({
  ariaLabel,
  borderColor,
  icon,
  onClick,
  triggerBackground = "color-mix(in srgb, var(--color-bg-elevated, transparent) 78%, transparent)",
}: TableIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[color:var(--fg-body)] transition-colors hover:text-[var(--color-accent-interactive)]"
      style={{
        border: `1px solid ${borderColor}`,
        background: triggerBackground,
      }}
      aria-label={ariaLabel}
    >
      {icon}
    </button>
  );
}

function TableIconMenu<T extends string | number>({
  ariaLabel,
  value,
  options,
  onChange,
  icon,
  borderColor,
  menuBackground = "var(--color-raised)",
  triggerBackground = "color-mix(in srgb, var(--color-bg-elevated, transparent) 78%, transparent)",
  activeBackground = "color-mix(in srgb, var(--color-accent-interactive) 14%, transparent)",
  menuWidthPx,
  selectedSuffix,
}: TableIconMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <div aria-haspopup="menu" aria-expanded={open}>
        <TableIconButton
          ariaLabel={ariaLabel}
          borderColor={borderColor}
          icon={icon}
          onClick={() => setOpen((current) => !current)}
          triggerBackground={triggerBackground}
        />
      </div>

      {open ? (
        <div
          className="absolute right-0 z-20 mt-2 overflow-hidden rounded-2xl"
          style={{
            width: `${menuWidthPx}px`,
            border: `1px solid ${borderColor}`,
            background: menuBackground,
            boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
          }}
          role="menu"
          aria-label={`${ariaLabel} options`}
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={
                  selected
                    ? "flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-2 text-left text-sm text-[var(--color-accent-interactive)] transition-colors"
                    : "flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-2 text-left text-sm text-[var(--fg-body)] transition-colors hover:text-[var(--color-accent-interactive)]"
                }
                style={{
                  background: selected ? activeBackground : "transparent",
                  borderTop:
                    index === 0
                      ? "none"
                      : `1px solid color-mix(in srgb, ${borderColor} 72%, transparent)`,
                }}
                role="menuitemradio"
                aria-checked={selected}
              >
                <span>{option.label}</span>
                {selected ? selectedSuffix : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function TableRowsMenu({
  value,
  options,
  onChange,
  borderColor,
  menuBackground,
  triggerBackground,
  activeBackground,
}: TableRowsMenuProps) {
  return (
    <TableIconMenu
      ariaLabel="Rows per page"
      value={value}
      options={options.map((option) => ({ value: option, label: String(option) }))}
      onChange={onChange}
      icon={<RowsIcon />}
      borderColor={borderColor}
      menuBackground={menuBackground}
      triggerBackground={triggerBackground}
      activeBackground={activeBackground}
      menuWidthPx={96}
    />
  );
}

export function TableSortMenu<T extends string>({
  value,
  options,
  onChange,
  borderColor,
  menuBackground,
  triggerBackground,
  activeBackground,
  selectedSuffix,
  menuWidthPx = 256,
}: TableSortMenuProps<T>) {
  return (
    <TableIconMenu
      ariaLabel="Sort rows"
      value={value}
      options={options.map((option) => ({ value: option.key, label: option.label }))}
      onChange={onChange}
      icon={<SortIcon />}
      borderColor={borderColor}
      menuBackground={menuBackground}
      triggerBackground={triggerBackground}
      activeBackground={activeBackground}
      menuWidthPx={menuWidthPx}
      selectedSuffix={selectedSuffix}
    />
  );
}
