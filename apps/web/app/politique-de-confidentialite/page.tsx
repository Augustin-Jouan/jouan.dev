import type { Metadata } from "next";
import { contact } from "@/data/contact";
import { A_COMPLETER, mentionsLegales } from "@/data/legal";
import { siteName } from "@/data/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: `Politique de confidentialité et traitement des données personnelles (RGPD) du site de ${siteName}.`,
  alternates: { canonical: "/politique-de-confidentialite" },
};

export default function PolitiqueConfidentialitePage() {
  const transfertPlaceholder =
    mentionsLegales.transfertHorsUe === A_COMPLETER;

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-16">
      <h1 className="font-serif text-5xl">Politique de confidentialité</h1>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">
          Responsable du traitement
        </h2>
        <p>
          Le responsable du traitement des données collectées sur ce site est{" "}
          {mentionsLegales.editeur} ({mentionsLegales.statut}), joignable par
          e-mail à l&apos;adresse {mentionsLegales.email}.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Données collectées</h2>
        <p>
          Lorsque vous utilisez le formulaire de contact, je collecte les
          informations que vous renseignez : nom, adresse email, numéro de
          téléphone (facultatif) et le contenu de votre message. Les champs nom,
          email et message sont obligatoires : sans eux, la demande ne peut pas
          être traitée.
        </p>
        <p>
          Lors de l&apos;envoi du formulaire, l&apos;adresse IP est utilisée de
          façon temporaire (une heure, en mémoire) pour limiter les envois
          abusifs. L&apos;hébergeur peut également conserver des journaux
          techniques d&apos;accès (adresse IP, date, page consultée) pour la
          sécurité et le bon fonctionnement du site.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Finalité du traitement</h2>
        <p>
          Ces données sont utilisées uniquement pour répondre à votre demande de
          devis ou de renseignement. La base légale du traitement est
          l&apos;exécution de mesures précontractuelles prises à votre demande
          (article 6.1.b du RGPD).
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Liens personnalisés</h2>
        <p>
          Je peux envoyer à un prospect un lien personnalisé vers ce site, qui le
          salue par le nom de son entreprise. Quand ce lien est ouvert,
          j&apos;enregistre la date de la visite, le type d&apos;appareil (mobile
          ou ordinateur) et le nombre de visites, et je reçois un e-mail. Ni
          adresse IP, ni cookie, ni identifiant de navigateur ne sont
          enregistrés.
        </p>
        <p>
          Ce suivi sert uniquement à savoir quand reprendre contact. Sa base
          légale est mon intérêt légitime à assurer le suivi commercial
          d&apos;une proposition (article 6.1.f du RGPD). Les visites sont
          conservées douze mois, puis supprimées automatiquement. Le nom de
          l&apos;entreprise et le lien sont conservés tant que le lien existe, et
          les e-mails de notification restent dans ma boîte de réception. Vous pouvez
          demander à tout moment la suppression de votre lien et de ses visites,
          par le formulaire de contact ou à l&apos;adresse{" "}
          {mentionsLegales.email}.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Présence en direct</h2>
        <p>
          Sur la page d&apos;accueil, un compteur indique combien de personnes regardent la page en même
          temps. Votre navigateur se connecte pour être compté, mais n&apos;envoie rien : ni position, ni
          contenu. Rien n&apos;est enregistré.
        </p>
        <p>
          Ce compteur sert à animer la page d&apos;accueil et à montrer un savoir-faire technique. Sa base
          légale est mon intérêt légitime (article 6.1.f du RGPD). Il dure le temps de votre visite : votre
          adresse IP sert uniquement, en mémoire et le temps de la connexion, à limiter le nombre de
          connexions ; les journaux techniques de l&apos;hébergeur relèvent de la mention ci-dessus.
        </p>
        <p>
          Le repère de l&apos;introduction déjà vue et les modifications faites dans la démo de l&apos;étude de
          cas « Suivi de marchés » ne durent que le temps de l&apos;onglet (stockage de session). Aucun cookie
          supplémentaire n&apos;est déposé.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Coulisses</h2>
        <p>
          La page Coulisses mesure, depuis votre navigateur, les temps de réponse du site, de sa base de
          données et du service temps réel. Ces mesures ne sont ni enregistrées ni transmises à des tiers.
        </p>
        <p>
          Votre adresse IP sert uniquement, en mémoire, à limiter le nombre de mesures : deux minutes au
          plus pour l&apos;aller-retour vers le site, le temps de la connexion pour l&apos;écho du service temps réel
          (elle est oubliée à la fermeture de la page). Elle n&apos;est jamais enregistrée ni journalisée.
          La base légale est mon intérêt légitime à protéger le site contre les abus (article 6.1.f du
          RGPD). Aucun cookie ni stockage local n&apos;est utilisé pour ces mesures.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Destinataires</h2>
        <p>
          Vos données sont destinées exclusivement à{" "}
          {mentionsLegales.editeur} et ne sont ni vendues ni cédées à des
          tiers. Deux prestataires techniques y ont accès du seul fait de leur
          rôle, sans autorisation d&apos;en faire un autre usage : l&apos;hébergeur
          du site, et le prestataire d&apos;envoi de mails qui achemine le message
          envoyé depuis le formulaire jusqu&apos;à ma boîte.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">
          Transferts hors de l&apos;Union européenne
        </h2>
        <p>
          Un transfert hors de l&apos;Union européenne dépend de l&apos;hébergeur
          retenu.{" "}
          <span className={transfertPlaceholder ? "italic" : undefined}>
            {mentionsLegales.transfertHorsUe}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">
          Durée de conservation
        </h2>
        <p>
          Les messages reçus via le formulaire sont conservés{" "}
          <strong>trois ans à compter du dernier contact</strong>, puis supprimés.
          Lorsqu&apos;une demande débouche sur une relation contractuelle, les
          documents correspondants relèvent des obligations comptables et sont
          conservés dix ans, conformément à l&apos;article L123-22 du code de
          commerce.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Vos droits</h2>
        <p>
          Conformément au Règlement général sur la protection des données (RGPD),
          vous disposez d&apos;un droit d&apos;accès, de rectification,
          d&apos;effacement, de limitation, d&apos;opposition et de portabilité de
          vos données. Pour exercer ces droits, écrivez-moi à{" "}
          <a href={`mailto:${contact.email}`} className="underline">
            {contact.email}
          </a>
          .
        </p>
        <p>
          Vous pouvez également introduire une réclamation auprès de la CNIL
          (www.cnil.fr) si vous estimez que vos droits ne sont pas respectés.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">
          Cookies et mesure d&apos;audience
        </h2>
        <p>
          Ce site ne dépose aucun cookie de suivi. Le seul cookie du site est celui
          de la session d&apos;administration, réservé au chemin /admin et
          strictement nécessaire : il ne concerne pas les visiteurs. La fréquentation est mesurée
          avec Umami, un outil respectueux de la vie privée : il ne dépose pas
          de cookie, ne collecte aucune donnée personnelle et ne permet pas de
          suivre un visiteur d&apos;un site à l&apos;autre. Les données sont
          agrégées et anonymes (pages consultées, type d&apos;appareil, pays).
          Conformément aux recommandations de la CNIL, cette mesure
          d&apos;audience est exemptée de consentement, ce qui explique
          l&apos;absence de bandeau cookie.
        </p>
      </div>
    </section>
  );
}
