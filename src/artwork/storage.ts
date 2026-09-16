import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";

export interface ArtworkStorageProvider {
  save(data: Uint8Array, extension: string): Promise<string>;
  saveProof(data: Uint8Array, extension: string): Promise<string>;
  read(storageKey: string): Promise<NodeJS.ReadableStream>;
  readBytes(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
  list(): Promise<string[]>;
}

export type ArtworkStorageKind = "LOCAL_DEVELOPMENT" | "OBJECT_STORAGE_FUTURE";

export class ObjectStorageArtworkStorage implements ArtworkStorageProvider {
  private unavailable(): never { throw new Error("Object artwork storage is not configured."); }
  async save(): Promise<string> { return this.unavailable(); }
  async saveProof(): Promise<string> { return this.unavailable(); }
  async read(): Promise<NodeJS.ReadableStream> { return this.unavailable(); }
  async readBytes(): Promise<Uint8Array> { return this.unavailable(); }
  async delete(): Promise<void> { return this.unavailable(); }
  async exists(): Promise<boolean> { return this.unavailable(); }
  async list(): Promise<string[]> { return this.unavailable(); }
}

export class LocalArtworkStorage implements ArtworkStorageProvider {
  private readonly root = resolve(/* turbopackIgnore: true */ process.cwd(), process.env.CXA_ARTWORK_STORAGE_PATH ?? ".cxa-storage/artwork");

  private pathFor(storageKey: string): string {
    if (!/^(temporary|proofs)\/[0-9a-f-]{36}\.(png|jpg|pdf|svg)$/.test(storageKey)) throw new Error("Invalid artwork storage key.");
    const target = resolve(this.root, storageKey.replaceAll("/", sep));
    if (!target.startsWith(`${this.root}${sep}`)) throw new Error("Invalid artwork storage key.");
    return target;
  }

  async save(data: Uint8Array, extension: string): Promise<string> {
    const storageKey = `temporary/${randomUUID()}.${extension}`;
    const target = this.pathFor(storageKey);
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, data, { flag: "wx" });
    return storageKey;
  }

  async saveProof(data: Uint8Array, extension: string): Promise<string> {
    if (!/^(png|jpg|pdf)$/.test(extension)) throw new Error("Proof files must be PNG, JPG or PDF.");
    const storageKey = `proofs/${randomUUID()}.${extension}`;
    const target = this.pathFor(storageKey);
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, data, { flag: "wx" });
    return storageKey;
  }

  async read(storageKey: string): Promise<NodeJS.ReadableStream> { return createReadStream(this.pathFor(storageKey)); }
  async readBytes(storageKey: string): Promise<Uint8Array> { return readFile(this.pathFor(storageKey)); }
  async delete(storageKey: string): Promise<void> { try { await unlink(this.pathFor(storageKey)); } catch (cause) { if (!(cause instanceof Error && "code" in cause && cause.code === "ENOENT")) throw cause; } }
  async exists(storageKey: string): Promise<boolean> { try { await readFile(this.pathFor(storageKey)); return true; } catch (cause) { if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") return false; throw cause; } }
  async list(): Promise<string[]> { try { const files = await readdir(resolve(this.root, "temporary")); return files.filter((file) => /^[0-9a-f-]{36}\.(png|jpg|pdf|svg)$/.test(file)).map((file) => `temporary/${file}`); } catch (cause) { if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") return []; throw cause; } }
}

export const artworkStorage: ArtworkStorageProvider = new LocalArtworkStorage();
