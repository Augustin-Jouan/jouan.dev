import { redirect } from "next/navigation";
import { sessionValide } from "@/lib/admin/acces";
import { FormulaireConnexion } from "./FormulaireConnexion";

export default async function PageConnexion() {
  if (await sessionValide()) redirect("/admin");
  return (
    <>
      <h1 className="font-serif text-4xl">Administration</h1>
      <FormulaireConnexion />
    </>
  );
}
