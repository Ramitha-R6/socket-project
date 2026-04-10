import socket
import ssl

HOST = "192.168.206.129"
PORT = 5000

context = ssl.create_default_context()

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

secure_socket = context.wrap_socket(sock, server_hostname=HOST)

secure_socket.connect((HOST, PORT))

file = open("received.bin", "wb")

while True:

    data = secure_socket.recv(1024)

    if not data:
        break

    file.write(data)

file.close()
secure_socket.close()

print("File download complete")