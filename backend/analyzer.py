import pandas as pd

def analyze():

    try:
        df = pd.read_csv("../data/download_log.csv")

        # 🔥 AUTO FIX: if headers missing
        if "speed" not in df.columns:
            df.columns = ["time", "size", "duration", "speed"]

        # 🔥 remove invalid values
        df = df[df["speed"] > 0]

        if df.empty:
            print("No valid data to analyze.")
            return

        avg_speed = df["speed"].mean()
        max_speed = df["speed"].max()
        min_speed = df["speed"].min()

        busiest = df.loc[df["speed"].idxmin()]

        print("\n===== NETWORK ANALYSIS =====")
        print(f"Average Speed: {avg_speed:.2f}")
        print(f"Max Speed: {max_speed:.2f}")
        print(f"Min Speed: {min_speed:.2f}")

        print("\n===== BUSIEST NETWORK TIME =====")
        print(f"Time: {busiest['time']}")
        print(f"File Size: {busiest['size']} bytes")
        print(f"Duration: {busiest['duration']:.2f} sec")
        print(f"Speed: {busiest['speed']:.2f}")

    except FileNotFoundError:
        print("❌ Log file not found. Run clients first.")