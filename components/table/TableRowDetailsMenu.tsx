"use client";

import { ActionDropdown, type ActionDropdownItem } from "@/components/ShareDropdown";

function EllipsisIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export type TableDetailsField = {
  label: string;
  value: string;
};

export default function TableRowDetailsMenu({
  fields,
  triggerLabel = "Row details",
}: {
  fields: TableDetailsField[];
  triggerLabel?: string;
}) {
  const items: ActionDropdownItem[] = fields.map((field) => ({
    key: field.label,
    label: `${field.label}: ${field.value}`,
  }));

  return (
    <ActionDropdown
      items={items}
      label={triggerLabel}
      menuAlign="right"
      menuDirection="down"
      portalMenu
      showTriggerIcon={false}
      triggerAriaLabel={triggerLabel}
      rootClassName="relative inline-flex flex-col items-center"
      menuClassName="w-[min(24rem,calc(100vw-1.5rem))]"
      menuStyle={{ maxWidth: "min(24rem, calc(100vw - 1.5rem))" }}
      buttonClassName="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[color:var(--fg-body)] transition-colors hover:text-[var(--color-accent-interactive)]"
      renderTriggerContent={() => <EllipsisIcon />}
      itemClassName="!cursor-default whitespace-normal break-words !font-medium leading-5 hover:bg-transparent hover:text-inherit"
    />
  );
}
