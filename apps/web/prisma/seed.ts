import { PrismaClient, Role, CardFormat, CardStatus, StudyMode } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── SOP Deck Definitions ─────────────────────────────────────────────────────

const DECKS: Array<{
  id: string;
  name: string;
  description: string;
  isMandatory: boolean;
  cards: Array<{ question: string; answer: string; tags: string[] }>;
}> = [
  {
    id: "seed-deck-escalation",
    name: "Escalation Procedures",
    description: "When and how to escalate tickets to the next support tier.",
    isMandatory: true,
    cards: [
      {
        question: "What criteria must be met before escalating a ticket to Tier 2?",
        answer: "All three conditions must be met: (1) the issue has been open for more than 2 business hours, (2) at least one troubleshooting path has been exhausted and documented, and (3) the customer is Enterprise or a paying Growth plan subscriber.",
        tags: ["escalation", "tier-2"],
      },
      {
        question: "How do you escalate a Priority 1 incident outside of business hours?",
        answer: "Use the on-call paging system (PagerDuty). Go to Escalation → Emergency, select 'P1 – Production Down', and page the on-call engineer. Do NOT use Slack alone for P1 escalations.",
        tags: ["escalation", "p1", "on-call"],
      },
      {
        question: "What information must be included in an escalation note before handing off to Tier 2?",
        answer: "Customer name, plan tier, error message or symptom, steps already taken, timestamp of first contact, and any relevant logs or screenshots attached to the ticket.",
        tags: ["escalation", "documentation"],
      },
      {
        question: "A customer reports data loss. What is the first action?",
        answer: "Immediately escalate to a Tier 2 engineer AND the Trust & Safety team simultaneously. Do not attempt further troubleshooting — data loss incidents are P1 by default and require engineering involvement within 15 minutes.",
        tags: ["escalation", "data-loss", "p1"],
      },
      {
        question: "What is the correct escalation path for a billing dispute that the agent cannot resolve?",
        answer: "Transfer to the Billing Specialist queue in Zendesk (tag: billing-specialist). Do not escalate to Tier 2 engineering. Billing disputes are handled entirely within the CS team.",
        tags: ["escalation", "billing"],
      },
      {
        question: "After escalating a ticket, what is the agent's responsibility?",
        answer: "Send the customer a confirmation message with an estimated response time, keep the ticket 'In Progress' (not 'Solved'), and check back within the SLA window to ensure Tier 2 has acknowledged it.",
        tags: ["escalation", "follow-up"],
      },
      {
        question: "When should a ticket be escalated to the Legal team?",
        answer: "Escalate to Legal if the customer mentions legal action, GDPR subject access requests, data breach notification requirements, or requests a subpoena response. Tag the ticket 'legal-review' and do not respond further until Legal advises.",
        tags: ["escalation", "legal", "compliance"],
      },
      {
        question: "What SLA applies to Tier 2 acknowledging an escalated ticket?",
        answer: "P1: 15 minutes. P2: 1 business hour. P3: 4 business hours. These SLAs start from the escalation timestamp, not the original ticket creation time.",
        tags: ["escalation", "sla"],
      },
    ],
  },
  {
    id: "seed-deck-refunds",
    name: "Refund & Billing Policies",
    description: "Standard operating procedures for refunds, credits, and billing disputes.",
    isMandatory: true,
    cards: [
      {
        question: "What is the standard refund window for monthly subscribers?",
        answer: "7 days from the most recent billing date. Refunds outside this window require manager approval. Annual plans have a 30-day refund window from the renewal date.",
        tags: ["refunds", "billing"],
      },
      {
        question: "A customer was charged twice in the same billing cycle. What steps do you take?",
        answer: "(1) Verify the double charge in Stripe — confirm two distinct charge IDs. (2) Issue a full refund for the duplicate charge immediately. (3) Document in the ticket. (4) File an internal bug report if the duplication is system-caused.",
        tags: ["billing", "duplicate-charge"],
      },
      {
        question: "Can agents issue credits instead of refunds? When is this appropriate?",
        answer: "Yes. Offer a credit equal to 1.5× the disputed amount when the customer prefers to stay on the platform and the issue was caused by a platform error. Credits expire after 12 months and are applied to the next invoice automatically.",
        tags: ["billing", "credits"],
      },
      {
        question: "What is the maximum refund amount an agent can approve without manager sign-off?",
        answer: "$150 USD or equivalent. Any single refund exceeding $150 requires a manager to approve in the Billing portal before processing.",
        tags: ["refunds", "approval"],
      },
      {
        question: "A customer cancels mid-month on a monthly plan. Are they owed a prorated refund?",
        answer: "No. Monthly plans are billed in advance and are non-prorated. The customer retains access until the end of the paid period. Annual plans may receive a prorated refund minus a 10% administrative fee, subject to manager approval.",
        tags: ["refunds", "cancellation"],
      },
      {
        question: "How do you handle a chargeback claim from a customer's bank?",
        answer: "Do NOT issue a refund through Stripe while a chargeback is active — this can result in a double payout. Escalate immediately to the Billing Specialist queue. Tag the ticket 'chargeback'. The Billing team handles all communication with the payment processor.",
        tags: ["billing", "chargeback"],
      },
      {
        question: "How long does a refund take to appear on a customer's statement?",
        answer: "Credit card refunds: 5–10 business days depending on the issuing bank. Debit card refunds: 3–5 business days. Inform the customer of this timeline at the time of issuing the refund.",
        tags: ["refunds", "timeline"],
      },
    ],
  },
  {
    id: "seed-deck-onboarding",
    name: "Customer Onboarding SOP",
    description: "Steps for guiding new customers through workspace setup and first value.",
    isMandatory: false,
    cards: [
      {
        question: "What is the target time-to-value goal for new Growth plan customers?",
        answer: "Customers should complete workspace setup and send their first campaign within 3 days of sign-up. The onboarding CSM sends a check-in email at day 1 and day 3 if the milestone is not met.",
        tags: ["onboarding", "growth"],
      },
      {
        question: "What are the three mandatory steps in the customer onboarding checklist?",
        answer: "(1) Verify and complete the workspace profile. (2) Invite at least one additional team member. (3) Connect one integration (Slack, HubSpot, or Salesforce). These unlock the full trial experience.",
        tags: ["onboarding", "checklist"],
      },
      {
        question: "A new customer says they cannot find the 'Invite Team' button. Where is it?",
        answer: "Settings → Team → Members → Invite Member (top-right blue button). Note: only users with the Admin or Owner role can see this button. Confirm the customer's role before troubleshooting further.",
        tags: ["onboarding", "team"],
      },
      {
        question: "When should a new Enterprise customer be assigned a dedicated Customer Success Manager?",
        answer: "Immediately upon contract signing. The Sales team triggers the CSM assignment in Salesforce. If a CSM has not been assigned within 24 hours of contract close, escalate to the CS team lead.",
        tags: ["onboarding", "enterprise", "csm"],
      },
      {
        question: "What is the maximum number of users included in the standard Enterprise onboarding package?",
        answer: "Up to 50 users receive a live onboarding session. For accounts with more than 50 users, a train-the-trainer model is used: the customer nominates 5 power users who receive in-depth training.",
        tags: ["onboarding", "enterprise"],
      },
      {
        question: "How should an agent handle a customer who has not completed onboarding after 7 days?",
        answer: "Send the 'Onboarding Stalled' template email. If no response within 48 hours, assign the account to the CSM queue for a proactive check-in call. Log the outreach attempt in the CRM.",
        tags: ["onboarding", "churn-risk"],
      },
      {
        question: "What is the primary goal of the day-14 onboarding review call?",
        answer: "Confirm the customer has achieved their stated success metric, identify any blockers, and introduce the roadmap for the next quarter. Document the call summary in the account notes within 2 hours of the call.",
        tags: ["onboarding", "review"],
      },
    ],
  },
  {
    id: "seed-deck-security",
    name: "Data Security & Compliance",
    description: "Security protocols, data handling rules, and compliance obligations.",
    isMandatory: true,
    cards: [
      {
        question: "A customer submits a GDPR data deletion request. What is the SLA and process?",
        answer: "SLA: 30 calendar days. Process: (1) Verify the requester's identity. (2) Log the request in the Privacy tracker. (3) Forward to the Data Protection Officer (DPO) within 2 business hours. Do not attempt deletion manually.",
        tags: ["gdpr", "compliance", "data"],
      },
      {
        question: "What data can agents view in the admin console when troubleshooting a customer issue?",
        answer: "Agents may view account metadata, subscription status, usage metrics, and error logs. Agents must NOT view or share customer content (messages, files, or documents) unless the customer explicitly grants access in writing.",
        tags: ["security", "data-access"],
      },
      {
        question: "A customer reports they suspect their account has been compromised. What is the first step?",
        answer: "Immediately disable all active sessions by navigating to the customer's account in Admin → Security → Revoke All Sessions. Then change the temporary password, notify the customer, and open a security incident ticket.",
        tags: ["security", "compromise"],
      },
      {
        question: "Is CloudFlow compliant with SOC 2 Type II? Where can customers access the report?",
        answer: "Yes. The SOC 2 Type II report is available in the Trust Center (trust.cloudflow.io). Customers must sign an NDA before downloading. Direct them to the Trust Center link and the NDA request form.",
        tags: ["compliance", "soc2"],
      },
      {
        question: "How long must support tickets containing customer PII be retained?",
        answer: "7 years for Enterprise customers (contractual obligation). 3 years for all other plans (legal minimum). After the retention period, tickets are automatically purged by the data lifecycle system.",
        tags: ["compliance", "retention", "pii"],
      },
      {
        question: "An agent accidentally sends customer data to the wrong email address. What should they do?",
        answer: "Report it to the DPO and their manager immediately — this is a potential data breach. Complete the Incident Report form within 1 hour. Do not attempt to contact the recipient yourself. The DPO assesses whether GDPR notification obligations apply (72-hour window).",
        tags: ["security", "breach", "gdpr"],
      },
      {
        question: "What is the minimum password requirement for admin accounts on the CloudFlow platform?",
        answer: "12 characters minimum, including at least one uppercase letter, one number, and one special character. MFA is mandatory for all admin and owner accounts. Agents must also enable MFA within 7 days of account creation.",
        tags: ["security", "passwords", "mfa"],
      },
      {
        question: "Can customer data be transferred outside the EU for EU-based accounts?",
        answer: "No, without an approved Standard Contractual Clause (SCC) in place. EU customer data is stored exclusively in eu-west-1. Any cross-border transfer must be approved by the DPO and documented in the data transfer register.",
        tags: ["gdpr", "data-residency", "compliance"],
      },
    ],
  },
];

