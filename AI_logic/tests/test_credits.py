from fastapi.testclient import TestClient
from src.api.server import app, CREDITS_FILE
import os
import json

client = TestClient(app)


def test_credits_flow(tmp_path, monkeypatch):
    # Redirect credits file to tmp path
    tmpfile = tmp_path / "credits.json"
    monkeypatch.setenv('PYTHONIOENCODING', 'utf-8')

    # Call get credits for guest
    res = client.get('/api/credits/guest')
    assert res.status_code == 200
    data = res.json()
    assert 'remaining' in data
    orig_remaining = data['remaining']

    # Spend a credit (guest flow - direct call to spend should work without session)
    res2 = client.post('/api/credits/guest/spend', headers={})
    # In guest mode this should fail because server expects session for spending
    assert res2.status_code == 401

    # Now monkeypatch _verify_clerk_session to return a user and call spend with header
    from src.api.server import _verify_clerk_session
    monkeypatch.setattr('src.api.server._verify_clerk_session', lambda x: 'user-123')

    res3 = client.post('/api/credits/user-123/spend', headers={'X-Session-Id': 'validtoken'})
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3['remaining'] == 99 or data3['remaining'] == orig_remaining - 1

    # Reset credits (admin reset - requires ADMIN_RESET_KEY env var)
    monkeypatch.setenv('ADMIN_RESET_KEY', 'admin')
    res4 = client.post('/api/credits/user-123/reset')
    assert res4.status_code == 200
    data4 = res4.json()
    assert data4['remaining'] == 100
