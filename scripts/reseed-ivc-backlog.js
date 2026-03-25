/**
 * reseed-ivc-backlog.js — Delete old backlog, insert 6 real IVC items
 * Run: node scripts/reseed-ivc-backlog.js
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp({ projectId: 'nouvia-os' });
const db = getFirestore();

async function main() {
  console.log('Reseeding IVC backlog...\n');

  // Step 1: Delete all existing ivc_backlog docs where clientId == "ivc"
  const existing = await db.collection('ivc_backlog').where('clientId', '==', 'ivc').get();
  const deleteCount = existing.size;
  const batch1 = db.batch();
  existing.forEach(doc => batch1.delete(doc.ref));
  if (deleteCount > 0) await batch1.commit();
  console.log(`  Deleted ${deleteCount} old backlog items.`);

  // Step 2: Insert 6 real IVC backlog items
  const items = [
    {
      title: "IVC AI Platform — Phase 1 Floorplan Takeoff",
      description: "Complete AI annotation platform: AI Annotation Engine, Learning Library, Data Layer, Output Generation, Admin Interface, GCP Infrastructure. 84%+ accuracy on floorplan takeoffs.",
      stage: "done",
      linkedPillar: "engineering",
      estimatedEffort: "L",
      value: 30000,
      startDate: new Date("2026-02-15"),
      deliveredDate: new Date("2026-03-19"),
      priority: 1,
      components: ["AI Annotation Engine", "Learning Library", "Data Layer", "Output Generation", "Admin Interface", "GCP Infrastructure"],
      clientId: "ivc",
      createdAt: FieldValue.serverTimestamp(),
    },
    {
      title: "ChatGPT Enterprise Migration — 11 Users",
      description: "Transitioning from Gemini Enterprise to ChatGPT Enterprise for 11 IVC team members.",
      stage: "in_progress",
      linkedPillar: "engineering",
      estimatedEffort: "S",
      startDate: new Date("2026-03-19"),
      targetDate: new Date("2026-03-28"),
      priority: 2,
      clientId: "ivc",
      createdAt: FieldValue.serverTimestamp(),
    },
    {
      title: "IVC Managed Platform — Monthly Retainer",
      description: "Platform monitoring, maintenance, incident response, ongoing improvements, monthly review, priority access to Nouvia engineering.",
      stage: "approved",
      linkedPillar: "engineering",
      estimatedEffort: "XL",
      value: 60000,
      monthlyFee: 5000,
      startDate: new Date("2026-04-01"),
      priority: 3,
      components: ["Platform Monitoring", "Maintenance & Patches", "Incident Response", "Monthly Review", "Priority Access"],
      notes: "$5,000/month recurring. SOW pending signature.",
      clientId: "ivc",
      createdAt: FieldValue.serverTimestamp(),
    },
    {
      title: "Design Scoping Solution",
      description: "AI-powered design scoping that connects SolidWorks PDM part geometry to auto-generate scoped engineering drawings.",
      stage: "in_progress",
      linkedPillar: "engineering",
      estimatedEffort: "M",
      startDate: new Date("2026-03-24"),
      targetDate: new Date("2026-04-15"),
      priority: 4,
      components: ["PDM Data Bridge", "Scoping Interface", "Google Cloud Platform"],
      clientId: "ivc",
      createdAt: FieldValue.serverTimestamp(),
    },
    {
      title: "Engineering Scoping Solution — AI Estimation Platform",
      description: "Floorplan → part codes → Genius ERP → BOM → cost estimate. The path to bringing estimation in-house and replacing the $150k offshore process.",
      stage: "approved",
      linkedPillar: "estimation",
      estimatedEffort: "XL",
      startDate: new Date("2026-04-15"),
      targetDate: new Date("2026-05-15"),
      priority: 5,
      notes: "Depends on ERP integration completion.",
      clientId: "ivc",
      createdAt: FieldValue.serverTimestamp(),
    },
    {
      title: "ESSOR Discovery — Revenue Québec Grant",
      description: "Formal discovery phase for the approved Investissement Québec ESSOR grant. Covers AI platform assessment and expansion roadmap.",
      stage: "approved",
      linkedPillar: "engineering",
      estimatedEffort: "M",
      startDate: new Date("2026-04-01"),
      targetDate: new Date("2026-05-01"),
      priority: 6,
      notes: "Grant approved. Discovery starting April.",
      clientId: "ivc",
      createdAt: FieldValue.serverTimestamp(),
    },
  ];

  for (const item of items) {
    await db.collection('ivc_backlog').add(item);
    console.log(`  ✓ Inserted: ${item.title}`);
  }

  // Step 3: Update Engineering pillar activeCapabilities
  const pillars = await db.collection('ivc_pillars').where('pillarId', '==', 'engineering').get();
  for (const doc of pillars.docs) {
    const current = doc.data().activeCapabilities || [];
    if (!current.includes('Floorplan AI Annotation')) {
      await doc.ref.update({ activeCapabilities: [...current, 'Floorplan AI Annotation'] });
      console.log('  ✓ Updated Engineering pillar activeCapabilities');
    }
  }

  console.log(`\n✅ Deleted ${deleteCount} old items. Inserted ${items.length} new items.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
