from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

c = canvas.Canvas("/Users/mic/docode/jk/dummy_upload.pdf", pagesize=letter)
c.drawString(100, 750, "Girdawari Report")
c.drawString(100, 730, "Owner: Muhammad Aslam")
c.drawString(100, 710, "Khasra: 555")
c.drawString(100, 690, "Village: Rampur")
c.save()
print("Created dummy_upload.pdf")
