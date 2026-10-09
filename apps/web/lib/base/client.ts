/**
 * Client Prisma partagé. Sans DATABASE_URL (développement sans base), les
 * appelants le vérifient avec `baseConfiguree()` et se replient : accueil
 * normal, signal ignoré, bandeau dans l'administration.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globale = globalThis as unknown as { prismaJouan?: PrismaClient };

export function baseConfiguree(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function base(): PrismaClient {
  globale.prismaJouan ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  return globale.prismaJouan;
}
