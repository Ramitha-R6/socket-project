import socket
import ssl
import threading

HOST = "0.0.0.0"
PORT = 5000

context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile="cert.pem", keyfile="key.pem")

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind((HOST, PORT))
server.listen(5)

print("Secure Server running on port", PORT)

def handle_client(conn, addr):

    print("Client connected:", addr)

    with open("testfile.bin", "rb") as f:
        while True:
            data = f.read(1024)

            if not data:
                break

            conn.sendall(data)

    conn.close()

    print("File sent to", addr)


while True:

    client_socket, addr = server.accept()

    secure_socket = context.wrap_socket(client_socket, server_side=True)

    thread = threading.Thread(target=handle_client, args=(secure_socket, addr))

    thread.start()
