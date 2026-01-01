import React, { useState } from 'react';
import { Network, Target, Zap, ChevronRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LOGO_URL = 'https://d64gsuwffb70l.cloudfront.net/6906bb3c71e38f27025f3702_1764911901727_6285940b.png';


const steps = [
  { icon: null, title: 'Welcome to PSS Orange', desc: 'Your lightweight CRM for solar sales & business development. Track customers, partners, and opportunities in one place.', color: 'bg-orange-500', useLogo: true },
  { icon: Network, title: '5 Degrees of Separation', desc: 'Discover hidden connections in your network. See how contacts link to decision makers, regulators, and bankers.', color: 'bg-blue-500', useLogo: false },
  { icon: Target, title: 'Track Your Pipeline', desc: 'Monitor opportunities from prospect to won. Set next actions and never miss a follow-up.', color: 'bg-purple-500', useLogo: false },
  { icon: Zap, title: 'Quick Capture', desc: 'Log calls, meetings, and notes instantly. Tap the + button anytime to capture activities on the go.', color: 'bg-amber-500', useLogo: false },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden">
        <div className={`${current.color} p-8 text-white text-center`}>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {current.useLogo ? (
              <img src={LOGO_URL} alt="PSS Orange Logo" className="w-12 h-12 object-contain" />
            ) : Icon ? (
              <Icon className="w-8 h-8" />
            ) : null}
          </div>
          <h2 className="text-xl font-bold">{current.title}</h2>
        </div>
        <div className="p-6">
          <p className="text-gray-600 text-center mb-6">{current.desc}</p>
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-orange-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">Skip</button>
            <button onClick={() => isLast ? onClose() : setStep(s => s + 1)} className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 flex items-center justify-center gap-1">
              {isLast ? 'Get Started' : 'Next'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
