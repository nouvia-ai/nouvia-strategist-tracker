import { useState, useEffect } from 'react'
import { NIP_STATUS } from './architectureData'
import { getArchitectureStatus, saveArchitectureStatus } from '../../../services/architectureService'
const SC = {
  live:     { bg:'bg-green-100',  text:'text-green-700',  dot:'bg-green-500',  label:'● Live' },
  building: { bg:'bg-amber-100',  text:'text-amber-700',  dot:'bg-amber-400',  label:'◐ Building' },
  planned:  { bg:'bg-blue-100',   text:'text-blue-600',   dot:'bg-blue-400',   label:'○ Planned' },
  agentic:  { bg:'bg-purple-100', text:'text-purple-700', dot:'bg-purple-400', label:'◇ Agentic' },
}
function Badge({ status, small }) {
  const s = SC[status] || SC.planned
  const pulseStyle = status === 'building'
    ? { animation: 'pulseBuilding 2s ease-in-out infinite' }
    : {}
  return (
    <span
      className={`${s.bg} ${s.text} font-medium rounded
        ${small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'}`}
      style={pulseStyle}
    >
      {s.label}
    </span>
  )
}
function Dot({ status }) {
  const s = SC[status] || SC.planned
  return (
    <span className={`inline-block w-2 h-2 rounded-full
      flex-shrink-0 mt-1.5 ${s.dot}`}
      style={status === 'building' ? {
        animation: 'pulseBuilding 2s ease-in-out infinite'
      } : {}}
    />
  )
}
function Card({ children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
      {children}
    </div>
  )
}
function ModuleCard({ module, accent }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className={`text-sm font-medium ${accent}`}>{module.label}</span>
        <Badge status={module.status} small />
      </div>
      {module.note && <p className="text-xs text-gray-400 italic mb-1">{module.note}</p>}
      {module.components && (
        <>
          <button
            onClick={() => setOpen(o => !o)}
            className="text-xs text-gray-400 hover:text-gray-600 mt-1 flex items-center gap-1"
          >
            {open ? '▾ Hide' : '▸ Show'} components ({module.components.length})
          </button>
          {open && (
            <div className="mt-2 space-y-1.5 pl-1">
              {module.components.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Dot status={c.status} />
                  <span className="text-xs text-gray-600">{c.label}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
function OverviewTab({ status }) {
  // Status-driven color maps
  const svgColors = {
    live:     { fill: '#E6F1FB', stroke: '#85B7EB', title: '#0C447C', sub: '#185FA5' },
    building: { fill: '#FFFBEB', stroke: '#FCD34D', title: '#92400E', sub: '#B45309' },
    planned:  { fill: '#F3F4F6', stroke: '#D1D5DB', title: '#4B5563', sub: '#9CA3AF' },
    agentic:  { fill: '#F3E8FF', stroke: '#C4B5FD', title: '#6D28D9', sub: '#7C3AED' },
  }
  const studioColors = { fill: '#EEEDFE', stroke: '#AFA9EC', title: '#3C3489', sub: '#534AB7' }
  const dsiColors = { fill: '#E1F5EE', stroke: '#5DCAA5', title: '#085041', sub: '#0F6E56' }

  // Read statuses from data
  const getModuleStatus = (side, id) => {
    const modules = side === 'studio' ? status.studio?.modules : status.aims?.modules
    return modules?.find(m => m.id === id)?.status || 'planned'
  }
  const phase0Status = status.phase0?.status || 'building'
  const phase0Live = phase0Status === 'live'
  const phase0Colors = phase0Live
    ? { fill: '#E1F5EE', stroke: '#5DCAA5', title: '#085041', sub: '#0F6E56', dash: '' }
    : { fill: '#FFFBEB', stroke: '#FCD34D', title: '#92400E', sub: '#B45309', dash: '5 3' }
  const phase0Label = phase0Live ? 'Phase 0 · Complete · DSI ↔ AIMS synced' : 'Phase 0 · Closed-loop Firestore sync · DSI ↔ AIMS'

  const getAimsBoxColors = (id) => {
    const s = getModuleStatus('aims', id)
    return svgColors[s] || svgColors.planned
  }

  const cmdC = getAimsBoxColors('command')
  const bklC = getAimsBoxColors('backlog')
  const hlthC = getAimsBoxColors('health')
  const invC = getAimsBoxColors('investment')

  return (
    <div className="space-y-4">
      {/* SVG Architecture Diagram */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 overflow-x-auto">
        <svg width="100%" viewBox="0 0 680 300" style={{minWidth:'500px'}}>
          <defs>
            <marker id="arr2" viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="#9CA3AF"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </marker>
          </defs>
          {/* NIP Header */}
          <rect x="10" y="6" width="660" height="34" rx="10" fill="#534AB7"/>
          <text x="340" y="23" textAnchor="middle" dominantBaseline="central"
            fontSize="13" fontWeight="500" fill="#EEEDFE"
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            Nouvia Intelligence Platform · NIP
          </text>
          {/* Studio label */}
          <text x="16" y="54" fontSize="10" fill="#534AB7" fontWeight="600"
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            NOUVIA STUDIO
          </text>
          {/* BSI */}
          <rect x="10" y="60" width="205" height="66" rx="8"
            fill={studioColors.fill} stroke={studioColors.stroke} strokeWidth="0.5"/>
          <text x="112" y="85" textAnchor="middle" dominantBaseline="central"
            fontSize="13" fontWeight="500" fill={studioColors.title}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">BSI</text>
          <text x="112" y="108" textAnchor="middle" dominantBaseline="central"
            fontSize="11" fill={studioColors.sub}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            Canvas · experiments · trends
          </text>
          {/* SI */}
          <rect x="227" y="60" width="205" height="66" rx="8"
            fill={studioColors.fill} stroke={studioColors.stroke} strokeWidth="0.5"/>
          <text x="329" y="85" textAnchor="middle" dominantBaseline="central"
            fontSize="13" fontWeight="500" fill={studioColors.title}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">SI</text>
          <text x="329" y="108" textAnchor="middle" dominantBaseline="central"
            fontSize="11" fill={studioColors.sub}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            Pipeline · prospects · funnel
          </text>
          {/* DSI */}
          <rect x="444" y="60" width="226" height="66" rx="8"
            fill={dsiColors.fill} stroke={dsiColors.stroke} strokeWidth="0.5"/>
          <text x="557" y="85" textAnchor="middle" dominantBaseline="central"
            fontSize="13" fontWeight="500" fill={dsiColors.title}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">DSI</text>
          <text x="557" y="108" textAnchor="middle" dominantBaseline="central"
            fontSize="11" fill={dsiColors.sub}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            Delivery · client bridge
          </text>
          {/* Phase 0 Bar — data-driven */}
          <rect x="12" y="136" width="656" height="40" rx="8"
            fill={phase0Colors.fill} stroke={phase0Colors.stroke} strokeWidth="0.5"
            strokeDasharray={phase0Colors.dash}/>
          <text x="340" y="154" textAnchor="middle" dominantBaseline="central"
            fontSize="11" fill={phase0Colors.title}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            {phase0Label}
          </text>
          <text x="80" y="170" textAnchor="middle" fontSize="10" fill={phase0Colors.sub}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            {phase0Live ? '✓ studio synced' : '← studio updates'}
          </text>
          <text x="600" y="170" textAnchor="middle" fontSize="10" fill={phase0Colors.sub}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            {phase0Live ? '✓ client synced' : 'client activity →'}
          </text>
          {/* AIMS label */}
          <text x="16" y="194" fontSize="10" fill="#185FA5" fontWeight="600"
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            AI MANAGEMENT SYSTEM · AIMS
          </text>
          {/* Command Center — data-driven */}
          <rect x="10" y="200" width="152" height="66" rx="8"
            fill={cmdC.fill} stroke={cmdC.stroke} strokeWidth="0.5"/>
          <text x="86" y="225" textAnchor="middle" dominantBaseline="central"
            fontSize="12" fontWeight="500" fill={cmdC.title}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            Command center
          </text>
          <text x="86" y="248" textAnchor="middle" dominantBaseline="central"
            fontSize="11" fill={cmdC.sub}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            Goals · pillars
          </text>
          {/* Backlog — data-driven */}
          <rect x="174" y="200" width="152" height="66" rx="8"
            fill={bklC.fill} stroke={bklC.stroke} strokeWidth="0.5"/>
          <text x="250" y="225" textAnchor="middle" dominantBaseline="central"
            fontSize="12" fontWeight="500" fill={bklC.title}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            Backlog
          </text>
          <text x="250" y="248" textAnchor="middle" dominantBaseline="central"
            fontSize="11" fill={bklC.sub}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            Kanban · Gantt
          </text>
          {/* Health — data-driven */}
          <rect x="338" y="200" width="152" height="66" rx="8"
            fill={hlthC.fill} stroke={hlthC.stroke} strokeWidth="0.5"/>
          <text x="414" y="225" textAnchor="middle" dominantBaseline="central"
            fontSize="12" fontWeight="500" fill={hlthC.title}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            Health
          </text>
          <text x="414" y="248" textAnchor="middle" dominantBaseline="central"
            fontSize="11" fill={hlthC.sub}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            {getModuleStatus('aims', 'health') === 'live' ? 'Metrics · SLA' : 'Phase 2'}
          </text>
          {/* Investment — data-driven */}
          <rect x="502" y="200" width="168" height="66" rx="8"
            fill={invC.fill} stroke={invC.stroke} strokeWidth="0.5"/>
          <text x="586" y="225" textAnchor="middle" dominantBaseline="central"
            fontSize="12" fontWeight="500" fill={invC.title}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            Investment
          </text>
          <text x="586" y="248" textAnchor="middle" dominantBaseline="central"
            fontSize="11" fill={invC.sub}
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            {getModuleStatus('aims', 'investment') === 'live' ? 'ROI · spend' : 'Phase 2'}
          </text>
          {/* IVC Footer */}
          <rect x="12" y="276" width="656" height="18" rx="6" fill="#0F6E56"/>
          <text x="22" y="285" dominantBaseline="central" fontSize="11"
            fontWeight="500" fill="#E1F5EE"
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            IVC AI Management System
          </text>
          <text x="660" y="285" textAnchor="end" dominantBaseline="central"
            fontSize="10" fill="#9FE1CB"
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            Powered by Nouvia Intelligence Platform
          </text>
        </svg>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
          {[
            { color:'bg-purple-500', label:'Nouvia Studio' },
            { color:'bg-green-500', label:'Phase 0 bridge' },
            { color:'bg-blue-400', label:'AIMS (live)' },
            { color:'bg-gray-300', label:'Phase 2 placeholder' },
          ].map((l, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${l.color}`}/>
              {l.label}
            </span>
          ))}
        </div>
      </div>
      {/* Studio + AIMS grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-3">
            Nouvia Studio
          </p>
          {status.studio?.modules?.map((m, i) => (
            <ModuleCard key={i} module={m} accent="text-purple-700" />
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
            AI Management System — AIMS
          </p>
          {status.aims?.modules?.map((m, i) => (
            <ModuleCard key={i} module={m} accent="text-blue-700" />
          ))}
        </div>
      </div>
    </div>
  )
}
function LearningTab() {
  const layers = [
    { color:'border-purple-500', title:'Layer 1 — Framework foundations',
      body:'62 books · 7 clusters. Distilled through Ben\'s AI delivery lens.',
      pills:['Human behavior','Revenue models','Validation','UX design','Momentum','Client selling','Data strategy'],
      pillStyle:'bg-purple-50 text-purple-700' },
    { color:'border-green-500', title:'Layer 2 — 48 application rules',
      body:'How each framework translates into delivery decisions. Loaded by every coworker at session start.',
      pills:['Hook design','Discovery methodology','UX constraints','Pricing behavior','Retention'],
      pillStyle:'bg-green-50 text-green-700' },
    { color:'border-blue-400', title:'Layer 3 — Client pattern library',
      body:'Real patterns from engagements. IVC has 24 patterns logged. Each new client compounds this layer.',
      pills:[],
      pillStyle:'' },
  ]
  const flywheel = [
    { dot:'bg-purple-500', label:'Engage', desc:'deliver for client, observe what works' },
    { dot:'bg-green-500', label:'Harvest', desc:'log patterns to Layer 3' },
    { dot:'bg-blue-400', label:'Encode', desc:'promote high-confidence patterns into Layer 2 rules' },
    { dot:'bg-amber-400', label:'Apply', desc:'updated rules load at next session start' },
    { dot:'bg-purple-500', label:'Compound', desc:'by Client 5, Nouvia holds more manufacturing AI patterns than any competitor' },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Card>
            <p className="text-sm font-medium text-gray-900 mb-3">Three-layer intelligence architecture</p>
            {layers.map((l, i) => (
              <div key={i} className={`border-l-[3px] ${l.color} pl-3 mb-3 last:mb-0`}>
                <p className="text-sm font-medium text-gray-800 mb-1">{l.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-2">{l.body}</p>
                {l.pills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {l.pills.map((p, j) => (
                      <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${l.pillStyle}`}>
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Card>
          <Card>
            <p className="text-sm font-medium text-gray-900 mb-3">Where the 48 rules apply in NIP</p>
            {[
              { dot:'bg-purple-500', label:'Strategist', desc:'full 48-rule framework on every canvas decision' },
              { dot:'bg-green-500', label:'Blueprint', desc:'rules 2.23–2.29: UX, risk, hook design' },
              { dot:'bg-green-500', label:'Compass', desc:'rules 2.37–2.43: discovery, luxury service' },
              { dot:'bg-amber-400', label:'Atlas', desc:'rules 2.14–2.20: pricing, LAER, MRR' },
              { dot:'bg-blue-400', label:'AIMS cockpit', desc:'hook model: variable reward via ideas, investment loop via client data' },
            ].map((r, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
                <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${r.dot}`}/>
                <p className="text-xs text-gray-600">
                  <span className="font-medium text-gray-800">{r.label}</span> — {r.desc}
                </p>
              </div>
            ))}
          </Card>
        </div>
        <div className="space-y-3">
          <Card>
            <p className="text-sm font-medium text-gray-900 mb-3">The NIP intelligence flywheel</p>
            <div className="border border-dashed border-gray-200 rounded-xl p-3 space-y-2">
              {flywheel.map((f, i) => (
                <div key={i}>
                  <div className="flex items-start gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${f.dot}`}/>
                    <p className="text-xs text-gray-600">
                      <span className="font-medium text-gray-800">{f.label}</span> — {f.desc}
                    </p>
                  </div>
                  {i < flywheel.length - 1 && (
                    <p className="text-center text-gray-300 text-sm pl-4">↓</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-sm font-medium text-gray-900 mb-3">CIF — Client Intelligence File</p>
            <p className="text-xs text-gray-400 mb-3 italic">How personalization works — loaded at every session</p>
            {[
              { dot:'bg-purple-500', label:'Company layer', desc:'industry, workflows, tech stack, commercial context, grant environment' },
              { dot:'bg-purple-500', label:'Contact layer', desc:'individual behavioral notes: Nick (budget), Josy (operations), Nelson (technical), Said (builder)' },
              { dot:'bg-green-500', label:'Pattern layer', desc:'what has worked, what caused friction, what this client cares about most' },
              { dot:'bg-blue-400', label:'Memory system', desc:'Strategist project maintains persistent memory, surfaces context automatically' },
            ].map((r, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
                <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${r.dot}`}/>
                <p className="text-xs text-gray-600">
                  <span className="font-medium text-gray-800">{r.label}</span> — {r.desc}
                </p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
function DataTab({ status }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <p className="text-sm font-medium text-gray-900 mb-3">Nouvia Studio — Firestore reads</p>
          {[
            { dot:'bg-purple-500', label:'goals', desc:'NorthStarGoal.jsx' },
            { dot:'bg-purple-500', label:'mrr_entries, forecast_cache', desc:'FinancialMetrics' },
            { dot:'bg-purple-500', label:'client_backlog', desc:'BacklogPipeline + FinancialMetrics' },
            { dot:'bg-purple-500', label:'okrs', desc:'OKRProgress' },
            { dot:'bg-purple-500', label:'priority_queue', desc:'PrioritySequence, FlywheelConnection (r/w)' },
            { dot:'bg-purple-500', label:'weekly_todos', desc:'WeeklyTodos (r/w)' },
            { dot:'bg-gray-400', label:'trends, decisions, experiments, canvas', desc:'localStorage via Strategist MCP' },
          ].map((r, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${r.dot}`}/>
              <p className="text-xs text-gray-600">
                <span className="font-medium text-gray-800">{r.label}</span> — {r.desc}
              </p>
            </div>
          ))}
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-900 mb-3">AIMS — ivc_* Firestore collections</p>
          {[
            { dot:'bg-blue-400', label:'ivc_goals', desc:'BusinessObjectives (r/w) + audit log on delete' },
            { dot:'bg-blue-400', label:'ivc_issues', desc:'IssuesBlockers (r/w) + audit log on delete' },
            { dot:'bg-green-500', label:'ivc_pillars', desc:'read-only for client; Nouvia-only write' },
            { dot:'bg-blue-400', label:'ivc_ideas', desc:'IdeasQueue (r/w) + audit log on decline/delete' },
            { dot:'bg-blue-400', label:'ivc_backlog', desc:'BacklogBoard (r/w): change requests, pause requests, stage transitions' },
            { dot:'bg-amber-400', label:'ivc_audit_log', desc:'4 event types, all notifyNouvia:true' },
          ].map((r, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${r.dot}`}/>
              <p className="text-xs text-gray-600">
                <span className="font-medium text-gray-800">{r.label}</span> — {r.desc}
              </p>
            </div>
          ))}
        </Card>
      </div>
      {/* Phase 0 Bridge */}
      <div className="border border-dashed border-amber-300 bg-amber-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-amber-700">Phase 0 bridge — what changes</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Before Phase 0</p>
            {[
              'All 6 ivc_* collections invisible to Studio — zero visibility',
              'ivc_audit_log has getAuditLog() function — nothing in Studio calls it',
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2 mb-1.5">
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-red-400"/>
                <p className="text-xs text-gray-600">{t}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">After Phase 0</p>
            {[
              'DSI reads all 6 ivc_* collections in real-time',
              'Ben writes pillar progress + quotes from Studio → appear instantly in AIMS',
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2 mb-1.5">
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-green-500"/>
                <p className="text-xs text-gray-600">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
function AgentsTab({ status }) {
  const agents = [
    { title:'Nouvia Strategist', sub:'Claude Sonnet 4.6 · always on', status:'live',
      rows:[
        { dot:'bg-purple-500', text:'Direct Firestore r/w via MCP server on Cloud Run' },
        { dot:'bg-purple-500', text:'Processes debriefs, signals, canvas evolution' },
        { dot:'bg-purple-500', text:'Personalization via CIF + project-scoped memory' },
        { dot:'bg-purple-500', text:'Loads: delivery-intelligence (48 rules), business-strategist' },
      ],
      pills:[{label:'BSI',cls:'bg-purple-100 text-purple-700'},{label:'SI',cls:'bg-purple-100 text-purple-700'},{label:'DSI',cls:'bg-purple-100 text-purple-700'}],
    },
    { title:'Claude Code — Blueprint + Forge', sub:'Agentic coding · terminal-based', status:'live',
      rows:[
        { dot:'bg-green-500', text:'Blueprint: generates executable specs for every build' },
        { dot:'bg-green-500', text:'Forge: executes specs autonomously — reads, writes, verifies' },
        { dot:'bg-green-500', text:'Reads CLAUDE.md + skill files at session start' },
        { dot:'bg-green-500', text:'Deploys via Firebase CLI on build complete' },
      ],
      pills:[{label:'Studio',cls:'bg-green-100 text-green-700'},{label:'AIMS',cls:'bg-green-100 text-green-700'}],
    },
    { title:'Ideas Engine', sub:'Phase 0 · SCOR gap analysis', status:'building',
      rows:[
        { dot:'bg-blue-400', text:'SCOR gap analysis: identifies unfilled manufacturing pillars' },
        { dot:'bg-blue-400', text:'NCC pattern matching: surfaces reusable capabilities' },
        { dot:'bg-blue-400', text:'Writes to ivc_ideas with source: "scor_gap" or "nouvia_ai"' },
        { dot:'bg-blue-400', text:'Ben reviews and quotes in DSI before IVC sees' },
      ],
      pills:[{label:'AIMS ideas queue',cls:'bg-blue-100 text-blue-700'},{label:'DSI ideas',cls:'bg-green-100 text-green-700'}],
    },
    { title:'Sentinel', sub:'Phase 2 · autonomous monitoring', status:'planned',
      rows:[
        { dot:'bg-amber-400', text:'Adoption monitoring: tracks usage after 60 days' },
        { dot:'bg-amber-400', text:'Flags low adoption (<60%) → design retrospective' },
        { dot:'bg-amber-400', text:'Validates NCC components via production usage data' },
        { dot:'bg-amber-400', text:'Auto-generates monthly: what works, what needs fixing' },
      ],
      pills:[{label:'AIMS Health',cls:'bg-amber-100 text-amber-700'},{label:'DSI Health',cls:'bg-green-100 text-green-700'}],
    },
  ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {agents.map((a, i) => (
        <Card key={i}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-gray-900">{a.title}</p>
            <Badge status={a.status} small />
          </div>
          <p className="text-xs text-gray-400 italic mb-3">{a.sub}</p>
          <div className="space-y-1.5 mb-3">
            {a.rows.map((r, j) => (
              <div key={j} className="flex items-start gap-2">
                <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${r.dot}`}/>
                <p className="text-xs text-gray-600">{r.text}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {a.pills.map((p, j) => (
              <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${p.cls}`}>
                {p.label}
              </span>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
function SecurityTab() {
  const layers = [
    { border:'border-purple-500', title:'Layer 1 — Firebase Authentication',
      body:'All users authenticate via Google sign-in before any content renders. JWT tokens validated on every Firestore request. No public data exposure.' },
    { border:'border-blue-500', title:'Layer 2 — Role-based access gate (AuthGate.jsx)',
      body:'AuthGate reads portal_users collection to determine role before rendering.',
      cards:[
        { title:'admin — Ben / Nouvia', desc:'Full Studio + AIMS. ?view=portal preview. benTimeHours + nccDependencies visible. All stage transitions. Pillar progress writes.' },
        { title:'client — IVC', desc:'AIMS only. No Studio. Admin fields hidden. in_progress/done/managed transitions blocked. Stage locks trigger change request flow.' },
      ]
    },
    { border:'border-green-500', title:'Layer 3 — Firestore security rules',
      body:'All 6 ivc_* collections require isAuthenticated(). Phase 0 adds clientId scoping — preventing cross-client data access as platform scales.',
      pills:['ivc_goals ✓','ivc_issues ✓','ivc_pillars ✓','ivc_ideas ✓','ivc_backlog ✓','ivc_audit_log ✓'],
      pillStyle:'bg-green-100 text-green-700'
    },
    { border:'border-amber-500', title:'Layer 4 — Admin-only hidden fields',
      body:'Two ivc_backlog fields never rendered in AIMS. Visible only in DSI Backlog Manager.',
      cards:[
        { title:'benTimeHours', desc:'Actual Ben hours per item. Protects capacity model — the gap between perceived effort and actual time is Nouvia\'s margin.' },
        { title:'nccDependencies', desc:'NCC component IDs powering each item. Protects IP reuse strategy.' },
      ]
    },
  ]
  return (
    <div className="space-y-3">
      {layers.map((l, i) => (
        <div key={i} className={`border-l-[3px] ${l.border} pl-3 bg-white border border-gray-200 rounded-r-xl p-4`}>
          <p className="text-sm font-medium text-gray-900 mb-1">{l.title}</p>
          <p className="text-xs text-gray-500 leading-relaxed mb-2">{l.body}</p>
          {l.cards && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {l.cards.map((c, j) => (
                <div key={j} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-800 mb-1">{c.title}</p>
                  <p className="text-xs text-gray-500">{c.desc}</p>
                </div>
              ))}
            </div>
          )}
          {l.pills && (
            <div className="flex flex-wrap gap-1 mt-2">
              {l.pills.map((p, j) => (
                <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${l.pillStyle}`}>
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
function InfraTab({ status }) {
  const stack = [
    { label:'User interface',
      items:[
        { cls:'bg-purple-100 text-purple-700', t:'Nouvia Studio (BSI · SI · DSI)' },
        { cls:'bg-blue-100 text-blue-700', t:'IVC AI Management System (AIMS)' },
        { cls:'bg-gray-100 text-gray-600', t:'Future: Client 2+ AIMS instances' },
      ]},
    { label:'Intelligence layer',
      items:[
        { cls:'bg-purple-100 text-purple-700', t:'11 active skill files (.md)' },
        { cls:'bg-purple-100 text-purple-700', t:'48 delivery intelligence rules' },
        { cls:'bg-purple-100 text-purple-700', t:'Project-scoped memory system' },
        { cls:'bg-green-100 text-green-700', t:'NCC Registry (14 components)' },
        { cls:'bg-gray-100 text-gray-600', t:'Business Model Canvas (Firestore)' },
      ]},
    { label:'Application runtime',
      items:[
        { cls:'bg-blue-100 text-blue-700', t:'React 19.2 + Vite 8' },
        { cls:'bg-blue-100 text-blue-700', t:'Tailwind CSS 3.4' },
        { cls:'bg-green-100 text-green-700', t:'GitHub Actions CI/CD' },
        { cls:'bg-green-100 text-green-700', t:'Node.js + npm' },
      ]},
    { label:'AI platform',
      items:[
        { cls:'bg-purple-100 text-purple-700', t:'Anthropic Claude Sonnet 4.6' },
        { cls:'bg-purple-100 text-purple-700', t:'Claude Code (agentic coding)' },
        { cls:'bg-purple-100 text-purple-700', t:'MCP Protocol' },
      ]},
    { label:'External connectors',
      items:[
        { cls:'bg-blue-100 text-blue-700', t:'Gmail MCP' },
        { cls:'bg-blue-100 text-blue-700', t:'Google Calendar MCP' },
        { cls:'bg-blue-100 text-blue-700', t:'Google Drive MCP' },
        { cls:'bg-blue-100 text-blue-700', t:'GoDaddy MCP' },
      ]},
    { label:'Data + auth',
      items:[
        { cls:'bg-green-100 text-green-700', t:'Firestore (nouvia-os project)' },
        { cls:'bg-green-100 text-green-700', t:'Firebase Authentication' },
        { cls:'bg-gray-100 text-gray-600', t:'localStorage (Strategist side)' },
      ]},
    { label:'Cloud infrastructure',
      items:[
        { cls:'bg-green-100 text-green-700', t:'GCP Cloud Run (MCP server)' },
        { cls:'bg-green-100 text-green-700', t:'Firebase Hosting (CDN)' },
        { cls:'bg-green-100 text-green-700', t:'Cloud Logging → BigQuery (Phase 2)' },
        { cls:'bg-green-100 text-green-700', t:'GCP project: nouvia-os' },
      ]},
  ]
  return (
    <div className="space-y-2">
      {stack.map((row, i) => (
        <div key={i} className="flex items-stretch gap-3">
          <div className="w-36 flex-shrink-0 flex items-center justify-end pr-3
            border-r-2 border-gray-200 text-right">
            <span className="text-xs font-medium text-gray-400">{row.label}</span>
          </div>
          <div className="flex-1 flex flex-wrap gap-1.5 items-center py-2
            bg-gray-50 rounded-lg px-3 border border-gray-200">
            {row.items.map((it, j) => (
              <span key={j} className={`text-xs px-2 py-0.5 rounded font-medium ${it.cls}`}>
                {it.t}
              </span>
            ))}
          </div>
        </div>
      ))}
      {/* Path to agentic */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
        <p className="text-sm font-medium text-gray-900 mb-3">Path to agentic</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { tag:'Now', tagCls:'bg-green-100 text-green-700',
              desc:'Ben executes 80%. Claude Code sessions require constant presence.' },
            { tag:'Phase 0', tagCls:'bg-amber-100 text-amber-700',
              desc:'Studio sees AIMS data. Closed loop confirmed. Ideas + pillars bidirectional.' },
            { tag:'Phase 2', tagCls:'bg-amber-100 text-amber-700',
              desc:'Sentinel monitors autonomously. Ideas Engine surfaces SCOR gaps. Ben reviews recommendations.' },
            { tag:'Phase 4+', tagCls:'bg-purple-100 text-purple-700',
              desc:'Blueprint → Forge → Deploy → Sentinel loop. Ben judges 80%, executes 20%.' },
          ].map((p, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${p.tagCls}`}>
                {p.tag}
              </span>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default function NIPArchitecture() {
  const [status, setStatus] = useState(NIP_STATUS)
  const [loading, setLoading] = useState(false)
  const [updateLog, setUpdateLog] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  useEffect(() => {
    getArchitectureStatus().then(saved => {
      if (saved?.status) {
        setStatus(saved.status)
        setLastSaved(saved.savedAt?.toDate?.()?.toLocaleDateString() || 'Saved')
      }
    }).catch(() => {})
  }, [])
  const countByStatus = (s, st) => {
    let n = 0
    const chk = (arr) => arr?.forEach(item => {
      if (item.status === st) n++
      item.components?.forEach(c => { if (c.status === st) n++ })
    })
    chk(s.studio?.modules)
    chk(s.aims?.modules)
    s.aiAgents?.forEach(a => { if (a.status === st) n++ })
    s.intelligence?.forEach(a => { if (a.status === st) n++ })
    s.infrastructure?.forEach(a => { if (a.status === st) n++ })
    return n
  }
  const counts = {
    live:     countByStatus(status, 'live'),
    building: countByStatus(status, 'building'),
    planned:  countByStatus(status, 'planned'),
    agentic:  countByStatus(status, 'agentic'),
  }
  const total = Math.max(Object.values(counts).reduce((a,b) => a+b, 0), 1)
  const handleUpdate = async () => {
    setLoading(true)
    setError(null)
    setUpdateLog(null)
    try {
      const now = new Date().toLocaleDateString('en-CA')
      const next = { ...status, lastUpdated: now }
      setStatus(next)
      setUpdateLog([
        `\u2705 Architecture status saved to Firestore`,
        `\ud83d\udcca ${counts.live} Live \u00b7 ${counts.building} Building \u00b7 ${counts.planned} Planned \u00b7 ${counts.agentic} Agentic`,
        `\u2192 Edit architectureData.js to update component statuses, then click Update to persist`,
      ])
      await saveArchitectureStatus({ status: next, savedAt: new Date() })
      setLastSaved(new Date().toLocaleDateString())
    } catch(err) {
      setError('Update failed — ' + err.message)
    } finally {
      setLoading(false)
    }
  }
  const TABS = [
    { id:'overview', label:'Overview' },
    { id:'learning', label:'Learning' },
    { id:'data',     label:'Data' },
    { id:'agents',   label:'AI agents' },
    { id:'security', label:'Security' },
    { id:'infra',    label:'Infrastructure' },
  ]
  return (
    <>
    <style>{`
      @keyframes pulseBuilding {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.35; }
      }
    `}</style>
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">NIP Architecture</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Last updated: {status.lastUpdated || 'Not yet updated'}
            {lastSaved && ` · Saved: ${lastSaved}`}
          </p>
        </div>
        <button
          onClick={handleUpdate}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm
            font-medium transition-all flex-shrink-0
            ${loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'}`}
        >
          {loading ? (
            <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>Analysing...</>
          ) : (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16"/>
            </svg>Update Status</>
          )}
        </button>
      </div>
      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3
          text-sm text-red-700">{error}</div>
      )}
      {/* Update log */}
      {updateLog?.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
            Status Report — {status.lastUpdated}
          </p>
          <ul className="space-y-1">
            {updateLog.map((line, i) => (
              <li key={i} className="text-sm text-purple-700">{line}</li>
            ))}
          </ul>
        </div>
      )}
      {/* Progress bar */}
      <div>
        <div className="flex rounded-full overflow-hidden h-2 mb-2">
          <div className="bg-green-500 transition-all duration-700"
            style={{width:`${(counts.live/total)*100}%`}}/>
          <div className="bg-amber-400 transition-all duration-700"
            style={{width:`${(counts.building/total)*100}%`}}/>
          <div className="bg-blue-400 transition-all duration-700"
            style={{width:`${(counts.planned/total)*100}%`}}/>
          <div className="bg-purple-400 transition-all duration-700"
            style={{width:`${(counts.agentic/total)*100}%`}}/>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span><span className="text-green-600 font-medium">{counts.live}</span> Live</span>
          <span><span className="text-amber-600 font-medium">{counts.building}</span> Building</span>
          <span><span className="text-blue-600 font-medium">{counts.planned}</span> Planned</span>
          <span><span className="text-purple-600 font-medium">{counts.agentic}</span> Agentic</span>
        </div>
      </div>
      {/* Legend */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status legend</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { status: 'live', dot: 'bg-green-500', badge: 'bg-green-100 text-green-700', label: '● Live', title: 'Built and working', desc: 'Deployed to production. Running today.' },
            { status: 'building', dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', label: '◐ Building', title: 'Actively in progress', desc: 'Current sprint. Dots pulse to show active work.', pulse: true },
            { status: 'planned', dot: 'bg-blue-400', badge: 'bg-blue-100 text-blue-600', label: '○ Planned', title: 'On the roadmap', desc: 'Scoped and sequenced. Starts after current sprint.' },
            { status: 'agentic', dot: 'bg-purple-400', badge: 'bg-purple-100 text-purple-700', label: '◇ Agentic', title: 'Future destination', desc: 'Phase 4+ autonomous vision. Blueprint → Forge loop.' },
          ].map((item, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.dot}`}
                  style={item.pulse ? { animation: 'pulseBuilding 2s ease-in-out infinite' } : {}} />
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${item.badge}`}>{item.label}</span>
              </div>
              <p className="text-xs font-medium text-gray-800 mb-0.5">{item.title}</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap
              transition-colors
              ${activeTab === t.id
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Tab content */}
      <div>
        {activeTab === 'overview'  && <OverviewTab  status={status} />}
        {activeTab === 'learning'  && <LearningTab />}
        {activeTab === 'data'      && <DataTab      status={status} />}
        {activeTab === 'agents'    && <AgentsTab    status={status} />}
        {activeTab === 'security'  && <SecurityTab />}
        {activeTab === 'infra'     && <InfraTab     status={status} />}
      </div>
    </div>
    </>
  )
}
