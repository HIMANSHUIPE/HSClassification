import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai@4.73.1";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
  duties: Array<{ country: string; rate: string; note?: string | null; verified?: boolean }>;
  risks: Array<{ icon: string; text: string; level: 'low' | 'medium' | 'high' }>;
  similar: Array<{ code: string; desc: string }>;
}

function extractCountryCode(countryString: string): string {
  if (countryString.includes('USA')) return 'USA';
  if (countryString.includes('EU')) return 'EU';
  if (countryString.includes('India')) return 'IN';
  if (countryString.includes('China')) return 'CN';
  if (countryString.includes('UK') || countryString.includes('GB')) return 'GB';
  return 'USA';
}

function formatRate(rate: number, unit: string): string {
  if (unit === '%') return `${rate}%`;
  return `${rate} ${unit}`;
}

async function fetchTariffRate(
  supabase: any,
  hsCode: string,
  origin: string,
  destination: string
): Promise<any> {
  try {
    const cleanCode = hsCode.replace(/\./g, '');

    // Check cache first
    const { data: cached } = await supabase
      .from('tariff_rates')
      .select('*')
      .eq('hs_code', cleanCode)
      .eq('country_origin', origin)
      .eq('country_destination', destination)
      .order('last_verified', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      const verifiedDate = new Date(cached.last_verified);
      const now = new Date();
      const daysSince = (now.getTime() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince < 30) {
        return {
          dutyRate: parseFloat(cached.duty_rate),
          rateUnit: cached.rate_unit,
          source: cached.source,
          isVerified: true
        };
      }
    }

    // Fetch from USITC API for USA
    if (destination === 'USA' || destination === 'US') {
      try {
        const searchCode = cleanCode.substring(0, Math.min(10, cleanCode.length));
        const response = await fetch(
          `https://hts.usitc.gov/reststop/hts?search=${searchCode}&format=json`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const generalRate = result.general || '0';
            const rateMatch = generalRate.match(/(\d+\.?\d*)/);
            const dutyRate = rateMatch ? parseFloat(rateMatch[1]) : 0;

            // Cache the result
            await supabase.from('tariff_rates').insert({
              hs_code: cleanCode,
              country_origin: origin,
              country_destination: destination,
              duty_rate: dutyRate,
              duty_type: 'MFN',
              rate_unit: generalRate.includes('%') ? '%' : generalRate,
              effective_date: new Date().toISOString().split('T')[0],
              source: 'USITC',
              source_url: `https://hts.usitc.gov/?query=${searchCode}`,
              notes: `Special rates: ${result.special || 'N/A'}`,
              last_verified: new Date().toISOString()
            });

            return {
              dutyRate,
              rateUnit: generalRate.includes('%') ? '%' : generalRate,
              source: 'USITC',
              isVerified: true
            };
          }
        }
      } catch (err) {
        console.error('USITC API error:', err);
      }
    }

    // Return cached even if old, or null
    if (cached) {
      return {
        dutyRate: parseFloat(cached.duty_rate),
        rateUnit: cached.rate_unit,
        source: cached.source,
        isVerified: false
      };
    }

    return null;
  } catch (err) {
    console.error('Error fetching tariff rate:', err);
    return null;
  }
}

