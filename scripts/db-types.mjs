// Regenerates lib/supabase/database.types.ts from the remote database.
// Reads SUPABASE_DB_URL from .env.local (via --env-file) so the URL never appears in shell history.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL is missing in .env.local");
  process.exit(1);
}
const out = execFileSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["exec", "supabase", "gen", "types", "typescript", "--db-url", url, "--schema", "public"],
  { encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "inherit"] },
);
writeFileSync("lib/supabase/database.types.ts", out);
console.log("Wrote lib/supabase/database.types.ts");