async function main() {
  // ── System org + super admin ───────────────────────────────────────────────
  const systemOrg = await prisma.organization.upsert({
    where: { id: "system-org-001" },
    update: {},
    create: { id: "system-org-001", name: "System" },
  });

  const superAdminHash = await bcrypt.hash("admin", 12);
  await prisma.user.upsert({
    where: { email: "admin@recallai.app" },
    update: {},
    create: {
      id: "super-admin-001",
      email: "admin@recallai.app",
      name: "Super Admin",
      hashedPassword: superAdminHash,
      role: Role.SUPER_ADMIN,
      orgId: systemOrg.id,
      onboardedAt: new Date(),
    },
  });

  console.log("✓ Super admin: admin@recallai.app / admin");

  // ── Demo org — AUTO_ROTATE so all cards spin for all users ───────────────
  const org = await prisma.organization.upsert({
    where: { id: "seed-org-001" },
    update: { studyMode: StudyMode.AUTO_ROTATE },
    create: {
      id: "seed-org-001",
      name: "Acme Support",
      studyMode: StudyMode.AUTO_ROTATE,
    },
  });

  const team = await prisma.team.upsert({
    where: { id: "seed-team-001" },
    update: {},
    create: { id: "seed-team-001", name: "Customer Experience", orgId: org.id },
  });

  // ── Test users (all onboarded so they land on dashboard immediately) ──────
  const passwordHash = await bcrypt.hash("password123", 12);

  const seedUsers = [
    { id: "seed-user-admin",   email: "admin@test.com",   name: "Alice Admin",   role: Role.ADMIN },
    { id: "seed-user-manager", email: "manager@test.com", name: "Marcus Manager", role: Role.MANAGER },
    { id: "seed-user-agent",   email: "agent@test.com",   name: "Amy Agent",     role: Role.AGENT },
    { id: "seed-user-generic", email: "user@test.com",    name: "Test User",     role: Role.AGENT },
    { id: "e2e-customer-admin", email: "customer-admin@test.com", name: "E2E Customer Admin", role: Role.ADMIN },
    { id: "e2e-manager", email: "customer-manager@test.com", name: "E2E Manager", role: Role.MANAGER },
    { id: "e2e-agent", email: "customer-agent@test.com", name: "E2E Agent", role: Role.AGENT },
  ];

  for (const u of seedUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { onboardedAt: new Date() },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        hashedPassword: passwordHash,
        role: u.role,
        orgId: org.id,
        onboardedAt: new Date(),
      },
    });
    await prisma.teamMember.upsert({
      where: { userId_teamId: { userId: u.id, teamId: team.id } },
      update: {},
      create: { userId: u.id, teamId: team.id },
    });
  }

  console.log("✓ Test users: admin / manager / agent / user @test.com (password: password123)");

  // ── SOP Decks & Cards (all ACTIVE, inRotation: true) ────────────────────
  let totalCards = 0;

  for (const deckDef of DECKS) {
    await prisma.deck.upsert({
      where: { id: deckDef.id },
      update: {
        name: deckDef.name,
        description: deckDef.description,
        isMandatory: deckDef.isMandatory,
        inRotation: true,
        isArchived: false,
      },
      create: {
        id: deckDef.id,
        name: deckDef.name,
        description: deckDef.description,
        orgId: org.id,
        createdById: "seed-user-admin",
        isMandatory: deckDef.isMandatory,
        inRotation: true,
        isArchived: false,
      },
    });

    for (const u of seedUsers) {
      await prisma.deckAssignment.upsert({
        where: { userId_deckId: { userId: u.id, deckId: deckDef.id } },
        update: { assignedById: "seed-user-admin", teamId: team.id },
        create: {
          userId: u.id,
          deckId: deckDef.id,
          assignedById: "seed-user-admin",
          teamId: team.id,
        },
      });
    }

    for (let i = 0; i < deckDef.cards.length; i++) {
      const c = deckDef.cards[i];
      const cardId = `${deckDef.id}-card-${String(i + 1).padStart(3, "0")}`;
      await prisma.card.upsert({
        where: { id: cardId },
        update: { status: CardStatus.ACTIVE },
        create: {
          id: cardId,
          deckId: deckDef.id,
          question: c.question,
          answer: c.answer,
          format: CardFormat.QA,
          tags: c.tags,
          status: CardStatus.ACTIVE,
        },
      });
      totalCards++;
    }

    console.log(`  ✓ Deck: "${deckDef.name}" (${deckDef.cards.length} cards, mandatory: ${deckDef.isMandatory})`);
  }

  console.log(`\n✓ Seed complete: AUTO_ROTATE org, ${seedUsers.length} users, ${DECKS.length} SOP decks, ${totalCards} active cards`);
  console.log(`  All cards will appear in study rotation immediately on first login.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
