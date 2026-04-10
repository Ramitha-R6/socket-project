import pandas as pd
import matplotlib.pyplot as plt

def visualize():

    try:
        df = pd.read_csv("../data/download_log.csv")

        # 🔥 Fix if CSV has no headers
        if "speed" not in df.columns:
            df.columns = ["time", "size", "duration", "speed"]

        # 🔥 Remove invalid data
        df = df[df["speed"] > 0]

        if df.empty:
            print("No valid data to visualize.")
            return

        # 🔥 Plot speed graph
        plt.plot(df["speed"])

        plt.xlabel("Download Attempt")
        plt.ylabel("Speed (bytes/sec)")
        plt.title("Network Throughput Analysis")

        plt.grid()

        plt.show()

    except FileNotFoundError:
        print("❌ Log file not found. Run clients first.")