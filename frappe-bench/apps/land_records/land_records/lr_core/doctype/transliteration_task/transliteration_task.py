import frappe
from frappe.model.document import Document

class TransliterationTask(Document):
    def before_save(self):
        """
        Automate checking for file upload or text input to perform OCR/Transliteration.
        """
        self.perform_ocr_if_needed()
        self.perform_transliteration_if_needed()

    def perform_ocr_if_needed(self):
        """
        If source_file is present but no input_text, simulate OCR extraction.
        """
        if self.source_file and not self.input_text:
            frappe.msgprint("Processing Urdu File for Text Extraction...", alert=True)
            
            # TODO: Integrate actual OCR Service here (e.g. Tesseract with uru language)
            # For now, we simulate extraction based on filename
            
            self.input_text = f"Simulated extracted Urdu text from {self.source_file}.\n(Aslam Khan S/O Rahim Khan, Village Jammu)"

    def perform_transliteration_if_needed(self):
        """
        If input_text (Urdu) is present but no output_text, simulate Transliteration.
        """
        if self.input_text and not self.output_text:
            frappe.msgprint("Translating Urdu to English...", alert=True)
            
            # TODO: Integrate Transliteration API (e.g. Google Translate, Azure)
            # For now, simplistic simulation
            
            if "Aslam Khan" in self.input_text:
                self.output_text = "Aslam Khan S/O Rahim Khan, Village Jammu"
            else:
                 self.output_text = f"Transliterated: {self.input_text[:50]}..."
