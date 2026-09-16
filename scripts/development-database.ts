import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

export const EXPECTED_DATABASE_NAME = "cxa_dev";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function loadLocalEnvironment(): void {
  if (existsSync(".env.local")) loadEnvFile(".env.local");
}

export function assertSafeDevelopmentDatabase(): {
  databaseName: string;
  host: string;
  port: string;
} {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured.");

  const url = new URL(value);
  const databaseName = url.pathname.replace(/^\//, "");

  if (!LOCAL_HOSTS.has(url.hostname) || databaseName !== EXPECTED_DATABASE_NAME) {
    throw new Error(
      "Refusing database operation: expected local database cxa_dev.",
    );
  }

  return {
    databaseName,
    host: url.hostname,
    port: url.port || "5432",
  };
}
