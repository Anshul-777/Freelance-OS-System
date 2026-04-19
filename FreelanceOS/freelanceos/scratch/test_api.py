
import requests
import json
import time

url = "https://freelance-os-system.onrender.com/api/auth/register"
data = {
    "email": f"test_{int(time.time())}@example.com",
    "password": "Password123!",
    "full_name": "Test User",
    "company_name": "Test Co",
    "currency": "USD",
    "hourly_rate": 100
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
except Exception as e:
    print(f"ERROR: {e}")
