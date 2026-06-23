import { GoogleGenerativeAI } from "@google/generative-ai";

// gemini-embedding-001, pinned to 768 dims to match the vector(768) Brain schema
// (multilingual — good for Hindi + English).
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY env var. Set it in .env.local");
}
const genai = new GoogleGenerativeAI(apiKey);
const model = genai.getGenerativeModel({ model: "gemini-embedding-001" });

export async function embed(text: string): Promise<number[]> {
  const res = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    outputDimensionality: 768,
  } as any);
  return res.embedding.values;
}
