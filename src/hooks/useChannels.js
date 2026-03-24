/**
 * useChannels — NIP Phase 5
 * Manages channel monitoring data from Firestore (user-scoped storage).
 * Tracks channel alignment with canvas and detects stale channels.
 */
import { useState, useEffect, useCallback } from "react";
import { getData, setData } from "../storage";

const CHANNELS_KEY = "strategist:channels";
const CANVAS_LAST_MODIFIED_KEY = "strategist:canvas_last_modified";

const uuid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().split("T")[0];

export const CHANNEL_TYPES = [
  { value: "website", label: "Website", icon: "\u{1F310}" },
  { value: "linkedin", label: "LinkedIn", icon: "\u{1F4BC}" },
  { value: "email", label: "Email", icon: "\u{1F4E7}" },
  { value: "content", label: "Content", icon: "\u{1F4DD}" },
  { value: "referral", label: "Referral", icon: "\u{1F91D}" },
  { value: "speaking", label: "Speaking", icon: "\u{1F3A4}" },
  { value: "community", label: "Community", icon: "\u{1F465}" },
  { value: "other", label: "Other", icon: "\u{1F4CC}" },
];

export const STATUS_CONFIG = {
  aligned:      { label: "Aligned",      emoji: "\u2705", variant: "green" },
  stale:        { label: "Stale",        emoji: "\u26A0\uFE0F", variant: "amber" },
  needs_update: { label: "Needs Update", emoji: "\u{1F534}", variant: "red" },
  planned:      { label: "Planned",      emoji: "\u{1F4CB}", variant: "default" },
};

export function isCanvasStale(channel, canvasLastModified) {
  if (!channel.last_alignment_check || !canvasLastModified) return false;
  return new Date(canvasLastModified) > new Date(channel.last_alignment_check);
}

const SEED_CHANNELS = [
  {
    id: uuid(),
    name: "nouvia.ai Website",
    type: "website",
    url: "https://nouvia.ai",
    status: "needs_update",
    canvas_dependencies: ["value_propositions", "customer_segments", "channels"],
    alignment_notes: "Website exists but messaging predates current positioning. Needs to reflect AI implementation consultancy for traditional businesses.",
    next_action: "Update hero copy and service descriptions to match current canvas",
    priority: "high",
    owner: "Ben",
    last_updated: "2026-03-01",
    last_alignment_check: "2026-03-01",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    name: "LinkedIn (Ben Melchionno)",
    type: "linkedin",
    url: "https://linkedin.com/in/benmelchionno",
    status: "stale",
    canvas_dependencies: ["value_propositions", "customer_relationships"],
    alignment_notes: "Profile reflects previous role. Needs Nouvia positioning.",
    next_action: "Update headline, about section, and featured content",
    priority: "high",
    owner: "Ben",
    last_updated: "2026-01-15",
    last_alignment_check: "2026-03-01",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    name: "IVC Referral Network",
    type: "referral",
    url: "",
    status: "aligned",
    canvas_dependencies: ["channels", "customer_relationships"],
    alignment_notes: "Active referral channel through IVC relationship. Potential to expand through IVC's industry contacts.",
    next_action: "Ask IVC for warm introductions to similar businesses",
    priority: "medium",
    owner: "Ben",
    last_updated: "2026-03-20",
    last_alignment_check: "2026-03-24",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    name: "Technical Blog / Content",
    type: "content",
    url: "",
    status: "planned",
    canvas_dependencies: ["value_propositions", "channels", "customer_segments"],
    alignment_notes: "No content published yet. Content marketing identified as key traction channel.",
    next_action: "Write first case study: IVC Floorplan Takeoff Platform",
    priority: "medium",
    owner: "Ben",
    last_updated: "2026-03-24",
    last_alignment_check: "2026-03-24",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    name: "Email Outreach",
    type: "email",
    url: "",
    status: "planned",
    canvas_dependencies: ["channels", "customer_segments"],
    alignment_notes: "No outbound email campaign active. Need to build prospect list first.",
    next_action: "Build target list of 20 companies matching IVC Segment Zero profile",
    priority: "low",
    owner: "Ben",
    last_updated: "2026-03-24",
    last_alignment_check: "2026-03-24",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function useChannels() {
  const [channels, setChannels] = useState([]);
  const [canvasLastModified, setCanvasLastModified] = useState("2026-03-24T00:00:00.000Z");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [stored, clm] = await Promise.all([
        getData(CHANNELS_KEY),
        getData(CANVAS_LAST_MODIFIED_KEY),
      ]);
      if (stored && Array.isArray(stored) && stored.length > 0) {
        setChannels(stored);
      } else {
        setChannels(SEED_CHANNELS);
        await setData(CHANNELS_KEY, SEED_CHANNELS);
      }
      if (clm) {
        setCanvasLastModified(clm);
      } else {
        const defaultClm = "2026-03-24T00:00:00.000Z";
        setCanvasLastModified(defaultClm);
        await setData(CANVAS_LAST_MODIFIED_KEY, defaultClm);
      }
      setLoading(false);
    })();
  }, []);

  const saveChannels = useCallback(async (updated) => {
    setChannels(updated);
    await setData(CHANNELS_KEY, updated);
  }, []);

  const addChannel = useCallback(async (data) => {
    const now = new Date().toISOString();
    const newChannel = {
      id: uuid(),
      name: data.name || "",
      type: data.type || "other",
      url: data.url || "",
      status: data.status || "planned",
      canvas_dependencies: data.canvas_dependencies || [],
      alignment_notes: data.alignment_notes || "",
      next_action: data.next_action || "",
      priority: data.priority || "medium",
      owner: data.owner || "",
      last_updated: data.last_updated || today(),
      last_alignment_check: today(),
      created_at: now,
      updated_at: now,
    };
    const updated = [...channels, newChannel];
    await saveChannels(updated);
    return newChannel;
  }, [channels, saveChannels]);

  const updateChannel = useCallback(async (id, updates) => {
    const updated = channels.map(ch =>
      ch.id === id ? { ...ch, ...updates, updated_at: new Date().toISOString() } : ch
    );
    await saveChannels(updated);
  }, [channels, saveChannels]);

  const deleteChannel = useCallback(async (id) => {
    const updated = channels.filter(ch => ch.id !== id);
    await saveChannels(updated);
  }, [channels, saveChannels]);

  const updateCanvasLastModified = useCallback(async (timestamp) => {
    setCanvasLastModified(timestamp);
    await setData(CANVAS_LAST_MODIFIED_KEY, timestamp);
  }, []);

  return {
    channels,
    loading,
    addChannel,
    updateChannel,
    deleteChannel,
    saveChannels,
    canvasLastModified,
    updateCanvasLastModified,
  };
}
