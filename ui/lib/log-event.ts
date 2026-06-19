/**
 * log-event — appends routing decisions to output/events.jsonl.
 *
 * One JSON object per line, newest at the end. Read from the bottom
 * for recent activity. Never throws — logging must not affect rendering.
 *
 * On Vercel, the filesystem is read-only in production so writes are
 * silently skipped. Wire up PostHog or another analytics destination
 * as an additive step when ready for production observability.
 */

import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "./get-output";

export interface RoutingEvent {
  ts: string;               // ISO timestamp
  funnel_stage: string;
  funnel_signal: string;    // param | utm_medium | utm_campaign | cookie | default
  archetype: string;
  archetype_signal: string; // param | utm_content | cookie | ua | default
  variant_label: string;    // the label of the page that was served
  palette_driver: string;   // funnel_stage | archetype
  build_ts: string;         // active build timestamp
}

export function logRoutingEvent(event: RoutingEvent): void {
  try {
    const filepath = path.join(DATA_ROOT, "output", "events.jsonl");
    fs.appendFileSync(filepath, JSON.stringify(event) + "\n", "utf8");
  } catch {
    // Never throw — logging failure must not affect page rendering
  }
}

export function getRecentEvents(limit = 50): RoutingEvent[] {
  try {
    const filepath = path.join(DATA_ROOT, "output", "events.jsonl");
    if (!fs.existsSync(filepath)) return [];
    const lines = fs.readFileSync(filepath, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean);
    return lines
      .slice(-limit)
      .reverse()
      .map((line) => JSON.parse(line) as RoutingEvent);
  } catch {
    return [];
  }
}
