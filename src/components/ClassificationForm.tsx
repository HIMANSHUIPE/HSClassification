import React, { useState } from 'react';
import { Search, Building2, Package, Loader2, AlertTriangle } from 'lucide-react';

interface ClassificationFormProps {
  onSubmit: (productName: string, customerName?: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function ClassificationForm({ onSubmit, isLoading, error }: ClassificationFormProps) {
  const [productName, setProductName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [includeCustomerAnalysis, setIncludeCustomerAnalysis] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (productName.trim()) {
      onSubmit(productName.trim(), includeCustomerAnalysis ? customerName.trim() : undefined);
    }
  };

  const exampleProducts = [
    'Dell XPS 13 laptop computer, aluminum alloy chassis, 13.3-inch LED display, Intel Core i7 processor, 16GB DDR4 RAM, 512GB SSD storage, intended for business and personal computing, portable use in office and home environments',
    'Cisco 4000 Series industrial ethernet router, steel enclosure, 24-port gigabit switch, fiber optic connectivity, intended for industrial automation networks, factory floor installation, temperature range -40°C to +70°C',
    'AES-256 encryption software package, digital security application, intended for data protection in financial institutions, commercial license, Windows/Linux compatible, network security implementation',
    'Siemens MAGNETOM MRI scanner, 1.5 Tesla magnetic field strength, superconducting magnet, intended for medical diagnostic imaging, hospital installation, patient examination of soft tissues and organs',
    'Bosch automotive engine control unit (ECU), aluminum housing, microprocessor-based, intended for fuel injection control in passenger vehicles, automotive aftermarket replacement part'
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Package className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Product Classification</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-2">
            Product Name / Specification *
          </label>
          <textarea
            id="productName"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Please Provide: Material Composition, Intended Use, Place of Use, Function and Technical Details"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            rows={4}
            required
          />
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-900 mb-2">Please Provide: Material Composition, Intended Use, Place of Use, Function and Technical Details</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• <strong>Material Composition:</strong> What is it made of? (steel, plastic, cotton, etc.)</li>
              <li>• <strong>Intended Use:</strong> What is its primary function or purpose?</li>
              <li>• <strong>Place of Use:</strong> Industrial, commercial, household, medical, etc.</li>
              <li>• <strong>Function:</strong> How does it work and what does it do?</li>
              <li>• <strong>Technical Details:</strong> Dimensions, capacity, power, performance, specifications</li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center space-x-3 mb-4">
            <input
              id="includeCustomer"
              type="checkbox"
              checked={includeCustomerAnalysis}
              onChange={(e) => setIncludeCustomerAnalysis(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="includeCustomer" className="text-sm font-medium text-gray-700">
              Include Customer Company Analysis
            </label>
          </div>

          {includeCustomerAnalysis && (
            <div className="space-y-4 ml-7">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Customer Company Name
                </label>
                <input
                  id="customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g., Apple Inc., Tesla Motors, etc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll analyze the company's product portfolio for better classification
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-1">Classification Error</h4>
                <p className="text-sm text-red-700">{error}</p>
                {error.includes('API') && (
                  <p className="text-xs text-red-600 mt-2">
                    Please check your OpenAI API configuration in the Settings tab.
                  </p>
                )}
                {error.includes('database') && (
                  <p className="text-xs text-red-600 mt-2">
                    Database connection issue. Classification saved locally only.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!productName.trim() || isLoading || !import.meta.env.VITE_OPENAI_API_KEY}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI Analyzing Product...</span>
            </>
          ) : !import.meta.env.VITE_OPENAI_API_KEY ? (
            <span>Configure OpenAI API Key</span>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>AI Classify Product</span>
            </>
          )}
        </button>
        
        {!import.meta.env.VITE_OPENAI_API_KEY && (
          <p className="text-xs text-amber-600 text-center">
            OpenAI API key required. Configure in Settings tab.
          </p>
        )}
      </form>

      <div className="mt-8 pt-6 border-t">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Example Products</h3>
        <div className="space-y-2">
          {exampleProducts.map((example, index) => (
            <button
              key={index}
              onClick={() => setProductName(example)}
              className="text-left w-full text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="text-xs font-medium text-amber-900 mb-2">💡 Pro Tip for Better Classifications:</h4>
          <p className="text-xs text-amber-800">
            Instead of "Laptop Computer", try: "Dell XPS 13 laptop computer, aluminum chassis, 
            13.3-inch LCD display, Intel processor, 8GB RAM, intended for business/personal use, 
            portable computing device for office and home environments"
          </p>
        </div>
      </div>
    </div>
  );
}