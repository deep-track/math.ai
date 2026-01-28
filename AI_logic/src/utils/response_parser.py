"""
Response Parser for Academic Format
Converts raw AI responses into structured AcademicResponse format
"""

import json
import re
from typing import Dict, Any

def parse_academic_response(ai_response: str, question: str) -> Dict[str, Any]:
    """
    Parse Claude/Mistral response into AcademicResponse format.
    
    Expected format in response:
    - PARTIE: [Title]
    - ÉNONCÉ/PROBLEM_STATEMENT: [Statement]
    - Steps starting with "ÉTAPE 1:", "ÉTAPE 2:", etc.
    - CONCLUSION: [Final conclusion]
    - Math in LaTeX format using $ or $$
    
    Args:
        ai_response: Raw response from Claude/Mistral
        question: Original user question
    
    Returns:
        Dictionary matching AcademicResponse interface
    """
    
    # Initialize response structure
    response = {
        "partie": "",
        "problemStatement": question,
        "steps": [],
        "conclusion": ""
    }
    
    try:
        # Extract PARTIE
        partie_match = re.search(r'PARTIE[:\s]+(.+?)(?=\n|ÉNONCÉ|PROBLEM|ÉTAPE)', ai_response, re.IGNORECASE | re.DOTALL)
        if partie_match:
            response["partie"] = partie_match.group(1).strip()
        else:
            response["partie"] = "Analyse Mathématique"
        
        # Extract Problem Statement
        problem_match = re.search(
            r'(?:ÉNONCÉ|PROBLEM_STATEMENT|PROBLEM)[:\s]+(.+?)(?=\nÉTAPE|STEP)',
            ai_response,
            re.IGNORECASE | re.DOTALL
        )
        if problem_match:
            response["problemStatement"] = problem_match.group(1).strip()
        else:
            # Use the question if not found
            response["problemStatement"] = question
        
        # Extract Steps (ÉTAPE 1, ÉTAPE 2, etc.)
        # Pattern: ÉTAPE N: Title\nExplanation\nEquations...
        step_pattern = r'ÉTAPE\s+(\d+)[:\s]+(.+?)(?=\nÉTAPE\s+\d+|CONCLUSION|$)'
        step_matches = re.finditer(step_pattern, ai_response, re.IGNORECASE | re.DOTALL)
        
        steps_list = []
        for match in step_matches:
            step_content = match.group(2).strip()
            
            # Split title (first line) from explanation
            lines = step_content.split('\n', 1)
            title = lines[0].strip() if lines else "Step"
            explanation = lines[1].strip() if len(lines) > 1 else ""
            
            # Extract LaTeX equations (patterns like $...$ or $$...$$)
            equations = []
            
            # Find $$...$$ equations
            double_dollar = re.findall(r'\$\$(.+?)\$\$', explanation, re.DOTALL)
            equations.extend(double_dollar)
            
            # Find $...$ equations (but not inside $$...$$)
            single_dollar = re.findall(r'(?<!\$)\$([^\$]+?)\$(?!\$)', explanation)
            equations.extend(single_dollar)
            
            steps_list.append({
                "title": title,
                "explanation": explanation,
                "equations": equations if equations else None
            })
        
        response["steps"] = steps_list
        
        # Extract Conclusion
        conclusion_match = re.search(
            r'CONCLUSION[:\s]+(.+?)$',
            ai_response,
            re.IGNORECASE | re.DOTALL
        )
        if conclusion_match:
            conclusion_text = conclusion_match.group(1).strip()
            
            # Try to extract final LaTeX equation
            latex_match = re.search(r'\$\$?(.+?)\$\$?', conclusion_text, re.DOTALL)
            if latex_match:
                response["conclusion"] = latex_match.group(1).strip()
            else:
                response["conclusion"] = conclusion_text
        
        # Ensure we have at least one step
        if not response["steps"]:
            # Fallback: create a single step from the entire response
            response["steps"] = [{
                "title": "Analyse",
                "explanation": ai_response[:500],
                "equations": None
            }]
        
        return response
        
    except Exception as e:
        print(f"Warning: Error parsing academic response: {e}")
        # Return fallback structure
        return {
            "partie": "Analyse",
            "problemStatement": question,
            "steps": [{
                "title": "Réponse",
                "explanation": ai_response,
                "equations": None
            }],
            "conclusion": None
        }
