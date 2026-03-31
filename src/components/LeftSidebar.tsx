import React from 'react';
import { Globe } from 'lucide-react';

interface LeftSidebarProps {
  productInput: string;
  setProductInput: (value: string) => void;
  customerName: string;
  setCustomerName: (value: string) => void;
  selectedCountry: string;
  setSelectedCountry: (value: string) => void;
  activeModes: {
    gri: boolean;
    duty: boolean;
    risk: boolean;
    similar: boolean;
  };
  toggleMode: (mode: 'gri' | 'duty' | 'risk' | 'similar') => void;
  onClassify: () => void;
  isLoading: boolean;
}

const COUNTRIES = [
  { code: 'US', name: 'United States (HTS 10-digit)', flag: '🇺🇸' },
  { code: 'EU', name: 'European Union (TARIC)', flag: '🇪🇺' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
];

const EXAMPLES = [
  {
    label: 'Dell XPS 13 laptop computer',
    text: 'Dell XPS 13 laptop, aluminum chassis, Intel i7 processor, 16GB RAM, 512GB SSD, Li-ion battery, 13.4 inch OLED display, USB-C Thunderbolt ports',
  },
  {
    label: 'Cotton t-shirt, men\'s casual wear',
    text: '100% organic cotton t-shirt, knitted fabric, short sleeve, crew neck, men\'s, for casual wear, 180 GSM fabric weight',
  },
  {
    label: 'Industrial hydraulic pump',
    text: 'Industrial hydraulic pump, steel housing, 200 bar max pressure, 50L/min flow rate, electric motor driven, used in manufacturing machinery',
  },
  {
    label: 'Paracetamol 500mg tablets',
    text: 'Pharmaceutical grade paracetamol tablets 500mg, blister pack of 20, for human therapeutic use, oral administration',
  },
];

export default function LeftSidebar({
  productInput,
  setProductInput,
  customerName,
  setCustomerName,
  selectedCountry,
  setSelectedCountry,
  activeModes,
  toggleMode,
  onClassify,
  isLoading,
}: LeftSidebarProps) {
  return (
    <div className="w-[380px] bg-white border-r border-gray-200 flex flex-col h-screen overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start space-x-3 mb-3">
          <div className="bg-gray-900 p-2 rounded-lg">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">HS Classifier Pro</h1>
            <p className="text-xs text-gray-500">GRI-powered · Multi-country · Audit-ready</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded border border-blue-200">
            WCO 2022
          </span>
          <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded border border-green-200">
            95%+ Accuracy
          </span>
          <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded border border-amber-200">
            GRI Reasoning
          </span>
        </div>
      </div>

      <div className="p-6 space-y-4 flex-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Customer name (optional)
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g., Acme Corp, ABC Industries"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product specification
          </label>
          <textarea
            value={productInput}
            onChange={(e) => setProductInput(e.target.value)}
            placeholder="Include: material composition, function, intended end use, technical specifications, dimensions, manufacturing process, etc."
            className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target country
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            disabled={isLoading}
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Analysis modes
          </label>
          <div className="space-y-2">
            <button
              onClick={() => toggleMode('gri')}
              disabled={isLoading}
              className={`w-full p-3 border rounded-lg text-left transition-all ${
                activeModes.gri
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-2">
                <span className="text-lg">⚖️</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">GRI step-by-step reasoning</div>
                  <div className="text-xs text-gray-500">General Rules of Interpretation logic</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => toggleMode('duty')}
              disabled={isLoading}
              className={`w-full p-3 border rounded-lg text-left transition-all ${
                activeModes.duty
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-2">
                <span className="text-lg">💰</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Duty rate analysis</div>
                  <div className="text-xs text-gray-500">Tariff rates + FTA eligibility</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => toggleMode('risk')}
              disabled={isLoading}
              className={`w-full p-3 border rounded-lg text-left transition-all ${
                activeModes.risk
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-2">
                <span className="text-lg">🔍</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Compliance risk flags</div>
                  <div className="text-xs text-gray-500">Restricted items, licensing, antidumping</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => toggleMode('similar')}
              disabled={isLoading}
              className={`w-full p-3 border rounded-lg text-left transition-all ${
                activeModes.similar
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-2">
                <span className="text-lg">🔀</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Similar product precedents</div>
                  <div className="text-xs text-gray-500">Binding rulings & BTI database</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <button
          onClick={onClassify}
          disabled={isLoading || !productInput.trim()}
          className="w-full py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Classifying...' : 'Classify with AI'}
        </button>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Quick examples
          </label>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example, index) => (
              <button
                key={index}
                onClick={() => setProductInput(example.text)}
                disabled={isLoading}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-700 transition-colors disabled:opacity-50"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
