import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { content, targetLanguage, isJson } = await req.json();

        if (!content || !targetLanguage) {
            return NextResponse.json(
                { error: "Missing content or targetLanguage" },
                { status: 400 }
            );
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY is not set");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 }
            );
        }

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        let prompt = "";

        if (isJson) {
            prompt = `
        You are a professional translator. 
        Translate the values in the following JSON object to ${targetLanguage}.
        Keep the keys exactly the same. Only translate the values.
        Return ONLY the valid JSON string, no markdown formatting.
        
        JSON to translate:
        ${JSON.stringify(content)}
      `;
        } else {
            prompt = `
        You are a professional translator.
        Translate the following text to ${targetLanguage}.
        Return ONLY the translated text, no other commentary.
        
        Text to translate:
        "${content}"
      `;
        }

        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Clean up potential markdown formatting from Gemini
        if (isJson) {
            text = text.replace(/```json\n?|\n?```/g, "").trim();
            try {
                const jsonResponse = JSON.parse(text);
                return NextResponse.json({ translatedContent: jsonResponse });
            } catch (e) {
                console.error("Failed to parse Gemini JSON response:", text);
                return NextResponse.json(
                    { error: "Failed to parse translation response" },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({ translatedContent: text.trim() });

    } catch (error: any) {
        console.error("Translation API Error:", error);
        return NextResponse.json(
            { error: error.message || "Translation failed" },
            { status: 500 }
        );
    }
}
