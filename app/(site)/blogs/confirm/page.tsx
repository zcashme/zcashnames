import { redirect } from "next/navigation";

export default async function BlogConfirmRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim();
  redirect(token ? `/subscribe/confirm?token=${encodeURIComponent(token)}` : "/subscribe/confirm");
}
