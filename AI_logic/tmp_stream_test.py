from fastapi.testclient import TestClient
from src.api.server import app

client = TestClient(app)
print('Posting streaming request (dev bypass)...')
with client.stream('POST', '/ask-stream', headers={'Authorization': 'Bearer dev', 'Content-Type': 'application/json'}, json={'text': '2+2', 'user_id': 'user-test'}) as r:
    print('status_code', r.status_code)
    if r.status_code == 200:
        for chunk in r.iter_lines():
            if chunk:
                print('CHUNK:', chunk)
            else:
                print('KEEPALIVE')
    else:
        print('Response not ok', r.text)
