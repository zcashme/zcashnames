import { redirect } from "next/navigation";

export default function ProtocolIndexRedirect() {
  redirect("/docs/protocol/overview");
}
