import React from 'react';
import { ExternalLink, AlertTriangle, CheckCircle, TrendingUp, Clock, Building2 } from 'lucide-react';

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
  links?: {
    wto: string;
    wcoomic: string;
    chapter: string;
    detailed: string;
    search: string;
  };
}

interface ResultsDisplayProps {
  results: ClassificationResult[];
  isLoading: boolean;
}

export default function ResultsDisplay({ results, isLoading }: ResultsDisplayProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-green-600 bg-green-100';
    if (confidence >= 85) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 95) return 'High Confidence';
    if (confidence >= 85) return 'Medium Confidence';
    return 'Low Confidence';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="text-gray-600">
            <p className="font-medium">Processing Classification...</p>
            <p className="text-sm">Analyzing product specifications and cross-referencing HS database</p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="bg-gray-100 h-4 rounded animate-pulse"></div>
          <div className="bg-gray-100 h-4 rounded animate-pulse w-3/4"></div>
          <div className="bg-gray-100 h-4 rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Classify</h3>
        <p className="text-gray-500">
          Enter a product name or specification to get started with HS code classification.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {results.map((result) => (
        <div key={result.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {result.productName}
                </h3>
                {result.customerName && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                    <Building2 className="w-4 h-4" />
                    <span>Customer: {result.customerName}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{result.timestamp.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(result.confidence)}`}>
                  {result.confidence}% {getConfidenceText(result.confidence)}
                </div>
                {result.isDualUse && (
                  <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Dual-Use</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">HS Code</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-mono font-bold text-blue-800">
                        {result.hsCode}
                      </span>
                      {result.links && (
                        <a
                          href={result.links.search}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-500 transition-colors"
                          title="Search this HS Code"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Chapter</h4>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {result.chapter}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {result.description}
                  </p>
                  {result.reasoning && (
                    <div className="mt-2">
                      <h5 className="text-xs font-medium text-gray-700 mb-1">AI Reasoning</h5>
                      <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                        {result.reasoning}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Confidence Analysis</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Classification Accuracy</span>
                      <span className="text-sm font-medium">{result.confidence}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          result.confidence >= 95 ? 'bg-green-500' :
                          result.confidence >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${result.confidence}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {result.isDualUse && (
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-800 mb-1">Dual-Use Item Detected</h4>
                    <p className="text-sm text-amber-700">
                      This product may have both civilian and military applications. Additional export controls 
                      and licensing requirements may apply. Please consult with trade compliance specialists.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">AI-Powered Classification</span>
              </div>
              
              <div className="flex items-center space-x-3">
                {result.links && (
                  <>
                    <a
                      href={result.links.chapter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-500 text-sm font-medium transition-colors"
                    >
                      <span>Chapter {result.hsCode.substring(0, 2)}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={result.links.search}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-green-600 hover:text-green-500 text-sm font-medium transition-colors"
                    >
                      <span>HS Database</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={result.links.detailed}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-500 text-sm font-medium transition-colors"
                    >
                      <span>US Tariff</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}