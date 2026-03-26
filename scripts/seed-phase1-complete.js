import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
initializeApp({ projectId: 'nouvia-os' });
const db = getFirestore();

const BASE = { use_count: 0, last_used_at: null, status: 'active', version: 'v1.0',
  created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() };
const CW_ALL = ['Blueprint','Forge','Compass','Strategist'];

async function seedIfNew(col, doc) {
  const snap = await db.collection(col).where('title', '==', doc.title).limit(1).get();
  if (!snap.empty) return false;
  await db.collection(col).add({ ...BASE, ...doc, created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() });
  return true;
}

async function run() {
  console.log('=== Phase 1: Seed + Update ===\n');
  let added = 0, skipped = 0;

  // STEP 1.1: Update rule_type on existing L2 rules
  console.log('Step 1.1: Adding rule_type to existing L2 rules...');
  const rulesSnap = await db.collection('intelligence_rules').get();
  let ruleUpdated = 0;
  for (const d of rulesSnap.docs) {
    if (!d.data().rule_type) {
      await d.ref.update({ rule_type: 'universal' });
      ruleUpdated++;
    }
  }
  console.log(`  ${ruleUpdated} rules updated with rule_type='universal'\n`);

  // STEP 1.2: Cluster 9 — Nouvia Design Standard
  console.log('Step 1.2: Seeding Cluster 9 — Nouvia Design Standard...');
  const c9 = [
    { layer:1, cluster:9, cluster_name:'Nouvia design standard', domain:'design_execution', rule_type:'nouvia_standard', coworkers:['Blueprint','Forge'],
      title:'Seven workspace UX patterns — the non-negotiable build standard', source:'Nouvia UX Architecture',
      content:'Pattern 1 — Workspace Hierarchy: 70/30 split. Pattern 2 — One Action Zone: all primary actions top-right. Pattern 3 — Bidirectional Linking: selection highlights in all views. Pattern 4 — Progressive Disclosure: minimum UI for task. Pattern 5 — System Status Always Visible: no spinner-only states. Pattern 6 — Actionable Error Messages: what happened, why, what to do. Pattern 7 — Fast Paths for Experts: keyboard shortcuts for 3 most common actions.' },
    { layer:1, cluster:9, cluster_name:'Nouvia design standard', domain:'design_execution', rule_type:'nouvia_standard', coworkers:['Blueprint','Forge'],
      title:'Enterprise density, typography, and spacing standards', source:'Nouvia Design Standard NCC-003',
      content:'Typography: Nav 16px, H1 24px, H2 20px, H3 16px, Body 14px, Meta 12px, Code 13px mono. System font stack. Spacing: rem for vertical rhythm, px for component gaps. Default 40px rows. Min touch target 44x44pt. Doherty Threshold 400ms max response.' },
    { layer:1, cluster:9, cluster_name:'Nouvia design standard', domain:'design_execution', rule_type:'nouvia_standard', coworkers:['Blueprint','Forge'],
      title:'Color system — semantic meaning over decoration', source:'Nouvia Design Standard',
      content:'Primary Purple #534AB7 — brand, CTAs. Success Green #1D9E75. Warning Amber #BA7517 with pulse animation for building status. Danger Red #E24B4A. 60-30-10 rule: 60% neutral, 30% structure, 10% accent. Never use color as only differentiator. Dark mode mandatory via CSS variables.' },
    { layer:1, cluster:9, cluster_name:'Nouvia design standard', domain:'design_execution', rule_type:'nouvia_standard', coworkers:['Blueprint','Forge'],
      title:'Component hierarchy — three levels of containment', source:'Nouvia Design Standard',
      content:'Level 1 Page section: full-width, no border. Level 2 Card: white bg, 0.5px border, 12px radius. Level 3 Inline panel: expands below card. Never modals for inline content. Slide-in 380px panels only for add-item. No nested scrolling. Borders always 0.5px.' },
    { layer:1, cluster:9, cluster_name:'Nouvia design standard', domain:'design_execution', rule_type:'nouvia_standard', coworkers:['Blueprint','Forge'],
      title:'Navigation architecture — two-tier Studio pattern', source:'Nouvia Design Standard',
      content:'Tier 1 Module tabs always visible: Studio, BSI, SI, DSI. Tier 2 Sub-tabs contextual: Master Backlog, Dashboard, Architecture, Intelligence. No third tier ever. Active state: font-weight 500 + 2px purple bottom border. Never sidebars. Never dropdown navigation.' },
    { layer:1, cluster:9, cluster_name:'Nouvia design standard', domain:'design_execution', rule_type:'nouvia_standard', coworkers:['Blueprint','Forge'],
      title:'Status system — four build states with visual encoding', source:'Nouvia Design Standard',
      content:'Live (green ●): deployed, working. Building (amber ◐): current sprint, pulse animation 2s. Planned (blue ○): on roadmap. Agentic (purple ◇): Phase 4+ autonomous. Badge sizes: small 10px, standard 12px. Never use color alone — always include symbol.' },
    { layer:1, cluster:9, cluster_name:'Nouvia design standard', domain:'design_execution', rule_type:'nouvia_standard', coworkers:['Blueprint','Forge'],
      title:'UX performance constraints — non-negotiable build requirements', source:'Nouvia Design Standard + Apple HIG + Nielsen',
      content:'Five ship blockers: (1) Min touch target 44x44pt. (2) Doherty 400ms max. (3) Hick Law max 5-7 choices. (4) WCAG AA 4.5:1 contrast. (5) No spinner-only loading. Blueprint cites these. Forge builds to them. Release QA verifies.' },
  ];
  for (const doc of c9) { if (await seedIfNew('intelligence_foundations', doc)) added++; else skipped++; }
  console.log(`  Cluster 9: ${c9.length} docs processed\n`);

  // STEP 1.3: Cluster 10 — Brand & Visual Identity
  console.log('Step 1.3: Seeding Cluster 10 — Brand and Visual Identity...');
  const c10 = [
    { layer:1, cluster:10, cluster_name:'Brand and visual identity', domain:'brand_visual', rule_type:'nouvia_standard', coworkers:['Blueprint','Forge','Compass'],
      title:'Nouvia brand positioning — platform not consultancy', source:'Nouvia Brand Standard',
      content:'Single positioning principle: platform company that deploys AI transformation infrastructure. Not consultancy. Two-pillar naming: Studio (internal) and AIMS (client-facing). Powered by Nouvia Intelligence Platform. Words never used: leverage, synergize, best practices, cutting-edge, world-class.' },
    { layer:1, cluster:10, cluster_name:'Brand and visual identity', domain:'brand_visual', rule_type:'nouvia_standard', coworkers:['Blueprint','Forge','Compass'],
      title:'Nouvia color palette — primary and supporting values', source:'Nouvia Brand Standard',
      content:'Primary Purple #534AB7. Teal #1D9E75 for DSI/delivery. Blue #378ADD for AIMS/client. Amber #BA7517 warning. Red #E24B4A danger. System font stack for digital. Arial for Word docs. All production code uses CSS variables or Tailwind classes.' },
    { layer:1, cluster:10, cluster_name:'Brand and visual identity', domain:'brand_visual', rule_type:'nouvia_standard', coworkers:['Blueprint','Forge','Compass'],
      title:'Document and proposal design standards', source:'Nouvia Delivery Standard',
      content:'Four-section structure: Situation, Approach, Investment, Next Steps. Never deviate. Word typography: Arial, H1 36pt navy, H2 28pt navy, H3 24pt blue, Body 22pt. US Letter. Tables use WidthType.DXA. Never apologize for price.' },
    { layer:1, cluster:10, cluster_name:'Brand and visual identity', domain:'brand_visual', rule_type:'nouvia_standard', coworkers:['Blueprint','Forge','Compass'],
      title:'Client cockpit branding — AIMS naming and footer standard', source:'Nouvia Brand Standard',
      content:'Header: [Client Name] AI Management System. Footer: Powered by Nouvia Intelligence Platform. Always this exact string. Client accent color for name pill. Nouvia purple reserved for Studio only. IVC uses dark green #0F6E56.' },
  ];
  for (const doc of c10) { if (await seedIfNew('intelligence_foundations', doc)) added++; else skipped++; }
  console.log(`  Cluster 10: ${c10.length} docs processed\n`);

  // STEP 1.4: Cluster 11 — Strategic Frameworks
  console.log('Step 1.4: Seeding Cluster 11 — Strategic Frameworks...');
  const c11 = [
    { layer:1, cluster:11, cluster_name:'Strategic frameworks', domain:'strategy', rule_type:'universal', coworkers:['Strategist','Compass'],
      title:'Business Model Canvas — nine blocks and Nouvia application', source:'Business Model Generation — Osterwalder',
      content:'Nine blocks: Customer Segments, Value Propositions, Channels, Customer Relationships, Revenue Streams (right side); Key Resources, Key Activities, Key Partners, Cost Structure (left side). Right side drives left side. Three uses: diagnostic, evolution tracker, coworker audit.' },
    { layer:1, cluster:11, cluster_name:'Strategic frameworks', domain:'strategy', rule_type:'universal', coworkers:['Strategist','Compass'],
      title:'Crossing the Chasm — adoption lifecycle and the whole product', source:'Crossing the Chasm — Moore',
      content:'Innovators → Early Adopters → Chasm → Early Majority → Late Majority. Early Adopters buy vision. Early Majority buy proof and need the whole product. Bowling alley strategy: dominate one niche, use wins as peer references. IVC must become the reference case.' },
    { layer:1, cluster:11, cluster_name:'Strategic frameworks', domain:'strategy', rule_type:'universal', coworkers:['Strategist','Compass'],
      title:'Zero to One — the monopoly question and defensible position', source:'Zero to One — Peter Thiel',
      content:'Four monopoly characteristics: proprietary technology (10x better), network effects, economies of scale, branding. Nouvia maps to all four via accumulated intelligence, NCC reuse, client-compounding economics, NIP brand. 0→1 test: building something genuinely new, not competing 1→N.' },
    { layer:1, cluster:11, cluster_name:'Strategic frameworks', domain:'strategy', rule_type:'universal', coworkers:['Strategist','Compass'],
      title:'Lean Startup — validated learning and experiment discipline', source:'The Lean Startup — Eric Ries',
      content:'Build-Measure-Learn operating rhythm. Four questions: riskiest assumption, fastest test, measurement for right/wrong, next experiment if wrong. Innovation accounting tracks progress toward PMF. Pivot types: customer segment, value capture, channel, platform.' },
    { layer:1, cluster:11, cluster_name:'Strategic frameworks', domain:'strategy', rule_type:'universal', coworkers:['Strategist','Compass'],
      title:'Traction — the Bullseye Framework and 50% rule', source:'Traction — Weinberg & Mares',
      content:'50% rule: half on delivery, half on traction. 19 channels exist. Nouvia relevant: direct sales, BD partnerships, content marketing, speaking, engineering as marketing. Bullseye: brainstorm all → test 3-5 → focus on 1-2 proven. Current proven: direct sales, referral.' },
    { layer:1, cluster:11, cluster_name:'Strategic frameworks', domain:'strategy', rule_type:'universal', coworkers:['Strategist','Compass'],
      title:'Hooked — the client retention mechanism', source:'Hooked — Nir Eyal',
      content:'Four-phase Hook: Trigger (existing cue), Action (minimum effort to value, sub-30min), Variable Reward (quality delta surprise), Investment (user contributes value that compounds). Blueprint must answer all four for every feature. No hook design = no adoption.' },
  ];
  for (const doc of c11) { if (await seedIfNew('intelligence_foundations', doc)) added++; else skipped++; }
  console.log(`  Cluster 11: ${c11.length} docs processed\n`);

  // STEP 1.5: L2 Nouvia Standard Rules (49-54)
  console.log('Step 1.5: Seeding L2 Nouvia Standard Rules...');
  const nouvia_rules = [
    { layer:2, rule_number:49, cluster:9, cluster_name:'Nouvia design standard', domain:'nouvia_operations', rule_type:'nouvia_standard',
      title:'Four-section estimate format is mandatory for all client proposals', source:'Nouvia delivery standard',
      content:'Every estimate follows: Situation, Approach, Investment, Next Steps. Never deviate. The format is the credibility signal.', coworkers:['Atlas','Compass'] },
    { layer:2, rule_number:50, cluster:9, cluster_name:'Nouvia design standard', domain:'nouvia_operations', rule_type:'nouvia_standard',
      title:'CIF loading is mandatory at every client session start', source:'Nouvia delivery standard',
      content:'Every coworker must load the Client Intelligence File before generating output. Loading is not optional polish — it is the mechanism for personally curated interactions.', coworkers:['Strategist','Blueprint','Compass','Atlas'] },
    { layer:2, rule_number:51, cluster:9, cluster_name:'Nouvia design standard', domain:'nouvia_operations', rule_type:'nouvia_standard',
      title:'Handoff block is required at every coworker boundary', source:'Nouvia agentic build standard',
      content:'Minimum fields: What was built, Riskiest assumption verified, NCC components used, Open questions, Recommended next step. Prevents context loss at coworker boundaries.', coworkers:['Blueprint','Forge','Compass','Atlas'] },
    { layer:2, rule_number:52, cluster:10, cluster_name:'Brand and visual identity', domain:'nouvia_operations', rule_type:'nouvia_standard',
      title:'Never justify price — present it with confidence and silence', source:'Nouvia selling standard + Voss',
      content:'Atlas does not apologize, over-explain, or decompose price. After presenting Investment section, pause. Let the client respond first. Justifying signals doubt.', coworkers:['Atlas','Compass'] },
    { layer:2, rule_number:53, cluster:10, cluster_name:'Brand and visual identity', domain:'nouvia_operations', rule_type:'nouvia_standard',
      title:'Sub-30-minute Time to First Value is a non-negotiable delivery constraint', source:'Nouvia delivery standard',
      content:'Every solution: meaningful output within 30 minutes of first access. Blueprint includes TTFV milestone. Forge designs onboarding. Release QA tests with new user. IVC baseline: under 20 minutes.', coworkers:['Blueprint','Forge','Compass'] },
    { layer:2, rule_number:54, cluster:10, cluster_name:'Brand and visual identity', domain:'nouvia_operations', rule_type:'nouvia_standard',
      title:'Every engagement must have at least two designed WOW moments', source:'Nouvia delivery standard + The Journey to WOW',
      content:'Peak WOW: art of the possible (Compass). Ending WOW: QBR business impact (Sentinel). These are planned, not left to chance.', coworkers:['Compass','Sentinel'] },
  ];
  for (const doc of nouvia_rules) { if (await seedIfNew('intelligence_rules', doc)) added++; else skipped++; }
  console.log(`  Nouvia standard rules: ${nouvia_rules.length} processed\n`);

  // FINAL COUNTS
  console.log('=== Final Collection Counts ===');
  for (const col of ['intelligence_foundations','intelligence_rules','intelligence_patterns']) {
    const snap = await db.collection(col).get();
    console.log(`  ${col}: ${snap.size} documents`);
  }

  console.log(`\n✅ Phase 1 complete: ${added} added, ${skipped} skipped (already existed)`);
  process.exit(0);
}

run().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
