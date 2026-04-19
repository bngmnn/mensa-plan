import type { Dish, MenuResponse } from "@mensa/shared";

export function buildWelcomeSpeech(locationName: string): string {
  return `Willkommen beim ${locationName} Plan. Du kannst mich fragen, was es heute, morgen oder an einem Wochentag gibt.`;
}

export function buildMenuSpeech(menu: MenuResponse): string {
  const dishes = menu.categories.flatMap((category) => category.dishes);

  if (dishes.length === 0) {
    return `Für ${menu.location.name} konnte ich für den gewünschten Tag leider keine Gerichte finden.`;
  }

  const intro = `Am ${formatGermanDate(menu.serviceDate)} gibt es in ${menu.location.name} ${buildDishCount(dishes.length)}.`;
  const summary = dishes.slice(0, 3).map(formatDishSummary).join(" ");
  const staleNote = menu.isStale
    ? "Achtung, die Daten stammen noch aus dem letzten erfolgreichen Abruf."
    : "";

  return [intro, summary, staleNote].filter(Boolean).join(" ");
}

export function buildReprompt(): string {
  return "Du kannst zum Beispiel fragen: Was gibt es heute in der Mensa?";
}

function buildDishCount(count: number): string {
  return count === 1 ? "ein Gericht" : `${count} Gerichte`;
}

function formatDishSummary(dish: Dish): string {
  const category = dish.category ? `In ${dish.category}` : "Heute";
  const indicators = dish.indicators.map((indicator) => indicator.label);
  const qualifier =
    indicators.length > 0 ? `, ${indicators.slice(0, 2).join(" und ")}` : "";

  return `${category} gibt es ${dish.name}${qualifier}.`;
}

function formatGermanDate(isoDate: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}
