import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp({ projectId: 'nouvia-os' });
const db = getFirestore();

const COWORKERS = ['Blueprint', 'Forge', 'Compass', 'Strategist'];

function baseDoc(extra) {
  return {
    use_count: 0,
    last_used_at: null,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
    status: 'active',
    coworkers: COWORKERS,
    version: 'v1.0',
    ...extra,
  };
}

// ─── SECTION 1: intelligence_foundations (Layer 1) ───────────────────────────

const L1_DOCS = [
  // Cluster 1 — Human behavior (domain: behavioral_design) — 9 docs
  { title: 'Hook model — trigger, action, variable reward, investment', source: 'Hooked — Nir Eyal', domain: 'behavioral_design', content: 'Products that form habits run users through a four-phase loop. A trigger prompts an action. The action delivers a variable reward. The user invests something that makes the next cycle more likely. Every AI solution must create a cycle, not just complete a task.' },
  { title: 'Internal vs external triggers — design for emotional state', source: 'Hooked — Nir Eyal', domain: 'behavioral_design', content: 'External triggers are notifications outside the user. Internal triggers are emotional states that become associated with a product through repeated use. Solutions depending entirely on external triggers are fragile. Design for the emotional context.' },
  { title: 'System 1 vs System 2 — design for automatic, not deliberate', source: 'Thinking Fast and Slow — Kahneman', domain: 'behavioral_design', content: 'System 1 is fast, automatic, habitual. System 2 is slow, deliberate, effortful. If using an AI platform requires System 2 thinking, adoption will always be fragile. Design so the right action is the System 1 action.' },
  { title: 'Habit loop — cue, routine, reward — attach to existing cues', source: 'The Power of Habit — Duhigg', domain: 'behavioral_design', content: 'Habits form through cue-routine-reward loops. Attach to existing cues rather than creating new habits. Never ask users to adopt a new behavior — ask them to do their existing behavior differently.' },
  { title: 'Anchoring and arbitrary coherence — first number shapes all judgments', source: 'Predictably Irrational — Ariely', domain: 'behavioral_design', content: 'The first number encountered irrationally influences all subsequent judgments. Present Phase 1 price first, never the full build total. The first client experience sets the quality anchor for everything that follows.' },
  { title: 'Social proof and authority — two most powerful B2B persuasion principles', source: 'Influence — Cialdini', domain: 'behavioral_design', content: 'Social proof (people follow what similar others do) and authority (people defer to perceived experts) are the two most relevant for B2B technology adoption. Establish authority through specific relevant reference points.' },
  { title: 'Peak-end rule — design the peak moment and the ending deliberately', source: 'The Power of Moments — Heath & Heath', domain: 'behavioral_design', content: 'People remember the peak (most intense moment) and the end (how it finished). The engagement needs designed peaks and a strong ending. Compass owns the peak moment. Sentinel owns the strong ending.' },
  { title: 'What customers cannot tell you — behavioral data over conversational data', source: 'What Your Customer Wants — Palmer', domain: 'behavioral_design', content: 'Customers make decisions based on subconscious processes they cannot articulate. Observing what they do produces reliable data. Three biases drive most resistance: loss aversion, status quo bias, social proof gap.' },
  { title: 'UX specification standard — exact constraints for building to industry baselines', source: 'Apple HIG + Material Design 3 + Nielsen', domain: 'behavioral_design', content: 'Minimum touch target 44x44pt. Doherty Threshold sub-400ms response. Hick Law max 5-7 options. Miller Law max 7 items without chunking. WCAG AA 4.5:1 contrast. Non-negotiable build constraints.' },

  // Cluster 2 — Revenue models (domain: subscription_business) — 10 docs
  { title: 'LAER model — Land, Adopt, Expand, Renew', source: 'Technology-as-a-Service Playbook — Lah & Wood', domain: 'subscription_business', content: 'Most tech companies invest in Land and Expand and skip Adopt entirely — primary cause of churn. Nouvia must confirm adoption before proposing expansion SOWs.' },
  { title: 'ROI frame — lead every estimate with the business outcome', source: 'TaaS Playbook', domain: 'subscription_business', content: 'CFOs decide based on cost replacement or revenue growth, not feature lists. Every proposal must connect the feature to the financial outcome. Frame against the $150k offshore replacement cost.' },
  { title: 'Flywheel design — reinforcing components that compound over time', source: 'Turning the Flywheel — Collins', domain: 'subscription_business', content: 'Nouvia flywheel: Delivery quality → behavioral data → Sentinel intelligence → proactive opportunities → expanded engagements → more data → smarter OS → stronger delivery. Every decision should add flywheel momentum.' },
  { title: 'Churn economics — retention beats acquisition', source: 'The Automatic Customer — Warrillow', domain: 'subscription_business', content: 'Acquiring new customers costs 5-7x more than retaining. Phase 3 renewal is decided monthly based on perceived value. Sentinel monthly reporting converts trust to evidence.' },
  { title: 'Phase 3 as three value propositions — never call it managed services', source: 'The Automatic Customer — Warrillow', domain: 'subscription_business', content: 'Peace of Mind (monitored and maintained), Simplifier (ongoing improvements without new SOWs), Front of the Line (priority access). Never describe as managed services.' },
  { title: 'Value metric — price should scale naturally with value delivered', source: 'TaaS Playbook — Lah & Wood', domain: 'subscription_business', content: 'Monthly base + $500 per workflow on platform. Price scales with complexity and value. Per-workflow escalation creates natural expansion revenue path.' },
  { title: 'Business model as hypothesis — test components not the whole plan', source: 'Getting to Plan B — Mullins & Komisar', domain: 'subscription_business', content: 'Five components to test: Revenue Model, Gross Margin, Operating Model, Working Capital, Investment Model. Change failing components specifically.' },
  { title: 'Recurring revenue and valuation — MRR commands 3-8x higher multiples', source: 'The Subscription Boom — Levinter', domain: 'subscription_business', content: 'Subscription businesses command 3-8x higher valuation multiples. 10 Phase 3 clients at $6k/month = $720k ARR. At 5x multiple = $3.6M enterprise value.' },
  { title: 'Onboarding as the make-or-break moment — time to first value determines retention', source: 'Subscription Marketing — Janzer', domain: 'subscription_business', content: 'First 90 days determine renewal. Time to First Value must be short. Every estimate must include a TTFV milestone.' },
  { title: 'Retention marketing loop — success content, usage triggers, value evidence', source: 'Subscription Marketing — Janzer', domain: 'subscription_business', content: 'Three mechanisms: Success Content (showing how to get more value), Usage Triggers (prompting at right moments), Value Evidence (quantifying outcomes). Without all three, clients drift toward churn.' },

  // Cluster 3 — Validation (domain: product_validation) — 8 docs
  { title: 'No facts inside the building — customer development is behavioral investigation', source: 'Four Steps to the Epiphany — Blank', domain: 'product_validation', content: 'All business plans created inside the company are opinions. Facts only exist in the market. Nova discovery must be redesigned around behavioral questions.' },
  { title: 'The Mom Test — ask about behavior not preferences', source: 'Running Lean — Maurya', domain: 'product_validation', content: 'Never ask if they would use your product. Ask about actual behavior, past experiences, real problems, and what they have tried. Good questions about past behavior, bad questions about future preferences.' },
  { title: 'Problem-solution fit before product-market fit', source: 'From Idea to Product-Market Fit — Mohout', domain: 'product_validation', content: 'Two sequential stages. IVC floorplan tool has Problem-Solution Fit but NOT Product-Market Fit. Only 1 engineer using it. Most jobs still manual. Estimation is at hypothesis stage.' },
  { title: 'Riskiest assumption test — identify and test the load-bearing assumption first', source: 'Testing Business Ideas — Bland & Osterwalder', domain: 'product_validation', content: 'Usually one or two assumptions are load-bearing. Test the riskiest first with the smallest possible experiment. Blueprint must include a Riskiest Assumption field.' },
  { title: 'The Lean Canvas — every version is a hypothesis', source: 'Running Lean — Maurya', domain: 'product_validation', content: 'A one-page structured hypothesis. Each client engagement has its own canvas. Nova Mode A should produce a one-paragraph Engagement Hypothesis.' },
  { title: 'Sprint — 5 days to a testable answer without building', source: 'Sprint — Jake Knapp', domain: 'product_validation', content: 'Map, Sketch, Decide, Prototype, Test. Most questions can be answered with a realistic prototype in 5 days. Tier 3-4 builds should have a prototype sprint first.' },
  { title: 'Segment first then go deep — dominate one segment before expanding', source: 'Find Your Market — Garbugli', domain: 'product_validation', content: 'Find the segment where you already have traction and go deeper before going wider. IVC profile: owner-operated, cost pressure, manual workflows, AI-naive, 10-50 employees.' },
  { title: 'Validated learning vs vanity metrics', source: 'The Lean Startup — Ries', domain: 'product_validation', content: 'Vanity metrics: total users, revenue, features shipped. Validated learning metrics: retention rate, daily active usage, feature utilization, time to first value. IVC validated baseline: 1 active engineer, sub-20min TTFV, 85% accuracy.' },

  // Cluster 4 — UX design (domain: ux_design) — 8 docs
  { title: 'Dont make them think — cognitive load is the enemy of adoption', source: 'Dont Make Me Think — Krug', domain: 'ux_design', content: 'Every time a user stops to figure out what to do, they spend cognitive energy. Users scan for the first reasonable option and click. Hick Law, Fitts Law, Jakob Law encode this mathematically.' },
  { title: 'Four big risks — value, usability, feasibility, viability', source: 'Inspired — Cagan', domain: 'ux_design', content: 'Value risk (will they use it?), Usability risk (can they figure it out?), Feasibility risk (can we build it?), Viability risk (is this sustainable?). Feasibility is the least interesting risk.' },
  { title: 'User story mapping — build shared understanding before blueprint', source: 'User Story Mapping — Patton', domain: 'ux_design', content: 'Two-dimensional visualization: horizontal=user journey, vertical=depth of functionality. The map is a shared understanding artifact, not planning artifact.' },
  { title: 'Why What-If How discovery model', source: 'A More Beautiful Question — Berger', domain: 'ux_design', content: 'WHY (challenge status quo), WHAT IF (imagine alternatives), HOW (make it real). Most discovery skips to HOW. Running all three produces transformation.' },
  { title: 'Service blueprinting — map frontstage and backstage separately', source: 'This Is Service Design Thinking — Stickdorn', domain: 'ux_design', content: 'Frontstage: everything the customer sees. Backstage: everything that enables it. Both must be designed deliberately. Blueprint must include both sections.' },
  { title: 'Outcome vs output — features are not value, measure behavioral change', source: 'Inspired — Cagan', domain: 'ux_design', content: 'Output is what you ship. Outcome is what changes. The product death cycle: ship features, measure existence not impact. Every estimate must define the outcome being targeted.' },
  { title: 'UX laws as non-negotiable build constraints', source: 'Nielsen 10 Heuristics + Laws of UX', domain: 'ux_design', content: 'Ten laws govern whether an interface will be usable. Currently build quality depends on Ben personal instincts. UX laws make the standard transferable and auditable.' },
  { title: 'Seven Nouvia workspace UX patterns — the build standard foundation', source: 'Nouvia UX Architecture — Melchionno', domain: 'ux_design', content: 'Seven structural rules: Workspace Hierarchy 70/30 split, One Action Zone, Bidirectional Linking, Progressive Disclosure, System Status Always Visible, Actionable Error Messages, Fast Paths for Experts.' },

  // Cluster 5 — Momentum (domain: organizational_excellence) — 6 docs
  { title: 'Checklists prevent ineptitude — DO-CONFIRM at every handoff', source: 'The Checklist Manifesto — Gawande', domain: 'organizational_excellence', content: 'Expert failure is ineptitude, not ignorance. DO-CONFIRM checklists ensure experts actually do what they know. The Build Standard, handoff block, and 7 Workspace Patterns are Gawande checklists.' },
  { title: 'Disruptive innovation — enter where incumbents cannot profitably go', source: 'The Innovators Dilemma — Christensen', domain: 'organizational_excellence', content: 'Disruptors enter at the low end — too small for incumbents to compete. Nouvia serves clients McKinsey and Deloitte ignore. Stay at the entry point long enough to build the platform.' },
  { title: 'Sigmoid curve — start the next curve while still ascending', source: 'The Age of Paradox — Handy', domain: 'organizational_excellence', content: 'Every strategy follows an S-curve. The right time to start the next curve is while ascending. Nouvia consulting is ascending — build the platform curve now.' },
  { title: 'One metric that matters — stage-appropriate measurement', source: 'Lean Analytics — Croll & Yoskovitz', domain: 'organizational_excellence', content: 'IVC is at Stickiness stage. OMTM is platform adoption rate: % of jobs through platform vs manually. Not revenue. Until that metric moves to 80%+, expansion is premature.' },
  { title: 'Make them ecstatically happy — depth before width', source: 'The Art of the Start — Kawasaki', domain: 'organizational_excellence', content: 'IVC must become ecstatically happy before Client 2. One reference case beats three mediocre clients. Ecstatically happy: 80%+ adoption, 3+ engineers active, 3-day delivery consistent.' },
  { title: 'Investable metrics — MRR, NRR, LTV, CAC from day one', source: 'Venture Deals — Feld & Mendelson', domain: 'organizational_excellence', content: 'Track MRR, NRR, CAC, LTV, expansion revenue. NRR should be >100%. Per-workflow escalation model improves NRR naturally.' },

  // Cluster 6 — Client selling (domain: client_relationships) — 6 docs
  { title: 'Tactical empathy before pitch — mirror, label, calibrated questions', source: 'Never Split the Difference — Voss', domain: 'client_relationships', content: 'Understand the other party and make them feel heard before moving them. Core tools: mirroring, labeling, calibrated questions (How/What). Run accusation audit before pricing.' },
  { title: 'Make the client feel genuinely known — CIF is Carnegie applied systematically', source: 'How to Win Friends — Carnegie', domain: 'client_relationships', content: 'The fundamental desire: to feel important and understood. CIF loading at session start is Carnegie applied systematically. Luxury client experience requires persistent client knowledge.' },
  { title: 'Luxury service — the experience IS the product, never justify price', source: 'Luxury Selling — Srun', domain: 'client_relationships', content: 'Three principles: understand client world before offering, never justify price (it signals doubt), the experience is the product. The estimate format, brand design, proactive advisory ARE the product.' },
  { title: 'Design the WOW moment — the gap between expected and delivered', source: 'The Journey to WOW — Belding', domain: 'client_relationships', content: 'WOW is not a feature — it is a gap between expectation and experience. Every engagement needs at least two designed WOW moments: peak (art of the possible) and ending (QBR data).' },
  { title: 'Customer experience is a business result — six CX disciplines', source: 'Outside In — Manning & Bodine', domain: 'client_relationships', content: 'Six disciplines: Strategy, Customer Understanding (CIF), Design, Measurement (Sentinel), Governance (7 Patterns), Culture (CIF loading mandatory).' },
  { title: 'Proactive service beats reactive service', source: 'Digital Customer Service — Delisi & Michaeli', domain: 'client_relationships', content: 'Proactive service has dramatically higher satisfaction and lower churn. Sentinel monthly report (value evidence), Compass quarterly advisory (strategic counsel). The client should never initiate "how are things going?"' },

  // Cluster 7 — Data strategy (domain: data_intelligence) — 6 docs
  { title: 'Three types of data-driven value — Type 3 embedded is the foundation', source: 'Monetizing Data — Liozu & Ulaga', domain: 'data_intelligence', content: 'Type 1: data as product. Type 2: data as service. Type 3: data embedded in offerings. Nouvia is building Type 3. Blueprint must design data capture into every solution from day one.' },
  { title: 'Data quality determines AI quality — governance is a discovery question', source: 'Data Monetization cluster', domain: 'data_intelligence', content: 'Quality of AI output is bounded by data quality. IVC three open questions are data quality questions. Nouvia diagnoses data quality before building.' },
  { title: 'Data silo wedge — integration IS the intelligence layer', source: '5 Steps to Harvesting Data — Holloway', domain: 'data_intelligence', content: 'The company that builds the integration layer between disconnected systems creates the intelligence layer. SolidWorks + Genius ERP integration becomes the intelligence layer.' },
  { title: 'Everything can be measured — uncertainty reduction, not perfection', source: 'How to Measure Anything — Hubbard', domain: 'data_intelligence', content: 'If something matters, it can be measured. Decompose unmeasurable things into smaller observable proxies. Together they produce evidence-based conversations.' },
  { title: 'Behavioral data beats conversational data — capture what users actually do', source: 'Data Monetization cluster', domain: 'data_intelligence', content: 'What users say they do and what they actually do diverge. Usage logs, session patterns, feature utilization produce behavioral data. Zero session visibility is currently Nouvia biggest gap.' },
  { title: 'Data as a compounding asset — accumulated domain intelligence is the moat', source: 'Monetizing Data — Liozu & Ulaga', domain: 'data_intelligence', content: 'Unlike physical assets, data appreciates with use. Every additional engagement produces cross-client patterns. The organization with the most relevant domain data becomes progressively harder to displace.' },
];

