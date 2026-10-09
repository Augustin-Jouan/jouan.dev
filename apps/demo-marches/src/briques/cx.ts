/** Joint des classes ; ignore false, null, undefined et les chaînes vides. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
