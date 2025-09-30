import sys
import pandas as pd
import numpy as np
import os

# Check for correct usage
if len(sys.argv) != 2:
    print("Usage: python toSqrt.py <filename.csv>")
    sys.exit(1)

input_file = sys.argv[1]

# Read the CSV
df = pd.read_csv(input_file)

# Ensure there are at least two columns
if df.shape[1] < 2:
    print("Error: File must have at least two columns.")
    sys.exit(1)

# Apply square root to the second column
second_col = df.columns[1]
df[second_col] = np.sqrt(df[second_col])

# Create new filename with "_rescaled"
base, ext = os.path.splitext(input_file)
output_file = f"{base}_rescaled{ext}"

# Save to the new file
df.to_csv(output_file, index=False)

print(f"Rescaled file saved as '{output_file}'")