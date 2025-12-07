import React, { useState } from 'react';
import { Building2, Search, Globe, TrendingUp, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { analyzeCompanyProducts } from '../services/openai';

interface CompanyProduct {
  name: string;
  category: string;
  hsCode: string;
  confidence: number;
  isDualUse: boolean;
}

interface CompanyProfile {
  name: string;
  website: string;
  industry: string;
  products: CompanyProduct[];
  riskLevel: 'Low' | 'Medium' | 'High';
}

export default function CompanyAnalysis() {
  const [companyName, setCompanyName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const analysis = await analyzeCompanyProducts(companyName.trim());
      
      const profile: CompanyProfile = {
        name: companyName,
        website: `https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
        industry: analysis.industry,
        products: analysis.products,
        riskLevel: analysis.riskLevel
      };
      
      setCompanyProfile(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Company analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Company Product Analysis</h2>
            <p className="text-sm text-gray-600">Analyze a company's product portfolio for HS code classification</p>
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name (e.g., Apple, Tesla, Microsoft)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              required
            />
          </div>
          <button
            type="submit"
           disabled={isAnalyzing || !companyName.trim() || !import.meta.env.VITE_OPENAI_API_KEY}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isAnalyzing ? (
              <>
               <Loader2 className="w-4 h-4 animate-spin" />
               <span>AI Analyzing...</span>
              </>
           ) : !import.meta.env.VITE_OPENAI_API_KEY ? (
             <span>Configure API Key</span>
            ) : (
              <>
                <Search className="w-4 h-4" />
               <span>AI Analyze</span>
              </>
            )}
          </button>
        </form>

       {error && (
         <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
           <div className="flex items-start space-x-3">
             <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
             <div>
               <h4 className="text-sm font-medium text-red-800 mb-1">Analysis Error</h4>
               <p className="text-sm text-red-700">{error}</p>
             </div>
           </div>
         </div>
       )}

        {isAnalyzing && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
             <Loader2 className="w-5 h-5 animate-spin text-blue-600 mt-0.5" />
              <div>
               <h4 className="text-sm font-medium text-blue-900 mb-1">AI Analysis in Progress</h4>
                <div className="text-sm text-blue-700 space-y-1">
                 <p>• Analyzing company product portfolio</p>
                 <p>• Cross-referencing with HS code database</p>
                  <p>• Identifying dual-use products and technologies</p>
                  <p>• Generating HS code classifications</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {companyProfile && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{companyProfile.name}</h3>
                <p className="text-indigo-100">{companyProfile.industry}</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(companyProfile.riskLevel)}`}>
                  {companyProfile.riskLevel} Risk
                </div>
                <a 
                  href={companyProfile.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white hover:text-indigo-200 transition-colors"
                >
                  <Globe className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold text-gray-900">Product Portfolio Analysis</h4>
              <div className="text-sm text-gray-600">
                {companyProfile.products.length} products identified
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {companyProfile.products.map((product, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 mb-1">{product.name}</h5>
                      <p className="text-sm text-gray-600">{product.category}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {product.isDualUse && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Dual-Use
                        </span>
                      )}
                      <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {product.hsCode}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Confidence:</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              product.confidence >= 95 ? 'bg-green-500' :
                              product.confidence >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${product.confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{product.confidence}%</span>
                      </div>
                    </div>
                    
                    <button className="text-blue-600 hover:text-blue-500 text-sm font-medium flex items-center space-x-1">
                      <span>View Details</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{companyProfile.products.length}</div>
                  <div className="text-sm text-gray-600">Products Analyzed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">
                    {companyProfile.products.filter(p => p.isDualUse).length}
                  </div>
                  <div className="text-sm text-gray-600">Dual-Use Items</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(companyProfile.products.reduce((acc, p) => acc + p.confidence, 0) / companyProfile.products.length)}%
                  </div>
                  <div className="text-sm text-gray-600">Avg. Confidence</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}