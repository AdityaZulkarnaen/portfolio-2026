// Applies pending migrations in supabase/migrations to the remote database.
import { execFileSync } from "node:child_process";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL is missing in .env.local");
  process.exit(1);
}
execFileSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["exec", "supabase", "db", "push", `--remote=${url}`, "--yes"],
  { stdio: "inherit", shell: process.platform === "win32" },
);
