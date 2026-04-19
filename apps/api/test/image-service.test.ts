import { describe, expect, it, vi } from "vitest";

import {
  ImageService,
  normalizeDishNameForImageSearch,
} from "../src/image-service";
import type {
  ImageCacheEntry,
  ImageCacheShape,
  TranslationCacheEntry,
} from "../src/image-cache";

function createMemoryCache(): ImageCacheShape {
  const translations = new Map<string, TranslationCacheEntry>();
  const images = new Map<string, ImageCacheEntry>();

  return {
    async getTranslation(key) {
      return translations.get(key) ?? null;
    },
    async setTranslation(key, value, source) {
      translations.set(key, { value, source });
    },
    async getImage(key) {
      return images.get(key);
    },
    async setImage(key, query, value) {
      images.set(key, { query, result: value });
    },
  };
}

describe("ImageService", () => {
  it("maps the first Pixabay match into the shared image response", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) => {
        const url = String(input);

        if (url.includes("pixabay.com/api")) {
          return {
            ok: true,
            json: async () => ({
              hits: [
                {
                  id: 716429,
                  tags: "pasta, garlic",
                  pageURL: "https://pixabay.com/photos/pasta-garlic-716429/",
                  largeImageURL:
                    "https://cdn.pixabay.com/photo/716429_1280.jpg",
                },
              ],
            }),
          } as Response;
        }

        throw new Error(`Unexpected URL: ${url}`);
      });

    const service = new ImageService(
      "pixabay-key",
      undefined,
      fetchMock,
      createMemoryCache(),
    );
    const result = await service.searchDishImage("Pasta with Garlic, Salat");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://pixabay.com/api/"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("q=Pasta+with+Garlic"),
    );
    expect(result.query).toBe("Pasta with Garlic");
    expect(result.result?.id).toBe(716429);
    expect(result.result?.source).toBe("pixabay");
    expect(result.result?.sourceUrl).toBe(
      "https://pixabay.com/photos/pasta-garlic-716429/",
    );
  });

  it("fails clearly when the API key is missing", async () => {
    const service = new ImageService(
      undefined,
      undefined,
      vi.fn<typeof fetch>(),
      createMemoryCache(),
    );

    await expect(service.searchDishImage("Gemüsegulasch")).rejects.toThrow(
      "PIXABAY_API_KEY is not configured.",
    );
  });

  it("uses DeepL on compact normalized German queries before Pixabay", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) => {
        const url = String(input);

        if (url.includes("api-free.deepl.com")) {
          return {
            ok: true,
            json: async () => ({
              translations: [{ text: "vegetable goulash with rice" }],
            }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({
            hits: [
              {
                id: 99,
                tags: "goulash, rice",
                pageURL: "https://pixabay.com/photos/goulash-99/",
                largeImageURL: "https://cdn.pixabay.com/photo/99_1280.jpg",
              },
            ],
          }),
        } as Response;
      });
    const service = new ImageService(
      "pixabay-key",
      "deepl-key",
      fetchMock,
      createMemoryCache(),
    );

    const result = await service.searchDishImage("Gemüsegulasch (Sl), Reis");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-free.deepl.com/v2/translate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "DeepL-Auth-Key deepl-key",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("q=vegetable+goulash+with+rice"),
    );
    expect(result.query).toBe("vegetable goulash with rice");
  });

  it("caches translations and image results by normalized dish name", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) => {
        const url = String(input);

        if (url.includes("api-free.deepl.com")) {
          return {
            ok: true,
            json: async () => ({
              translations: [{ text: "vegetable goulash with rice" }],
            }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({
            hits: [
              {
                id: 101,
                tags: "goulash, rice",
                pageURL: "https://pixabay.com/photos/goulash-101/",
                largeImageURL: "https://cdn.pixabay.com/photo/101_1280.jpg",
              },
            ],
          }),
        } as Response;
      });
    const service = new ImageService(
      "pixabay-key",
      "deepl-key",
      fetchMock,
      createMemoryCache(),
    );

    await service.searchDishImage("Gemüsegulasch, Reis");
    await service.searchDishImage("Gemüsegulasch, Reis");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refreshes legacy fallback translations and stale image cache entries when DeepL is available", async () => {
    const cache = createMemoryCache();
    await cache.setTranslation(
      "gemüsegulasch mit reis",
      "Gemüsegulasch mit Reis",
      "fallback",
    );
    await cache.setImage("gemüsegulasch mit reis", "Gemüsegulasch mit Reis", {
      id: 1,
      title: "old image",
      imageUrl: "https://cdn.pixabay.com/old.jpg",
      sourceUrl: "https://pixabay.com/photos/old/",
      source: "pixabay",
    });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) => {
        const url = String(input);

        if (url.includes("api-free.deepl.com")) {
          return {
            ok: true,
            json: async () => ({
              translations: [{ text: "vegetable goulash with rice" }],
            }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({
            hits: [
              {
                id: 2,
                tags: "goulash, rice",
                pageURL: "https://pixabay.com/photos/new/",
                largeImageURL: "https://cdn.pixabay.com/new.jpg",
              },
            ],
          }),
        } as Response;
      });
    const service = new ImageService(
      "pixabay-key",
      "deepl-key",
      fetchMock,
      cache,
    );

    const result = await service.searchDishImage("Gemüsegulasch, Reis");

    expect(result.query).toBe("vegetable goulash with rice");
    expect(result.result?.id).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("normalizes branded mensa titles into a searchable main dish", () => {
    expect(
      normalizeDishNameForImageSearch(
        'Unsere vegane "ExtraVurst - CampusStyle" (Sf), mit Curry-Spezial-Sauce (5,Sf,Sw), oder Curry-Delikant-Sauce, Pommes Frites (Sf)',
      ),
    ).toBe("vegane Currywurst mit Pommes Frites");
  });

  it("keeps the main dish and helpful side dishes while removing codes", () => {
    expect(
      normalizeDishNameForImageSearch(
        "Bohnen-Lauch-Curry mit Brech- Bohnen, Edamame Bohnen und Lauch (So,Sl,Sf,Sw), Basmatireis",
      ),
    ).toBe("Bohnen-Lauch-Curry mit BrechBohnen mit Basmatireis");
  });
});
