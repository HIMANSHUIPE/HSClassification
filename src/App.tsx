import React, { useState } from 'react';
import { Building2, BookOpen } from 'lucide-react';
import LeftSidebar from './components/LeftSidebar';
import ResultsPanel from './components/ResultsPanel';
import FollowUpModal from './components/FollowUpModal';
import CustomerAnalysis from './components/CustomerAnalysis';
import ResourceLinks from './components/ResourceLinks';
import { classifyProduct, sendFollowUpQuestion, ClassificationResult } from './services/hsClassifier';
import { DatabaseService } from './services/database';

type ViewMode = 'classify' | 'customers' | 'resources';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('classify');
  const [productInput, setProductInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [activeModes, setActiveModes] = useState({
    gri: true,
    duty: true,
    risk: true,
    similar: false,
  });
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [followUpModal, setFollowUpModal] = useState<{
    isOpen: boolean;
    question: string;
    answer: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    question: '',
    answer: '',
    isLoading: false,
  });

  const toggleMode = (mode: 'gri' | 'duty' | 'risk' | 'similar') => {
    setActiveModes((prev) => ({
      ...prev,
      [mode]: !prev[mode],
    }));
  };

  const handleClassify = async () => {
    if (!productInput.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const activeModesArray = Object.entries(activeModes)
        .filter(([_, isActive]) => isActive)
        .map(([mode]) => mode);

      const classification = await classifyProduct(productInput, selectedCountry, activeModesArray);
      setResult(classification);

      try {
        await DatabaseService.saveClassification({
          product_name: productInput,
          customer_name: customerName || undefined,
          hs_code: classification.hs_code,
          chapter: `Chapter ${classification.hs_code.substring(0, 2)}`,
          description: classification.description,
          confidence: classification.confidence,
          is_dual_use: classification.risks?.some(r => r.text.toLowerCase().includes('dual-use')) || false,
          reasoning: classification.gri_steps?.map(s => s.verdict).join('; '),
        });
      } catch (dbError) {
        console.error('Failed to save to database:', dbError);
      }
    } catch (error) {
      console.error('Classification error:', error);
      alert(error instanceof Error ? error.message : 'Classification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPrompt = async (question: string) => {
    setFollowUpModal({
      isOpen: true,
      question,
      answer: '',
      isLoading: true,
    });

    try {
      const answer = await sendFollowUpQuestion(question);
      setFollowUpModal((prev) => ({
        ...prev,
        answer,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Follow-up question error:', error);
      setFollowUpModal((prev) => ({
        ...prev,
        answer: error instanceof Error ? error.message : 'Failed to get answer',
        isLoading: false,
      }));
    }
  };

  const closeFollowUpModal = () => {
    setFollowUpModal({
      isOpen: false,
      question: '',
      answer: '',
      isLoading: false,
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {viewMode === 'classify' && (
        <>
          <LeftSidebar
            productInput={productInput}
            setProductInput={setProductInput}
            customerName={customerName}
            setCustomerName={setCustomerName}
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
            activeModes={activeModes}
            toggleMode={toggleMode}
            onClassify={handleClassify}
            isLoading={isLoading}
          />

          <ResultsPanel
            result={result}
            isLoading={isLoading}
            activeModes={activeModes}
            onSendPrompt={handleSendPrompt}
          />
        </>
      )}

      {viewMode === 'customers' && (
        <div className="flex-1 overflow-y-auto p-8 pb-24">
          <CustomerAnalysis />
        </div>
      )}

      {viewMode === 'resources' && (
        <div className="flex-1 overflow-y-auto p-8 pb-24">
          <ResourceLinks />
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="flex items-center justify-center space-x-2 p-3">
          <button
            onClick={() => setViewMode('classify')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              viewMode === 'classify'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span>⚡</span>
            <span>Classify</span>
          </button>
          <button
            onClick={() => setViewMode('customers')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              viewMode === 'customers'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Customers</span>
          </button>
          <button
            onClick={() => setViewMode('resources')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              viewMode === 'resources'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Resources</span>
          </button>
        </div>
      </div>

      <FollowUpModal
        isOpen={followUpModal.isOpen}
        onClose={closeFollowUpModal}
        question={followUpModal.question}
        answer={followUpModal.answer}
        isLoading={followUpModal.isLoading}
      />
    </div>
  );
}

export default App;
