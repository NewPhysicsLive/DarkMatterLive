import pandas as pd
import glob
import os

# adjust this if your files live in a subfolder
input_pattern = './AxionLimits/Projections/*.txt'

for txt_path in glob.glob(input_pattern):
    # read, skipping “#…” comment lines, splitting on whitespace
    df = pd.read_csv(txt_path,
                     comment='#',
                     sep=r'\s+',
                     header=None,
                     names=['x','y'])

    df['x'] *= 1e-9
    # prepare output filename: same base, but .csv
    csv_path = os.path.splitext(txt_path)[0] + '.csv'
    df.to_csv(csv_path, index=False)
    print(f"Wrote {csv_path}")
