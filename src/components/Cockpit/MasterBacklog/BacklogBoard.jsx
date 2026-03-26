import { useState } from 'react';
import BacklogItemCard from './BacklogItemCard';

const STATUS_COLS = [
  { id: 'this_week', label: 'This Week' },
  { id: 'next_week', label: 'Next Week' },
  { id: 'backlog',   label: 'Backlog' },
];

function StreamSection({ label, desc, target, items, bgClass, borderClass, textClass, dotClass, onStatusChange, onDelete, onAdd, filter }) {
  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter || i.status === 'this_week');
  const doneItems = items.filter(i => i.status === 'done');
  const committed = items.filter(i => i.status === 'this_week').reduce((s, i) => s + (i.effortHours || 0), 0);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
          <span className={`text-sm font-semibold ${textClass}`}>{label}</span>
          <span className="text-xs text-gray-400">{desc}</span>
        </div>
        <div className="flex items-center gap-3">
          {target && <span className="text-xs text-gray-400">{committed}h / {target}h target</span>}
          <button onClick={() => onAdd?.()} className="text-xs text-gray-400 hover:text-gray-600 font-medium">＋</button>
        </div>
      </div>
      <div className={`border ${borderClass} rounded-xl p-3 ${bgClass}`}>
        <div className="grid grid-cols-3 gap-3">
          {STATUS_COLS.map(col => {
            const colItems = filtered.filter(i => i.status === col.id);
            return (
              <div key={col.id}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{col.label}</span>
                  <span className="bg-gray-200 text-gray-500 text-[10px] font-medium px-1.5 py-0.5 rounded-full">{colItems.length}</span>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  {colItems.length === 0 ? (
                    <div className="border border-dashed border-gray-200 rounded-lg p-3 text-center text-[10px] text-gray-300">Empty</div>
                  ) : (
                    colItems.map(item => <BacklogItemCard key={item.uid} item={item} onStatusChange={onStatusChange} onDelete={onDelete} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {doneItems.length > 0 && (
          <details className="mt-2">
            <summary className="text-[10px] text-gray-400 cursor-pointer">{doneItems.length} done items</summary>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {doneItems.map(item => <BacklogItemCard key={item.uid} item={item} onStatusChange={onStatusChange} onDelete={onDelete} />)}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function SIDoubleSection({ salesItems, marketingItems, onStatusChange, onDelete, onAddSales, onAddMarketing, filter }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm font-semibold text-green-700">SI — Sales Intelligence</span>
        <span className="text-xs text-gray-400">13h total target</span>
      </div>
      <div className="border border-green-200 rounded-xl p-3 bg-green-50/50">
        <div className="grid grid-cols-2 gap-4">
          {/* Sales */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-green-700">🌱 Sales</span>
                <span className="text-[10px] text-gray-400">8h target</span>
              </div>
              <button onClick={onAddSales} className="text-[10px] text-gray-400 hover:text-gray-600">＋</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_COLS.map(col => {
                const colItems = (filter === 'all' ? salesItems : salesItems.filter(i => i.status === filter || i.status === 'this_week')).filter(i => i.status === col.id);
                return (
                  <div key={col.id}>
                    <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">{col.label} <span className="text-gray-300">({colItems.length})</span></div>
                    <div className="space-y-1.5 min-h-[40px]">
                      {colItems.length === 0 ? <div className="border border-dashed border-gray-200 rounded p-2 text-center text-[9px] text-gray-300">—</div>
                        : colItems.map(i => <BacklogItemCard key={i.uid} item={i} onStatusChange={onStatusChange} onDelete={onDelete} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Divider */}
          <div className="border-l border-green-200 pl-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-teal-700">📣 Marketing</span>
                <span className="text-[10px] text-gray-400">5h target</span>
              </div>
              <button onClick={onAddMarketing} className="text-[10px] text-gray-400 hover:text-gray-600">＋</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_COLS.map(col => {
                const colItems = (filter === 'all' ? marketingItems : marketingItems.filter(i => i.status === filter || i.status === 'this_week')).filter(i => i.status === col.id);
                return (
                  <div key={col.id}>
                    <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">{col.label} <span className="text-gray-300">({colItems.length})</span></div>
                    <div className="space-y-1.5 min-h-[40px]">
                      {colItems.length === 0 ? <div className="border border-dashed border-gray-200 rounded p-2 text-center text-[9px] text-gray-300">—</div>
                        : colItems.map(i => <BacklogItemCard key={i.uid} item={i} onStatusChange={onStatusChange} onDelete={onDelete} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BacklogBoard({ items, streamConfig, onStatusChange, onAddItem, onDelete }) {
  const [filter, setFilter] = useState('all');
  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'this_week', label: 'This Week' },
    { id: 'next_week', label: 'Next Week' },
    { id: 'backlog', label: 'Backlog' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filter === f.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => onAddItem('manual')} className="bg-purple-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-purple-700">＋ Add Item</button>
      </div>

      {/* BUILD */}
      <StreamSection label="🏗 Build" desc="NIP platform" target={20}
        items={items.build} bgClass="bg-purple-50/50" borderClass="border-purple-200"
        textClass="text-purple-700" dotClass="bg-purple-500"
        onStatusChange={onStatusChange} onDelete={onDelete}
        onAdd={() => onAddItem('build')} filter={filter} />

      {/* DELIVER */}
      <StreamSection label="📦 Deliver" desc="IVC + clients" target={15}
        items={items.deliver} bgClass="bg-blue-50/50" borderClass="border-blue-200"
        textClass="text-blue-700" dotClass="bg-blue-500"
        onStatusChange={onStatusChange} onDelete={onDelete}
        onAdd={() => onAddItem('deliver')} filter={filter} />

      {/* SI (double) */}
      <SIDoubleSection salesItems={items.sales} marketingItems={items.marketing}
        onStatusChange={onStatusChange} onDelete={onDelete}
        onAddSales={() => onAddItem('sales')} onAddMarketing={() => onAddItem('marketing')}
        filter={filter} />

      {/* OPERATE */}
      <StreamSection label="🧠 Operate" desc="BSI strategy" target={7}
        items={items.operate} bgClass="bg-amber-50/50" borderClass="border-amber-200"
        textClass="text-amber-700" dotClass="bg-amber-500"
        onStatusChange={onStatusChange} onDelete={onDelete}
        onAdd={() => onAddItem('operate')} filter={filter} />

      {/* LEARN */}
      {items.learn?.length > 0 && (
        <StreamSection label="🧠 Learn" desc="Intelligence layer" target={null}
          items={items.learn} bgClass="bg-violet-50/50" borderClass="border-violet-200"
          textClass="text-violet-700" dotClass="bg-violet-500"
          onStatusChange={onStatusChange} onDelete={onDelete}
          onAdd={() => {}} filter={filter} />
      )}

      {/* MANUAL */}
      {items.manual.length > 0 && (
        <StreamSection label="📌 Manual" desc="No source system" target={null}
          items={items.manual} bgClass="bg-gray-50" borderClass="border-gray-200"
          textClass="text-gray-600" dotClass="bg-gray-400"
          onStatusChange={onStatusChange} onDelete={onDelete}
          onAdd={() => onAddItem('manual')} filter={filter} />
      )}
    </div>
  );
}
