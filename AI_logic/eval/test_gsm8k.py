import os
import sys
import json
import re
from pathlib import Path

current_file = Path(__file__).resolve()
project_root = current_file.parent.parent
sys.path.append(str(project_root))

try:
    from src.engine.orchestrator import ask_benin_math
except ImportError:
    print("Error: Could not find ask_benin_math")
    sys.exit(1)


def extract_from_ai_response(text):
    """
    Since the AI might explain its reasoning, we look for
    the last number in its response to compare with your JSON.
    """
    if not text:
        return None

    # First, check if the AI used the standard '#### [number]' format
    match = re.search(r"####\s?(-?\d+)", text)
    if match:
        return match.group(1)

    # Fallback: Find the last number in the text
    numbers = re.findall(r"[-+]?\d+", text)
    return numbers[-1] if numbers else None


def run_eval():
    # Paths to your JSON data
    q_path = "/home/fritz-nvm/math.ai/AI_logic/eval/gsm8k_data/questions_fr.json"
    a_path = "/home/fritz-nvm/math.ai/AI_logic/eval/gsm8k_data/answer_fr.json"

    # Load JSON files
    with open(q_path, "r") as f:
        questions = json.load(f)
    with open(a_path, "r") as f:
        answers = json.load(f)

    correct = 0
    total = len(questions)

    print(f"Starting Evaluation on {total} samples...\n")

    for i in range(total):
        # 1. Get question and ground truth
        question = questions[i].get("question")
        target_val = str(answers[i].get("answer")).strip()

        print(f"[{i+1}/{total}] Q: {question[:50]}...")

        # 2. Get AI Response
        ai_raw_response = ask_benin_math(question)
        ai_val = extract_from_ai_response(ai_raw_response)

        # 3. Compare strings
        if ai_val == target_val:
            correct += 1
            print(f"Correct! Answer: {ai_val}")
        else:
            print(f"Wrong. AI: {ai_val} | Target: {target_val}")

        print("-" * 20)

    accuracy = (correct / total) * 100
    print(f"\n📊 RESULTS: {correct}/{total} correct")
    print(f"📈 Accuracy: {accuracy:.2f}%")


if __name__ == "__main__":
    run_eval()
