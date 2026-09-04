export const ACCESS_APPROVAL_REASON = `Thanks for requesting access to this protected name.

Your request has been approved because the information you provided was sufficient to verify your connection to the name and your eligibility to claim it.

At launch, we'll send an access code to the contact information provided with your request. You can use that code to claim the name at the stated price.`;

export const ORGANIZATION_ACCESS_DENIAL_REASON = `Thanks for requesting access to this protected name.

This name is protected because its misuse could create a meaningful risk of impersonation, fraud, phishing, or other harm to users.

Your request did not include enough context or a verifiable method of contact for us to determine that you represent the person, company, or organization associated with the name, or otherwise have a valid claim to it.

If you believe you should be the rightful owner, please submit a new request with supporting context, evidence of your connection to the name, and a verifiable method of contact.`;

export const ENS_ACCESS_DENIAL_REASON = `Thanks for requesting access to this name.

It is protected because the same name is claimed on ENS and displayed by an X account that ranks among the top 1,000 such accounts by follower count. You did not indicate the same X account as a method of contact.

You can dispute the protection. Grounds for removing protection may include that the X account has not posted in over a year, or that the name is common and does not uniquely identify a high-profile person or trademarked company.

If the protection is removed, early access codes are sent in the order in which names entered the waitlist. Referrals can improve your position once someone joins through your link and completes their reservation. You can track waitlist position and referrals at zcashnames.com/waitlist/view.

When your code becomes available, you can claim the name at the stated price if it has not already been claimed. Someone later in the queue can still claim their name first once they receive their code and complete the purchase sooner. If the name remains unclaimed through early access, it will become available during open registration.

So, if you believe this name should not be protected, please submit a dispute and include the relevant reasoning and evidence.

Otherwise, the name will also become available when the protection expires.

Thanks, again!`;

export const ZM_ACCESS_DENIAL_REASON = `We're denying this access request because you may already qualify for priority access through your verified Zcash.me profile! Since this profile was verified before the May 2026 eligibility deadline, they will have the first opportunity to claim this name!

No action is required right now, other than making sure the Zcash address on your Zcash.me profile is up to date. Before early access begins, we'll send a priority access code by shielded memo to that address. Use it to claim the name during the priority access period.

If the name isn't claimed during priority access, people on its waitlist, if any, may use their early access codes to claim it. If it remains unclaimed after early access, it will become available to the public during open registration.

Zcash.me online profiles will be integrated with onchain ZcashNames. Once the integration is complete, the owner of the ZcashName will also own the profile at zcash.me/{zcashname}.`;

export type AccessReasonContext = {
  category: string | null;
  ensPriorityClaim: boolean;
  zmPriorityClaim: boolean;
};

export function getAccessReasonTemplate(
  decision: "approved" | "denied",
  context: AccessReasonContext,
  name: string,
): { label: string; text: string } | null {
  if (decision === "approved") {
    return { label: "Use approval template", text: ACCESS_APPROVAL_REASON };
  }
  if (context.zmPriorityClaim) {
    return {
      label: "Use Zcash.me priority template",
      text: ZM_ACCESS_DENIAL_REASON.replace("{zcashname}", name),
    };
  }
  if (context.ensPriorityClaim) {
    return { label: "Use ENS priority template", text: ENS_ACCESS_DENIAL_REASON };
  }
  if (context.category === "organization") {
    return { label: "Use organization template", text: ORGANIZATION_ACCESS_DENIAL_REASON };
  }
  return null;
}
