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
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let saisie = "";
    // 0 : texte ; 1 : après ESC ; 2 : dans une séquence CSI/SS3 (flèches…)
    let echappement = 0;
    function terminer() {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", surDonnees);
      stdin.off("end", surFin);
      stdout.write("\n");
      resoudre(saisie);
    }
    function surFin() {
      console.error("\nFin de l'entrée avant la fin de la saisie.");
      process.exit(1);
    }
    // Un collage arrive en un seul bloc : on traite caractère par caractère.
    function surDonnees(bloc) {
      for (const c of bloc) {
        if (echappement === 1) {
          echappement = c === "[" || c === "O" ? 2 : 0;
        } else if (echappement === 2) {
          if (c >= "@" && c <= "~") echappement = 0;
        } else if (c === "\u001b") {
          echappement = 1;
        } else if (c === "\r" || c === "\n" || c === "\u0004") {
          // Tout ce qui suit dans le bloc est ignoré.
          return terminer();
        } else if (c === "\u0003") {
          process.exit(130);
        } else if (c === "\u007f" || c === "\b") {
          saisie = Array.from(saisie).slice(0, -1).join("");
        } else {
          saisie += c;
        }
      }
    }
    stdin.on("data", surDonnees);
    stdin.on("end", surFin);
  });
}

if (!stdin.isTTY) {
  console.error("Ce script doit être lancé dans un terminal interactif (le mot de passe serait affiché).");
  process.exit(1);
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
const empreinte = ["scrypt", 16384, 8, 1, sel.toString("base64url"), cle.toString("base64url")].join("$");
console.log("Pour .env.local :");
console.log(`ADMIN_EMPREINTE=${empreinte.replaceAll("$", "\\$")}`);
console.log("Pour Coolify (valeur brute) :");
console.log(empreinte);
