import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'x-application-name': 'hs-code-classifier',
    },
  },
});

export interface ClassificationRecord {
  id: string;
  product_name: string;
  customer_name?: string;
  hs_code: string;
  chapter: string;
  description: string;
  confidence: number;
  is_dual_use: boolean;
  reasoning?: string;
  wto_links?: {
    wto: string;
    wcoomic: string;
    chapter: string;
    detailed: string;
    search: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ClassificationInsert {
  product_name: string;
  customer_name?: string;
  hs_code: string;
  chapter: string;
  description: string;
  confidence: number;
  is_dual_use: boolean;
  reasoning?: string;
  wto_links?: {
    wto: string;
    wcoomic: string;
    chapter: string;
    detailed: string;
    search: string;
  };
}

export class DatabaseService {
  private static async retryOperation<T>(
    operation: () => Promise<T>,
    retries = 2,
    delay = 1000
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && error instanceof Error && error.message.includes('Failed to fetch')) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryOperation(operation, retries - 1, delay * 1.5);
      }
      throw error;
    }
  }

  static async saveClassification(classification: ClassificationInsert): Promise<ClassificationRecord> {
    return this.retryOperation(async () => {
      const { data, error } = await supabase
        .from('classifications')
        .insert([classification])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to save classification: ${error.message}`);
      }

      return data;
    });
  }

  static async getClassifications(options?: {
    limit?: number;
    offset?: number;
    searchTerm?: string;
    dualUseOnly?: boolean;
    sortBy?: 'created_at' | 'confidence' | 'product_name';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: ClassificationRecord[]; count: number }> {
    return this.retryOperation(async () => {
      let query = supabase
        .from('classifications')
        .select('*', { count: 'exact' });

    // Apply search filter
    if (options?.searchTerm) {
      const searchTerm = options.searchTerm.trim();
      
      // Use individual filters to ensure index usage
      if (searchTerm.match(/^\d{4}(\.\d{2}(\.\d{2})?)?$/)) {
        // If it looks like an HS code, search HS codes first (uses idx_classifications_hs_code)
        query = query.ilike('hs_code', `%${searchTerm}%`);
      } else {
        // For text searches, use OR condition but structure to use indexes
        query = query.or(`product_name.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,hs_code.ilike.%${searchTerm}%`);
      }
    }

    // Apply dual-use filter
    if (options?.dualUseOnly) {
      // Uses idx_classifications_is_dual_use
      query = query.eq('is_dual_use', true);
    }

    // Apply sorting
    const sortBy = options?.sortBy || 'created_at';
    const sortOrder = options?.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

      const { data, error, count } = await query;

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to fetch classifications: ${error.message}`);
      }

      return { data: data || [], count: count || 0 };
    });
  }

  // Get a specific classification by ID
  static async getClassificationById(id: string): Promise<ClassificationRecord | null> {
    const { data, error } = await supabase
      .from('classifications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Database error:', error);
      throw new Error(`Failed to fetch classification: ${error.message}`);
    }

    return data;
  }

  // Update an existing classification
  static async updateClassification(id: string, updates: Partial<ClassificationInsert>): Promise<ClassificationRecord> {
    const { data, error } = await supabase
      .from('classifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to update classification: ${error.message}`);
    }

    return data;
  }

  // Delete a classification
  static async deleteClassification(id: string): Promise<void> {
    const { error } = await supabase
      .from('classifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to delete classification: ${error.message}`);
    }
  }

  // Get classification statistics
  static async getStatistics(): Promise<{
    totalClassifications: number;
    dualUseCount: number;
    averageConfidence: number;
    topChapters: Array<{ chapter: string; count: number }>;
  }> {
    // Get total count and dual-use count
    const { data: stats, error: statsError } = await supabase
      .from('classifications')
      .select('confidence, is_dual_use, chapter');

    if (statsError) {
      console.error('Database error:', statsError);
      throw new Error(`Failed to fetch statistics: ${statsError.message}`);
    }

    const totalClassifications = stats.length;
    const dualUseCount = stats.filter(s => s.is_dual_use).length;
    const averageConfidence = stats.length > 0 
      ? Math.round(stats.reduce((sum, s) => sum + s.confidence, 0) / stats.length)
      : 0;

    // Get top chapters
    const chapterCounts = stats.reduce((acc, s) => {
      const chapter = s.chapter.split(' - ')[0]; // Extract chapter number
      acc[chapter] = (acc[chapter] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topChapters = Object.entries(chapterCounts)
      .map(([chapter, count]) => ({ chapter, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalClassifications,
      dualUseCount,
      averageConfidence,
      topChapters
    };
  }

  // Search for similar products
  static async findSimilarProducts(productName: string, limit = 5): Promise<ClassificationRecord[]> {
    // Use ILIKE for pattern matching which can utilize idx_classifications_product_name
    const { data, error } = await supabase
      .from('classifications')
      .select('*')
      .ilike('product_name', `%${productName}%`)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return [];
    }

    return data || [];
  }

  // Get classifications by HS code - utilizes idx_classifications_hs_code
  static async getClassificationsByHSCode(hsCode: string): Promise<ClassificationRecord[]> {
    const { data, error } = await supabase
      .from('classifications')
      .select('*')
      .eq('hs_code', hsCode) // Uses idx_classifications_hs_code
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to fetch classifications by HS code: ${error.message}`);
    }

    return data || [];
  }

  // Get classifications by customer - utilizes idx_classifications_customer_name
  static async getClassificationsByCustomer(customerName: string): Promise<ClassificationRecord[]> {
    const { data, error } = await supabase
      .from('classifications')
      .select('*')
      .eq('customer_name', customerName) // Uses idx_classifications_customer_name
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to fetch classifications by customer: ${error.message}`);
    }

    return data || [];
  }

  // Get dual-use classifications - utilizes idx_classifications_is_dual_use
  static async getDualUseClassifications(): Promise<ClassificationRecord[]> {
    const { data, error } = await supabase
      .from('classifications')
      .select('*')
      .eq('is_dual_use', true) // Uses idx_classifications_is_dual_use
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to fetch dual-use classifications: ${error.message}`);
    }

    return data || [];
  }

  // Additional methods to ensure all indexes are utilized
  
  // Search products by name pattern - uses idx_classifications_product_name
  static async searchProductsByName(productName: string, limit = 10): Promise<ClassificationRecord[]> {
    const { data, error } = await supabase
      .from('classifications')
      .select('*')
      .ilike('product_name', `%${productName}%`) // Uses idx_classifications_product_name
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return [];
    }

    return data || [];
  }

  // Get classifications by HS code pattern - uses idx_classifications_hs_code
  static async searchByHSCodePattern(hsCodePattern: string): Promise<ClassificationRecord[]> {
    const { data, error } = await supabase
      .from('classifications')
      .select('*')
      .ilike('hs_code', `${hsCodePattern}%`) // Uses idx_classifications_hs_code
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return [];
    }

    return data || [];
  }

  // Get classifications by customer pattern - uses idx_classifications_customer_name
  static async searchCustomersByPattern(customerPattern: string): Promise<ClassificationRecord[]> {
    const { data, error } = await supabase
      .from('classifications')
      .select('*')
      .ilike('customer_name', `%${customerPattern}%`) // Uses idx_classifications_customer_name
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return [];
    }

    return data || [];
  }
}