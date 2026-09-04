import { Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "@/components/emails/EmailLayout";
import { content, paragraph } from "@/lib/email/styles";

export type ProtectedNameDecisionEmailArgs = {
  name: string;
  workflow: string;
  decision: string;
  reason: string;
  nameStatus?: string | null;
  didTransition?: boolean;
  submittedReason?: string | null;
  detailsUrl?: string;
  isCorrection?: boolean;
  isDecisionCorrection?: boolean;
};

function workflowLabel(workflow: string): string {
  if (workflow === "access_request") return "access request";
  return workflow;
}

export function protectedNameDecisionSubject(args: ProtectedNameDecisionEmailArgs): string {
  const outcome = args.decision === "approved" ? "approved" : "denied";
  const prefix = args.isCorrection ? "Correction: " : "";
  return `${prefix}Protected name ${workflowLabel(args.workflow)} ${outcome}: ${args.name}.zec / ${args.name}.zcash`;
}

export default function ProtectedNameDecisionEmail(args: ProtectedNameDecisionEmailArgs & { detailsUrl: string }) {
  const approved = args.decision === "approved";
  const label = workflowLabel(args.workflow);
  const outcome = approved ? "approved" : "denied";
  const statusSentence = args.nameStatus === "protected" ? (args.didTransition === false ? `The name ${args.name} remains protected.` : `The name ${args.name} is now protected.`) : args.nameStatus === "rejected" ? (args.didTransition === false ? `The name ${args.name} remains not protected.` : `The name ${args.name} is no longer protected.`) : null;
  return <EmailLayout preview={`Your protected name ${label} for ${args.name}.zec / ${args.name}.zcash was ${outcome}.`} headingText={args.isCorrection ? "Decision correction" : `Request ${outcome}`}><Section style={content}>{args.isCorrection ? <Text style={paragraph}>{args.isDecisionCorrection ? "This message corrects the outcome and reason in our prior decision." : "This message corrects the reason in our prior decision. The decision outcome has not changed."}</Text> : <Text style={paragraph}>We reviewed your protected name {label} for <strong>{args.name}</strong>.</Text>}{args.workflow === "dispute" && args.submittedReason ? <><Text style={{ ...paragraph, marginBottom: 8, fontWeight: 700 }}>Your submitted dispute reason</Text><Section style={{ borderLeft: "3px solid #f4b728", backgroundColor: "#18181b", padding: "14px 16px", margin: "0 0 24px" }}><Text style={{ margin: 0, whiteSpace: "pre-wrap", color: "#d4d4d8", fontSize: 15, lineHeight: "24px" }}>{args.submittedReason}</Text></Section></> : null}<Text style={paragraph}>Your request has been <strong>{outcome}</strong>.{args.workflow !== "access_request" && statusSentence ? ` ${statusSentence}` : ""}</Text><Text style={{ ...paragraph, marginBottom: 8, fontWeight: 700 }}>{args.isCorrection ? "Corrected reason" : `Reason ${approved ? "Approved" : "Denied"}`}</Text><Section style={{ border: "1px solid #3f3f46", borderRadius: 8, backgroundColor: "#18181b", padding: "16px 18px", margin: "0 0 24px" }}><Text style={{ margin: 0, whiteSpace: "pre-wrap", color: "#e4e4e7", fontSize: 15, lineHeight: "24px" }}>{args.reason}</Text></Section>{approved && args.workflow === "access_request" ? <Text style={paragraph}>We have recorded your approved access request. We will use the contact details you provided for any follow-up.</Text> : null}{args.workflow === "access_request" ? <Text style={paragraph}>This decision is in regard to your access request and does not change the protection status of the name.</Text> : null}<Text style={paragraph}>View the details here: <Link href={args.detailsUrl} style={{ color: "#f4b728", textDecoration: "underline" }}>{args.detailsUrl}</Link></Text><Text style={paragraph}>If you have questions, reply to <Link href="mailto:support@zcashnames.com" style={{ color: "#f4b728", textDecoration: "underline" }}>support@zcashnames.com</Link>.</Text></Section></EmailLayout>;
}
