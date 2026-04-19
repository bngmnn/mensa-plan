import {
  getIntentName,
  getRequestType,
  type HandlerInput,
  SkillBuilders,
} from "ask-sdk-core";
import type { IntentRequest, Response } from "ask-sdk-model";

import { getAlexaSkillConfig } from "./config";
import { resolveMenuDayRequest } from "./day-resolution";
import { fetchMenu } from "./menu-api";
import { buildMenuSpeech, buildReprompt, buildWelcomeSpeech } from "./speech";

const LaunchRequestHandler = {
  canHandle(handlerInput: HandlerInput) {
    return getRequestType(handlerInput.requestEnvelope) === "LaunchRequest";
  },
  handle(handlerInput: HandlerInput) {
    const config = getAlexaSkillConfig();
    return handlerInput.responseBuilder
      .speak(buildWelcomeSpeech(config.locationName))
      .reprompt(buildReprompt())
      .getResponse();
  },
};

const GetMenuIntentHandler = {
  canHandle(handlerInput: HandlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      getIntentName(handlerInput.requestEnvelope) === "GetMenuIntent"
    );
  },
  async handle(handlerInput: HandlerInput): Promise<Response> {
    const config = getAlexaSkillConfig();
    const request = handlerInput.requestEnvelope.request as IntentRequest;
    const slotValue = request.intent.slots?.day?.value;
    const day = resolveMenuDayRequest(slotValue, new Date(), config.timeZone);
    const menu = await fetchMenu(day);
    const speech = buildMenuSpeech(menu);

    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt(buildReprompt())
      .withSimpleCard(config.locationName, speech)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput: HandlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      getIntentName(handlerInput.requestEnvelope) === "AMAZON.HelpIntent"
    );
  },
  handle(handlerInput: HandlerInput) {
    const speech = `${buildReprompt()} Du kannst auch fragen: Was gibt es am Freitag?`;

    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt(speech)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput: HandlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      ["AMAZON.CancelIntent", "AMAZON.StopIntent"].includes(
        getIntentName(handlerInput.requestEnvelope),
      )
    );
  },
  handle(handlerInput: HandlerInput) {
    return handlerInput.responseBuilder.speak("Bis bald.").getResponse();
  },
};

const FallbackIntentHandler = {
  canHandle(handlerInput: HandlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      getIntentName(handlerInput.requestEnvelope) === "AMAZON.FallbackIntent"
    );
  },
  handle(handlerInput: HandlerInput) {
    const speech = `Das habe ich noch nicht verstanden. ${buildReprompt()}`;

    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt(speech)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput: HandlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === "SessionEndedRequest"
    );
  },
  handle(handlerInput: HandlerInput) {
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput: HandlerInput, error: Error) {
    const speech =
      error.message.startsWith("MENSA_API_BASE_URL") ||
      error.message.startsWith("Menu API returned")
        ? "Ich konnte gerade nicht auf den Mensa Plan zugreifen."
        : "Beim Abrufen des Mensa Plans ist etwas schiefgelaufen.";

    return handlerInput.responseBuilder
      .speak(`${speech} Bitte versuche es gleich noch einmal.`)
      .reprompt(buildReprompt())
      .getResponse();
  },
};

function createSkillBuilder() {
  return SkillBuilders.custom()
    .addRequestHandlers(
      LaunchRequestHandler,
      GetMenuIntentHandler,
      HelpIntentHandler,
      CancelAndStopIntentHandler,
      FallbackIntentHandler,
      SessionEndedRequestHandler,
    )
    .addErrorHandlers(ErrorHandler);
}

export const skill = createSkillBuilder().create();

export const handler = createSkillBuilder().lambda();
