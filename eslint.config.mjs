import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code's isolated worktrees (.claude/worktrees/*) are full checkouts of the repo —
    // without this they get linted as if they were part of the project, drowning real output
    // in duplicate errors from whatever historical commit each worktree happened to be on.
    ".claude/**",
  ]),
  {
    // These files use @react-pdf/renderer's <Image>, not next/image's — jsx-a11y's alt-text
    // rule matches on the tag name "Image" (configured for next/image) and can't tell the two
    // apart. react-pdf's Image renders into a PDF, not the DOM, so it has no alt-text concept.
    files: ["src/lib/generate-*-pdf.tsx"],
    rules: {
      "jsx-a11y/alt-text": "off",
    },
  },
]);

export default eslintConfig;
