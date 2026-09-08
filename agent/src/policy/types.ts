/**
 * Machine-readable creator licensing policy (spec §4, §18).
 * The agent evaluates requests against this — it must NOT invent
 * arbitrary decisions outside these rules (spec §4).
 */
export interface LicensingPolicy {
  commercialUse: { allowed: boolean; price: string };
  nonCommercialUse: { allowed: boolean; price: string };
  modification: { allowed: boolean };
  attribution: { required: boolean };
  politicalUse: { allowed: boolean };
}

export interface LicenseRequest {
  contentId: string;
  requester: string; // 0x address
  usage: "commercial" | "nonCommercial";
  intendsModification: boolean;
  intendsPoliticalUse: boolean;
}

export type LicenseDecision =
  | {
      decision: "APPROVE";
      price: string;
      currency: "ETH";
      terms: {
        commercial: boolean;
        modification: boolean;
        attribution: boolean;
      };
    }
  | {
      decision: "REJECT";
      reason: string;
    };

/**
 * Pure, deterministic policy evaluation — spec §19: "The agent should not
 * invent arbitrary legal decisions. It should evaluate requests against
 * machine-readable rules."
 */
export function evaluateLicenseRequest(
  policy: LicensingPolicy,
  request: LicenseRequest
): LicenseDecision {
  if (request.intendsPoliticalUse && !policy.politicalUse.allowed) {
    return { decision: "REJECT", reason: "political use not permitted by policy" };
  }

  if (request.intendsModification && !policy.modification.allowed) {
    return { decision: "REJECT", reason: "modification not permitted by policy" };
  }

  const usageRule =
    request.usage === "commercial" ? policy.commercialUse : policy.nonCommercialUse;

  if (!usageRule.allowed) {
    return { decision: "REJECT", reason: `${request.usage} use not permitted by policy` };
  }

  return {
    decision: "APPROVE",
    price: usageRule.price,
    currency: "ETH",
    terms: {
      commercial: request.usage === "commercial",
      modification: request.intendsModification,
      attribution: policy.attribution.required,
    },
  };
}
