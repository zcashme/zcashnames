"use client";

import {
  addNameEvidenceAction,
  patchNameEvidenceAction,
  removeNameEvidenceAction,
} from "@/app/admin/protected-names/actions";
import EvidenceEditor from "@/components/admin/protected-names/EvidenceEditor";
import type { EvidenceItem } from "@/lib/protected-names/types";

export default function NameEvidenceEditor({
  name,
  evidence,
  expectedUpdatedAt,
}: {
  name: string;
  evidence: EvidenceItem[];
  expectedUpdatedAt: string | null;
}) {
  return (
    <EvidenceEditor
      mode="name"
      name={name}
      evidence={evidence}
      expectedUpdatedAt={expectedUpdatedAt}
      onAdd={(input, expected) => addNameEvidenceAction(name, input, expected)}
      onPatch={(evidenceId, input, expected) =>
        patchNameEvidenceAction(name, evidenceId, input, expected)
      }
      onRemove={(evidenceId, expected) =>
        removeNameEvidenceAction(name, evidenceId, expected)
      }
    />
  );
}
