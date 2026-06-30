import { BRAND } from "@/lib/zns/brand";

export default function Head() {
  return (
    <>
      <link rel="me" href="https://zcash.me/zcashnames" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: BRAND.name,
            url: BRAND.url,
            logo: BRAND.logo,
            description: BRAND.description,
            foundingDate: "2026",
            parentOrganization: { "@type": "Organization", name: "ZcashMe" },
            contactPoint: {
              "@type": "ContactPoint",
              email: "support@zcash.me",
              contactType: "customer support",
            },
            sameAs: BRAND.socials.map((s) => s.href),
          }),
        }}
      />
    </>
  );
}
