export type Question = {
  question: string;
  reponse: string;
};

type Props = {
  questions: Question[];
};

/**
 * Données structurées schema.org pour une foire aux questions.
 * Voir https://schema.org/FAQPage
 *
 * À rendre depuis la section FAQ elle-même : le balisage doit décrire des
 * questions réellement visibles sur la page qui le porte.
 *
 * Google ne montre plus le résultat enrichi FAQ qu'aux sites de santé et
 * d'administration, mais Bing l'exploite et il rend le contenu lisible par
 * les moteurs et assistants qui parsent schema.org.
 */
export function FaqJsonLd({ questions }: Props) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.reponse },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // Sérialisation contrôlée d'un objet statique, pas d'entrée utilisateur.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