// ─── SECTION 2: intelligence_rules (Layer 2) — 48 rules ─────────────────────

const L2_RULES = [
  { rule_number: 1, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'Build-Measure-Learn is the delivery operating rhythm', source: 'Lean Startup — Ries', content: 'Every delivery is an experiment. Sentinel measures what happens. Nova incorporates the learning. The loop never breaks.' },
  { rule_number: 2, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'Every solution must have a hook design', source: 'Hooked — Nir Eyal', content: 'Blueprint must answer four questions: TRIGGER (existing cue), ACTION (minimum effort to value), VARIABLE REWARD (unpredictable delight), INVESTMENT (what user contributes that improves platform). Without all four, it is a task tool not a habit-forming product.' },
  { rule_number: 3, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'Variable reward is the surprise, not the completion', source: 'Hooked — Nir Eyal', content: 'Completion is predictable. The variable reward is the quality delta between expected and AI-found results. Design to surface the surprise explicitly.' },
  { rule_number: 4, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'Attach to existing cues — never create new habits from scratch', source: 'Hooked — Nir Eyal + Power of Habit', content: 'Users have existing workflows with existing triggers. Design the solution to insert itself into them. Never ask users to adopt a new behavior.' },
  { rule_number: 5, cluster: 22, cluster_name: 'UX constraints', domain: 'ux_design', title: 'Design for System 1, not System 2', source: 'Thinking Fast and Slow — Kahneman', content: 'If the primary flow requires deliberate thought, adoption is fragile. The UX Anchor is a System 1 constraint. Blueprint test: Can the user complete the primary task without stopping to think?' },
  { rule_number: 6, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'Set the quality anchor with the first deliverable', source: 'Predictably Irrational — Ariely', content: 'The first thing shipped sets the quality anchor for everything that follows. Start with the highest-confidence, cleanest deliverable — not the most ambitious.' },
  { rule_number: 7, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'Design the peak moment deliberately', source: 'The Power of Moments — Heath & Heath', content: 'Every engagement needs a designed peak moment. Compass owns the peak (art of the possible). Sentinel owns the strong ending (QBR business impact data).' },
  { rule_number: 8, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'When a client resists, diagnose the bias before responding', source: 'Thinking Fast and Slow + Influence', content: 'Resistance is almost never about the recommendation. Diagnose: Loss aversion → reframe risk of NOT changing. Status quo bias → make new option familiar. Social proof gap → show similar companies.' },
  { rule_number: 9, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'Luxury experience, accessible price — CIF loading is mandatory', source: 'Luxury Selling — Srun + Carnegie', content: 'AI enables personally curated service at accessible price. CIF encodes client knowledge. Every interaction should feel like the coworker already knows who this client is.' },
  { rule_number: 10, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'Brand and content marketing are pipeline infrastructure', source: 'Crossing the Chasm — Moore', content: 'Brand building combined with content marketing creates the awareness pipeline. Without it, Nouvia is invisible to prospects not referred directly.' },
  { rule_number: 11, cluster: 23, cluster_name: 'Discovery method', domain: 'discovery', title: 'Discovery must find the real problem, not the stated problem', source: 'SPIN Selling — Rackham', content: 'Customers describe symptoms, not root causes. Nova must ask progressive questions that move from symptom to actual pain to underlying system failure.' },
  { rule_number: 12, cluster: 26, cluster_name: 'Data governance', domain: 'data_intelligence', title: 'AI unlocks data monetization that was not previously possible', source: 'Monetizing Data — Liozu', content: 'Pattern extraction, anomaly detection, sentiment monitoring are now possible at scale at the client data layer. This is a new value-creation model.' },
  { rule_number: 13, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'Every strategic decision should add flywheel momentum', source: 'Good to Great — Collins', content: 'Any decision that does not add momentum to at least one flywheel component should be questioned. Flywheel: delivery → data → intelligence → opportunities → engagements → more data → smarter OS.' },
  { rule_number: 14, cluster: 24, cluster_name: 'Pricing behavior', domain: 'pricing', title: 'Never expand before adoption is confirmed', source: 'TaaS Playbook — Lah & Wood', content: 'Before any expansion SOW, confirm minimum utilization threshold. Expanding to a client who has not adopted Phase 1 is the most common TaaS failure mode.' },
  { rule_number: 15, cluster: 24, cluster_name: 'Pricing behavior', domain: 'pricing', title: 'Lead every estimate with the business outcome, not the feature', source: 'TaaS Playbook', content: 'CFOs decide based on cost replacement or revenue growth. Atlas must frame around the financial outcome first. IVC: frame against $150k offshore replacement cost.' },
  { rule_number: 16, cluster: 24, cluster_name: 'Pricing behavior', domain: 'pricing', title: 'Phase 3 is three value propositions, not managed services', source: 'The Automatic Customer — Warrillow', content: 'Never describe as managed services. Always frame as Peace of Mind + Simplifier + Front of the Line. Same price, completely different perceived value.' },
  { rule_number: 17, cluster: 25, cluster_name: 'Retention mechanics', domain: 'retention', title: 'Value must be visible to be defensible', source: 'Customer Success — Mehta', content: 'Trust-based value perception is one personnel change from collapse. Sentinel monthly reporting converts trust into data. Building Sentinel is the most important retention action.' },
  { rule_number: 18, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'Every strategic decision gets a flywheel test', source: 'Good to Great — Collins', content: 'Before committing to any investment, ask: does this add flywheel momentum? Options that do not reinforce at least one component should be deprioritized.' },
  { rule_number: 19, cluster: 24, cluster_name: 'Pricing behavior', domain: 'pricing', title: 'Track MRR impact on every decision', source: 'SaaS metrics best practice', content: 'A decision adding $1k/month recurring is worth more long-term than $15k one-time. Atlas must always show MRR impact alongside project price.' },
  { rule_number: 20, cluster: 25, cluster_name: 'Retention mechanics', domain: 'retention', title: 'Define Time to First Value for every engagement', source: 'Subscription Marketing — Janzer', content: 'Every estimate must include a TTFV milestone: the specific outcome and when. Converts onboarding from administrative to value-based.' },
  { rule_number: 21, cluster: 25, cluster_name: 'Retention mechanics', domain: 'retention', title: 'Sub-30-minute Time to First Value is a delivery standard', source: 'IVC engagement data', content: 'Every Nouvia-built solution must deliver meaningful first output within 30 minutes. IVC baseline: under 20 minutes confirmed. This is a design constraint, not a stretch goal.' },
  { rule_number: 22, cluster: 23, cluster_name: 'Discovery method', domain: 'discovery', title: 'IVC estimation is still at hypothesis stage', source: 'Running Lean — Maurya', content: 'IVC request for estimation is a stated preference, not a validated behavioral need. Two riskiest assumptions must be tested first: data quality and actual headcount reduction.' },
  { rule_number: 23, cluster: 22, cluster_name: 'UX constraints', domain: 'ux_design', title: 'Cognitive load is the primary design constraint', source: 'Dont Make Me Think — Krug', content: 'Every interface decision: does this require the user to think? If yes, redesign. Blueprint must audit cognitive load. Forge cannot ship spinner-only loading or options requiring reading.' },
  { rule_number: 24, cluster: 22, cluster_name: 'UX constraints', domain: 'ux_design', title: 'Blueprint must assess all four risks before architecture', source: 'Inspired — Cagan', content: 'Value, Usability, Feasibility, Viability. Feasibility is easiest and least important. For High/Critical risks, recommend de-risking steps before committing.' },
  { rule_number: 25, cluster: 22, cluster_name: 'UX constraints', domain: 'ux_design', title: 'Every build begins with a user journey narrative, not a feature list', source: 'User Story Mapping — Patton', content: 'Blueprint must have a clear narrative of the user journey in plain language before any architecture. If you cannot write this narrative clearly, the feature is not understood enough to build.' },
  { rule_number: 26, cluster: 23, cluster_name: 'Discovery method', domain: 'discovery', title: 'Nova discovery runs Why What-If How, not feature collection', source: 'A More Beautiful Question — Berger', content: 'WHY (challenge current state), WHAT IF (expand possibility), HOW (scope the test). Skipping to HOW produces feature requests. All three stages produce validated hypotheses.' },
  { rule_number: 27, cluster: 22, cluster_name: 'UX constraints', domain: 'ux_design', title: 'Every build has a frontstage and a backstage', source: 'Service Design Thinking — Stickdorn', content: 'Frontstage: what client users experience. Backstage: what enables it. Blueprint must include both. Sentinel is the backstage visibility tool.' },
  { rule_number: 28, cluster: 25, cluster_name: 'Retention mechanics', domain: 'retention', title: 'Measure outcomes, not outputs', source: 'Inspired — Cagan', content: 'Correct success metric is behavioral change, not feature deployment. Every estimate must include a Target Outcome. Every Sentinel report must measure outcome metrics.' },
  { rule_number: 29, cluster: 22, cluster_name: 'UX constraints', domain: 'ux_design', title: 'The 7 Nouvia workspace patterns are the build standard', source: 'Nouvia UX Architecture — Melchionno', content: 'All 7 patterns must pass Blueprint design review and Release QA before deployment: Workspace Hierarchy, One Action Zone, Bidirectional Linking, Progressive Disclosure, System Status, Actionable Errors, Fast Paths.' },
  { rule_number: 30, cluster: 22, cluster_name: 'UX constraints', domain: 'ux_design', title: 'Every coworker handoff requires a DO-CONFIRM checklist', source: 'The Checklist Manifesto — Gawande', content: 'Every handoff must include a short checklist. Minimum: Handoff Block complete? CIF loaded? NCC flagged? Target Outcome defined? 7 Patterns reviewed?' },
  { rule_number: 31, cluster: 23, cluster_name: 'Discovery method', domain: 'discovery', title: 'Nouvia competes on a different value network than incumbents', source: 'Innovators Dilemma — Christensen', content: 'Nouvia competes on speed, adoption, transparency, and access — not prestige, scale, or headcount. Never position against other consulting firms. Position against the status quo.' },
  { rule_number: 32, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'Start the second curve now, not when the first plateaus', source: 'The Age of Paradox — Handy', content: 'Consulting curve is ascending. Build the platform curve now. Every consulting engagement is R&D for the platform. Practical test: does this build the first curve only, or also the second?' },
  { rule_number: 33, cluster: 25, cluster_name: 'Retention mechanics', domain: 'retention', title: 'Define the OMTM at engagement start, report it every month', source: 'Lean Analytics — Croll & Yoskovitz', content: 'Stickiness stage: % of workflows through platform vs manually (80%+ within 60 days). Revenue stage: cost per workflow. Scale stage: NRR (monthly spend growth).' },
  { rule_number: 34, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'IVC must become ecstatically happy before Client 2', source: 'Art of the Start — Kawasaki', content: 'One client who cannot live without the platform is worth more than three satisfied but unadopted clients. IVC as reference case opens every future conversation.' },
  { rule_number: 35, cluster: 24, cluster_name: 'Pricing behavior', domain: 'pricing', title: 'Track investable metrics from day one', source: 'Venture Deals — Feld & Mendelson', content: 'Track MRR, NRR, LTV, CAC, expansion revenue. NRR should be >100%. Atlas must show projected MRR impact alongside every Phase 3 estimate.' },
  { rule_number: 36, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'Consulting and platform are a managed paradox', source: 'Multiple frameworks', content: 'The tension between delivering today (consulting) and building the OS (product) is permanent and intentional. Both curves must run simultaneously. Protect second-curve time from first-curve urgency.' },
  { rule_number: 37, cluster: 23, cluster_name: 'Discovery method', domain: 'discovery', title: 'Reach the hidden constraint before recommending anything', source: 'Never Split the Difference — Voss', content: 'Every conversation has a stated reason and hidden constraint. Calibrated questions: What makes this the priority right now? What happens if this is not solved this year?' },
  { rule_number: 38, cluster: 24, cluster_name: 'Pricing behavior', domain: 'pricing', title: 'Run the accusation audit before every pricing conversation', source: 'Never Split the Difference — Voss', content: 'Name the client likely objections proactively. Naming the objection first removes its power. Builds trust more efficiently than feature justification.' },
  { rule_number: 39, cluster: 24, cluster_name: 'Pricing behavior', domain: 'pricing', title: 'Never justify price — present it with confidence', source: 'Luxury Selling — Srun', content: 'Justifying a price signals doubt about whether it is worth it. Present price with calm authority. Never contain: this is why the price is X, or we tried to keep costs down.' },
  { rule_number: 40, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'The experience of working with Nouvia IS the product', source: 'Luxury Selling — Srun', content: 'The four-section estimate, branded PDF, Compass advisory, Sentinel report — these ARE the product. Clients cannot evaluate AI code quality. They CAN evaluate the experience quality.' },
  { rule_number: 41, cluster: 21, cluster_name: 'Hook design', domain: 'behavioral_design', title: 'Design at least two WOW moments per engagement', source: 'The Journey to WOW — Belding', content: 'Peak WOW: art of the possible conversation (Compass). Ending WOW: QBR business impact data (Sentinel). Optional: first scan result, Phase 1 investment PDF quality, proactive Sentinel alert.' },
  { rule_number: 42, cluster: 23, cluster_name: 'Discovery method', domain: 'discovery', title: 'Know each contact, not just each client', source: 'Carnegie + CIF design', content: 'Nick forward-calculates and cares about competitive advantage. Josy owns operations. Nelson is technical lead. Said is independent builder. Each requires different communication. CIF must include per-contact behavioral notes.' },
  { rule_number: 43, cluster: 25, cluster_name: 'Retention mechanics', domain: 'retention', title: 'Proactive service is the retention mechanism', source: 'Digital Customer Service — Delisi', content: 'Proactive service calendar: Weekly health check (Sentinel). Monthly report to Josy/Nelson. Quarterly Compass advisory. Annual business impact review. Client should never initiate status conversation.' },
  { rule_number: 44, cluster: 26, cluster_name: 'Data governance', domain: 'data_intelligence', title: 'Design data capture into every solution from day one', source: 'Data engineering best practice', content: 'Data capture cannot be retrofitted. Minimum: session timestamps, action completion events, error/correction events, output generation events, feature utilization rates. Blueprint Section 0 must include Data Capture Architecture.' },
  { rule_number: 45, cluster: 26, cluster_name: 'Data governance', domain: 'data_intelligence', title: 'Data quality is a discovery question, not an IT question', source: 'IVC engagement — observed', content: 'Before scoping any AI build, Nova must conduct a Data Quality Assessment. Questions: What data does this AI need? Where does it live? Who owns it? When was it last validated?' },
  { rule_number: 46, cluster: 26, cluster_name: 'Data governance', domain: 'data_intelligence', title: 'Every engagement must have a measurement plan', source: 'How to Measure Anything — Hubbard', content: 'Every estimate must include a Measurement Plan: baseline at engagement start, OMTM defined, comparison metric (platform vs manual), improvement rate, usage frequency.' },
  { rule_number: 47, cluster: 26, cluster_name: 'Data governance', domain: 'data_intelligence', title: 'Sentinel behavioral data is Nouvia most valuable asset', source: 'Nouvia OS design', content: 'Behavioral data from every deployment is the primary proprietary asset. Must be: captured systematically, structured consistently for cross-client patterns, protected as NCC IP, fed back to improve delivery.' },
  { rule_number: 48, cluster: 26, cluster_name: 'Data governance', domain: 'data_intelligence', title: 'Integrate data siloes — that IS the intelligence layer', source: 'Data silo wedge strategy', content: 'When a client operates disconnected systems, the integration IS the AI intelligence layer. Every integration creates switching costs, intelligence depth, and platform dependency. Blueprint must identify silo opportunities.' },
];

