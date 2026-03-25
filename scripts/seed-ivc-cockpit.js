/**
 * seed-ivc-cockpit.js — Seed IVC AI Cockpit collections in Firestore
 * Run: node scripts/seed-ivc-cockpit.js
 * Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account key
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({ projectId: 'nouvia-os' });
}
const db = getFirestore();

async function main() {
  // Check if already seeded
  const existing = await db.collection('ivc_pillars').where('clientId', '==', 'ivc').get();
  if (!existing.empty) {
    console.log('Already seeded — skipping');
    return;
  }

  console.log('Seeding IVC Cockpit data...');

  // ── Pillars (6 docs) ──
  const pillars = [
    { pillarId: 'engineering', label: 'Engineering & Design', scorDomain: 'Make (Enable)',
      description: 'CAD spec extraction, BOM automation, design knowledge capture',
      enablementProgress: 25, activeCapabilities: ['Floorplan AI Annotation'],
      order: 1, status: 'active', clientId: 'ivc' },
    { pillarId: 'estimation', label: 'Estimation & Quoting', scorDomain: 'Plan + Deliver',
      description: 'Adaptive cost/time estimation, bid intelligence',
      enablementProgress: 0, activeCapabilities: [],
      order: 2, status: 'next', clientId: 'ivc' },
    { pillarId: 'procurement', label: 'Procurement & Sourcing', scorDomain: 'Source',
      description: 'PO processing, supplier intelligence, RFQ automation',
      enablementProgress: 0, activeCapabilities: [],
      order: 3, status: 'staged', clientId: 'ivc' },
    { pillarId: 'production_planning', label: 'Production Planning', scorDomain: 'Plan',
      description: 'Capacity planning, job scheduling, constraint resolution',
      enablementProgress: 0, activeCapabilities: [],
      order: 4, status: 'staged', clientId: 'ivc' },
    { pillarId: 'quality_compliance', label: 'Quality & Compliance', scorDomain: 'Enable',
      description: 'Inspection automation, non-conformance tracking',
      enablementProgress: 0, activeCapabilities: [],
      order: 5, status: 'staged', clientId: 'ivc' },
    { pillarId: 'delivery_logistics', label: 'Delivery & Logistics', scorDomain: 'Deliver',
      description: 'Shipping coordination, milestone tracking',
      enablementProgress: 0, activeCapabilities: [],
      order: 6, status: 'staged', clientId: 'ivc' },
  ];

  for (const p of pillars) {
    await db.collection('ivc_pillars').add(p);
    console.log(`  ✓ Pillar: ${p.label}`);
  }

  // ── Goals (1 doc) ──
  await db.collection('ivc_goals').add({
    title: 'Reduce delivery cycle from 12 to 8 weeks',
    owner: 'CFO', ownerName: 'CFO',
    targetMetric: 'Delivery cycle: 12 weeks → 8 weeks',
    contributingFactors: ['Data cleanliness', 'AI adoption by estimating team'],
    linkedPillars: ['estimation'],
    enablementProgress: 0, outcomeProgress: 0,
    status: 'active', clientId: 'ivc',
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log('  ✓ Goal: Reduce delivery cycle');

  // ── Issues (2 docs) ──
  await db.collection('ivc_issues').add({
    title: 'Historical job data quality',
    description: 'Raw job history data requires cleansing before AI training',
    severity: 'high', linkedPillars: ['estimation'],
    status: 'open', raisedBy: 'client', clientId: 'ivc',
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log('  ✓ Issue: Historical job data quality');

  await db.collection('ivc_issues').add({
    title: 'AI adoption by estimating team',
    description: 'Change management needed to drive daily usage of AI tools',
    severity: 'medium', linkedPillars: ['estimation'],
    status: 'open', raisedBy: 'nouvia', clientId: 'ivc',
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log('  ✓ Issue: AI adoption by estimating team');

  // ── Backlog (4 docs) ──
  const backlogItems = [
    { title: 'Floorplan AI Annotation',
      description: 'AI-powered floorplan annotation and zone detection',
      stage: 'done', linkedPillar: 'engineering',
      estimatedEffort: 'L', priority: 1, clientId: 'ivc' },
    { title: 'Geometry Reuse Intelligence',
      description: 'Identify reusable geometry patterns across job history',
      stage: 'in_progress', linkedPillar: 'engineering',
      estimatedEffort: 'XL', priority: 2, clientId: 'ivc' },
    { title: 'AI-Assisted Estimation Engine',
      description: 'ML-powered cost and time estimation from historical jobs',
      stage: 'approved', linkedPillar: 'estimation',
      estimatedEffort: 'XL', priority: 3, clientId: 'ivc' },
    { title: 'Supplier Intelligence Module',
      description: 'Automated supplier scoring and RFQ recommendations',
      stage: 'idea', linkedPillar: 'procurement',
      estimatedEffort: 'L', priority: 4, clientId: 'ivc' },
  ];

  for (const item of backlogItems) {
    await db.collection('ivc_backlog').add({
      ...item,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`  ✓ Backlog: ${item.title}`);
  }

  // ── Ideas (1 doc) ──
  await db.collection('ivc_ideas').add({
    title: 'Automated RFQ Generation',
    description: 'Auto-generate RFQs from approved BOMs using supplier intelligence',
    source: 'scor_gap', linkedPillars: ['procurement'],
    status: 'submitted', aiGenerated: true, clientId: 'ivc',
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log('  ✓ Idea: Automated RFQ Generation');

  console.log('\n✅ Seed complete: 6 pillars, 1 goal, 2 issues, 4 backlog items, 1 idea');
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
