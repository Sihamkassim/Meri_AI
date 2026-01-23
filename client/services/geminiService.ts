
import { GoogleGenAI } from "@google/genai";
import { CAMPUS_NODES } from "../constants";

export class CampusAIService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ Gemini API Key is missing! Please set NEXT_PUBLIC_GEMINI_API_KEY in your .env file.");
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || 'MISSING_KEY' });
  }

  async getCampusInfo(query: string): Promise<string> {
    const campusContext = `
      You are the official ASTU Route AI Assistant for Adama Science and Technology University (ASTU).
      Your goal is to help students, staff, and visitors navigate the campus and provide information about facilities.
      
      Campus Facilities:
      ${CAMPUS_NODES.map(node => `- ${node.name}: ${node.description} (${node.category})`).join('\n')}
      
      Instructions:
      1. Be professional, academic, and helpful.
      2. If asked for a location, tell them what it is and its general area.
      3. If asked for a route, suggest common paths.
      4. Avoid slang; maintain a formal university tone.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: query,
        config: {
          systemInstruction: campusContext,
          temperature: 0.7,
        }
      });
      return response.text || "I'm sorry, I couldn't process that request at the moment.";
    } catch (error) {
      console.error("AI Service Error:", error);
      return "The AI assistant is currently unavailable. Please refer to the official university maps.";
    }
  }
}

export const campusAI = new CampusAIService();
