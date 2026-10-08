/**
 * Lance le serveur de production tel qu'il tourne dans l'image Docker :
 * `.next/standalone` complété de `public` et `.next/static`, que le mode
 * standalone ne copie pas. Sert aux tests de bout en bout et à Lighthouse.
 *
 * Prérequis : `pnpm build`. Port et hôte : variables PORT et HOSTNAME.
 */
import { spawn } from "node:child_process";
import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
// Monorepo : le serveur est rangé sous le chemin de l'app dans le standalone.
const standalone = join(app, ".next/standalone/apps/web");

if (!existsSync(join(standalone, "server.js"))) {
  console.error("Build introuvable : lancer `pnpm build` d'abord.");
  process.exit(1);
}

cpSync(join(app, "public"), join(standalone, "public"), { recursive: true });
cpSync(join(app, ".next/static"), join(standalone, ".next/static"), { recursive: true });

const serveur = spawn(process.execPath, [join(standalone, "server.js")], {
  stdio: "inherit",
  env: process.env,
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => serveur.kill(signal));
serveur.on("exit", (code) => process.exit(code ?? 0));
