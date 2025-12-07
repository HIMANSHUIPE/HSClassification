import React, { useState } from 'react';
import { Clock, Download, Filter, Search, AlertTriangle, Building2, RefreshCw, BarChart3 } from 'lucide-react';
import { DatabaseService } from '../services/database';

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
  links?: {
    wto: string;
    wcoomic: string;
    chapter: string;
    detailed: string;
    search: string;
  };
}

interface SearchHistoryProps {
  results: ClassificationResult[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function SearchHistory({ results, isLoading, onRefresh }: SearchHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDualUse, setFilterDualUse] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'confidence' | 'product'>('date');
  const [statistics, setStatistics] = useState<{
    totalClassifications: number;
    dualUseCount: number;
    averageConfidence: number;
    topChapters: Array<{ chapter: string; count: number }>;
  } | null>(null);
  const [showStats, setShowStats] = useState(false);

  // Load statistics
  const loadStatistics = async () => {
    try {
      const stats = await DatabaseService.getStatistics();
      setStatistics(stats);
      setShowStats(true);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const filteredResults = results
    .filter(result => 
      result.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.hsCode.includes(searchTerm) ||
      (result.customerName && result.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter(result => !filterDualUse || result.isDualUse)
    .sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence - a.confidence;
        case 'product':
          return a.productName.localeCompare(b.productName);
        case 'date':
        default:
          return b.timestamp.getTime() - a.timestamp.getTime();
      }
    });

  const exportToCSV = () => {
    const headers = ['Product Name', 'HS Code', 'Chapter', 'Confidence', 'Dual Use', 'Customer', 'Timestamp'];
    const csvData = filteredResults.map(result => [
      result.productName,
      result.hsCode,
      result.chapter,
      `${result.confidence}%`,
      result.isDualUse ? 'Yes' : 'No',
      result.customerName || '',
      result.timestamp.toISOString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hs-code-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Panel */}
      {showStats && statistics && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Classification Statistics</h3>
            <button
              onClick={() => setShowStats(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.totalClassifications}</div>
              <div className="text-sm text-gray-600">Total Classifications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{statistics.dualUseCount}</div>
              <div className="text-sm text-gray-600">Dual-Use Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.averageConfidence}%</div>
              <div className="text-sm text-gray-600">Avg. Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{statistics.topChapters.length}</div>
              <div className="text-sm text-gray-600">Active Chapters</div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Top HS Chapters</h4>
            <div className="space-y-2">
              {statistics.topChapters.map((chapter, index) => (
                <div key={chapter.chapter} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Chapter {chapter.chapter}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 bg-blue-500 rounded-full"
                        style={{ width: `${(chapter.count / statistics.totalClassifications) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{chapter.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Classification History</h2>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={loadStatistics}
              className="inline-flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Statistics</span>
            </button>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={exportToCSV}
              disabled={results.length === 0}
              className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products, HS codes, or customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterDualUse}
                onChange={(e) => setFilterDualUse(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Dual-Use Only</span>
            </label>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'confidence' | 'product')}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="date">Sort by Date</option>
            <option value="confidence">Sort by Confidence</option>
            <option value="product">Sort by Product</option>
          </select>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Showing {filteredResults.length} of {results.length} classifications
          {import.meta.env.VITE_SUPABASE_URL && (
            <span className="ml-2 text-green-600">• Database Connected</span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading History</h3>
          <p className="text-gray-500">Fetching classification history from database...</p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
          <p className="text-gray-500">
            {results.length === 0 
              ? 'No classification history available yet.'
              : 'No results match your current filters.'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    HS Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResults.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {result.productName}
                        </div>
                        {result.customerName && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                            <Building2 className="w-3 h-3" />
                            <span>{result.customerName}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono font-medium text-gray-900">
                        {result.hsCode}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className={`h-2 rounded-full ${
                              result.confidence >= 95 ? 'bg-green-500' :
                              result.confidence >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${result.confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{result.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {result.isDualUse && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Dual-Use
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {result.timestamp.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}