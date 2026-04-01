import React from 'react';
import { Copy, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

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

interface ResultsPanelProps {
  result: ClassificationResult | null;
  isLoading: boolean;
  activeModes: {
    gri: boolean;
    duty: boolean;
    risk: boolean;
    similar: boolean;
  };
  onSendPrompt: (prompt: string) => void;
}

export default function ResultsPanel({ result, isLoading, activeModes, onSendPrompt }: ResultsPanelProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatHSCode = (code: string, countryCode: string | null) => {
    const formatted = code.replace(/(\d{2})(\d{2})(\d{2})/, '$1.$2.$3');
    return countryCode ? `${formatted}.${countryCode}` : formatted;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'green';
    if (confidence >= 65) return 'amber';
    return 'blue';
  };

  const getRiskColor = (level: string) => {
    if (level === 'low') return 'green';
    if (level === 'medium') return 'amber';
    return 'red';
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🗂️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to classify</h2>
          <p className="text-sm text-gray-500">Enter product details and select your analysis modes to begin</p>
        </div>
      </div>
    );
  }

  const confidenceColor = getConfidenceColor(result.confidence);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl space-y-3.5">
        {/* Primary Classification Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Primary classification</h3>
            <span className={`px-2 py-1 bg-${confidenceColor}-50 text-${confidenceColor}-700 text-xs font-medium rounded border border-${confidenceColor}-200`}>
              {result.confidence}% confident
            </span>
          </div>

          <div className="font-mono text-4xl font-semibold text-gray-900 mb-3">
            {formatHSCode(result.hs_code, result.country_code)}
          </div>

          <p className="text-sm text-gray-700 mb-4">{result.description}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
              Chapter {result.hs_code.substring(0, 2)}
            </span>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
              Heading {result.hs_code.substring(0, 4)}
            </span>
            <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
              Subheading {result.hs_code}
            </span>
            {result.country_code && (
              <span className="px-3 py-1 bg-gray-50 text-gray-700 text-xs font-medium rounded-full border border-gray-200">
                Extension {result.country_code}
              </span>
            )}
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Confidence</span>
              <span>{result.confidence}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-${confidenceColor}-500`}
                style={{ width: `${result.confidence}%` }}
              ></div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(formatHSCode(result.hs_code, result.country_code))}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-xs font-medium text-gray-700 transition-colors flex items-center space-x-1"
            >
              <Copy className="w-3 h-3" />
              <span>Copy code</span>
            </button>
            <button
              onClick={() => onSendPrompt(`Can you explain why ${result.hs_code} is the correct HS code and what the customs notes say?`)}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-xs font-medium text-gray-700 transition-colors flex items-center space-x-1"
            >
              <span>Ask expert</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              onClick={() => onSendPrompt(`What are the import duty rates for HS code ${result.hs_code} in the US, EU, and India?`)}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-xs font-medium text-gray-700 transition-colors flex items-center space-x-1"
            >
              <span>Get duty rates</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Alternative Classifications */}
        {result.alternatives && result.alternatives.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Alternative classifications to consider</h3>
            <div className="space-y-2">
              {result.alternatives.map((alt, index) => (
                <button
                  key={index}
                  onClick={() => onSendPrompt(`Compare HS code ${result.hs_code} versus ${alt.code}. Which is more accurate and why?`)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-semibold text-gray-900">{formatHSCode(alt.code, null)}</span>
                      <span className="text-sm text-gray-600">{alt.reason}</span>
                    </div>
                    <span className="text-xs text-gray-500">{alt.conf}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GRI Reasoning Chain */}
        {activeModes.gri && result.gri_steps && result.gri_steps.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-900">GRI reasoning chain</h3>
              <p className="text-xs text-gray-500">General Rules of Interpretation</p>
            </div>
            <div className="space-y-2">
              {result.gri_steps.map((step, index) => (
                <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-700">{step.rule}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 mb-1">{step.title}</div>
                      <div className="text-xs text-gray-600">{step.verdict}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Duty Rate Snapshot */}
        {activeModes.duty && result.duties && result.duties.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Duty rate snapshot</h3>
              <div className="flex items-center space-x-2">
                {result.duties.some(d => d.verified) && (
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded border border-green-200 flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Verified rates available</span>
                  </span>
                )}
                {!result.duties.every(d => d.verified) && (
                  <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded border border-amber-200">
                    Some rates estimated
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {result.duties.map((duty, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${
                    duty.verified
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-gray-500">{duty.country}</div>
                    {duty.verified ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" title="Verified from official source" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" title="AI estimated" />
                    )}
                  </div>
                  <div className="text-xl font-semibold text-gray-900 mb-1">{duty.rate}</div>
                  {duty.note && (
                    <div className={`text-xs ${duty.verified ? 'text-green-700' : 'text-gray-600'}`}>
                      {duty.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => onSendPrompt(`What FTA agreements apply to this product and how can I reduce the duty rate?`)}
              className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center justify-center space-x-1"
            >
              <span>Check FTA eligibility</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Compliance Risk Check */}
        {activeModes.risk && result.risks && result.risks.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Compliance risk check</h3>
            <div className="space-y-2">
              {result.risks.map((risk, index) => {
                const riskColor = getRiskColor(risk.level);
                return (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-lg flex-shrink-0">{risk.icon}</span>
                    <div className="flex-1 text-sm text-gray-700">{risk.text}</div>
                    <span className={`px-2 py-1 bg-${riskColor}-50 text-${riskColor}-700 text-xs font-medium rounded border border-${riskColor}-200 flex-shrink-0`}>
                      {risk.level}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Binding Ruling Precedents */}
        {activeModes.similar && result.similar && result.similar.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-900">Binding ruling precedents</h3>
              <p className="text-xs text-gray-500">BTI / CROSS database</p>
            </div>
            <div className="space-y-2">
              {result.similar.map((ruling, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono font-semibold rounded border border-gray-300">
                      {ruling.code}
                    </span>
                    <span className="text-sm text-gray-700">{ruling.desc}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(ruling.code)}
                    className="px-2 py-1 bg-white hover:bg-gray-50 border border-gray-200 rounded text-xs font-medium text-gray-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
