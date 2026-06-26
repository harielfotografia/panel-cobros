import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const nombre = process.argv[4] ?? "Admin";

  if (!email || !password) {
    console.error("Uso: npx tsx scripts/crear-admin.ts email password nombre");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const admin = await prisma.admin.upsert({
    where: { email },
    update: { password: hash, nombre },
    create: { email, password: hash, nombre },
  });

  console.log("Admin creado:", admin.email);
}

main().finally(() => prisma.$disconnect());
