/** Un interrupteur : bouton role="switch" dont le nom est son libellé. */
export function Interrupteur({ libelle, actif, surChangement }: {
  libelle: string;
  actif: boolean;
  surChangement(actif: boolean): void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      onClick={() => surChangement(!actif)}
      className="group inline-flex cursor-pointer items-center gap-2 bg-transparent p-0 text-13 select-none"
    >
      <span
        aria-hidden="true"
        className={
          "relative h-4 w-7.5 flex-none rounded-full border border-rule-strong bg-raise transition-[background-color,border-color] duration-140 " +
          "after:absolute after:top-0.5 after:left-0.5 after:size-2.5 after:rounded-full after:bg-muted after:transition-[translate,background-color] after:duration-140 after:content-[''] " +
          "group-aria-checked:border-accent group-aria-checked:bg-accent group-aria-checked:after:translate-x-3.5 group-aria-checked:after:bg-on-accent"
        }
      />
      {libelle}
    </button>
  );
}
