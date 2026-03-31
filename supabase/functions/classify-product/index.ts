import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai@4.73.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ClassificationRequest {
  productDescription: string;
  country: string;
  activeModes: string[];
  type: 'classify' | 'followup';
  question?: string;
}

interface ClassificationResult {
  hs_code: string;
  description: string;
  confidence: number;
  country_code: string | null;
  alternatives: Array<{ code: string; reason: string; conf: number }>;
  gri_steps: Array<{ rule: string; title: string; verdict: string }>;
  duties: Array<{ country: string; rate: string; note?: string | null }>;
  risks: Array<{ icon: string; text: string; level: 'low' | 'medium' | 'high' }>;
  similar: Array<{ code: string; desc: string }>;
}

const SYSTEM_PROMPT = `You are a world-class customs classification expert with 20+ years experience applying WCO General Rules of Interpretation (GRI). You classify products to HS codes with high accuracy.

Return ONLY valid JSON in this exact structure (no markdown, no preamble):
{
  "hs_code": "6-digit HS code string",
  "description": "Official WCO tariff description for this code (1-2 sentences)",
  "confidence": number 0-100,
  "country_code": "4-digit country-specific extension if applicable, else null",
  "alternatives": [
    {"code": "6-digit string", "reason": "Why this could also apply (max 60 chars)", "conf": number}
  ],
  "gri_steps": [
    {"rule": "1", "title": "Essential character test", "verdict": "How GRI 1 applies to this product (max 80 chars)"},
    {"rule": "3b", "title": "Most specific description", "verdict": "Why this heading beats alternatives (max 80 chars)"}
  ],
  "duties": [
    {"country": "🇺🇸 USA (MFN)", "rate": "X.X%", "note": "optional FTA note"},
    {"country": "🇪🇺 EU (TARIC)", "rate": "X.X%", "note": null},
    {"country": "🇮🇳 India", "rate": "XX%", "note": null},
    {"country": "🇨🇳 China", "rate": "XX%", "note": null}
  ],
  "risks": [
    {"icon": "✅", "text": "No export control restrictions identified", "level": "low"}
  ],
  "similar": [
    {"code": "xxxxxx", "desc": "Similar product classified here in BTI rulings"}
  ]
}

Rules:
- Apply GRI 1 first (headings and legal notes), then GRI 3 if needed
- Only include 2-3 alternatives (not the primary code)
- Include 2-4 GRI steps actually relevant to this product
- Duty rates should be realistic MFN approximations
- Risk flags: check for dual-use, antidumping, licensing, banned substances
- Confidence: be honest — ambiguous products get 60-75%, clear-cut ones get 88-95%`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const requestData: ClassificationRequest = await req.json();

    if (requestData.type === 'followup' && requestData.question) {
      // Handle follow-up question
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a world-class customs classification expert. Provide detailed, accurate answers to questions about HS codes, tariffs, and trade compliance.",
          },
          { role: "user", content: requestData.question },
        ],
        temperature: 0.5,
      });

      const answer = response.choices[0]?.message?.content || "No response received";

      return new Response(
        JSON.stringify({ answer }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      // Handle product classification
      const userMessage = `Classify this product for country ${requestData.country}: ${requestData.productDescription}

Active analysis modes: ${requestData.activeModes.join(', ')}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Strip markdown code fences if present
      const cleanedContent = content
        .replace(/^```json\n?/gm, "")
        .replace(/\n?```$/gm, "")
        .trim();

      const result: ClassificationResult = JSON.parse(cleanedContent);

      return new Response(
        JSON.stringify(result),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    console.error("Error in classify-product function:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
