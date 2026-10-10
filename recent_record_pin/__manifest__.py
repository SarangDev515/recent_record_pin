{
    "name": "Quick Record Pin & History Sidebar",
    "version": "19.0.1.0.0",
    "category": "Productivity",
    "summary": "Pin important records and revisit your ten most recent forms",
    "license": "LGPL-3",
    "depends": ["web", "mail"],
    "assets": {
        "web.assets_backend": [
            "recent_record_pin/static/src/services/record_history_service.js",
            "recent_record_pin/static/src/services/form_tracking_service.js",
            "recent_record_pin/static/src/systray/record_pin_systray.js",
            "recent_record_pin/static/src/systray/record_pin_systray.xml",
            "recent_record_pin/static/src/scss/record_pin.scss",
        ],
    },
    "installable": True,
    "application": False,
    "auto_install": False,
}
