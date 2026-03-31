export interface ClassificationResult {
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

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-product`;

export async function classifyProduct(
  productDescription: string,
  country: string,
  activeModes: string[]
): Promise<ClassificationResult> {
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        productDescription,
        country,
        activeModes,
        type: 'classify'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Classification failed');
    }

    const result: ClassificationResult = await response.json();
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Classification failed: ${error.message}`);
    }
    throw new Error('Classification failed with an unknown error');
  }
}

export async function sendFollowUpQuestion(question: string): Promise<string> {
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        question,
        type: 'followup'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Follow-up question failed');
    }

    const data = await response.json();
    return data.answer || 'No response received';
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Follow-up question failed: ${error.message}`);
    }
    throw new Error('Follow-up question failed with an unknown error');
  }
}
