import { supabase } from './database';

export interface TariffRate {
  hsCode: string;
  countryOrigin: string;
  countryDestination: string;
  dutyRate: number;
  dutyType: string;
  rateUnit: string;
  effectiveDate: string;
  expiryDate?: string;
  source: string;
  sourceUrl?: string;
  additionalDuties?: Record<string, any>;
  notes?: string;
  lastVerified: string;
  isVerified: boolean;
}

interface USITCHTSResponse {
  results?: Array<{
    htsno?: string;
    description?: string;
    general?: string;
    special?: string;
    column2?: string;
  }>;
}

interface WITSResponse {
  reporter?: string;
  year?: string;
  productcode?: string;
  mfntariff?: string;
  btariff?: string;
}

export class TariffAPIService {
  private static readonly CACHE_EXPIRY_DAYS = 30;
  private static readonly USITC_BASE_URL = 'https://hts.usitc.gov/reststop';
  private static readonly WITS_BASE_URL = 'https://wits.worldbank.org/API/V1';

  static async getTariffRate(
    hsCode: string,
    countryOrigin: string,
    countryDestination: string
  ): Promise<TariffRate | null> {
    const cached = await this.getCachedRate(hsCode, countryOrigin, countryDestination);

    if (cached && this.isCacheValid(cached.lastVerified)) {
      return cached;
    }

    let liveRate: TariffRate | null = null;

    if (countryDestination === 'USA' || countryDestination === 'US') {
      liveRate = await this.fetchUSITCRate(hsCode, countryOrigin);
    } else if (countryDestination.startsWith('EU') || countryDestination === 'GB') {
      liveRate = await this.fetchEURate(hsCode, countryOrigin);
    } else {
      liveRate = await this.fetchWITSRate(hsCode, countryOrigin, countryDestination);
    }

    if (liveRate) {
      await this.cacheRate(liveRate);
      return liveRate;
    }

    return cached;
  }

  private static async getCachedRate(
    hsCode: string,
    countryOrigin: string,
    countryDestination: string
  ): Promise<TariffRate | null> {
    try {
      const { data, error } = await supabase
        .from('tariff_rates')
        .select('*')
        .eq('hs_code', hsCode)
        .eq('country_origin', countryOrigin)
        .eq('country_destination', countryDestination)
        .order('last_verified', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      return {
        hsCode: data.hs_code,
        countryOrigin: data.country_origin,
        countryDestination: data.country_destination,
        dutyRate: parseFloat(data.duty_rate),
        dutyType: data.duty_type,
        rateUnit: data.rate_unit,
        effectiveDate: data.effective_date,
        expiryDate: data.expiry_date,
        source: data.source,
        sourceUrl: data.source_url,
        additionalDuties: data.additional_duties,
        notes: data.notes,
        lastVerified: data.last_verified,
        isVerified: this.isCacheValid(data.last_verified),
      };
    } catch (err) {
      console.error('Error fetching cached rate:', err);
      return null;
    }
  }

  private static isCacheValid(lastVerified: string): boolean {
    const verified = new Date(lastVerified);
    const now = new Date();
    const diffDays = (now.getTime() - verified.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays < this.CACHE_EXPIRY_DAYS;
  }

  private static async fetchUSITCRate(
    hsCode: string,
    countryOrigin: string
  ): Promise<TariffRate | null> {
    try {
      const cleanCode = hsCode.replace(/\./g, '');
      const searchCode = cleanCode.substring(0, Math.min(10, cleanCode.length));

      const response = await fetch(
        `${this.USITC_BASE_URL}/hts?search=${searchCode}&format=json`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('USITC API error:', response.status);
        return null;
      }

      const data: USITCHTSResponse = await response.json();

      if (!data.results || data.results.length === 0) {
        return null;
      }

      const result = data.results[0];
      const generalRate = result.general || '0';

      const rateMatch = generalRate.match(/(\d+\.?\d*)/);
      const dutyRate = rateMatch ? parseFloat(rateMatch[1]) : 0;

      return {
        hsCode: cleanCode,
        countryOrigin,
        countryDestination: 'USA',
        dutyRate,
        dutyType: 'MFN',
        rateUnit: generalRate.includes('%') ? '%' : generalRate.includes('/') ? generalRate : '%',
        effectiveDate: new Date().toISOString().split('T')[0],
        source: 'USITC',
        sourceUrl: `https://hts.usitc.gov/?query=${searchCode}`,
        notes: `Special rates: ${result.special || 'N/A'}`,
        lastVerified: new Date().toISOString(),
        isVerified: true,
      };
    } catch (err) {
      console.error('Error fetching USITC rate:', err);
      return null;
    }
  }

  private static async fetchEURate(
    hsCode: string,
    countryOrigin: string
  ): Promise<TariffRate | null> {
    return {
      hsCode,
      countryOrigin,
      countryDestination: 'EU',
      dutyRate: 0,
      dutyType: 'MFN',
      rateUnit: '%',
      effectiveDate: new Date().toISOString().split('T')[0],
      source: 'API_UNAVAILABLE',
      notes: 'EU TARIC API requires authentication. Using estimated rate.',
      lastVerified: new Date().toISOString(),
      isVerified: false,
    };
  }

  private static async fetchWITSRate(
    hsCode: string,
    countryOrigin: string,
    countryDestination: string
  ): Promise<TariffRate | null> {
    try {
      const cleanCode = hsCode.replace(/\./g, '').substring(0, 6);
      const currentYear = new Date().getFullYear() - 1;

      const response = await fetch(
        `${this.WITS_BASE_URL}/Tariff/TradeStats-Tariff?reporter=${countryDestination}&year=${currentYear}&product=${cleanCode}&format=json`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data: WITSResponse[] | WITSResponse = await response.json();
      const records = Array.isArray(data) ? data : [data];

      if (records.length === 0 || !records[0].mfntariff) {
        return null;
      }

      const dutyRate = parseFloat(records[0].mfntariff) || 0;

      return {
        hsCode: cleanCode,
        countryOrigin,
        countryDestination,
        dutyRate,
        dutyType: 'MFN',
        rateUnit: '%',
        effectiveDate: new Date().toISOString().split('T')[0],
        source: 'WITS',
        sourceUrl: `https://wits.worldbank.org/`,
        lastVerified: new Date().toISOString(),
        isVerified: true,
      };
    } catch (err) {
      console.error('Error fetching WITS rate:', err);
      return null;
    }
  }

  private static async cacheRate(rate: TariffRate): Promise<void> {
    try {
      const { error } = await supabase.from('tariff_rates').insert({
        hs_code: rate.hsCode,
        country_origin: rate.countryOrigin,
        country_destination: rate.countryDestination,
        duty_rate: rate.dutyRate,
        duty_type: rate.dutyType,
        rate_unit: rate.rateUnit,
        effective_date: rate.effectiveDate,
        expiry_date: rate.expiryDate,
        source: rate.source,
        source_url: rate.sourceUrl,
        additional_duties: rate.additionalDuties || {},
        notes: rate.notes,
        last_verified: rate.lastVerified,
      });

      if (error) {
        console.error('Error caching tariff rate:', error);
      }
    } catch (err) {
      console.error('Error caching tariff rate:', err);
    }
  }

  static formatDutyRate(rate: TariffRate): string {
    if (rate.rateUnit === '%') {
      return `${rate.dutyRate}%`;
    }
    return `${rate.dutyRate} ${rate.rateUnit}`;
  }
}
