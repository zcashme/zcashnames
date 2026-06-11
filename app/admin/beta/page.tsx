import { redirect } from "next/navigation";

export default function BetaAdminIndex() {
  redirect("/admin/beta/drafts");
}
