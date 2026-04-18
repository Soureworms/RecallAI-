import { PrismaClient, Role, CardFormat, CardStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SAMPLE_CARDS: Array<{ question: string; answer: string; tags: string[] }> = [
  {
    question: "What is the maximum number of users supported on the Starter plan?",
    answer: "The Starter plan supports up to 5 users. To add more seats you must upgrade to the Growth or Enterprise plan.",
    tags: ["billing", "plans"],
  },
  {
    question: "How do customers reset their password if they no longer have access to their email?",
    answer: "Submit a support ticket with a government-issued ID. The Trust & Safety team verifies identity within 2 business days and resets the account.",
    tags: ["account", "security"],
  },
  {
    question: "What is the SLA response time for Priority 1 incidents on the Enterprise plan?",
    answer: "Enterprise P1 incidents receive an initial response within 1 hour, 24/7, with a target resolution time of 4 hours.",
    tags: ["sla", "enterprise"],
  },
  {
    question: "Which data centres does CloudFlow use to store customer data?",
    answer: "CloudFlow stores data in AWS us-east-1 (primary) and eu-west-1 (EU customers). Data residency can be selected during onboarding.",
    tags: ["infrastructure", "compliance"],
  },
  {
    question: "Can customers export all their data before cancelling their subscription?",
    answer: "Yes. Customers can trigger a full data export from Settings → Account → Export Data. The export is available as a ZIP file within 24 hours.",
    tags: ["offboarding", "data"],
  },
  {
    question: "What integrations are available on the Growth plan?",
    answer: "Growth includes Slack, Zapier, Salesforce, and HubSpot. REST API access and custom webhooks are also enabled on this plan.",
    tags: ["integrations", "plans"],
  },
  {
    question: "How long is customer data retained after account cancellation?",
    answer: "Data is retained for 30 days post-cancellation, then permanently deleted. Enterprise customers can negotiate extended retention in their contract.",
    tags: ["data", "compliance"],
  },
  {
    question: "What does the 'Workspace Suspended' banner mean and how is it resolved?",
    answer: "It means the subscription payment failed. The account owner must update their payment method in Billing settings within 7 days to avoid data loss.",
    tags: ["billing", "account"],
  },
  {
    question: "Does CloudFlow offer a free trial, and does it require a credit card?",
    answer: "Yes, a 14-day free trial is available on the Growth plan. No credit card is required to start the trial.",
    tags: ["sales", "plans"],
  },
  {
    question: "How can an admin transfer workspace ownership to another user?",
    answer: "Go to Settings → Team → Members, click the target user's menu, and select 'Transfer Ownership'. The current owner becomes an Admin.",
    tags: ["admin", "account"],
  },
];

async function main() {
  // ── Org & team ────────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { id: "seed-org-001" },
    update: {},
    create: { id: "seed-org-001", name: "Acme Support" },
  });

  const team = await prisma.team.upsert({
    where: { id: "seed-team-001" },
    update: {},
    create: { id: "seed-team-001", name: "Customer Experience", orgId: org.id },
  });

  // ── Users ─────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 12);

  const seedUsers: Array<{ id: string; email: string; name: string; role: Role }> = [
    { id: "seed-user-admin",   email: "admin@test.com",   name: "Admin User",   role: Role.ADMIN },
    { id: "seed-user-manager", email: "manager@test.com", name: "Manager User", role: Role.MANAGER },
    { id: "seed-user-agent",   email: "agent@test.com",   name: "Agent User",   role: Role.AGENT },
  ];

  for (const u of seedUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        hashedPassword: passwordHash,
        role: u.role,
        orgId: org.id,
      },
    });

    await prisma.teamMember.upsert({
      where: { userId_teamId: { userId: user.id, teamId: team.id } },
      update: {},
      create: { userId: user.id, teamId: team.id },
    });
  }

  // ── Deck ──────────────────────────────────────────────────────────────────
  const deck = await prisma.deck.upsert({
    where: { id: "seed-deck-001" },
    update: {},
    create: {
      id: "seed-deck-001",
      name: "Product Knowledge",
      description: "Core CloudFlow product knowledge for CX agents.",
      orgId: org.id,
      createdById: "seed-user-admin",
      isMandatory: true,
    },
  });

  // ── Cards ─────────────────────────────────────────────────────────────────
  for (let i = 0; i < SAMPLE_CARDS.length; i++) {
    const c = SAMPLE_CARDS[i];
    await prisma.card.upsert({
      where: { id: `seed-card-${String(i + 1).padStart(3, "0")}` },
      update: {},
      create: {
        id: `seed-card-${String(i + 1).padStart(3, "0")}`,
        deckId: deck.id,
        question: c.question,
        answer: c.answer,
        format: CardFormat.QA,
        tags: c.tags,
        status: CardStatus.ACTIVE,
      },
    });
  }

  console.log(
    `Seed complete: 1 org, 1 team, 3 users, 1 deck, ${SAMPLE_CARDS.length} cards`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
