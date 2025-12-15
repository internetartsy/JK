# Copyright (c) 2024, Me and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from .land_parcel_auto_id import generate_parcel_id


class LandParcel(Document):
    def before_insert(self):
        """Auto-generate ULPIN (Unique Land Parcel Identification Number) from geocoordinates"""
        generate_parcel_id(self)
    
    def before_save(self):
        """Re-generate ULPIN if coordinates changed"""
        if not self.parcel_id or self.has_value_changed("geojson"):
            generate_parcel_id(self)
