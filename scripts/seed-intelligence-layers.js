import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
initializeApp({ projectId: 'nouvia-os' });
const db = getFirestore();

const COWORKERS = ['Blueprint', 'Forge', 'Compass', 'Strategist'];
const BASE_L2 = { layer: 2, domain: 'delivery', coworkers: COWORKERS, use_count: 0, last_used_at: null, version: 'v1.0', status: 'active' };
const BASE_L3 = { layer: 3, domain: 'client_patterns', coworkers: COWORKERS, use_count: 0, last_used_at: null, version: 'v1.0', status: 'active', validated_by_sentinel: false };

const L2_RULES = [
  // Cluster 21 — Hook design (8)
  { rule_number: 1, cluster: 21, cluster_name: 'Hook design', title: 'Internal trigger before external trigger', content: 'Design for the feeling the user already has, not the notification you send them. Map to an existing emotion: boredom, FOMO, uncertainty.', source: 'Hooked — Nir Eyal, Ch 2' },
  { rule_number: 2, cluster: 21, cluster_name: 'Hook design', title: 'Variable reward beats fixed reward', content: 'Unpredictable rewards retain better than predictable ones. Design for variability: new ideas, new insights, surprising connections.', source: 'Hooked — Nir Eyal, Ch 4' },
  { rule_number: 3, cluster: 21, cluster_name: 'Hook design', title: 'Investment increases switching cost', content: 'Every piece of data a client adds to AIMS increases their cost to leave. Design for accumulation: goals, issues, ideas — each increases lock-in organically.', source: 'Hooked — Nir Eyal, Ch 5' },
  { rule_number: 4, cluster: 21, cluster_name: 'Hook design', title: 'Low-friction first action is critical', content: 'The first action must require minimal effort. If onboarding requires more than 3 steps before first value, dropout is high.', source: 'Hooked — Nir Eyal, Ch 3' },
  { rule_number: 5, cluster: 21, cluster_name: 'Hook design', title: 'Social rewards outperform functional rewards', content: 'Recognition from peers drives stronger retention than feature utility alone. Design for visibility of contributions.', source: 'Hooked + Influence — Cialdini' },
  { rule_number: 6, cluster: 21, cluster_name: 'Hook design', title: 'Progress indicators sustain engagement', content: 'Visible progress toward a goal drives completion behavior. SCOR pillar bars, OKR rings, and backlog burn-down are retention mechanics.', source: 'Drive — Daniel Pink' },
  { rule_number: 7, cluster: 21, cluster_name: 'Hook design', title: 'Vitamins become painkillers through habit', content: 'Start as a nice-to-have that becomes essential through daily use. Design the cockpit so users check it habitually.', source: 'Hooked — Nir Eyal, Intro' },
  { rule_number: 8, cluster: 21, cluster_name: 'Hook design', title: 'Peak-end rule governs perception of value', content: 'Users remember the emotional peak and the ending, not the average. Design so the last interaction always ends on a positive signal.', source: 'Thinking Fast and Slow — Kahneman' },
  // Cluster 22 — UX constraints (7)
  { rule_number: 9, cluster: 22, cluster_name: 'UX constraints', title: 'Progressive disclosure reduces cognitive load', content: 'Show only what is needed for the current decision. Reveal complexity on demand. Never front-load all features.', source: 'Dont Make Me Think — Krug' },
  { rule_number: 10, cluster: 22, cluster_name: 'UX constraints', title: 'Consistency beats novelty in enterprise UX', content: 'Enterprise users prioritize predictability. Match conventions from tools they already use.', source: 'Design of Everyday Things — Norman' },
  { rule_number: 11, cluster: 22, cluster_name: 'UX constraints', title: 'Error prevention over error recovery', content: 'Design to prevent wrong actions. Confirmation dialogs, locked stages, and change request flows prevent costly errors.', source: 'Design of Everyday Things — Norman' },
  { rule_number: 12, cluster: 22, cluster_name: 'UX constraints', title: 'Visible system status builds trust', content: 'Users need to know what the system is doing. Loading states, progress indicators, and sync confirmations are trust signals.', source: 'Usability Engineering — Nielsen' },
  { rule_number: 13, cluster: 22, cluster_name: 'UX constraints', title: 'Recognition over recall', content: 'Minimize cognitive load by making options visible. Dropdowns over free-text. Status badges over status codes.', source: 'Usability Engineering — Nielsen' },
  { rule_number: 14, cluster: 22, cluster_name: 'UX constraints', title: 'Aesthetic usability effect', content: 'Visually appealing interfaces are perceived as more usable and credible. Design quality is a competitive signal.', source: 'Emotional Design — Norman' },
  { rule_number: 15, cluster: 22, cluster_name: 'UX constraints', title: 'Decision fatigue reduces approval rates', content: 'Too many decisions in sequence degrades quality. Limit any single workflow to 3 decisions maximum before a break.', source: 'Thinking Fast and Slow — Kahneman' },
  // Cluster 23 — Discovery method (6)
  { rule_number: 16, cluster: 23, cluster_name: 'Discovery method', title: 'Problems before solutions', content: 'Never present a solution before the client has articulated the problem in their own words. Problem-first creates alignment.', source: 'SPIN Selling — Rackham' },
  { rule_number: 17, cluster: 23, cluster_name: 'Discovery method', title: 'Implication questions create urgency', content: 'After identifying a problem, ask about consequences: What does this cost you? Implication questions self-generate urgency.', source: 'SPIN Selling — Rackham' },
  { rule_number: 18, cluster: 23, cluster_name: 'Discovery method', title: 'Listen for the 80/20 of pain', content: 'Most discovery surfaces 5-10 problems. Usually 1-2 account for 80% of strategic pain. Identify and anchor on those.', source: 'The Challenger Sale' },
  { rule_number: 19, cluster: 23, cluster_name: 'Discovery method', title: 'Economic buyer must be in the room', content: 'Discovery without the economic decision-maker is theater. If you cannot get the budget owner, qualify the opportunity.', source: 'SPIN Selling + Challenger Sale' },
  { rule_number: 20, cluster: 23, cluster_name: 'Discovery method', title: 'Silence after a proposal is information', content: 'A client who goes quiet after a proposal is processing, not rejecting. Wait for their response before filling the silence.', source: 'Never Split the Difference — Voss' },
  { rule_number: 21, cluster: 23, cluster_name: 'Discovery method', title: 'Label emotions to defuse resistance', content: 'Name what the client is feeling. Labeling reduces emotional temperature and creates space for rational discussion.', source: 'Never Split the Difference — Voss' },
  // Cluster 24 — Pricing behavior (6)
  { rule_number: 22, cluster: 24, cluster_name: 'Pricing behavior', title: 'Anchor high then negotiate scope not price', content: 'Set the anchor at the full value delivered. Negotiate by removing scope, never by reducing price. Price reductions devalue.', source: 'Predictably Irrational — Ariely' },
  { rule_number: 23, cluster: 24, cluster_name: 'Pricing behavior', title: 'Price on outcomes not effort', content: 'Clients pay for business outcomes, not hours. Frame pricing around what changes for them, not what it costs you to build.', source: 'Value-Based Pricing — Nagle' },
  { rule_number: 24, cluster: 24, cluster_name: 'Pricing behavior', title: 'Monthly recurring beats project billing', content: 'MRR creates sustainable revenue and client expectation of ongoing value. Transition from project fees to managed platform fees.', source: 'Technology-as-a-Service Playbook' },
  { rule_number: 25, cluster: 24, cluster_name: 'Pricing behavior', title: 'Loss aversion drives renewal more than gain', content: 'Clients renew to avoid losing what they have more than to gain new features. Frame renewal around what stops working if they leave.', source: 'Thinking Fast and Slow — Kahneman' },
  { rule_number: 26, cluster: 24, cluster_name: 'Pricing behavior', title: 'Three-tier pricing increases average deal size', content: 'Offer three options: basic, recommended, premium. Most buyers choose the middle. The premium option makes the middle feel reasonable.', source: 'Predictably Irrational — Ariely' },
  { rule_number: 27, cluster: 24, cluster_name: 'Pricing behavior', title: 'Grant funding reframes budget conversations', content: 'When grant coverage is available, lead with net cost after grant. The psychological anchor shifts from total investment to out-of-pocket.', source: 'IVC engagement observation' },
  // Cluster 25 — Retention mechanics (5)
  { rule_number: 28, cluster: 25, cluster_name: 'Retention mechanics', title: 'Endowment effect locks in adoption', content: 'Once a client has customized the platform, they value it more than an equivalent alternative. Encourage personalization early.', source: 'Thinking Fast and Slow — Kahneman' },
  { rule_number: 29, cluster: 25, cluster_name: 'Retention mechanics', title: 'Status quo bias favors the incumbent', content: 'Clients default to keeping what they have. Design switching costs through data accumulation, workflow integration, and team training.', source: 'Behavioral Economics — Thaler' },
  { rule_number: 30, cluster: 25, cluster_name: 'Retention mechanics', title: 'Community reduces churn', content: 'Clients who interact with peers using the same platform churn less. User groups, shared benchmarks, and industry insights create network effects.', source: 'Crossing the Chasm — Moore' },
  { rule_number: 31, cluster: 25, cluster_name: 'Retention mechanics', title: 'Proactive outreach before renewal prevents churn', content: 'The renewal conversation starts 90 days before expiry, not at expiry. Surface value delivered, problems solved, and roadmap before the decision.', source: 'Customer Success — Mehta' },
  { rule_number: 32, cluster: 25, cluster_name: 'Retention mechanics', title: 'Adoption metrics predict churn before surveys do', content: 'Usage frequency, feature breadth, and time-to-value are stronger churn predictors than NPS or satisfaction surveys. Measure behavior, not opinion.', source: 'Customer Success + Sentinel design' },
  // Cluster 26 — Data governance (5)
  { rule_number: 33, cluster: 26, cluster_name: 'Data governance', title: 'Data quality is a discovery question not IT', content: 'Surface data quality during discovery, not after build. Ask: who owns the data, how often is it updated, what happens when it is wrong.', source: 'IVC engagement — Rule 2.45' },
  { rule_number: 34, cluster: 26, cluster_name: 'Data governance', title: 'Schema-first prevents integration debt', content: 'Define the data schema before building the integration. Schema changes after deployment are 10x more expensive than schema changes before.', source: 'Data engineering best practices' },
  { rule_number: 35, cluster: 26, cluster_name: 'Data governance', title: 'Audit trails are non-negotiable', content: 'Every write operation must be traceable. Who changed what, when, and why. This is not optional for regulated industries or enterprise trust.', source: 'SOC 2 + enterprise requirements' },
  { rule_number: 36, cluster: 26, cluster_name: 'Data governance', title: 'Client data never leaves their boundary without consent', content: 'Data residency, encryption at rest, and access controls must be defined at engagement start. Default to most restrictive.', source: 'Privacy by design — Cavoukian' },
  { rule_number: 37, cluster: 26, cluster_name: 'Data governance', title: 'Learning data is the platform moat', content: 'Every correction, every annotation, every domain-specific mapping is proprietary client data. Protect it as IP — it is the switching cost.', source: 'IVC Learning Library design' },
];

