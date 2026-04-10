import json
import urllib.request
from datetime import datetime
import threading

lock = threading.Lock()

# Import the host IP from downloader config so we aim at the correct Multiclient Server
try:
    from downloader import HOST as FLASK_HOST
except ImportError:
    FLASK_HOST = "127.0.0.1"

# We hit the centralized Dashboard API
API_URL = f"http://{FLASK_HOST}:5001/api/log_download"

def log_download(size, time_taken, speed):
    with lock:
        time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        payload = {
            "time": time_str,
            "size": size,
            "duration": time_taken,
            "speed": speed
        }
        
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(API_URL, data=data, headers={"Content-Type": "application/json"})
        
        try:
            response = urllib.request.urlopen(req)
            if response.status == 200:
                print(f"✅ Log sent successfully to Dashboard at {FLASK_HOST}")
            else:
                print(f"⚠️ Server responded with status: {response.status}")
        except Exception as e:
            print(f"❌ Failed to send log to dashboard: {e}")