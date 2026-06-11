"use client";

import DraftEditor, { type DraftEditorProps } from "@/components/admin/beta/DraftEditor";

type Props = Omit<DraftEditorProps, "variant">;

export default function BetaV2DraftEditor(props: Props) {
  return <DraftEditor {...props} variant="v2" />;
}
