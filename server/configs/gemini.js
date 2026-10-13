import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Gemini sometimes returns 503 when a model is under high demand,
// so fall back to the next one instead of failing the request.
const models = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];

async function main(prompt) {
  let lastError;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      return response.text
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export default main;
