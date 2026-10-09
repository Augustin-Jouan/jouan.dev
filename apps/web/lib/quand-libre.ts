/** Lance `fn` une fois la page chargée, dans un temps libre du navigateur. Renvoie l'annulation. */
export function quandLibre(fn: () => void): () => void {
  let id: number | undefined;
  const lancer = () => {
    id =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(fn, { timeout: 3_000 })
        : window.setTimeout(fn, 1_000);
  };
  if (document.readyState === "complete") lancer();
  else window.addEventListener("load", lancer, { once: true });
  return () => {
    window.removeEventListener("load", lancer);
    if (id === undefined) return;
    if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(id);
    window.clearTimeout(id);
  };
}
