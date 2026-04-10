import sys
import schedule
import time

from downloader import download_file
from logger import log_download

def run_client(client_id):

    print(f"\nClient {client_id} starting...")

    # EVEN → limited, ODD → full
    use_limit = (client_id % 2 == 0)

    size, time_taken, speed = download_file(client_id, use_limit)

    log_download(size, time_taken, speed)

    print(f"Client {client_id} completed")


if __name__ == "__main__":

    if len(sys.argv) != 2:
        print("Usage: python scheduler.py <client_id>")
        exit()

    client_id = int(sys.argv[1])

    # 🔥 RUN EVERY 1 MINUTE
    schedule.every(1).minutes.do(run_client, client_id)

    print(f"Client {client_id} scheduled every 1 minute...")

    while True:
        schedule.run_pending()
        time.sleep(1)