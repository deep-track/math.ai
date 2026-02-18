import os
import json
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import json
import os
from dotenv import load_dotenv
from src.retrieval.pdf_preprocessing import is_scanned_pdf, extract_scanned_pdf

load_dotenv()
anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")

file_path=r"C:\Users\Administrator\Documents\Math.ai\AI_logic\curriculum_data\raw" # Change to your path
output_file=r"C:\Users\Administrator\Documents\Math.ai\AI_logic\curriculum_data\processed\processed_curriculum.json"

def load_and_chunk(file_path, output_file, api_key=None, max_workers=4):
    """Load PDFs, extract text (with batch processing for scanned), chunk, and save to JSON"""

    # Get all PDF files
    pdf_files = [f for f in os.listdir(file_path) if f.lower().endswith('.pdf')]
    print(f"Found {len(pdf_files)} PDF files")
    print(f"Batch processing with {max_workers} workers")

    # Setup text splitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
        separators=["\n\n", "\n", " ", ""]
    )

    all_chunks = []

    # Process each PDF
    for pdf_name in pdf_files:
        pdf_path = os.path.join(file_path, pdf_name)
        print(f"Processing: {pdf_name}")

        try:
            if is_scanned_pdf(pdf_path):
                print(f"  -> Scanned PDF - using Claude vision")
                docs = extract_scanned_pdf(pdf_path, api_key, max_workers)
                docs = text_splitter.split_documents(docs)
            else:
                print(f"  -> Native PDF - using text extraction")
                docs = PyMuPDFLoader(pdf_path).load_and_split(text_splitter)

            print(f"  -> Created {len(docs)} chunks\n")

            # Convert to JSON format
            for i, doc in enumerate(docs):
                all_chunks.append({
                    "id": f"{pdf_name[:-4]}_chunk{i}",
                    "text": doc.page_content,
                    "source": pdf_name,
                    "page": doc.metadata.get("page", 0) + 1
                })

        except Exception as e:
            print(f"  -> Error: {e}\n")
            continue

    # Save to JSON
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_chunks, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(all_chunks)} chunks to {output_file}")

    return all_chunks

if __name__ == "__main__":
    load_and_chunk(file_path, output_file, api_key=anthropic_api_key, max_workers=4)