/**
 * Lance `fn` une fois la page chargée, dans un temps libre du navigateur. Renvoie l'annulation.
 * Les numéros de `requestIdleCallback` et de `setTimeout` sont deux suites distinctes :
 * l'annulation n'appelle que la fonction de l'API utilisée, et seulement avant le lancement.
 */
export function quandLibre(fn: () => void): () => void {
  let annulerAttente: (() => void) | null = null;
  const lancer = () => {
    const executer = () => {
      annulerAttente = null;
      fn();
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(executer, { timeout: 3_000 });
      annulerAttente = () => window.cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(executer, 1_000);
      annulerAttente = () => window.clearTimeout(id);
    }
  };
  if (document.readyState === "complete") lancer();
  else window.addEventListener("load", lancer, { once: true });
  return () => {
    window.removeEventListener("load", lancer);
    annulerAttente?.();
    annulerAttente = null;
  };
}
