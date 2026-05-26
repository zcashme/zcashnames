"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { redeemBetaInviteCode } from "@/lib/beta-v2/actions";

export default function JoinClient({ code }: { code: string }) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [displayName, setDisplayName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    redeemBetaInviteCode(code).then((result) => {
      if (result.ok) {
        setDisplayName(result.displayName);
        setState("success");
        setTimeout(() => router.replace("/"), 2200);
      } else {
        setErrorMsg(result.error);
        setState("error");
      }
    });
  }, [code, router]);

  if (state === "loading") {
    return (
      <div className="text-center py-16" style={{ color: "var(--fg-muted)" }}>
        <p className="text-base">Verifying your invite...</p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="text-center py-16 flex flex-col items-center gap-4">
        <p className="text-2xl font-bold" style={{ color: "var(--fg-heading)" }}>
          Welcome to the beta{displayName ? `, ${displayName}` : ""}.
        </p>
        <p className="text-base" style={{ color: "var(--fg-muted)" }}>
          Taking you to the app...
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-16 flex flex-col items-center gap-4">
      <p className="text-base font-semibold" style={{ color: "var(--fg-heading)" }}>
        {errorMsg || "This invite is not valid."}
      </p>
      <Link href="/beta" className="text-sm underline" style={{ color: "var(--fg-muted)" }}>
        Back to the beta page
      </Link>
    </div>
  );
}
