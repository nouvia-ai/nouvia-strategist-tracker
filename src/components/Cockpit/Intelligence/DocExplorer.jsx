import { useState, useEffect } from 'react';
import { searchDocs, CLUSTERS, updateDoc_intelligence, archiveDocument } from '../../../services/intelligenceService';

export default function DocExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [layerFilter, setLayerFilter] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [toast, setToast] = useState(null);

  const loadDocs = () => {
    setLoading(true);
    searchDocs(searchQuery, layerFilter).then(d => { setDocs(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadDocs(); }, [searchQuery, layerFilter]);

  const handleEdit = (d) => {
    setEditing(d);
    setEditForm({ title: d.title || '', content: d.content || '', source: d.source || '', coworkers: (d.coworkers || []).join(', '), cluster: d.cluster, status: d.status || 'active' });
  };

  const handleSave = async () => {
    if (!editing) return;
    await updateDoc_intelligence(editing._col, editing.id, {
      title: editForm.title, content: editForm.content, source: editForm.source,
      coworkers: editForm.coworkers.split(',').map(s => s.trim()).filter(Boolean),
      cluster: parseInt(editForm.cluster), status: editForm.status,
    });
    setEditing(null); loadDocs();
    setToast('Saved'); setTimeout(() => setToast(null), 2000);
  };

  const handleArchive = async (d) => {
    await archiveDocument(d._col, d.id);
    setEditing(null); loadDocs();
    setToast('Archived'); setTimeout(() => setToast(null), 2000);
  };

  // Group by cluster_name
  const grouped = {};
  docs.forEach(d => {
    const key = d.cluster_name || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search knowledge..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        <select value={layerFilter || ''} onChange={e => setLayerFilter(e.target.value ? parseInt(e.target.value) : null)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">All layers</option>
          <option value="1">Layer 1</option>
          <option value="2">Layer 2</option>
          <option value="3">Layer 3</option>
        </select>
      </div>

      {loading ? <div className="animate-pulse bg-gray-200 rounded-xl h-32" /> : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cluster, clusterDocs]) => (
            <div key={cluster}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-600">{cluster}</span>
                <span className="bg-gray-200 text-gray-500 text-[10px] font-medium px-1.5 py-0.5 rounded-full">{clusterDocs.length}</span>
              </div>
              <div className="space-y-1">
                {clusterDocs.map(d => (
                  <div key={d.id} onClick={() => handleEdit(d)}
                    className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer border-b border-gray-50">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.status === 'active' ? 'bg-green-500' : 'bg-amber-400'}`} />
                    <span className="text-sm font-medium text-gray-800 flex-1 truncate">{d.title}</span>
                    <span className="text-[10px] text-gray-400 truncate max-w-[200px]">{(d.content || '').substring(0, 60)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${(d.use_count || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{d.use_count || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {docs.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No documents found</p>}
        </div>
      )}

      {/* Edit panel */}
      {editing && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setEditing(null)} />
          <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 flex flex-col overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
              <button onClick={() => setEditing(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg">✕</button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Editing</span>
                <span className="bg-purple-100 text-purple-700 text-[10px] font-medium px-1.5 py-0.5 rounded">L{editing.layer}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-1 pr-8">{editing.title}</h3>
            </div>
            <div className="p-4 space-y-4 flex-1">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Title</label>
                <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Content</label>
                <textarea value={editForm.content} onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))} rows={6}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Source</label>
                <input value={editForm.source} onChange={e => setEditForm(p => ({ ...p, source: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Coworkers (comma-separated)</label>
                <input value={editForm.coworkers} onChange={e => setEditForm(p => ({ ...p, coworkers: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="active">Active</option>
                    <option value="stale">Stale</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 p-4 flex justify-between">
              <button onClick={() => handleArchive(editing)} className="text-red-400 hover:text-red-600 text-xs font-medium">Archive</button>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="text-gray-500 text-sm">Cancel</button>
                <button onClick={handleSave} className="bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-purple-700">Save</button>
              </div>
            </div>
          </div>
        </>
      )}

      {toast && <div className="fixed bottom-4 right-4 bg-green-500 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}
    </div>
  );
}
