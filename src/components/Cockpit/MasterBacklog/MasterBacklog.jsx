import { useState, useEffect } from 'react';
import {
  getArchitectureItems,
  subscribeToDeliverItems,
  subscribeToOperateItems,
  subscribeToSalesItems,
  subscribeToMarketingItems,
  subscribeToManualItems,
  updateMasterBacklogItemStatus,
  deleteMasterBacklogItem,
  addMasterBacklogItem,
} from '../../../services/masterBacklogService';
import BacklogBoard from './BacklogBoard';
import BacklogRoadmap from './BacklogRoadmap';
import AddItemModal from './AddItemModal';

const CAPACITY = [
  { key: 'build', label: '🏗 Build', target: 20, color: 'purple' },
  { key: 'deliver', label: '📦 Deliver', target: 15, color: 'blue' },
  { key: 'si', label: '📊 SI', target: 13, color: 'green', keys: ['sales', 'marketing'] },
  { key: 'operate', label: '🧠 Operate', target: 7, color: 'amber' },
];

export default function MasterBacklog() {
  const [items, setItems] = useState({
    build: [], deliver: [], sales: [], marketing: [], operate: [], manual: []
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalStream, setAddModalStream] = useState('manual');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let mounted = true;
    const unsubs = [];

    // Load architecture items (one-time)
    getArchitectureItems().then(archItems => {
      if (!mounted) return;
      setItems(prev => ({
        ...prev,
        build: archItems.filter(i => i.stream === 'build'),
      }));
    }).catch(err => console.warn('Master Backlog: arch load failed', err));

    // Subscribe to live sources — each wrapped to prevent crash
    try {
      unsubs.push(subscribeToDeliverItems(deliverItems => {
        if (!mounted) return;
        setItems(prev => ({ ...prev, deliver: deliverItems }));
      }));
    } catch (e) { console.warn('MB: deliver sub failed', e); }

    try {
      unsubs.push(subscribeToOperateItems(operateItems => {
        if (!mounted) return;
        setItems(prev => ({ ...prev, operate: operateItems }));
      }));
    } catch (e) { console.warn('MB: operate sub failed', e); }

    try {
      unsubs.push(subscribeToSalesItems(salesItems => {
        if (!mounted) return;
        setItems(prev => ({ ...prev, sales: salesItems }));
      }));
    } catch (e) { console.warn('MB: sales sub failed', e); }

    try {
      unsubs.push(subscribeToMarketingItems(marketingItems => {
        if (!mounted) return;
        setItems(prev => ({ ...prev, marketing: marketingItems }));
      }));
    } catch (e) { console.warn('MB: marketing sub failed', e); }

    try {
      unsubs.push(subscribeToManualItems(manualItems => {
        if (!mounted) return;
        setItems(prev => ({ ...prev, manual: manualItems }));
      }));
    } catch (e) { console.warn('MB: manual sub failed', e); }

    setLoading(false);

    return () => {
      mounted = false;
      unsubs.forEach(fn => { try { fn?.(); } catch(e) {} });
    };
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleStatusChange = async (item, newStatus) => {
    try {
      await updateMasterBacklogItemStatus(item, newStatus);
      showToast(`Moved to ${newStatus === 'this_week' ? 'This Week' : newStatus === 'next_week' ? 'Next Week' : newStatus === 'done' ? 'Done' : 'Backlog'}`);
    } catch (err) {
      showToast('Update failed — ' + err.message);
    }
  };

  const handleDelete = async (item) => {
    try {
      await deleteMasterBacklogItem(item);
      showToast('Deleted');
    } catch (err) {
      showToast('Delete failed — ' + err.message);
    }
  };

  const handleAddItem = async (formData) => {
    try {
      await addMasterBacklogItem(formData);
      setShowAddModal(false);
      showToast(`Added to ${formData.stream}`);
    } catch (err) {
      showToast('Add failed — ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Master Backlog</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-gray-200 rounded-xl" />
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  // Compute capacity
  const getCommitted = (keys) => {
    const allItems = keys.flatMap(k => items[k] || []);
    return allItems.filter(i => i.status === 'this_week').reduce((s, i) => s + (i.effortHours || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Capacity bars */}
      <div className="grid grid-cols-4 gap-3">
        {CAPACITY.map(cap => {
          const keys = cap.keys || [cap.key];
          const committed = getCommitted(keys);
          const pct = Math.min(100, (committed / cap.target) * 100);
          const barColor = pct < 80 ? `bg-${cap.color}-400` : pct <= 100 ? `bg-amber-400` : 'bg-red-500';
          const textColor = pct < 80 ? `text-${cap.color}-600` : pct <= 100 ? 'text-amber-600' : 'text-red-600';
          const remaining = cap.target - committed;
          return (
            <div key={cap.key} className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700">{cap.label}</span>
                <span className={`text-xs font-semibold ${textColor}`}>{committed}h / {cap.target}h</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <span className={`text-[10px] ${remaining > 0 ? 'text-gray-400' : 'text-red-500 font-medium'}`}>
                {remaining > 0 ? `${remaining}h remaining` : `⚠ ${Math.abs(remaining)}h over`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Board */}
      <BacklogBoard
        items={items}
        onStatusChange={handleStatusChange}
        onAddItem={(stream) => { setAddModalStream(stream); setShowAddModal(true); }}
        onDelete={handleDelete}
      />

      {/* Roadmap */}
      <div className="border-t border-gray-200 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Roadmap</p>
        <BacklogRoadmap items={items} />
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddItemModal
          defaultStream={addModalStream}
          onSave={handleAddItem}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Toast */}
      {toast && <div className="fixed bottom-4 right-4 bg-green-500 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}
    </div>
  );
}
