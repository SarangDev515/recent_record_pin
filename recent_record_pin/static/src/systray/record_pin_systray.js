/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { Dropdown } from "@web/core/dropdown/dropdown";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { normalizeRecord, recordKey } from "../services/record_history_service";

/** Navbar entry point for browser-local pinned and recently opened records. */
export class RecordPinSystray extends Component {
    static template = "recent_record_pin.RecordPinSystray";
    static components = { Dropdown, DropdownItem };
    static props = {};

    setup() {
        this.history = useService("recordHistory");
        this.action = useService("action");
        this.notification = useService("notification");
        this.state = useState(this.history.state);
        this.ui = useState({ opening: false });
        this.recordKey = recordKey;
    }
    /** @param {import("../services/record_history_service").RecordReference} record */
    isPinned(record) {
        return this.state.pinned.some((item) => recordKey(item) === recordKey(record));
    }
    /** Keep the dropdown open when changing a pin. */
    togglePin(record) {
        this.history.togglePin(record);
    }
    /** Remove only the shortcut from the selected list; never unlink backend data. */
    removeRecord(record, list) {
        if (list === "pinned") {
            this.history.removePinned(record);
        } else if (list === "recent") {
            this.history.removeRecent(record);
        }
    }
    /** Open an exact persisted record using the native action stack and guards. */
    async openRecord(value) {
        const record = normalizeRecord(value);
        if (!record || this.ui.opening) { return; }
        this.ui.opening = true;
        try {
            await this.action.doAction({
                type: "ir.actions.act_window",
                name: record.displayName,
                res_model: record.resModel,
                res_id: record.resId,
                views: [[false, "form"]],
                target: "current",
            });
        } catch {
            this.notification.add(
                _t("This record could not be opened. It may have been deleted, or you may no longer have access. You can unpin it from this menu."),
                { type: "warning" }
            );
        } finally {
            this.ui.opening = false;
        }
    }
}
registry.category("systray").add("recent_record_pin.RecordPinSystray", {
    Component: RecordPinSystray,
}, { sequence: 35 });
