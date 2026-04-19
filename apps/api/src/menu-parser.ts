import { load, type CheerioAPI } from "cheerio";
import type { Element as DomElement } from "domhandler";

import type {
  Allergen,
  Dish,
  Indicator,
  Location,
  MenuCategory,
  MenuResponse,
  Price,
  SustainabilityMetric,
} from "@mensa/shared";

const STWHH_ORIGIN = "https://www.stwhh.de";

interface ParseMenuInput {
  html: string;
  location: Location;
  serviceDate: string;
  fetchedAt: string;
  sourceUrl: string;
}

export function listMenuServiceDates(
  html: string,
  locationId: string,
): string[] {
  const $ = load(html);
  const locationRoot = $(
    `.tx-epwerkmenu-menu-location-wrapper[data-location="${locationId}"]`,
  ).first();

  if (locationRoot.length === 0) {
    return [];
  }

  return Array.from(
    new Set(
      locationRoot
        .find(".tx-epwerkmenu-menu-timestamp-wrapper")
        .map((_, wrapper) => cleanText($(wrapper).attr("data-timestamp") ?? ""))
        .get()
        .filter(Boolean),
    ),
  );
}

export function parseMenuPage({
  html,
  location,
  serviceDate,
  fetchedAt,
  sourceUrl,
}: ParseMenuInput): MenuResponse {
  const $ = load(html);
  const locationRoot = $(
    `.tx-epwerkmenu-menu-location-wrapper[data-location="${location.id}"]`,
  ).first();

  if (locationRoot.length === 0) {
    throw new Error(`No menu location wrapper found for ${location.id}`);
  }

  const categoryMap = new Map<string, Dish[]>();

  locationRoot
    .find(
      `.tx-epwerkmenu-menu-timestamp-wrapper[data-timestamp="${serviceDate}"]`,
    )
    .each((_, wrapper) => {
      const categoryName = cleanText(
        $(wrapper).find(".menulist__categorytitle").first().text(),
      );

      if (!categoryName) {
        return;
      }

      const dishes = categoryMap.get(categoryName) ?? [];

      $(wrapper)
        .find(".menue-tile")
        .each((__, tile) => {
          const dish = parseDish($, tile, categoryName);

          if (dish) {
            dishes.push(dish);
          }
        });

      categoryMap.set(categoryName, dishes);
    });

  const categories: MenuCategory[] = Array.from(categoryMap.entries()).map(
    ([name, dishes]) => ({
      name,
      dishes,
    }),
  );

  const totalDishes = categories.reduce(
    (sum, category) => sum + category.dishes.length,
    0,
  );

  return {
    location,
    serviceDate,
    fetchedAt,
    sourceUrl,
    isStale: false,
    warnings:
      categories.length === 0
        ? ["No meals were available for the requested day."]
        : [],
    categories,
    stats: {
      totalCategories: categories.length,
      totalDishes,
    },
  };
}

function parseDish(
  $: CheerioAPI,
  tile: DomElement,
  category: string,
): Dish | null {
  const element = $(tile);
  const dishId = cleanText(element.attr("data-uid") ?? "");
  const name = cleanText(element.find(".singlemeal__headline").first().text());

  if (!dishId || !name) {
    return null;
  }

  return {
    id: dishId,
    name,
    category,
    indicators: element
      .find(".singlemeal__icontooltip")
      .map((_, icon) => parseIndicator($, icon))
      .get()
      .filter(Boolean) as Indicator[],
    allergens: element
      .find(".dlist--inline dd")
      .map((_, allergen) => parseAllergen($, allergen))
      .get()
      .filter(Boolean) as Allergen[],
    prices: element
      .find(".singlemeal__bottom dl.dlist")
      .not(".dlist--inline")
      .first()
      .find("dd.dlist__item")
      .map((_, item) => parsePrice($, item))
      .get()
      .filter(Boolean) as Price[],
    sustainability: element
      .find(".eaternity__element")
      .map((_, metric) => parseMetric($, metric))
      .get()
      .filter(Boolean) as SustainabilityMetric[],
  };
}

function parseIndicator($: CheerioAPI, icon: DomElement): Indicator | null {
  const titleHtml = $(icon).attr("title");

  if (!titleHtml) {
    return null;
  }

  const tooltip = load(`<div>${titleHtml}</div>`);
  const label = cleanText(tooltip("b").first().text());
  const description = cleanText(tooltip.root().text().replace(label, ""));
  const iconUrl = absoluteUrl($(icon).find("img").attr("src"));

  if (!label) {
    return null;
  }

  return {
    label,
    ...(description ? { description } : {}),
    ...(iconUrl ? { iconUrl } : {}),
  };
}

function parseAllergen($: CheerioAPI, allergen: DomElement): Allergen | null {
  const raw = cleanText($(allergen).text());

  if (!raw.includes("=")) {
    return null;
  }

  const [code, label] = raw.split("=").map(cleanText);

  if (!code || !label) {
    return null;
  }

  return { code, label };
}

function parsePrice($: CheerioAPI, item: DomElement): Price | null {
  const amountText = cleanText(
    $(item).find(".singlemeal__info--semibold").text(),
  );
  const amount = parseEuroAmount(amountText);
  const audienceLabel = cleanText(
    $(item).find(".singlemeal__info").text().replace(amountText, ""),
  );

  const audience = audienceLabelToKey(audienceLabel);

  if (amount === null || !audience) {
    return null;
  }

  return {
    audience,
    amount,
    currency: "EUR",
  };
}

function parseMetric(
  $: CheerioAPI,
  metric: DomElement,
): SustainabilityMetric | null {
  const element = $(metric);
  const label = cleanText(
    element.find(".eaternity__element-img span").first().text(),
  );
  const value = cleanText(
    element.find(".eaternity__element-img span").eq(1).text(),
  );
  const rating = element.find(
    '.eaternity__element-rating img[src*="star-highlight"]',
  ).length;

  if (!label) {
    return null;
  }

  return {
    label,
    rating,
    ...(value ? { value } : {}),
  };
}

function parseEuroAmount(value: string): number | null {
  const match = value.replace(/\s+/g, "").match(/(\d+(?:,\d+)?)/);

  if (!match) {
    return null;
  }

  return Number.parseFloat(match[1].replace(",", "."));
}

function audienceLabelToKey(label: string): Price["audience"] | null {
  const normalized = label.toLowerCase();

  if (normalized.includes("studierende")) {
    return "students";
  }

  if (normalized.includes("bedienstete")) {
    return "staff";
  }

  if (normalized.includes("gäste")) {
    return "guests";
  }

  return null;
}

function absoluteUrl(path: string | undefined): string | undefined {
  if (!path) {
    return undefined;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${STWHH_ORIGIN}${path}`;
  }

  return undefined;
}

function cleanText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
