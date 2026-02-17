"""
Loading - pymupdf
Chunking Data - recursive character splitter
"""

# libraries
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import json
import os


file_path = (
    r"/home/fritz-nvm/math.ai/AI_logic/curriculum_data/raw"  # Change to your path
)
output_file = r"/home/fritz-nvm/math.ai/AI_logic/curriculum_data/processed/processed_curriculum.json"


def load_and_chunk(file_path, output_file):

    pdf_files = [f for f in os.listdir(file_path) if f.lower().endswith(".pdf")]
    print(len(pdf_files))

    # Splitting
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=100, separators=["\n\n", "\n", " ", ""]
    )

    all_chunks = []

    for pdf_name in pdf_files:
        pdf_path = os.path.join(file_path, pdf_name)

        loader = PyMuPDFLoader(pdf_path)
        docs = loader.load_and_split(text_splitter)

        # metadata
        for i, doc in enumerate(docs):
            all_chunks.append(
                {
                    "id": f"{pdf_name[:-4]}_chunk{i}",
                    "text": doc.page_content,
                    "source": pdf_name,
                    "page": doc.metadata.get("page", 0) + 1,
                }
            )

    # Processed curriculum JSON
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(all_chunks)} chunks to {output_file}")


if __name__ == "__main__":
    load_and_chunk(file_path, output_file)
