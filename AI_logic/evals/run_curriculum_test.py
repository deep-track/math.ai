import json
import os
import sys
import time
from rich.console import Console
from rich.table import Table

# 1. Setup Path to find 'src'
# Assuming this script is in AI_logic/evals/, we need to go up one level to find 'src'
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir) # This is AI_logic/
sys.path.append(parent_dir)

from src.engine.orchestrator import ask_math_ai

def load_dataset():
    """Loads questions and answers from the json files."""
    base_path = os.path.join(current_dir, "curriculum_questions")
    q_path = os.path.join(base_path, "questions.json")
    a_path = os.path.join(base_path, "answers.json")

    try:
        with open(q_path, "r", encoding="utf-8") as f:
            questions = json.load(f)
        with open(a_path, "r", encoding="utf-8") as f:
            answers = json.load(f)
        return questions, answers
    except FileNotFoundError as e:
        print(f"❌ Error: Could not find dataset files. Checked at: {base_path}")
        print(f"Details: {e}")
        sys.exit(1)

def main():
    console = Console()
    console.rule("[bold blue]Curriculum Evaluation Runner[/bold blue]")

    # Load Data
    questions, answers = load_dataset()
    
    # Create a quick lookup for answers
    answer_map = {item['id']: item['answer'] for item in answers}

    results = []
    
    # Progress Bar (Manual loop for clarity)
    total = len(questions)
    
    for i, q_item in enumerate(questions):
        q_id = q_item['id']
        question_text = q_item['question']
        target_answer = answer_map.get(q_id, "N/A")
        
        console.print(f"\n[bold yellow]Test {i+1}/{total}:[/bold yellow] ID {q_id}")
        console.print(f"❓ [cyan]Q:[/cyan] {question_text}")
        
        start_time = time.time()
        try:
            # --- CALL THE ORCHESTRATOR ---
            ai_response = ask_math_ai(question_text)
            # -----------------------------
        except Exception as e:
            ai_response = f"Error: {str(e)}"
        
        elapsed = time.time() - start_time
        
        console.print(f"🤖 [green]AI:[/green] {ai_response}")
        console.print(f"🎯 [magenta]Target:[/magenta] {target_answer}")
        console.print(f"⏱️ [dim]Time: {elapsed:.2f}s[/dim]")

        # Save result structure
        results.append({
            "id": q_id,
            "question": question_text,
            "target": target_answer,
            "ai_response": ai_response,
            "latency": elapsed
        })

    # Save to JSON for review
    output_file = os.path.join(current_dir, "curriculum_results.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    console.rule("[bold green]Evaluation Complete[/bold green]")
    console.print(f"📄 Results saved to: [underline]{output_file}[/underline]")

if __name__ == "__main__":
    main()