"use client";

import { Fragment, useState, type CSSProperties } from "react";

import {
  compareWalletVariantsByFeatureSupport,
  subcategoryLabel,
  type WalletFeatures,
  type WalletVariant,
} from "@/lib/wallets/catalog";

type FeatureRow = {
  kind: "feature";
  key: keyof Omit<WalletFeatures, "nameActions">;
  label: string;
};

type ActionRow = {
  kind: "action";
  key: keyof WalletFeatures["nameActions"];
  label: string;
};

type MatrixRow = FeatureRow | ActionRow;

type FeatureGroup = {
  id: string;
  label: string;
  rows: readonly MatrixRow[];
};

type MatrixVariantColumn = {
  key: string;
  platformLabel: string;
  variant: WalletVariant;
};

const FEATURE_GROUPS: readonly FeatureGroup[] = [
  {
    id: "use-zcashnames",
    label: "Use ZcashNames.com",
    rows: [
      { kind: "feature", key: "scanURI", label: "Scan URI" },
      { kind: "feature", key: "tapURI", label: "Tap URI" },
      { kind: "feature", key: "pasteURI", label: "Paste URI" },
      { kind: "feature", key: "uploadQR", label: "Upload QR" },
      { kind: "feature", key: "receiveUaddr", label: "Receive to unified address" },
      { kind: "feature", key: "rotateUaddr", label: "Rotate u-address" },
      { kind: "feature", key: "receiveTaddr", label: "Receive to transparent address" },
      { kind: "feature", key: "rotateTaddr", label: "Rotate t-address" },
    ],
  },
  {
    id: "interact-with-names",
    label: "Interact with Names",
    rows: [
      { kind: "feature", key: "resolveName", label: "Send to a name" },
      { kind: "feature", key: "reverseLookup", label: "See the name for an address" },
      { kind: "feature", key: "viewExplorer", label: "View explorer" },
      { kind: "feature", key: "viewProfile", label: "View profile" },
    ],
  },
  {
    id: "manage-names",
    label: "Manage Names",
    rows: [
      { kind: "feature", key: "importContact", label: "Import contact" },
      { kind: "feature", key: "exportContact", label: "Export contact" },
      { kind: "feature", key: "viewCollection", label: "View collection" },
    ],
  },
  {
    id: "control-names",
    label: "In-App Controls",
    rows: [
      { kind: "action", key: "claim", label: "Claim name" },
      { kind: "action", key: "release", label: "Release name" },
      { kind: "action", key: "buy", label: "Buy name" },
      { kind: "action", key: "list", label: "List name" },
      { kind: "action", key: "delist", label: "Delist name" },
    ],
  },
];

const FIRST_COLUMN_WIDTH = 220;

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  color: "var(--fg-body)",
  fontSize: "0.86rem",
};

const cellStyle: CSSProperties = {
  borderTop: "1px solid var(--faq-border)",
  padding: "0.65rem 0.55rem",
  textAlign: "left",
  verticalAlign: "middle",
};

const groupHeaderStyle: CSSProperties = {
  background: "color-mix(in srgb, var(--color-surface-elevated) 88%, black 12%)",
};

const groupSummaryCellStyle: CSSProperties = {
  ...groupHeaderStyle,
  color: "var(--fg-heading)",
  fontWeight: 700,
};

const stickyFirstColumnStyle: CSSProperties = {
  left: 0,
  position: "sticky",
  zIndex: 1,
  boxShadow: "1px 0 0 var(--faq-border)",
  backgroundClip: "padding-box",
  isolation: "isolate",
  overflow: "hidden",
  minWidth: FIRST_COLUMN_WIDTH,
  width: FIRST_COLUMN_WIDTH,
};

const stickyFirstHeaderStyle: CSSProperties = {
  ...stickyFirstColumnStyle,
  backgroundColor: "var(--color-surface)",
  zIndex: 10,
};

const stickyFirstRowStyle: CSSProperties = {
  ...stickyFirstColumnStyle,
  backgroundColor: "var(--color-surface)",
  zIndex: 8,
};

function SupportMark({ value }: { value: boolean }) {
  return (
    <span
      aria-label={value ? "Supported" : "Not supported"}
      title={value ? "Supported" : "Not supported"}
      style={{
        color: value ? "var(--color-accent-green)" : "var(--fg-muted)",
        fontWeight: 700,
      }}
    >
      {value ? "Yes" : "No"}
    </span>
  );
}

function rowSupported(variant: WalletVariant, row: MatrixRow): boolean {
  if (row.kind === "action") {
    return variant.features.nameActions[row.key];
  }

  return variant.features[row.key];
}

