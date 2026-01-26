import os
import cohere
import numpy as np
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

load_dotenv()

# Setup
console = Console()
api_key = os.getenv("COHERE_API_KEY")
if not api_key:
    console.print("[red]❌ Error: COHERE_API_KEY not found.[/red]")
    exit()

co = cohere.Client(api_key)

def get_embedding(text):
    response = co.embed(
        texts=[text],
        model="embed-multilingual-v3.0",
        input_type="search_query"
    )
    return np.array(response.embeddings[0])

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def main():
    console.rule("[bold blue]Embedding Quality Test (Cohere Multilingual)[/bold blue]")

    # 1. Define Test Pairs
    # We mix English queries with French concepts to test the "Multilingual" capability
    pairs = [
        # GOOD MATCHES (Should have HIGH score)
        ("Optics (English)", "Optique géométrique (French)"),
        ("Limit of a sequence", "Suite convergente"),
        ("Microscope", "Lentilles et miroirs"),
        
        # BAD MATCHES (Should have LOW score)
        ("Optics (English)", "Fonction dérivable"),
        ("Integral calculus", "Prisme et dispersion"),
        ("Pizza", "Lentilles minces") # Random control
    ]

    table = Table(title="Semantic Similarity Scores")
    table.add_column("Query A", style="cyan")
    table.add_column("Query B", style="magenta")
    table.add_column("Similarity (0-1)", justify="right")
    table.add_column("Verdict", justify="center")

    for text_a, text_b in pairs:
        emb_a = get_embedding(text_a)
        emb_b = get_embedding(text_b)
        score = cosine_similarity(emb_a, emb_b)
        
        # Grading
        if score > 0.4:
            verdict = "[green]✅ Related[/green]"
        else:
            verdict = "[red]❌ Distinct[/red]"
            
        table.add_row(text_a, text_b, f"{score:.4f}", verdict)

    console.print(table)
    console.print("\n[dim]Note: Scores above 0.5 usually indicate strong semantic relevance in Cohere models.[/dim]")

if __name__ == "__main__":
    main()