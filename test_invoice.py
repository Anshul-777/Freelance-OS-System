"""Quick test to get exact 500 error from invoice creation."""
import requests
import json

BASE = "http://localhost:8000"

# Login
r = requests.post(f"{BASE}/auth/login", json={"email": "demo@freelanceos.com", "password": "demo123"})
print("Login:", r.status_code)
data = r.json()
token = data["access_token"]
workspace_id = data["user"]["workspaces"][0]["id"] if data["user"]["workspaces"] else 1
print(f"Workspace ID: {workspace_id}")

headers = {"Authorization": f"Bearer {token}", "X-Workspace-Id": str(workspace_id)}

# Get clients
clients = requests.get(f"{BASE}/clients", headers=headers).json()
print(f"Clients: {[c['id'] for c in clients[:3]]}")
client_id = clients[0]["id"] if clients else None

from datetime import date, timedelta
today = date.today().isoformat()
due = (date.today() + timedelta(days=30)).isoformat()

# Try creating invoice
payload = {
    "client_id": client_id,
    "project_id": None,
    "status": "draft",
    "issue_date": today,
    "due_date": due,
    "tax_rate": 10,
    "discount_amount": 0,
    "currency": "USD",
    "notes": "",
    "payment_terms": 30,
    "items": [{"description": "Test Service", "quantity": 1, "unit_price": 500, "amount": 500}]
}

r = requests.post(f"{BASE}/invoices", headers=headers, json=payload)
print(f"\nCreate invoice: {r.status_code}")
print(json.dumps(r.json(), indent=2))