function supportedCount(variant: WalletVariant, group: FeatureGroup): number {
  return group.rows.reduce((count, row) => count + Number(rowSupported(variant, row)), 0);
}

function sameFeatureSet(a: WalletVariant, b: WalletVariant): boolean {
  return JSON.stringify(a.features) === JSON.stringify(b.features);
}

function matrixColumns(variants: readonly WalletVariant[]): MatrixVariantColumn[] {
  const sortedVariants = [...variants].sort(compareWalletVariantsByFeatureSupport);
  const consumed = new Set<string>();
  const columns: MatrixVariantColumn[] = [];

  for (const variant of sortedVariants) {
    if (consumed.has(variant.variantId)) continue;

    const equivalentMobilePeer = sortedVariants.find((candidate) =>
      candidate.variantId !== variant.variantId &&
      !consumed.has(candidate.variantId) &&
      candidate.displayName === variant.displayName &&
      candidate.device === "mobile" &&
      variant.device === "mobile" &&
      (
        (candidate.subcategory === "android" && variant.subcategory === "ios") ||
        (candidate.subcategory === "ios" && variant.subcategory === "android")
      ) &&
      sameFeatureSet(candidate, variant),
    );

    if (equivalentMobilePeer) {
      consumed.add(variant.variantId);
      consumed.add(equivalentMobilePeer.variantId);
      columns.push({
        key: `${variant.displayName}-android-ios`,
        platformLabel: "Android, iOS",
        variant,
      });
      continue;
    }

    consumed.add(variant.variantId);
    columns.push({
      key: variant.variantId,
      platformLabel: subcategoryLabel(variant.subcategory),
      variant,
    });
  }

  return columns;
}

export default function WalletFeatureMatrix({ variants }: { variants: readonly WalletVariant[] }) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(FEATURE_GROUPS.map((group) => [
      group.id,
      group.id === "interact-with-names" || group.id === "manage-names",
    ])),
  );

  if (variants.length === 0) return null;

  const columns = matrixColumns(variants);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--faq-border)" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th
                style={{
                  ...cellStyle,
                  ...stickyFirstHeaderStyle,
                  borderTop: "none",
                  color: "var(--fg-heading)",
                  paddingLeft: "2.2rem",
                }}
              >
                Feature
              </th>
              {columns.map(({ key, platformLabel, variant }) => (
                <th
                  key={key}
                  style={{ ...cellStyle, borderTop: "none", color: "var(--fg-heading)", minWidth: 130 }}
                >
                  <span className="block">{variant.displayName}</span>
                  <span className="block text-xs font-normal" style={{ color: "var(--fg-muted)" }}>
                    {platformLabel}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURE_GROUPS.map((group) => {
              const expanded = expandedGroups[group.id] ?? true;

              return (
                <Fragment key={group.id}>
                  <tr>
                    <th
                      scope="row"
                      style={{
                        ...cellStyle,
                        ...stickyFirstRowStyle,
                        color: "var(--fg-heading)",
                        fontWeight: 700,
                      }}
                    >
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedGroups((current) => ({
                            ...current,
                            [group.id]: !expanded,
                          }))
                        }
                        className="flex w-full items-center justify-between gap-3 text-left"
                        style={{
                          background: "none",
                          border: "none",
                          color: "inherit",
                          cursor: "pointer",
                          font: "inherit",
                          padding: 0,
                        }}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            style={{
                              color: "var(--fg-muted)",
                              fontSize: "1.15rem",
                              fontWeight: 800,
                              lineHeight: 1,
                              minWidth: "0.9rem",
                              textAlign: "center",
                            }}
                          >
                            {expanded ? "-" : "+"}
                          </span>
                          <span>{group.label}</span>
                        </span>
                        <span />
                      </button>
                    </th>
                    {columns.map(({ key, variant }) => (
                      <td
                        key={`${key}-${group.id}`}
                        style={{ ...cellStyle, ...groupSummaryCellStyle }}
                      >
                        {supportedCount(variant, group)} / {group.rows.length}
                      </td>
                    ))}
                  </tr>
                  {expanded &&
                    group.rows.map((row) => (
                      <tr key={`${group.id}-${row.key}`}>
                        <th
                          scope="row"
                          style={{
                            ...cellStyle,
                            ...stickyFirstRowStyle,
                            color: "var(--fg-heading)",
                            fontWeight: 400,
                            paddingLeft: "2.2rem",
                          }}
                        >
                          {row.label}
                        </th>
                        {columns.map(({ key, variant }) => (
                          <td key={`${key}-${group.id}-${row.key}`} style={cellStyle}>
                            <SupportMark value={rowSupported(variant, row)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
