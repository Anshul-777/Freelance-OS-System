import requests
import json

url = "http://localhost:8000/auth/register"
payload = {
    "full_name": "Antigravity User",
    "email": "newuser_antigravity@test.com",
    "password": "SecurePassword123!",
    "company_name": "Antigravity Inc",
    "currency": "USD",
    "hourly_rate": 50.0
}

response = requests.post(url, json=payload)

if response.status_code == 200:
    print("User registered successfully!")
    print(json.dumps(response.json(), indent=2))
else:
    print(f"Failed to register user. Status code: {response.status_code}")
    print(response.text)
