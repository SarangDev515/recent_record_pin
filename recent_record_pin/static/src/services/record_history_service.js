/** @odoo-module **/

import { reactive } from "@odoo/owl";
import { browser } from "@web/core/browser/browser";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { user } from "@web/core/user";
import { session } from "@web/session";

/**
 * @typedef {Object} RecordReference
 * @property {string} resModel Technical model name.
 * @property {number} resId Positive, persisted record ID.
 * @property {string} displayName Plain-text record label.
 */
const RECENT_KEY = "odoo_recent_records";
const PINNED_KEY = "odoo_pinned_records";
const MAX_RECENT = 10;

/** @param {unknown} value @returns {RecordReference|null} */
export function normalizeRecord(value) {
    if (!value || typeof value !== "object" ||
        typeof value.resModel !== "string" ||
        !/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(value.resModel) ||
        !Number.isSafeInteger(value.resId) || value.resId <= 0) {
        return null;
    }
    return {
        resModel: value.resModel,
        resId: value.resId,
        displayName: typeof value.displayName === "string" && value.displayName.trim()
            ? value.displayName.trim().slice(0, 512)
            : `${value.resModel} #${value.resId}`,
    };
}

/** @param {RecordReference} record @returns {string} */
export function recordKey(record) {
    return `${record.resModel}:${record.resId}`;
}

/** Sanitize stored data without trusting localStorage contents. */
function sanitizeList(values, limit = Infinity) {
    if (!Array.isArray(values)) {
        return [];
    }
    const seen = new Set();
    const result = [];
    for (const value of values) {
        const record = normalizeRecord(value);
        if (record && !seen.has(recordKey(record))) {
            seen.add(recordKey(record));
            result.push(record);
            if (result.length >= limit) {
                break;
            }
        }
    }
    return result;
}

export const recordHistoryService = {
    dependencies: ["notification"],
    start(env, { notification }) {
        // Fixed requested keys, with separate buckets for each database/user.
        const scope = JSON.stringify([session.db || "", user.userId]);
        const state = reactive({ recent: [], pinned: [] });
        let warned = false;
        const warn = () => {
            if (!warned) {
                warned = true;
                notification.add(_t("Record shortcuts could not be saved in this browser. They remain available for this session."), { type: "warning" });
            }
        };
        function readEnvelope(key) {
            try {
                const raw = browser.localStorage.getItem(key);
                if (!raw) {
                    return { version: 1, scopes: {} };
                }
                const parsed = JSON.parse(raw);
                if (parsed?.version === 1 && parsed.scopes &&
                    typeof parsed.scopes === "object" && !Array.isArray(parsed.scopes)) {
                    return parsed;
                }
            } catch {
                // Malformed JSON is treated as empty; storage failures are nonfatal.
            }
            return { version: 1, scopes: {} };
        }
        function persist(key, records) {
            try {
                const envelope = readEnvelope(key);
                envelope.scopes[scope] = records;
                browser.localStorage.setItem(key, JSON.stringify(envelope));
            } catch {
                warn();
            }
        }
        function refresh() {
            state.recent = sanitizeList(readEnvelope(RECENT_KEY).scopes[scope], MAX_RECENT);
            state.pinned = sanitizeList(readEnvelope(PINNED_KEY).scopes[scope]);
        }
        refresh();
        browser.addEventListener("storage", (event) => {
            if (event.key === null || event.key === RECENT_KEY || event.key === PINNED_KEY) {
                // Only reload the changed list, preserving other in-memory fallback data.
                if (event.key === null || event.key === RECENT_KEY) {
                    state.recent = sanitizeList(readEnvelope(RECENT_KEY).scopes[scope], MAX_RECENT);
                }
                if (event.key === null || event.key === PINNED_KEY) {
                    state.pinned = sanitizeList(readEnvelope(PINNED_KEY).scopes[scope]);
                }
            }
        });
        return {
            state,
            /** @returns {RecordReference[]} Defensive snapshot, newest first. */
            getRecent() { return state.recent.map((record) => ({ ...record })); },
            /** @returns {RecordReference[]} Defensive snapshot of pins. */
            getPinned() { return state.pinned.map((record) => ({ ...record })); },
            /** @param {RecordReference} value @returns {boolean} */
            addRecent(value) {
                const record = normalizeRecord(value);
                if (!record) { return false; }
                const key = recordKey(record);
                state.recent = [record, ...state.recent.filter((item) => recordKey(item) !== key)].slice(0, MAX_RECENT);
                persist(RECENT_KEY, state.recent);
                // Keep pinned names current after a rename or later revisit.
                if (state.pinned.some((item) => recordKey(item) === key)) {
                    state.pinned = state.pinned.map((item) => recordKey(item) === key ? record : item);
                    persist(PINNED_KEY, state.pinned);
                }
                return true;
            },
            /** Remove a shortcut from history, without deleting the actual Odoo record.
             * @param {RecordReference} value @returns {boolean} Whether removed.
             */
            removeRecent(value) {
                const record = normalizeRecord(value);
                if (!record) { return false; }
                const key = recordKey(record);
                const records = state.recent.filter((item) => recordKey(item) !== key);
                if (records.length === state.recent.length) { return false; }
                state.recent = records;
                persist(RECENT_KEY, state.recent);
                return true;
            },
            /** Remove a pinned shortcut without affecting recent history.
             * @param {RecordReference} value @returns {boolean} Whether removed.
             */
            removePinned(value) {
                const record = normalizeRecord(value);
                if (!record) { return false; }
                const key = recordKey(record);
                const records = state.pinned.filter((item) => recordKey(item) !== key);
                if (records.length === state.pinned.length) { return false; }
                state.pinned = records;
                persist(PINNED_KEY, state.pinned);
                return true;
            },
            /** @param {RecordReference} value @returns {boolean} Whether now pinned. */
            togglePin(value) {
                const record = normalizeRecord(value);
                if (!record) { return false; }
                const key = recordKey(record);
                const exists = state.pinned.some((item) => recordKey(item) === key);
                state.pinned = exists
                    ? state.pinned.filter((item) => recordKey(item) !== key)
                    : [record, ...state.pinned];
                persist(PINNED_KEY, state.pinned);
                return !exists;
            },
        };
    },
};
registry.category("services").add("recordHistory", recordHistoryService);
