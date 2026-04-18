import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "freelanceos", "backend"))

from main import app

for route in app.routes:
    if hasattr(route, "path"):
        print(f"{route.methods} {route.path}")
