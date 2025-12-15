frappe.ui.form.on('Farmer', {
    refresh: function (frm) {
        // Optional: Trigger something on load
    },
    name_english: function (frm) {
        if (frm.doc.name_english && !frm.doc.name_urdu) {
            frappe.call({
                method: "land_records.lr_core.doctype.farmer.farmer.transliterate_name",
                args: {
                    name_english: frm.doc.name_english
                },
                callback: function (r) {
                    if (r.message) {
                        frm.set_value('name_urdu', r.message);
                    }
                }
            });
        }
    }
});