// ─── SECTION 3: intelligence_patterns (Layer 3) — 18 patterns (3.7–3.24) ────

const L3_PATTERNS = [
  { title: 'IVC — Gemini failure as competitive positioning gift', confidence: 0.9, source: 'Observed across IVC meetings', content: 'IVC tried Gemini Enterprise Plus with 11 employees. 2 actively used it after 5 months (18% adoption). The Nouvia differentiator: we ensure AI gets adopted.' },
  { title: 'IVC — Trust-based value equals retention risk', confidence: 0.95, source: 'IVC engagement analysis', content: 'IVC perceived value is based entirely on trust and verbal endorsement. No quantified business impact data exists. Most significant churn risk.' },
  { title: 'IVC — Sub-20-minute time to first value confirmed', confidence: 0.95, source: 'IVC Phase 1 deployment', content: 'First engineer achieved meaningful output in under 20 minutes. Contrasts with 5 months of Gemini failure. Establishes TTFV baseline.' },
  { title: 'IVC — Estimation workflow is behaviorally uncharted', confidence: 0.9, source: 'IVC engagement analysis', content: 'Estimation request is a stated preference. No behavioral discovery done. Who does it? What tools? How long? Where does it break? Scoping is premature.' },
  { title: 'IVC — Two riskiest assumptions for the estimation build', confidence: 0.85, source: 'IVC engagement analysis', content: '(1) Historical estimation data in Genius ERP is structured enough for AI. (2) CFO will actually reduce offshore team if tool works.' },
  { title: 'IVC as Segment Zero — the profile for who else looks like IVC', confidence: 0.85, source: 'IVC pattern analysis', content: 'Owner-operated, cost pressure, manual workflows, AI-naive but interested, hard commercial forcing function, CFO as decision-maker, 10-50 employees.' },
  { title: 'IVC — No outcome measurement infrastructure exists', confidence: 0.95, source: 'IVC platform audit', content: 'No job tracking dashboard, no time comparison, no accuracy log, no cost attribution. Value perception is trust-based. Building outcome measurement transforms the renewal conversation.' },
  { title: 'IVC — Engineers scan interfaces, they do not read them', confidence: 0.9, source: 'IVC user observation', content: 'Engineering lead processes floorplans by scanning for primary action, not reading labels. Confirms Krug first law. Any new feature must maintain scan-first architecture.' },
  { title: 'IVC is Nouvia Innovators Dilemma proof point', confidence: 0.9, source: 'IVC engagement analysis', content: 'Too small for McKinsey. Too hands-on for SI. Too uncertain for software vendor. IVC is in the gap incumbents cannot enter. $30k platform deployed in weeks with sub-20min TTFV.' },
  { title: 'IVC OMTM right now is platform adoption rate', confidence: 0.95, source: 'Lean Analytics — applied to IVC', content: 'Stickiness stage. OMTM: % of floorplan jobs through platform vs manually. Current: ~1 engineer, most jobs manual. Target: 80%+ within 60 days.' },
  { title: 'IVC reference case is Nouvia most valuable asset', confidence: 0.9, source: 'Growth strategy analysis', content: 'IVC achieving 80%+ adoption and demonstrable offshore cost reduction is worth more than three new clients. A reference case removes the biggest friction in future sales.' },
  { title: 'IVC — Data siloes are the estimation opportunity', confidence: 0.85, source: 'IVC technical assessment', content: 'SolidWorks PDM, Genius ERP, historical spreadsheets — disconnected. The integration between them IS the intelligence layer. Once live, progressively harder to replace.' },
  { title: 'IVC — ERP data quality is an unknown risk', confidence: 0.9, source: 'IVC March 17 action plan', content: 'Three open questions suggest costing data may not be clean. Costing method unconfirmed, threshold undefined, no audit. If data is bad, AI produces confidently wrong estimates.' },
  { title: 'IVC — Zero session visibility is the single biggest intelligence gap', confidence: 0.95, source: 'IVC platform audit', content: 'No data on what engineers do inside the platform. No usage vs manual processing data. No correction frequency insight. Even basic telemetry would transform every conversation.' },
  { title: 'Nick Vardaro — forward-calculates, every conversation needs a forward frame', confidence: 0.95, source: 'Observed across IVC meetings', content: 'Nick consistently reasons forward from investment to future implications. Every communication should be structured around forward implication, not current status.' },
  { title: 'IVC relationship is currently Ben-dependent', confidence: 0.9, source: 'IVC engagement analysis', content: 'All four contacts relate to Ben personally, not Nouvia as system. Knowledge lives in Ben head, not CIF. One unavailability risks continuity. CIF is the systematization mechanism.' },
  { title: 'IVC Monday meeting is a tactical empathy opportunity', confidence: 0.85, source: 'Pre-meeting analysis Mar 23', content: 'Phase 1 investment PDF sent. Nick has forward-calculated. Meeting opening should be calibrated questions, not presentation. Art of the possible is the peak WOW after empathy stage.' },
  { title: 'IVC — Estimation workflow has no behavioral map yet', confidence: 0.9, source: 'IVC engagement analysis', content: 'No behavioral map of: who does estimation, what tools, how long, where it breaks. Most valuable info (penalty contract) was discovered through behavioral investigation, not stated requirements.' },
];

