import "dotenv/config";

import type { Handler } from "@netlify/functions";
import verifier from "alexa-verifier";

import { skill } from "../../apps/alexa/src/index";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  const rawBody = decodeRequestBody(event.body, event.isBase64Encoded);
  const signature = getHeader(event.headers, "signature");
  const certChainUrl = getHeader(event.headers, "signaturecertchainurl");

  if (!rawBody || !signature || !certChainUrl) {
    return {
      statusCode: 400,
      body: "Missing Alexa signature headers or body.",
    };
  }

  try {
    await verifier(certChainUrl, signature, rawBody);
  } catch {
    return {
      statusCode: 401,
      body: "Alexa request verification failed.",
    };
  }

  try {
    const requestEnvelope = JSON.parse(rawBody);
    const responseEnvelope = await skill.invoke(requestEnvelope);

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(responseEnvelope),
    };
  } catch {
    return {
      statusCode: 400,
      body: "Invalid Alexa request payload.",
    };
  }
};

function decodeRequestBody(
  body: string | null,
  isBase64Encoded: boolean,
): string {
  if (!body) {
    return "";
  }

  return isBase64Encoded ? Buffer.from(body, "base64").toString("utf8") : body;
}

function getHeader(
  headers: Record<string, string | undefined>,
  name: string,
): string | undefined {
  const match = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );

  return match?.[1];
}
