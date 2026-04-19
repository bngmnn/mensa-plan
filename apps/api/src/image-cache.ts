import type { DishImage } from "@mensa/shared";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

interface CacheStore {
  translations: Record<
    string,
    {
      value: string;
      source?: "deepl" | "fallback" | "legacy";
      updatedAt: string;
    }
  >;
  images: Record<
    string,
    {
      query?: string;
      result: DishImage | null;
      updatedAt: string;
    }
  >;
}

export interface TranslationCacheEntry {
  value: string;
  source: "deepl" | "fallback" | "legacy";
}

export interface ImageCacheEntry {
  query: string | null;
  result: DishImage | null;
}

export interface ImageCacheShape {
  getTranslation(key: string): Promise<TranslationCacheEntry | null>;
  setTranslation(
    key: string,
    value: string,
    source: "deepl" | "fallback",
  ): Promise<void>;
  getImage(key: string): Promise<ImageCacheEntry | undefined>;
  setImage(key: string, query: string, value: DishImage | null): Promise<void>;
}

const DEFAULT_CACHE_PATH = resolveDefaultCachePath();

export class FileImageCache implements ImageCacheShape {
  private storePromise: Promise<CacheStore> | null = null;
  private writeQueue = Promise.resolve();

  constructor(private readonly fileUrl: URL = DEFAULT_CACHE_PATH) {}

  async getTranslation(key: string): Promise<TranslationCacheEntry | null> {
    const store = await this.loadStore();
    const entry = store.translations[key];

    if (!entry) {
      return null;
    }

    return {
      value: entry.value,
      source: entry.source ?? "legacy",
    };
  }

  async setTranslation(
    key: string,
    value: string,
    source: "deepl" | "fallback",
  ): Promise<void> {
    await this.updateStore((store) => {
      store.translations[key] = {
        value,
        source,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async getImage(key: string): Promise<ImageCacheEntry | undefined> {
    const store = await this.loadStore();
    const entry = store.images[key];

    if (!entry) {
      return undefined;
    }

    return {
      query: entry.query ?? null,
      result: entry.result,
    };
  }

  async setImage(
    key: string,
    query: string,
    value: DishImage | null,
  ): Promise<void> {
    await this.updateStore((store) => {
      store.images[key] = {
        query,
        result: value,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  private async loadStore(): Promise<CacheStore> {
    if (!this.storePromise) {
      this.storePromise = this.readStore();
    }

    return this.storePromise;
  }

  private async readStore(): Promise<CacheStore> {
    try {
      const file = await readFile(this.fileUrl, "utf-8");
      return parseStore(file);
    } catch {
      return createEmptyStore();
    }
  }

  private async updateStore(
    update: (store: CacheStore) => void,
  ): Promise<void> {
    const store = await this.loadStore();
    update(store);

    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(dirname(this.fileUrl.pathname), { recursive: true });
      await writeFile(
        this.fileUrl,
        JSON.stringify(store, null, 2) + "\n",
        "utf-8",
      );
    });

    await this.writeQueue;
  }
}

function createEmptyStore(): CacheStore {
  return {
    translations: {},
    images: {},
  };
}

function parseStore(value: string): CacheStore {
  const parsed = JSON.parse(value) as Partial<CacheStore>;

  return {
    translations: parsed.translations ?? {},
    images: parsed.images ?? {},
  };
}

function resolveDefaultCachePath(): URL {
  const configuredPath = process.env.IMAGE_CACHE_PATH?.trim();

  if (configuredPath) {
    return new URL(`file://${configuredPath}`);
  }

  if (process.env.NETLIFY) {
    return new URL("file:///tmp/mensa-image-search-cache.json");
  }

  return new URL("../.cache/image-search-cache.json", import.meta.url);
}
