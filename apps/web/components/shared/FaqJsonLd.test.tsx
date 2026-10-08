import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FaqJsonLd } from "./FaqJsonLd";

const questions = [
  { question: "Quels sont vos horaires ?", reponse: "Du lundi au vendredi." },
  { question: "Intervenez-vous le week-end ?", reponse: "Sur demande." },
];

describe("FaqJsonLd", () => {
  it("décrit une FAQPage avec une Question par entrée", () => {
    const { container } = render(<FaqJsonLd questions={questions} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const jsonLd = JSON.parse(script?.textContent ?? "{}");
    expect(jsonLd["@type"]).toBe("FAQPage");
    expect(jsonLd.mainEntity).toHaveLength(2);
    expect(jsonLd.mainEntity[0]).toEqual({
      "@type": "Question",
      name: questions[0].question,
      acceptedAnswer: { "@type": "Answer", text: questions[0].reponse },
    });
  });
});
