import cors from "@fastify/cors";
import {
  healthResponseSchema,
  locationsResponseSchema,
  menuResponseSchema,
  weekMenuResponseSchema,
} from "@mensa/shared";
import Fastify from "fastify";

import { DEFAULT_LOCATION_ID, listLocations } from "./locations";
import { MenuService, type MenuServiceShape } from "./menu-service";

interface BuildAppOptions {
  menuService?: MenuServiceShape;
}

export async function buildApp({
  menuService = new MenuService(),
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

  app.get("/api/v1/locations/:locationId/menu/week", async (request, reply) => {
    const { locationId } = request.params as { locationId: string };
    const { week = "this_week" } = request.query as { week?: string };

    try {
      const validWeek = week === "next_week" ? "next_week" : "this_week";
      return weekMenuResponseSchema.parse(
        await menuService.getWeekMenu(locationId, validWeek),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const statusCode = message.startsWith("Unsupported location") ? 404 : 502;

      reply.code(statusCode);

      return {
        error: message,
      };
    }
  });

  return app;
}
