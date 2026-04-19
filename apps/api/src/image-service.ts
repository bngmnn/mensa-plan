import type { DishImageResponse } from "@mensa/shared";

import {
  FileImageCache,
  type ImageCacheShape,
  type TranslationCacheEntry,
} from "./image-cache";

interface PixabayImageSearchResponse {
  hits?: Array<{
    id: number;
    tags: string;
    pageURL: string;
    webformatURL?: string;
    largeImageURL?: string;
  }>;
}

export interface ImageServiceShape {
  searchDishImage(query: string): Promise<DishImageResponse>;
}

export class ImageService implements ImageServiceShape {
  constructor(
    private readonly pixabayApiKey = process.env.PIXABAY_API_KEY,
    private readonly deeplApiKey = process.env.DEEPL_API_KEY,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly cache: ImageCacheShape = new FileImageCache(),
  ) {}

  async searchDishImage(query: string): Promise<DishImageResponse> {
    const normalizedQuery = normalizeDishNameForImageSearch(query);
    const cacheKey = normalizedQuery.toLowerCase();

    if (!normalizedQuery) {
      throw new Error("Image query must not be empty.");
    }

    if (!this.pixabayApiKey) {
      throw new Error("PIXABAY_API_KEY is not configured.");
    }

    const translatedQuery = await this.translateQuery(
      normalizedQuery,
      cacheKey,
    );
    const cachedImage = await this.cache.getImage(cacheKey);

    if (cachedImage && cachedImage.query === translatedQuery) {
      return {
        query: translatedQuery,
        result: cachedImage.result,
      };
    }

    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", this.pixabayApiKey);
    url.searchParams.set("q", translatedQuery);
    url.searchParams.set("image_type", "photo");
    url.searchParams.set("category", "food");
    url.searchParams.set("per_page", "3");
    url.searchParams.set("safesearch", "true");

    const response = await this.fetchImpl(url.toString());

    if (!response.ok) {
      throw new Error(
        `Pixabay image search failed with status ${response.status}.`,
      );
    }

    const payload = (await response.json()) as PixabayImageSearchResponse;
    const result = payload.hits?.find(
      (hit) => hit.largeImageURL || hit.webformatURL,
    );
    const mappedResult = result
      ? {
          id: result.id,
          title: result.tags || translatedQuery,
          imageUrl: result.largeImageURL ?? result.webformatURL!,
          sourceUrl: result.pageURL,
          source: "pixabay" as const,
        }
      : null;

    await this.cache.setImage(cacheKey, translatedQuery, mappedResult);

    return {
      query: translatedQuery,
      result: mappedResult,
    };
  }

  private async translateQuery(
    normalizedQuery: string,
    cacheKey: string,
  ): Promise<string> {
    const cachedTranslation = await this.cache.getTranslation(cacheKey);

    if (
      cachedTranslation &&
      !shouldRefreshTranslation(
        cachedTranslation,
        normalizedQuery,
        Boolean(this.deeplApiKey),
      )
    ) {
      return cachedTranslation.value;
    }

    if (!this.deeplApiKey) {
      await this.cache.setTranslation(cacheKey, normalizedQuery, "fallback");
      return normalizedQuery;
    }

    const url = "https://api-free.deepl.com/v2/translate";
    const body = new URLSearchParams({
      text: normalizedQuery,
      source_lang: "DE",
      target_lang: "EN-US",
    });
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        authorization: `DeepL-Auth-Key ${this.deeplApiKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      await this.cache.setTranslation(cacheKey, normalizedQuery, "fallback");
      return normalizedQuery;
    }

    const payload = (await response.json()) as {
      translations?: Array<{ text?: string }>;
    };
    const translatedText = payload.translations?.[0]?.text?.trim();
    const translated =
      translatedText && translatedText.length > 0
        ? translatedText
        : normalizedQuery;

    await this.cache.setTranslation(
      cacheKey,
      translated,
      translatedText && translatedText.length > 0 ? "deepl" : "fallback",
    );
    return translated;
  }
}

const SIDE_DISH_PATTERNS = [
  /\breis\b/i,
  /\bbasmatireis\b/i,
  /\bpommes\b/i,
  /\bkartoffel/i,
  /\bnudeln?\b/i,
  /\bbulgur\b/i,
  /\bbrot\b/i,
  /\bpolenta\b/i,
  /\bcouscous\b/i,
];

const IGNORABLE_SEGMENT_PATTERNS = [
  /^\s*mit\s+.+sauce/i,
  /^\s*oder\s+.+sauce/i,
  /^\s*wahlweise\b/i,
];

export function normalizeDishNameForImageSearch(query: string): string {
  const cleaned = query
    .replace(/\((?:[^()]*)\)/g, " ")
    .replace(/["“”]/g, "")
    .replace(/(\p{L})-\s+(\p{L})/gu, "$1$2")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  const segments = cleaned
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const mainSegment = normalizeMainSegment(segments[0] ?? cleaned);
  const sideSegments = segments
    .slice(1)
    .filter((segment) =>
      SIDE_DISH_PATTERNS.some((pattern) => pattern.test(segment)),
    )
    .filter(
      (segment) =>
        !IGNORABLE_SEGMENT_PATTERNS.some((pattern) => pattern.test(segment)),
    )
    .map(normalizeSegment);

  const parts = [mainSegment, ...sideSegments].filter(Boolean);

  return dedupeWords(parts.join(" mit "));
}

function shouldRefreshTranslation(
  cached: TranslationCacheEntry,
  _normalizedQuery: string,
  hasDeeplApiKey: boolean,
): boolean {
  if (!hasDeeplApiKey) {
    return false;
  }

  return cached.source !== "deepl";
}

function normalizeMainSegment(segment: string): string {
  const normalized = normalizeSegment(segment)
    .replace(
      /^(?:unser(?:e|er|es|en)?|hausgemachte(?:r|s|n)?|frische(?:r|s|n)?|leckere(?:r|s|n)?)\s+/i,
      "",
    )
    .trim();

  if (/extravurst|campusstyle/i.test(normalized)) {
    return "vegane Currywurst";
  }

  return normalized;
}

function normalizeSegment(segment: string): string {
  return segment
    .replace(
      /^(?:unsere(?:r|s|n)?|unser(?:e|er|es|en)?|vegan(?:e|er|es|en)?|vegetarisch(?:e|er|es|en)?|mit)\s+/i,
      "",
    )
    .replace(/\s+-\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeWords(value: string): string {
  const words = value.split(/\s+/);
  const deduped: string[] = [];

  for (const word of words) {
    if (deduped.at(-1)?.toLowerCase() === word.toLowerCase()) {
      continue;
    }

    deduped.push(word);
  }

  return deduped.join(" ").trim();
}
