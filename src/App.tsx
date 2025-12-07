import React, { useState } from 'react';
import { useEffect } from 'react';
import { Search, Building2, AlertTriangle, ExternalLink, TrendingUp, Database, Globe, Shield, Settings } from 'lucide-react';
import ClassificationForm from './components/ClassificationForm';
import ResultsDisplay from './components/ResultsDisplay';
import SearchHistory from './components/SearchHistory';
import CompanyAnalysis from './components/CompanyAnalysis';
import { classifyProduct, generateWTOLink } from './services/openai';
import { DatabaseService, ClassificationInsert } from './services/database';

interface ClassificationResult {
  id: string;
  productName: string;
  hsCode: string;
  chapter: string;
  description: string;
  confidence: number;
  wtoLink: string;
  isDualUse: boolean;
  timestamp: Date;
  customerName?: string;
  reasoning?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'classify' | 'history' | 'company' | 'settings'>('classify');
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load search history on component mount
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      setError(null);
      const { data } = await DatabaseService.getClassifications({
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      // Convert database records to ClassificationResult format
      const convertedResults: ClassificationResult[] = data.map(record => ({
        id: record.id,
        productName: record.product_name,
        hsCode: record.hs_code,
        chapter: record.chapter,
        description: record.description,
        confidence: record.confidence,
        wtoLink: record.wto_links?.search || '',
        isDualUse: record.is_dual_use,
        timestamp: new Date(record.created_at),
        customerName: record.customer_name,
        reasoning: record.reasoning,
        links: record.wto_links
      }));

      setResults(convertedResults);
    } catch (err) {
      console.error('Failed to load search history:', err);
      setError('Unable to connect to database. Please check your connection and try again.');
      setResults([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleClassification = async (productName: string, customerName?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const classification = await classifyProduct(productName, customerName);
      
      const links = generateWTOLink(classification.hsCode);
      
      const result: ClassificationResult = {
        id: Date.now().toString(),
        productName,
        hsCode: classification.hsCode,
        chapter: classification.chapter,
        description: classification.description,
        confidence: classification.confidence,
        wtoLink: links.search,
        isDualUse: classification.isDualUse,
        timestamp: new Date(),
        customerName,
        reasoning: classification.reasoning,
        links
      };
      
      // Save to database
      try {
        const dbRecord: ClassificationInsert = {
          product_name: productName,
          customer_name: customerName,
          hs_code: classification.hsCode,
          chapter: classification.chapter,
          description: classification.description,
          confidence: classification.confidence,
          is_dual_use: classification.isDualUse,
          reasoning: classification.reasoning,
          wto_links: links
        };
        
        await DatabaseService.saveClassification(dbRecord);
      } catch (dbError) {
        console.error('Failed to save to database:', dbError);
        // Continue with local storage even if database save fails
      }
      
      setResults(prev => [result, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Classification failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">HS Code Classifier</h1>
                <p className="text-sm text-gray-500">International Trade Compliance System</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {import.meta.env.VITE_OPENAI_API_KEY && import.meta.env.VITE_SUPABASE_URL ? 'AI + Database' : 'Configure APIs'}
              </div>
              <Shield className={`w-5 h-5 ${import.meta.env.VITE_OPENAI_API_KEY && import.meta.env.VITE_SUPABASE_URL ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { key: 'classify', label: 'Product Classification', icon: Search },
              { key: 'history', label: 'Search History', icon: Database },
              { key: 'company', label: 'Company Analysis', icon: Building2 },
              { key: 'settings', label: 'API Settings', icon: Settings }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'classify' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <ClassificationForm onSubmit={handleClassification} isLoading={isLoading} error={error} />
            </div>
            <div className="lg:col-span-2">
              <ResultsDisplay results={results} isLoading={isLoading} />
            </div>
          </div>
        )}
        
        {activeTab === 'history' && (
          <SearchHistory results={results} isLoading={isLoadingHistory} onRefresh={loadSearchHistory} />
        )}
        
        {activeTab === 'company' && (
          <CompanyAnalysis />
        )}
        
        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <Settings className="w-5 h-5 text-gray-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">API Configuration</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">OpenAI API Setup</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-900 mb-2">Configuration Required</h4>
                    <p className="text-sm text-blue-800 mb-3">
                      To get real HS code classifications, you need to configure your OpenAI API key in the .env file.
                    </p>
                    <div className="bg-white rounded border p-3 font-mono text-sm">
                      <div className="text-gray-600"># Add to .env file:</div>
                      <div className="text-blue-600">VITE_OPENAI_API_KEY=your_api_key_here</div>
                      <div className="text-blue-600">VITE_OPENAI_MODEL=gpt-4</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">API Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        import.meta.env.VITE_OPENAI_API_KEY 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {import.meta.env.VITE_OPENAI_API_KEY ? 'Configured' : 'Not Configured'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Model:</span>
                      <span className="ml-2 text-gray-600">
                        {import.meta.env.VITE_OPENAI_MODEL || 'gpt-4 (default)'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">How to Get OpenAI API Key</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI API Keys page</a></li>
                    <li>Sign in to your OpenAI account or create a new one</li>
                    <li>Click "Create new secret key"</li>
                    <li>Copy the generated API key</li>
                    <li>Add it to your .env file as shown above</li>
                    <li>Restart the development server</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-500">
                © 2025 HS Code Classifier. Powered by OpenAI & WTO Harmonized System Database.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="https://www.wto.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-500 flex items-center space-x-1"
              >
                <span>WTO Official</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;