const L3_PATTERNS = [
  { title: 'Nick Vardaro — grant math framing', content: 'Nick forward-calculates total grant coverage before engaging with scope. If $146k ESSOR coverage and net out-of-pocket cost are not stated in the first 60 seconds, he disengages from pricing discussions.', client: 'IVC', confidence: 0.95, cluster: 31, cluster_name: 'IVC patterns', source: 'Observed across 3 IVC meetings: Feb 12, Mar 5, Mar 25 2026' },
  { title: 'Josy Lapointe — working demo before scope commitment', content: 'Josy needs a working demo before committing to scope changes. Slide decks and proposals fail to move her. Live platform demonstrations with real IVC data consistently produce operational sign-off.', client: 'IVC', confidence: 0.9, cluster: 31, cluster_name: 'IVC patterns', source: 'Observed across 2 IVC meetings' },
  { title: 'IVC — competitive urgency framing works with tier-1 only', content: 'IVC responds positively to competitive urgency framing when referencing Vooban or IA Expert. Reacts negatively to comparisons with smaller competitors. Frame competition upward, not sideways.', client: 'IVC', confidence: 0.85, cluster: 31, cluster_name: 'IVC patterns', source: 'Observed Nick and Josy responses' },
  { title: 'IVC — ESSOR milestone anchoring approves ideas', content: 'IVC has approved every capability proposal explicitly linked to an active ESSOR grant milestone. Ideas disconnected from grant phases stall regardless of technical merit.', client: 'IVC', confidence: 0.92, cluster: 31, cluster_name: 'IVC patterns', source: 'Pattern from 4 approved vs 2 stalled proposals' },
  { title: 'IVC — Said Hamdad builds independently, needs autonomy', content: 'Said prefers to implement solutions independently once direction is set. Overcommunicating steps or checking in frequently triggers resistance. Set direction clearly once, then let him execute.', client: 'IVC', confidence: 0.8, cluster: 31, cluster_name: 'IVC patterns', source: 'Observed across technical implementation conversations' },
  { title: 'IVC — Nelson Lapointe needs technical proof not business case', content: 'Nelson engages on technical architecture, accuracy metrics, and integration specifics. Business case arguments do not move him. Lead with how the system works.', client: 'IVC', confidence: 0.85, cluster: 31, cluster_name: 'IVC patterns', source: 'Observed across technical review sessions' },
];

async function seed() {
  // Check L2
  const l2Snap = await db.collection('intelligence_rules').limit(1).get();
  if (!l2Snap.empty) { console.log('Layer 2 already seeded. Skipping.'); }
  else {
    console.log('Seeding Layer 2 — 37 application rules...');
    for (const rule of L2_RULES) {
      await db.collection('intelligence_rules').add({ ...BASE_L2, ...rule, created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() });
      process.stdout.write('.');
    }
    console.log(`\n  ✓ ${L2_RULES.length} Layer 2 rules seeded`);
  }

  // Check L3
  const l3Snap = await db.collection('intelligence_patterns').limit(1).get();
  if (!l3Snap.empty) { console.log('Layer 3 already seeded. Skipping.'); }
  else {
    console.log('Seeding Layer 3 — 6 IVC patterns...');
    for (const pat of L3_PATTERNS) {
      await db.collection('intelligence_patterns').add({ ...BASE_L3, ...pat, created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() });
      process.stdout.write('.');
    }
    console.log(`\n  ✓ ${L3_PATTERNS.length} Layer 3 patterns seeded`);
  }

  console.log('\n✅ Seed complete');
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
