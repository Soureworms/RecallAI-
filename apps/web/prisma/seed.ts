import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "seed-org-001" },
    update: {},
    create: {
      id: "seed-org-001",
      name: "Acme Support",
    },
  });

  const team = await prisma.team.upsert({
    where: { id: "seed-team-001" },
    update: {},
    create: {
      id: "seed-team-001",
      name: "Customer Experience",
      orgId: org.id,
    },
  });

  const passwordHash = await bcrypt.hash("password123", 12);

  const seedUsers: Array<{ id: string; email: string; name: string; role: Role }> = [
    { id: "seed-user-admin", email: "admin@test.com", name: "Admin User", role: Role.ADMIN },
    { id: "seed-user-manager", email: "manager@test.com", name: "Manager User", role: Role.MANAGER },
    { id: "seed-user-agent", email: "agent@test.com", name: "Agent User", role: Role.AGENT },
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

  console.log("Seed complete: 1 org, 1 team, 3 users");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
