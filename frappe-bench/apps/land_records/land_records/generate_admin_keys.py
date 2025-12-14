import frappe

def run():
    user = frappe.get_doc("User", "Administrator")
    api_key = user.generate_key()
    user.save()
    api_secret = user.get_password('api_secret')
    print(f"API_KEY={api_key}")
    print(f"API_SECRET={api_secret}")
    frappe.db.commit()
