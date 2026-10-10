/** @odoo-module **/

import { useEffect } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { patch } from "@web/core/utils/patch";
import { FormController } from "@web/views/form/form_controller";

/**
 * Track successfully rendered forms, not merely requested window actions.
 * Covers pager changes, dialogs and records receiving an ID after creation.
 * No ORM request is required; labels come from the already loaded form model.
 */
patch(FormController.prototype, {
    setup() {
        super.setup(...arguments);
        const history = useService("recordHistory");
        useEffect(
            (resModel, resId, displayName, isNew) => {
                if (!isNew && Number.isSafeInteger(resId) && resId > 0) {
                    history.addRecent({ resModel, resId, displayName });
                }
            },
            () => {
                const root = this.model.root;
                return [
                    root.resModel || this.props.resModel,
                    root.resId,
                    root.data.display_name || this.displayName(),
                    root.isNew,
                ];
            }
        );
    },
});
