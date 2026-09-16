import { spawnSync } from "node:child_process";

function run(script, args, env = process.env) {
  const result = spawnSync(process.execPath, [script, ...args], { stdio: "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Preview builds must not migrate the production database shared by this project.
if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DATABASE_URL) throw new Error("Production DATABASE_URL is required.");
  run("node_modules/prisma/build/index.js", ["migrate", "deploy"], {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  });
}
run("node_modules/next/dist/bin/next", ["build"]);
