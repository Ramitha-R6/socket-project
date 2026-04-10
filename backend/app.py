from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
import time
import glob
import socket

app = Flask(__name__)
CORS(app)

LOG_FILE = "../data/download_log.csv"
DATA_DIR = "../data/"

def get_dataframe():
    if not os.path.exists(LOG_FILE):
        return pd.DataFrame(columns=["time", "size", "duration", "speed"])
    try:
        df = pd.read_csv(LOG_FILE)
        if "speed" not in df.columns:
            df.columns = ["time", "size", "duration", "speed"]
        return df
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return pd.DataFrame(columns=["time", "size", "duration", "speed"])

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

@app.route('/network_info', methods=['GET'])
def get_network_info():
    df = get_dataframe()
    # Check for active downloads by seeing if any .bin files are currently being written to
    # A file is considered active if modified in the last 5 seconds
    active_connections = 0
    now = time.time()
    
    bin_files = glob.glob(os.path.join(DATA_DIR, "*.bin"))
    for bf in bin_files:
        if now - os.path.getmtime(bf) < 5:
            active_connections += 1

    return jsonify({
        "server_ip": get_local_ip(),
        "total_clients": len(df),
        "active_clients": active_connections,
        "mode": "Localhost" if get_local_ip() == '127.0.0.1' else "Multi-client"
    })

@app.route('/logs', methods=['GET'])
def get_logs():
    df = get_dataframe()
    return jsonify(df.to_dict(orient="records"))

@app.route('/analysis', methods=['GET'])
def get_analysis():
    df = get_dataframe()
    df = df[df["speed"] > 0] # Filter out failures for analysis
    if df.empty:
        return jsonify({
            "avg_speed": 0,
            "max_speed": 0,
            "min_speed": 0,
            "busiest_time": None
        })
    
    return jsonify({
        "avg_speed": df["speed"].mean(),
        "max_speed": df["speed"].max(),
        "min_speed": df["speed"].min(),
        "busiest_time": df.loc[df["speed"].idxmin()].to_dict()["time"]
    })

@app.route('/clients', methods=['GET'])
def get_clients():
    df = get_dataframe()
    clients = []
    MAX_SIZE = 5 * 1024 * 1024 # 5MB limit
    
    now = time.time()
    
    # Analyze CSV and bin files together
    for idx, row in df.iterrows():
        size = float(row.get("size", 0))
        speed = float(row.get("speed", 0))
        client_type = "LIMITED" if size <= MAX_SIZE + 1024 else "FULL"
        file_name = "small.bin" if client_type == "LIMITED" else "large.bin"
        
        # Determine Status
        status = "COMPLETED"
        if speed <= 0:
            status = "FAILED"
            
        # Is there a corresponding active .bin file?
        filename = f"received_{idx+1}.bin"
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            if now - os.path.getmtime(filepath) <= 3:
                status = "ACTIVE"
        
        clients.append({
            "id": idx + 1,
            "size": size,
            "duration": row.get("duration", 0),
            "speed": speed,
            "type": client_type,
            "time": row.get("time", ""),
            "status": status,
            "file_name": file_name
        })
        
    # We should also check for any pending bin files that aren't in the CSV yet
    bin_files = glob.glob(os.path.join(DATA_DIR, "received_*.bin"))
    for bf in bin_files:
        try:
            cid = int(os.path.basename(bf).split('_')[1].split('.')[0])
            if cid > len(df):
                if now - os.path.getmtime(bf) <= 3:
                    size = os.path.getsize(bf)
                    clients.append({
                        "id": cid,
                        "size": size,
                        "duration": 0, # not finished
                        "speed": 0,    # not finished
                        "type": "LIMITED" if size <= MAX_SIZE + 1024 else "FULL", # partial
                        "time": time.strftime("%Y-%m-%d %H:%M:%S.000000"),
                        "status": "ACTIVE",
                        "file_name": "unknown.bin"
                    })
        except:
             pass
        
    # Sort by ID descending (newest first)
    clients.sort(key=lambda x: x["id"], reverse=True)
    return jsonify(clients)

@app.route('/api/log_download', methods=['POST'])
def api_log_download():
    import csv
    data = request.json
    size = data.get('size', 0)
    duration = data.get('duration', 0)
    speed = data.get('speed', 0)
    time_str = data.get('time', time.strftime("%Y-%m-%d %H:%M:%S"))
    
    os.makedirs(DATA_DIR, exist_ok=True)
    file_exists = os.path.exists(LOG_FILE)
    
    with open(LOG_FILE, mode='a', newline='') as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["time", "size", "duration", "speed"])
        
        writer.writerow([time_str, size, f"{float(duration):.2f}", speed])
    
    return jsonify({"status": "success", "message": "Log centralized successfully"})

if __name__ == '__main__':
    # Listen on all interfaces to allow multi-client access
    app.run(host='0.0.0.0', port=5001, debug=True)
