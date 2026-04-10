import os

# small file (2MB)
with open("small.bin", "wb") as f:
    f.write(os.urandom(2 * 1024 * 1024))

# large file (20MB)
with open("large.bin", "wb") as f:
    f.write(os.urandom(20 * 1024 * 1024))

print("Files created!")