const SYSTEM_PROMPT = `You are a world-class customs classification expert with 30+ years experience applying WCO General Rules of Interpretation (GRI) across ALL HS chapters (01-99). You handle edge cases, composite goods, and complex classification scenarios with precision.

═══════════════════════════════════════════════════════════════════════════════
COMPREHENSIVE CLASSIFICATION FRAMEWORK - ALL PRODUCTS & EDGE CASES
═══════════════════════════════════════════════════════════════════════════════

I. FOUNDATIONAL PRINCIPLES (Apply to ALL classifications)

1. GENERAL RULES OF INTERPRETATION (GRI) - Sequential Application:
   - GRI 1: Classification by headings and section/chapter notes (MOST IMPORTANT)
   - GRI 2(a): Incomplete/unfinished articles classified as complete if have essential character
   - GRI 2(b): Mixtures and combinations of materials/substances
   - GRI 3: Composite goods or goods answering to multiple headings
     • GRI 3(a): Most specific description prevails
     • GRI 3(b): Essential character determines classification
     • GRI 3(c): Last heading in numerical order (last resort)
   - GRI 4: Goods not classifiable by above rules → most similar goods
   - GRI 5: Containers and packing materials
   - GRI 6: Subheadings compared at same level only

2. ESSENTIAL CHARACTER DOCTRINE (Critical for edge cases):
   - What gives the product its PRIMARY PURPOSE and IDENTITY?
   - Consider: Function, material composition, bulk, value, role in use
   - NOT just physical components - consider software locks, intended use, marketing

II. COMPREHENSIVE EDGE CASE CATEGORIES

A. SOFTWARE-LOCKED / FIRMWARE-RESTRICTED DEVICES
   CRITICAL: When general hardware is SOFTWARE-LOCKED to ONE specific function → Classify by THAT FUNCTION, not underlying hardware

   Examples:
   ✓ Tablet LOCKED for ONLY home automation control → 8537.10 (NOT 8471)
   ✓ Computer LOCKED to ONLY run POS → 8470.50 (NOT 8471)
   ✓ Smartphone LOCKED as dedicated barcode scanner → 8471.90 or 8543.70 (NOT 8517)
   ✓ Display LOCKED for ONLY digital signage → 8528.52 (monitors, NOT computers)
   ✓ Device LOCKED for ONLY payment processing → 8470.50 (NOT 8471)

   Decision Matrix:
   - Can user install general apps? → If NO, classify by dedicated function
   - Is OS accessible/modifiable? → If NO, classify by dedicated function
   - Sold as "controller/terminal/kiosk"? → Classify by function not hardware

B. COMPOSITE GOODS & SETS (GRI 3)
   - Retail Sets: Essential character prevails
   - Machines with Integrated Computers: Machine heading wins (Section XV Note)
   - Multi-Material Products: Material giving essential character determines

C. INCOMPLETE / UNFINISHED GOODS (GRI 2(a))
   - Unfinished article with essential character → Classify as complete
   - Missing critical components → Classify as parts

D. DUAL-USE & MULTI-FUNCTION PRODUCTS
   - Convertible/hybrid devices → Primary function determines
   - Professional vs consumer → Actual function, not marketing

E. FOODSTUFFS & PREPARATIONS (Chapters 01-24)
   - Processed vs unprocessed critical distinction
   - Mixtures → Essential ingredient or Chapter 21 preparations
   - Dietary supplements → Check medicament vs food supplement boundary

F. TEXTILES & APPAREL (Chapters 50-63)
   - Mixed fiber → Predominant material by weight
   - Special function clothing → Function may override material
   - Coated fabrics → Textile unless coating dominates

G. CHEMICALS & PLASTICS (Chapters 28-39)
   - Defined vs undefined chemical composition matters
   - Mixtures and solutions → Check for specific headings first
   - Plastic articles vs raw plastic distinction

H. MACHINERY & ELECTRICAL (Chapters 84-85)
   - Parts vs complete machines: Integration determines
   - New energy/EV components: Specific headings exist
   - Semiconductors: Packaging state matters

I. VEHICLES & TRANSPORT (Chapters 86-89)
   - Electric vs traditional: Same headings typically
   - Drones: Recreational vs commercial distinction
   - E-bikes: Motor power threshold matters

J. PRECISION INSTRUMENTS (Chapter 90)
   - Medical vs scientific vs measuring distinction
   - Optical goods classification by function
   - VR/AR headsets → Check end use

K. JEWELRY, ART & COLLECTIBLES (Chapters 71, 97)
   - Precious metal content determines jewelry heading
   - Antiques: Age threshold (100 years)
   - Artworks: Medium and authorship matter

L. TOYS, GAMES & SPORTS (Chapter 95)
   - Electronic games consoles → 9504.50
   - Distinguish toys from sporting goods
   - Exercise equipment → 9506

III. SECTION & CHAPTER NOTES - MANDATORY
   - Section XV Note 1(m): Machines with integrated computers → Machine heading
   - Section XVI Note 2: Base metal essential character rules
   - Always check relevant notes before finalizing

IV. CLASSIFICATION DECISION TREE
   Step 1: Identify ALL features and materials
   Step 2: Check exclusion notes
   Step 3: Identify potentially applicable headings (GRI 1)
   Step 4: Apply GRI 3 if multiple headings
   Step 5: For software-locked devices, apply essential character override
   Step 6: Check if parts/accessories to more specific item
   Step 7: Validate against chapter notes
   Step 8: Assign confidence

V. CONFIDENCE SCORING
   95-100%: Single clear heading, established precedent
   85-94%: Clear heading, minor interpretation needed
   75-84%: GRI 3 required, essential character clear
   65-74%: Multiple viable headings, debatable
   50-64%: Significant ambiguity
   <50%: Insufficient information

VI. EDGE CASE RED FLAGS
   🚩 "Multi-purpose", "hybrid", "smart", "convertible"
   🚩 "Locked", "dedicated", "custom firmware", "proprietary"
   🚩 Multiple materials combined
   🚩 Unfinished, kits, sets
   🚩 New technology not in older nomenclature

═══════════════════════════════════════════════════════════════════════════════

Return ONLY valid JSON (no markdown):
{
  "hs_code": "6-digit HS code",
  "description": "Official WCO tariff description",
  "confidence": number 0-100,
  "country_code": "4-digit extension if applicable, else null",
  "alternatives": [
    {"code": "6-digit", "reason": "Why this could apply (max 80 chars)", "conf": number}
  ],
  "gri_steps": [
    {"rule": "GRI 1/2/3/4", "title": "Step name", "verdict": "Analysis (max 100 chars)"},
    {"rule": "3b", "title": "Essential character", "verdict": "What gives essential character (max 100 chars)"}
  ],
  "duties": [
    {"country": "🇺🇸 USA (MFN)", "rate": "X.X%", "note": "optional"},
    {"country": "🇪🇺 EU (TARIC)", "rate": "X.X%", "note": null},
    {"country": "🇮🇳 India", "rate": "XX%", "note": null},
    {"country": "🇨🇳 China", "rate": "XX%", "note": null}
  ],
  "risks": [
    {"icon": "⚠️/✅/🚫", "text": "Risk identified", "level": "low/medium/high"}
  ],
  "similar": [
    {"code": "xxxxxx", "desc": "Similar edge case or BTI ruling"}
  ]
}

CRITICAL REMINDERS:
- Edge cases are common - analyze thoroughly
- Software/firmware locks override hardware classification
- Essential character applies to composite goods
- Section/Chapter notes are legally binding
- List alternatives with clear reasoning
- Provide specific GRI steps used
- Flag controlled goods immediately`;

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

      // Fetch real tariff rates from APIs
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Update duties with real rates
        const updatedDuties = await Promise.all(
          result.duties.map(async (duty) => {
            const countryCode = extractCountryCode(duty.country);
            const originCountry = requestData.country || "CN";

            const tariffRate = await fetchTariffRate(
              supabase,
              result.hs_code,
              originCountry,
              countryCode
            );

            if (tariffRate && tariffRate.isVerified) {
              return {
                country: duty.country,
                rate: formatRate(tariffRate.dutyRate, tariffRate.rateUnit),
                note: tariffRate.source === 'API_UNAVAILABLE'
                  ? 'Estimated - API unavailable'
                  : `Verified via ${tariffRate.source}`,
                verified: tariffRate.isVerified
              };
            }

            return { ...duty, verified: false };
          })
        );

        result.duties = updatedDuties;
      }

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
