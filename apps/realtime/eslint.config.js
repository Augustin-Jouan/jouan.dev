import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  ...tseslint.configs.recommended,
  { files: ["**/*.ts"], languageOptions: { globals: globals.node } },
);
