import cors from "@fastify/cors";
import {
  dishImageResponseSchema,
  healthResponseSchema,
  locationsResponseSchema,
  menuResponseSchema,
} from "@mensa/shared";
import Fastify from "fastify";

import { ImageService, type ImageServiceShape } from "./image-service";
import { DEFAULT_LOCATION_ID, listLocations } from "./locations";
import { MenuService, type MenuServiceShape } from "./menu-service";

interface BuildAppOptions {
  menuService?: MenuServiceShape;
  imageService?: ImageServiceShape;
}

export async function buildApp({
  menuService = new MenuService(),
  imageService = new ImageService(),
}: BuildAppOptions = {}) {
  const app = Fastify({
    logger: false,
  });

  await app.register(cors, {
    origin: true,
  });

  app.get("/health/live", async () =>
    healthResponseSchema.parse({
      status: "ok",
      checkedAt: new Date().toISOString(),
    }),
  );

  app.get("/health/ready", async (_, reply) => {
    const cache = await menuService.getReadiness(DEFAULT_LOCATION_ID);
    const payload = healthResponseSchema.parse({
      status: cache === "empty" ? "degraded" : "ok",
      checkedAt: new Date().toISOString(),
      details: {
        source: "stwhh",
        cache,
      },
    });

    if (payload.status === "degraded") {
      reply.code(503);
    }

    return payload;
  });

  app.get("/api/v1/locations", async () =>
    locationsResponseSchema.parse({
      locations: listLocations(),
    }),
  );

  app.get("/api/v1/images/search", async (request, reply) => {
    const { q = "" } = request.query as { q?: string };

    try {
      return dishImageResponseSchema.parse(
        await imageService.searchDishImage(q),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const statusCode = message.startsWith("Image query")
        ? 400
        : message.startsWith("PIXABAY_API_KEY")
          ? 503
          : 502;

      reply.code(statusCode);

      return {
        error: message,
      };
    }
  });

  app.get("/api/v1/locations/:locationId/menu", async (request, reply) => {
    const { locationId } = request.params as { locationId: string };
    const { day = "today" } = request.query as { day?: string };

    try {
      return menuResponseSchema.parse(
        await menuService.getMenu(locationId, day),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const statusCode = message.startsWith("Unsupported location")
        ? 404
        : message.startsWith("Invalid day")
          ? 400
          : 502;

      reply.code(statusCode);

      return {
        error: message,
      };
    }
  });

  return app;
}
