/* Icônes génériques, trait de 1,6 en couleur courante. */
const svg = (d: React.ReactNode) =>
  function Icone() {
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
        {d}
      </svg>
    );
  };

export const Chevron = svg(<path d="m4 6 4 4 4-4" />);
export const Croix = svg(<path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />);
export const Plus = svg(<path d="M8 3v10M3 8h10" />);
export const Corbeille = svg(<path d="M2.8 4.3h10.4M6.4 4.3V2.8h3.2v1.5M4.2 4.3l.6 8.9h6.4l.6-8.9" />);
