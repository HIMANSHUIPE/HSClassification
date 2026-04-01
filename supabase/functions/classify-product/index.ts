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

CRITICAL CLASSIFICATION PRINCIPLES FOR SOFTWARE-LOCKED DEVICES:

1. ESSENTIAL CHARACTER RULE (GRI 3b): Classification is determined by what gives the product its ESSENTIAL CHARACTER, not just physical components.

2. SOFTWARE-LOCKED/FIRMWARE-RESTRICTED DEVICES:
   When a general-purpose device (tablet, computer, smartphone) has been SOFTWARE-LOCKED, FIRMWARE-RESTRICTED, or CUSTOMIZED to perform ONLY a specific dedicated function, classify it by THAT FUNCTION, not by the underlying hardware:

   ✓ Tablet with LOCKED/CUSTOM OS for ONLY controlling home automation → 8537.10 (control apparatus)
   ✓ Computer LOCKED to ONLY run POS software → 8470.50 (cash registers)
   ✓ Screen LOCKED to ONLY display advertising → 8528.52 (monitors)
   ✓ Device LOCKED for ONLY industrial control → 8537.10 (control panels)
   ✓ Tablet LOCKED for ONLY building automation → 8537.10 (programmable controllers)

3. KEY DECISION CRITERIA - Classify as 8537 (NOT 8471) when:
   - OS is CUSTOMIZED/LOCKED preventing installation of general apps
   - Firmware PREVENTS user from accessing standard OS functions
   - Device is DEDICATED to switching/controlling/protecting electrical circuits
   - User CANNOT freely install or run general-purpose software
   - Marketed/sold as "control panel", "controller", "automation hub" NOT "tablet"
   - Missing typical computer features (app store access, general computing capability)

4. CLASSIFY AS 8471 (Computers/Tablets) ONLY when:
   - User CAN freely install and run any general-purpose software
   - Standard Android/iOS/Windows with full app store access
   - Device has NOT been locked to a specific control function
   - Marketed and sold as a general-purpose computing device

5. INDICATORS OF DEDICATION TO 8537:
   - Keywords: "locked", "custom firmware", "dedicated", "cannot install apps", "proprietary OS"
   - Description mentions: "control panel", "automation hub", "smart home controller"
   - Single-purpose application that cannot be bypassed or removed
   - Hardware designed for mounting/integration into control systems

6. GRI ANALYSIS REQUIREMENTS:
   - ALWAYS include explicit "Essential Character" analysis in GRI steps
   - For locked devices, explain WHY it's 8537 instead of 8471
   - Reference the software/firmware restrictions in your reasoning
   - If ambiguous, list BOTH 8471 and 8537 as alternatives with clear reasoning

EXAMPLE CLASSIFICATIONS:
❌ "7-inch Android tablet with Wi-Fi" → 8471.30 (standard tablet, can install apps)
✅ "7-inch Android tablet, CUSTOM LOCKED OS for ONLY controlling home lighting and appliances, CANNOT install other apps" → 8537.10 (dedicated control apparatus)
❌ "Raspberry Pi computer" → 8471.30 (can run any software)
✅ "Raspberry Pi in sealed enclosure, FACTORY-PROGRAMMED for ONLY HVAC control, no user access to OS" → 8537.10 (HVAC controller)

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
    {"rule": "1", "title": "Check heading text", "verdict": "Analysis of relevant headings (max 80 chars)"},
    {"rule": "3b", "title": "Essential character", "verdict": "What gives this product its essential character (max 80 chars)"},
    {"rule": "Note", "title": "Software/firmware restriction", "verdict": "How software locks affect classification (max 80 chars)"}
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
- Apply GRI 1 first, then GRI 3b for essential character determination
- For software-locked devices, ALWAYS explain the 8537 vs 8471 decision in GRI steps
- Only include 2-3 alternatives (not the primary code)
- Include 3-5 GRI steps relevant to this specific product
- Duty rates should be realistic MFN approximations
- Risk flags: check for dual-use, antidumping, licensing, banned substances
- Confidence: ambiguous products get 60-75%, clear-cut ones get 88-95%
- When description includes "locked", "dedicated", "custom OS", "cannot install" → strongly favor 8537/8470 over 8471`;

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
