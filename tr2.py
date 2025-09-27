import fitz
import pytesseract
from PIL import Image

def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    all_text = []

    for page in doc:
        # 1. Try to get embedded text
        text = page.get_text("text")
        if text.strip():
            all_text.append(text.strip())
        else:
            # 2. Fallback to OCR
            pix = page.get_pixmap()
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            ocr_text = pytesseract.image_to_string(img)
            all_text.append(ocr_text.strip())

    return "\n".join(all_text)

pdf_path = "bharat_pe_checker.pdf"
result = extract_text_from_pdf(pdf_path)
print(result[:1000])
