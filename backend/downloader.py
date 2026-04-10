import socket
import ssl
import time
import os

HOST = "127.0.0.1"
PORT = 5000

MAX_SIZE = 5 * 1024 * 1024   # 5MB

def download_file(client_id, use_limit=True):

    os.makedirs("../data", exist_ok=True)

    context = ssl._create_unverified_context()

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    secure_sock = context.wrap_socket(sock, server_hostname=HOST)

    start_time = time.time()
    secure_sock.connect((HOST, PORT))

    total_bytes = 0
    filename = f"../data/received_{client_id}.bin"

    with open(filename, "wb") as file:
        while True:
            data = secure_sock.recv(1024)

            if not data:
                break

            # 🔥 LIMIT LOGIC
            if use_limit and total_bytes + len(data) > MAX_SIZE:
                allowed = MAX_SIZE - total_bytes
                file.write(data[:allowed])
                total_bytes += allowed

                print(f"⚠️ Client {client_id}: File size limit reached (5MB)")
                break

            file.write(data)
            total_bytes += len(data)

    secure_sock.close()

    end_time = time.time()

    download_time = end_time - start_time
    throughput = total_bytes / download_time

    return total_bytes, download_time, throughput