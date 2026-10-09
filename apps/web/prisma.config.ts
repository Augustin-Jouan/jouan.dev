import { defineConfig } from "prisma/config";

// L'URL n'est lue que par les commandes qui touchent la base (migrate) :
// `prisma generate` fonctionne sans base, en CI comme dans le build Docker.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
