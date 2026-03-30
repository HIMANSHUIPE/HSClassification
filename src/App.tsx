import React, { useState } from 'react';
import LeftSidebar from './components/LeftSidebar';
import ResultsPanel from './components/ResultsPanel';
import FollowUpModal from './components/FollowUpModal';
import { classifyProduct, sendFollowUpQuestion, ClassificationResult } from './services/hsClassifier';

function App() {
  const [productInput, setProductInput] = useState('');
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
      <LeftSidebar
        productInput={productInput}
        setProductInput={setProductInput}
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
