import re
from typing import Dict, List, Optional, Any, TypedDict, Union

# Define strict types for better code safety
class Step(TypedDict):
    step_number: int
    title: str
    explanation: str
    equations: List[str]

class AcademicResponse(TypedDict):
    partie: str
    problemStatement: str
    steps: List[Step]
    conclusion: str

def clean_markdown(text: str) -> str:
    """Removes bold/italic markdown and extra whitespace."""
    # Remove ** or * or __ or _ wrapper
    text = re.sub(r'(\*\*|__|[*_])(.*?)\1', r'\2', text)
    return text.strip()

def extract_equations(text: str) -> List[str]:
    """Extracts LaTeX equations ($...$ and $$...$$)."""
    equations = []
    # Block math $$...$$
    equations.extend(re.findall(r'\$\$(.+?)\$\$', text, re.DOTALL))
    # Inline math $...$ (negative lookbehind/ahead to avoid matching $$)
    equations.extend(re.findall(r'(?<!\$)\$([^\$]+?)\$(?!\$)', text))
    return [eq.strip() for eq in equations if eq.strip()]

def parse_academic_response(ai_response: str, default_question: str = "") -> AcademicResponse:
    """
    Parses a structured AI response into an AcademicResponse dictionary.
    Supports English (STEP) and French (ÉTAPE) keywords.
    """
    
    # 1. Default Structure
    parsed_data: AcademicResponse = {
        "partie": "General Analysis",
        "problemStatement": default_question,
        "steps": [],
        "conclusion": ""
    }

    if not ai_response:
        return parsed_data

    # 2. Extract Header Info (Partie/Part & Problem/Enoncé)
    # Using non-capturing groups (?:) for bilingual support
    part_match = re.search(
        r'(?:PARTIE|PART|SECTION)\s*[:\-]\s*(.+?)(?=\n|$|ÉNONCÉ|PROBLEM|ÉTAPE|STEP)', 
        ai_response, 
        re.IGNORECASE | re.DOTALL
    )
    if part_match:
        parsed_data["partie"] = clean_markdown(part_match.group(1))

    prob_match = re.search(
        r'(?:ÉNONCÉ|PROBLEM(?:_STATEMENT)?)\s*[:\-]\s*(.+?)(?=\n\s*(?:ÉTAPE|STEP)|$)', 
        ai_response, 
        re.IGNORECASE | re.DOTALL
    )
    if prob_match:
        parsed_data["problemStatement"] = prob_match.group(1).strip()

    # 3. Extract Steps
    # Pattern looks for "ÉTAPE X:" or "STEP X:" followed by content
    # It stops lookahead when it sees the next step or Conclusion
    step_pattern = re.compile(
        r'(?:^|\n)(?:ÉTAPE|STEP)\s+(\d+)[:\.]?\s*(.*?)(?=\n\s*(?:ÉTAPE|STEP)\s+\d+|CONCLUSION|$)', 
        re.IGNORECASE | re.DOTALL
    )
    
    for match in step_pattern.finditer(ai_response):
        step_num = int(match.group(1))
        raw_content = match.group(2).strip()
        
        # Split Title vs Explanation
        # Logic: The first line is usually the title.
        lines = raw_content.split('\n', 1)
        title = clean_markdown(lines[0])
        
        explanation = ""
        if len(lines) > 1:
            explanation = lines[1].strip()
        else:
            # If single line, treat title as explanation if it's long, 
            # or keep it as title if short.
            if len(title) > 50: 
                explanation = title
                title = f"Step {step_num}"
        
        parsed_data["steps"].append({
            "step_number": step_num,
            "title": title,
            "explanation": explanation,
            "equations": extract_equations(explanation)
        })

    # 4. Extract Conclusion
    concl_match = re.search(
        r'CONCLUSION\s*[:\-]\s*(.+)$', 
        ai_response, 
        re.IGNORECASE | re.DOTALL
    )
    if concl_match:
        parsed_data["conclusion"] = concl_match.group(1).strip()

    # 5. Fallback if parsing failed (Structure preservation)
    if not parsed_data["steps"] and not parsed_data["conclusion"]:
        parsed_data["steps"].append({
            "step_number": 1,
            "title": "Response Analysis",
            "explanation": ai_response,
            "equations": extract_equations(ai_response)
        })

    return parsed_data