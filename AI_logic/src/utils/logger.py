import json
import os
import hashlib
import datetime
from rich.console import Console
from rich.panel import Panel

# Initialize Rich Console
console = Console()


class AgentLogger:
    def __init__(self, log_dir="logs", filename="chat_history.jsonl", verbose=True):
        self.verbose = verbose
        # Find the project root
        self.base_dir = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        self.log_path = os.path.join(self.base_dir, log_dir)
        os.makedirs(self.log_path, exist_ok=True)
        self.log_file = os.path.join(self.log_path, filename)

    def compute_hash(self, text):
        return hashlib.sha256(text.encode()).hexdigest()[:8]

    def log_step(self, step_type, content):
        if not self.verbose:
            return
        if step_type == "Thought":
            console.print(
                Panel(content, title="[bold blue]Thought[/]", border_style="blue")
            )
        elif step_type == "Action":
            console.print(f"[bold yellow]Action:[/ ] {content}")
        elif step_type == "Observation":
            preview = content[:200] + "..." if len(content) > 200 else content
            console.print(f"[bold green]Observation:[/ ] {preview}")
        elif step_type == "Error":
            console.print(f"[bold red]Error:[/ ] {content}")

    def save_request(
        self, prompt, model, steps, final_answer, verifier_result=None, confidence=1.0
    ):
        entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "prompt_hash": self.compute_hash(prompt),
            "model_name": model,
            "prompt": prompt,
            "steps": steps,
            "final_answer": final_answer,
            "verifier_result": verifier_result or "N/A",
            "confidence": confidence,
        }
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

        if self.verbose:
            console.print(f"[dim]Log saved to {self.log_file}[/]")
