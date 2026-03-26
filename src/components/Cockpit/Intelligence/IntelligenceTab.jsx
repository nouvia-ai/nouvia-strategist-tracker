import { useState } from 'react';
import IntelligenceMap from './IntelligenceMap';
import KnowledgeGaps from './KnowledgeGaps';
import DocExplorer from './DocExplorer';
import InjectWorkflow from './InjectWorkflow';
import UsageAnalytics from './UsageAnalytics';

const TABS = [
  { id: 'map', label: 'Map' },
  { id: 'gaps', label: 'Gaps' },
  { id: 'explorer', label: 'Explorer' },
  { id: 'inject', label: 'Inject' },
  { id: 'usage', label: 'Usage' },
];

export default function IntelligenceTab() {
  const [activeTab, setActiveTab] = useState('map');

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-gray-200 pb-px overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
              ${activeTab === tab.id ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'map' && <IntelligenceMap />}
      {activeTab === 'gaps' && <KnowledgeGaps />}
      {activeTab === 'explorer' && <DocExplorer />}
      {activeTab === 'inject' && <InjectWorkflow />}
      {activeTab === 'usage' && <UsageAnalytics />}
    </div>
  );
}
