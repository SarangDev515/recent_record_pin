# Quick Record Pin & History Sidebar

Odoo 19.0 client-only productivity addon. The thumb-tack systray dropdown provides pinned and recent record navigation; no database tables, controllers or security ACLs are added.

## Installation
1. Include `D:\ODOO PROJECTS\ODOO-19\extra_addons` in the server's `addons_path`.
2. Restart Odoo, enable developer mode, and update the Apps list.
3. Remove the default Apps filter if necessary, search **Quick Record Pin & History Sidebar**, and install it.
4. Refresh the browser. For development, use `?debug=assets` to inspect assets.
5. After updating the files, upgrade the module and refresh assets.

## Behavior
- Successfully rendered saved forms are tracked, including pager navigation, form dialogs, and records saved from a new form.
- Recent records are unique by model/ID, most-recent first, limited to ten. Revisits move to the front; the oldest is evicted first.
- Pins persist independently of the ten-record history. Revisiting a pin updates its label.
- The native action service opens forms in the current action stack and respects unsaved-change guards and backend access rules.
- New/unsaved forms are ignored. Empty labels use `model #ID` until a display name is available.
- Pin and remove buttons keep the menu open; navigation items close it.
- Trash buttons remove shortcuts from their own section only. Removing a recent entry preserves its pin; removing a pin preserves history. No actual Odoo record is deleted. Reopening a removed recent record adds it to history again.
- The navbar pin is 20px with a 44px minimum target, subtle hover/active backgrounds, keyboard focus styling and reduced-motion support.

## Storage and privacy
The exact keys `odoo_recent_records` and `odoo_pinned_records` each contain a versioned JSON envelope with separate database/user buckets. Unscoped legacy arrays are intentionally not imported because their owner cannot be established. No record field contents other than the display name are stored. Model names, IDs and labels remain browser-local, survive refresh, and are visible to anyone with access to this browser's storage. This is not an encryption boundary. Clearing browser site data removes shortcuts; uninstalling the addon does not automatically clear localStorage.

Quota/write failures show one warning and retain in-memory state. Odoo's browser wrapper itself falls back to RAM when browser storage is unavailable. Corrupt data is ignored. Cross-tab storage events refresh changed lists. Simultaneous writes from multiple tabs are last-write-wins; localStorage does not provide transactions. Pins do not bypass access checks; deleted or inaccessible entries may remain and can be unpinned.

## Acceptance checks on a running Odoo server
- Open 12 different saved forms: the menu contains only the latest ten.
- Reopen a record: no duplicate, and it moves to the top.
- Navigate with the form pager and save a new record: both are tracked.
- Pin/unpin using either section, reload, and verify persistence.
- Rename a pinned record and revisit: the pin label refreshes.
- Switch user/database: shortcuts remain scoped separately.
- Open a removed or inaccessible record: an error is handled without a broken menu.
- Test keyboard navigation, narrow screens and unsaved-change prompts.

## Local automated validation
`node tests/test_record_history.cjs` tests the actual service source with minimal Odoo dependencies stubbed. This is not a live Odoo integration test.