// ─── SEED FUNCTION ───────────────────────────────────────────────────────────

async function seedCollection(collectionName, docs, extraFields) {
  const col = db.collection(collectionName);
  let added = 0;
  let skipped = 0;

  for (const doc of docs) {
    // Dedup by title
    const existing = await col.where('title', '==', doc.title).limit(1).get();
    if (!existing.empty) {
      skipped++;
      continue;
    }
    const data = { ...baseDoc(extraFields), ...doc };
    await col.add(data);
    added++;
  }

  console.log(`  ${collectionName}: ${added} added, ${skipped} skipped (already existed)`);
  return { added, skipped };
}

async function countByField(collectionName, field) {
  const snap = await db.collection(collectionName).get();
  const counts = {};
  snap.forEach((doc) => {
    const val = doc.data()[field] || 'unknown';
    counts[val] = (counts[val] || 0) + 1;
  });
  return { total: snap.size, counts };
}

async function main() {
  console.log('=== Seeding Intelligence Layer (Complete) ===\n');

  // L1 — intelligence_foundations
  console.log('Seeding L1 — intelligence_foundations...');
  await seedCollection('intelligence_foundations', L1_DOCS, { layer: 1 });

  // L2 — intelligence_rules
  console.log('Seeding L2 — intelligence_rules...');
  await seedCollection('intelligence_rules', L2_RULES, { layer: 2 });

  // L3 — intelligence_patterns
  console.log('Seeding L3 — intelligence_patterns...');
  await seedCollection('intelligence_patterns', L3_PATTERNS, {
    layer: 3,
    cluster: 31,
    cluster_name: 'IVC patterns',
    client: 'IVC',
    domain: 'client_patterns',
  });

  // ─── REPORT ──────────────────────────────────────────────────────────────

  console.log('\n=== Collection Counts ===\n');

  const l1 = await countByField('intelligence_foundations', 'domain');
  console.log(`intelligence_foundations: ${l1.total} total`);
  for (const [k, v] of Object.entries(l1.counts).sort()) console.log(`  ${k}: ${v}`);

  const l2 = await countByField('intelligence_rules', 'cluster_name');
  console.log(`\nintelligence_rules: ${l2.total} total`);
  for (const [k, v] of Object.entries(l2.counts).sort()) console.log(`  ${k}: ${v}`);

  const l3 = await countByField('intelligence_patterns', 'client');
  console.log(`\nintelligence_patterns: ${l3.total} total`);
  for (const [k, v] of Object.entries(l3.counts).sort()) console.log(`  ${k}: ${v}`);

  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
