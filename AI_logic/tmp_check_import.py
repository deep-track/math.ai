import sys
sys.path.insert(0, r"C:\Users\user\Downloads\math.ai\AI_logic")
import importlib
try:
    m = importlib.import_module("src.api.server")
    print("import OK, app exists:", hasattr(m, 'app'))
except Exception as e:
    import traceback
    traceback.print_exc()
    print('IMPORT FAILED:', e)
