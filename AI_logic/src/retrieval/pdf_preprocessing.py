import os
import json
import tempfile
import shutil
import fitz as pymupdf
import base64
from concurrent.futures import ThreadPoolExecutor
from langchain.schema import Document
from anthropic import Anthropic


SPLIT_SIZE = 33
progress_file = r"C:\Users\Administrator\Documents\Math.ai\AI_logic\curriculum_data\processed\progress.json" # Change to your path

# Progress
def _load_progress():
    if os.path.exists(progress_file):
        with open(progress_file) as f:
            return json.load(f)
    return {}


def _save_progress(state):
    os.makedirs(os.path.dirname(progress_file), exist_ok=True)
    with open(progress_file, "w") as f:
        json.dump(state, f, indent=2)

# Dealing with scanned PDFs
def is_scanned_pdf(pdf_path):
    """Check if PDF is scanned by looking for extractable text"""
    doc = pymupdf.open(pdf_path)
    for page_num in range(min(3, len(doc))):
        if len(doc[page_num].get_text().strip()) > 50:
            doc.close()
            return False
    doc.close()
    return True


def page_to_base64(pdf_path, page_num):
    """Convert single PDF page to base64 image with optimized settings"""
    doc = pymupdf.open(pdf_path)
    pix = doc[page_num].get_pixmap(matrix=pymupdf.Matrix(1, 1))
    img_base64 = base64.standard_b64encode(pix.tobytes("jpeg")).decode("utf-8")
    doc.close()
    return page_num, img_base64


def extract_text_with_claude(page_data, client):
    """Extract text using Claude with prompt caching"""
    page_num, img_base64 = page_data
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": img_base64
                        }
                    },
                    {
                        "type": "text",
                        "text": "Extract all text from this image. Preserve layout and structure. Return only the text, no commentary.",
                        "cache_control": {"type": "ephemeral"}
                    }
                ]
            }]
        )
        text = response.content[0].text
        if text.strip():
            return Document(
                page_content=text,
                metadata={"page": page_num}
            )
    except Exception as e:
        print(f"Error on page {page_num}: {e}")
    return None

# Splitting and Extraction

def _split_pdf(pdf_path, temp_dir):
    """Split PDF into SPLIT_SIZE-page temp PDFs. Returns list of (path, start_page)."""
    doc = pymupdf.open(pdf_path)
    total = len(doc)
    splits = []
    for start in range(0, total, SPLIT_SIZE):
        end = min(start + SPLIT_SIZE, total)
        out = os.path.join(temp_dir, f"split_{start:05d}.pdf")
        chunk = pymupdf.open()
        chunk.insert_pdf(doc, from_page=start, to_page=end - 1)
        chunk.save(out)
        chunk.close()
        splits.append((out, start))
    doc.close()
    print(f"  -> Split into {len(splits)} temp PDFs ({SPLIT_SIZE} pages each)")
    return splits


def _extract_split(split_path, page_offset, client, max_workers=4):
    """Convert pages to images and extract text, remapping to global page numbers."""
    doc = pymupdf.open(split_path)
    n = len(doc)
    doc.close()

    # Convert pages to base64 using local (0-based) page numbers
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        local_images = list(executor.map(
            lambda p: page_to_base64(split_path, p), range(n)
        ))

    # Remap local page numbers → global page numbers before passing to Claude
    global_images = [(page_offset + local_p, b64) for local_p, b64 in local_images]

    # Extract text in parallel; page_num inside each Document is already global
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        documents = list(executor.map(
            lambda img: extract_text_with_claude(img, client),
            global_images
        ))

    return [doc for doc in documents if doc is not None]


def extract_scanned_pdf(pdf_path, api_key=None, max_workers=4):
    """Extract text from scanned PDF: split first, extract per split, checkpoint each."""
    client = Anthropic(api_key=api_key or os.environ.get("ANTHROPIC_API_KEY"))
    progress = _load_progress()
    pdf_name = os.path.basename(pdf_path)
    temp_dir = tempfile.mkdtemp(prefix="pdf_split_")

    try:
        splits = _split_pdf(pdf_path, temp_dir)
        all_documents = []

        for split_path, page_offset in splits:
            split_key = f"{pdf_name}::offset_{page_offset:05d}"

            # Resume: reload already-completed split from checkpoint
            if split_key in progress:
                cached = progress[split_key]
                print(f"  -> Resume: reloading split offset={page_offset} ({len(cached)} pages)")
                for page_num_str, text in cached.items():
                    all_documents.append(Document(
                        page_content=text,
                        metadata={"page": int(page_num_str), "source": pdf_path}
                    ))
                os.remove(split_path)
                continue

            # Process this split
            print(f"  -> Split offset={page_offset}: converting pages to images...")
            docs = _extract_split(split_path, page_offset, client, max_workers)

            for doc in docs:
                doc.metadata["source"] = pdf_path
            all_documents.extend(docs)

            # Checkpoint: persist {global_page_num: text} for this split
            progress[split_key] = {
                str(doc.metadata["page"]): doc.page_content for doc in docs
            }
            _save_progress(progress)
            os.remove(split_path)
            print(f"  -> Checkpoint saved for offset={page_offset} ({len(docs)} pages)")

        return sorted(all_documents, key=lambda d: d.metadata["page"])

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)