#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { category } from "../src/categories/calendar-scheduling.mjs";

const args = parseArgs(process.argv.slice(2));
const inputPath = args.input ?? args._[0];

if (!inputPath) {
  console.error("Usage: npm run calendar -- --input <calendar-input.json>");
  console.error("   or: npm run calendar -- <calendar-input.json>");
  process.exit(1);
}

const rawInput = JSON.parse(await readFile(inputPath, "utf8"));
const outputs = (Array.isArray(rawInput) ? rawInput : [rawInput]).map(normalizeCalendarInput);

console.log(JSON.stringify(Array.isArray(rawInput) ? outputs : outputs[0], null, 2));

function normalizeCalendarInput(input = {}) {
  return {
    category,
    preferred_meeting_buffers: toList(input.buffer ?? input.preferred_meeting_buffers),
    avoided_meeting_days: toList(input.avoided_days ?? input.avoided_meeting_days),
    focus_time_windows: toList(input.focus_window ?? input.focus_time_windows),
    dropped_fields: collectDroppedFields(input),
    needs_review: true,
  };
}

function collectDroppedFields(input = {}) {
  return [
    "meeting_title",
    "attendee_emails",
    "meeting_link",
    "event_description",
    "private_notes",
  ].filter((field) => Object.hasOwn(input, field));
}

function toList(value) {
  if (Array.isArray(value)) return value.map(String);
  if (value === null || value === undefined || value === "") return [];
  return [String(value)];
}

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      parsed[arg.slice(2)] =
        argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    } else {
      parsed._.push(arg);
    }
  }
  return parsed;
}
