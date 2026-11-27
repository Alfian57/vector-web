import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../../generated/prisma/client";
import { DatabaseNotConfigured } from "./dependencies";

const shared = globalThis as typeof globalThis & { vektorPrisma?: PrismaClient };

export function db() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new DatabaseNotConfigured("DATABASE_URL is required");

  return (shared.vektorPrisma ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 12, connectionTimeoutMillis: 3000 }),
    transactionOptions: { maxWait: 3000, timeout: 15_000 },
  }));
}

export type DatabaseTransaction = Prisma.TransactionClient;

export function transaction<T>(run: (client: DatabaseTransaction) => Promise<T>) {
  return db().$transaction(run);
}
