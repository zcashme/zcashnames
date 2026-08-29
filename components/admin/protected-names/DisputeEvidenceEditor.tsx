"use client";

import {
  addDisputeEvidenceAction,
  patchDisputeEvidenceAction,
  removeDisputeEvidenceAction,
} from "@/app/admin/protected-names/actions";
import EvidenceEditor from "@/components/admin/protected-names/EvidenceEditor";
import type { EvidenceItem } from "@/lib/protected-names/types";

export default function DisputeEvidenceEditor({
  disputeId,
  protectedName,
  evidence,
  expectedUpdatedAt,
}: {
  disputeId: string;
  protectedName: string;
  evidence: EvidenceItem[];
  expectedUpdatedAt: string | null;
}) {
  return (
    <EvidenceEditor
      mode="dispute"
      disputeId={disputeId}
      evidence={evidence}
      expectedUpdatedAt={expectedUpdatedAt}
      onAdd={(input, expected) =>
        addDisputeEvidenceAction(disputeId, protectedName, input, expected)
      }
      onPatch={(evidenceId, input, expected) =>
        patchDisputeEvidenceAction(
          disputeId,
          protectedName,
          evidenceId,
          input,
          expected,
        )
      }
      onRemove={(evidenceId, expected) =>
        removeDisputeEvidenceAction(
          disputeId,
          protectedName,
          evidenceId,
          expected,
        )
      }
    />
  );
}
