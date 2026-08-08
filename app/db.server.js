import { PrismaClient } from "@prisma/client";

// Geliştirmede hot-reload sırasında bağlantı havuzunun şişmesini engeller.
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prismaGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaGlobal = prisma;
}

export default prisma;
