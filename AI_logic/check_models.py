import os
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

key = os.getenv("ANTHROPIC_API_KEY")
if not key:
    print("❌ No API Key found.")
    exit()

client = Anthropic(api_key=key)

try:
    print("Connecting to Anthropic...")
    # Attempt to list models (Note: logic varies by library version, 
    # but a simple completion test is the most reliable way to check access)
    
    # Let's try to trigger a simple response from the target model
    print("Testing access to 'claude-3-5-sonnet-20240620'...")
    message = client.messages.create(
        model="claude-3-5-sonnet-20240620",
        max_tokens=10,
        messages=[{"role": "user", "content": "Hello"}]
    )
    print("✅ SUCCESS! You have access to Claude 3.5 Sonnet.")
    print(f"Response: {message.content[0].text}")

except Exception as e:
    print(f"❌ FAILED: {e}")
    print("\n--- Recommendation ---")
    if "not_found_error" in str(e):
        print("Your API Key cannot see Claude 3.5. Please switch to 'claude-3-sonnet-20240229' in orchestrator.py")
    elif "authentication_error" in str(e):
        print("Your API Key is invalid.")