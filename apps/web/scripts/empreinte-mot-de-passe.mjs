/**
 * Demande le mot de passe de l'administration sans l'afficher et imprime son
 * empreinte, à coller dans la variable ADMIN_EMPREINTE de Coolify. Le mot de
 * passe lui-même va dans Bitwarden, jamais dans le dépôt.
 *
 * Usage : pnpm --filter web empreinte-mot-de-passe
 */
import { randomBytes, scryptSync } from "node:crypto";
import { stdin, stdout } from "node:process";

function lireMasque(question) {
  return new Promise((resoudre) => {
    stdout.write(question);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let saisie = "";
    stdin.on("data", function surTouche(touche) {
      if (touche === "\r" || touche === "\n" || touche === "\u0004") {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off("data", surTouche);
        stdout.write("\n");
        resoudre(saisie);
      } else if (touche === "\u0003") {
        process.exit(130);
      } else if (touche === "\u007f") {
        saisie = saisie.slice(0, -1);
      } else {
        saisie += touche;
      }
    });
  });
}

const motDePasse = await lireMasque("Mot de passe : ");
const confirmation = await lireMasque("Confirmation : ");
if (motDePasse.length < 12) {
  console.error("Au moins 12 caractères.");
  process.exit(1);
}
if (motDePasse !== confirmation) {
  console.error("Les deux saisies diffèrent.");
  process.exit(1);
}
const sel = randomBytes(16);
const cle = scryptSync(motDePasse, sel, 32, { N: 16384, r: 8, p: 1 });
console.log(["scrypt", 16384, 8, 1, sel.toString("base64url"), cle.toString("base64url")].join("$"));
