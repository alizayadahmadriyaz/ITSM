import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
import json

# -----------------------------
# STEP 1: Extract text from image-based PDF
# -----------------------------
def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        pix = page.get_pixmap()
        img = Image.open(io.BytesIO(pix.tobytes()))
        text += pytesseract.image_to_string(img)
    return text

pdf_text = extract_text_from_pdf("ilovepdf_merged.pdf")
print(pdf_text)
# -----------------------------
# STEP 2: Split into chunks
# -----------------------------
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
chunks = splitter.split_text(pdf_text)

# -----------------------------
# STEP 3: Build Taxonomy with LLM
# -----------------------------
llm = ChatOpenAI(model="gpt-4", temperature=0)

prompt = PromptTemplate(
    input_variables=["doc"],
    template="""
You are an ITSM knowledge analyst.
Analyze the following support document text and extract intents for taxonomy.

For each intent:
- Create a short intent label (e.g., "Password Reset", "VPN Access", "Email Setup")
- Provide a short description of the problem/solution.

Return output in JSON array format:
[
  {{ "intent": "Password Reset", "description": "Help user reset account passwords." }},
  {{ "intent": "VPN Access", "description": "Guide to request or troubleshoot VPN access." }}
]

Document:
{doc}
"""
)

chain = LLMChain(llm=llm, prompt=prompt)

taxonomy = []
for chunk in chunks:
    try:
        result = chain.run(doc=chunk)
        parsed = json.loads(result)  # parse LLM output as JSON
        taxonomy.extend(parsed)
    except Exception as e:
        print("Error parsing chunk:", e)

# -----------------------------
# STEP 4: Deduplicate & Save Taxonomy
# -----------------------------
unique_taxonomy = {item['intent']: item for item in taxonomy}
final_taxonomy = list(unique_taxonomy.values())

with open("taxonomy.json", "w") as f:
    json.dump(final_taxonomy, f, indent=2)

print("✅ Taxonomy saved to taxonomy.json")
