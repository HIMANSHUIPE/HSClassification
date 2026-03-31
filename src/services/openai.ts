export interface HSCodeClassification {
  hsCode: string;
  chapter: string;
  description: string;
  confidence: number;
  isDualUse: boolean;
  reasoning: string;
}

export interface CompanyProductAnalysis {
  products: Array<{
    name: string;
    category: string;
    hsCode: string;
    confidence: number;
    isDualUse: boolean;
  }>;
  industry: string;
  riskLevel: 'Low' | 'Medium' | 'High';
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-product`;

export async function classifyProduct(
  productName: string,
  customerName?: string
): Promise<HSCodeClassification> {
  const prompt = `
You are an expert in international trade and HS (Harmonized System) code classification.
Analyze the following product and provide accurate HS code classification.

Product: ${productName}
${customerName ? `Customer Company: ${customerName}` : ''}

Please provide a JSON response with the following structure:
{
  "hsCode": "XXXX.XX.XX",
  "chapter": "XX - Chapter description",
  "description": "Detailed product description matching HS nomenclature",
  "confidence": 85,
  "isDualUse": false,
  "reasoning": "Explanation of classification logic and confidence level"
}

Requirements:
1. Use the most current HS 2022 nomenclature
2. Provide 8-digit HS code (6-digit international + 2-digit national)
3. Confidence score should be realistic (70-99%)
4. Mark as dual-use if product has both civilian and military applications
5. Include clear reasoning for the classification
6. Ensure the chapter description matches the HS code

Be precise and conservative with confidence scores. If uncertain, explain why in the reasoning.
`;

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        question: prompt,
        type: 'followup'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Classification failed');
    }

    const data = await response.json();
    const answer = data.answer;

    if (!answer) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const jsonMatch = answer.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from OpenAI');
    }

    const classification: HSCodeClassification = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!classification.hsCode || !classification.chapter || !classification.description) {
      throw new Error('Incomplete classification data from OpenAI');
    }

    return classification;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error(`Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzeCompanyProducts(companyName: string): Promise<CompanyProductAnalysis> {
  const prompt = `
Analyze the company "${companyName}" and identify their main product categories for HS code classification.

Please provide a JSON response with the following structure:
{
  "products": [
    {
      "name": "Product name",
      "category": "Product category",
      "hsCode": "XXXX.XX.XX",
      "confidence": 85,
      "isDualUse": false
    }
  ],
  "industry": "Primary industry sector",
  "riskLevel": "Low|Medium|High"
}

Requirements:
1. Identify 3-6 main product categories for this company
2. Provide accurate HS codes using HS 2022 nomenclature
3. Assess dual-use potential for each product
4. Determine overall risk level based on dual-use products and industry
5. Use realistic confidence scores (70-99%)

Focus on the company's primary commercial products and their trade classification implications.
`;

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        question: prompt,
        type: 'followup'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Company analysis failed');
    }

    const data = await response.json();
    const answer = data.answer;

    if (!answer) {
      throw new Error('No response from OpenAI');
    }

    const jsonMatch = answer.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from OpenAI');
    }

    const analysis: CompanyProductAnalysis = JSON.parse(jsonMatch[0]);

    if (!analysis.products || !Array.isArray(analysis.products) || analysis.products.length === 0) {
      throw new Error('Invalid company analysis data from OpenAI');
    }

    return analysis;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error(`Company analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function generateWTOLink(hsCode: string): string {
  // Generate multiple useful links for HS code research
  const baseCode = hsCode.substring(0, 6); // Use 6-digit international code
  const chapter = hsCode.substring(0, 2); // First 2 digits for chapter
  
  return {
    wto: `https://www.wto.org/english/res_e/booksp_e/tariff_profiles_e.htm`,
    wcoomic: `https://www.wcoomd.org/en/topics/nomenclature/instrument-and-tools/hs-nomenclature-2022-edition/hs-nomenclature-2022-edition.aspx`,
    chapter: `https://www.foreign-trade.com/reference/hscode.cfm?code=${chapter}`,
    detailed: `https://hts.usitc.gov/current`,
    search: `https://www.tariffnumber.com/2022/${baseCode}`
  };
}