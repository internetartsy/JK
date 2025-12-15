import frappe

def generate_keys():
    user = frappe.get_doc("User", "Administrator")
    api_key = user.generate_key()
    user.save(ignore_permissions=True)
    api_secret = user.get_password('api_secret')
    
    print("---KEYS---")
    print(f"FRAPPE_API_KEY={api_key}")
    print(f"FRAPPE_API_SECRET={api_secret}")
    print("---KEYS---")
    frappe.db.commit()

if __name__ == "__main__":
    frappe.init(site="land-records.local")
    frappe.connect()
    generate_keys()
