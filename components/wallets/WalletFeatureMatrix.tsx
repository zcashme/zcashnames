import {
  subcategoryLabel,
  type WalletFeatures,
  type WalletVariant,
} from "@/lib/wallets/catalog";

const FEATURE_ROWS: { key: keyof Omit<WalletFeatures, "nameActions">; label: string }[] = [
  { key: "resolveName", label: "Resolve name" },
  { key: "reverseLookup", label: "Reverse lookup" },
  { key: "viewCollection", label: "View collection" },
  { key: "importContact", label: "Import contact" },
  { key: "exportContact", label: "Export contact" },
  { key: "viewProfile", label: "View profile" },
  { key: "viewExplorer", label: "View explorer" },
  { key: "scanURI", label: "Scan URI" },
  { key: "tapURI", label: "Tap URI" },
  { key: "pasteURI", label: "Paste URI" },
  { key: "uploadQR", label: "Upload QR" },
  { key: "rotateTaddr", label: "Rotate t-address" },
  { key: "rotateUaddr", label: "Rotate u-address" },
  { key: "receiveTaddr", label: "Receive t-address" },
  { key: "receiveUaddr", label: "Receive u-address" },
];

const NAME_ACTION_ROWS: { key: keyof WalletFeatures["nameActions"]; label: string }[] = [
  { key: "claim", label: "Claim name" },
  { key: "list", label: "List name" },
  { key: "delist", label: "Delist name" },
  { key: "release", label: "Release name" },
  { key: "buy", label: "Buy name" },
];

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  color: "var(--fg-body)",
  fontSize: "0.86rem",
};

const cellStyle: React.CSSProperties = {
  borderTop: "1px solid var(--faq-border)",
  padding: "0.65rem 0.55rem",
  textAlign: "left",
  verticalAlign: "middle",
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

export default function WalletFeatureMatrix({ variants }: { variants: readonly WalletVariant[] }) {
  if (variants.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--faq-border)" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...cellStyle, borderTop: "none", color: "var(--fg-heading)" }}>Feature</th>
            {variants.map((variant) => (
              <th
                key={variant.variantId}
                style={{ ...cellStyle, borderTop: "none", color: "var(--fg-heading)", minWidth: 130 }}
              >
                <span className="block">{variant.displayName}</span>
                <span className="block text-xs font-normal" style={{ color: "var(--fg-muted)" }}>
                  {subcategoryLabel(variant.subcategory)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_ROWS.map((feature) => (
            <tr key={feature.key}>
              <th scope="row" style={{ ...cellStyle, color: "var(--fg-heading)", fontWeight: 600 }}>
                {feature.label}
              </th>
              {variants.map((variant) => (
                <td key={`${variant.variantId}-${feature.key}`} style={cellStyle}>
                  <SupportMark value={variant.features[feature.key]} />
                </td>
              ))}
            </tr>
          ))}
          {NAME_ACTION_ROWS.map((action) => (
            <tr key={action.key}>
              <th scope="row" style={{ ...cellStyle, color: "var(--fg-heading)", fontWeight: 600 }}>
                {action.label}
              </th>
              {variants.map((variant) => (
                <td key={`${variant.variantId}-${action.key}`} style={cellStyle}>
                  <SupportMark value={variant.features.nameActions[action.key]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

