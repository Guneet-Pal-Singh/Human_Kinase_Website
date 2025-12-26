import pandas as pd
import os
import shutil

df=pd.read_csv("D:\\Website\\Backend\\Human_Kinase_Website\\KinaseDB.csv")

df1=df[['uniprot_id', 'pdb']]

df_missing = df1[df1['pdb'].isnull()]

# Define the source directory containing PDB files and the destination directory
source_dir = "D:\\Website\\Frontend\\Human_Kinase_Website\\pdb_files"
destination_dir = "D:\\Website\\Frontend\\Human_Kinase_Website\\alpha_fold"

# Create the destination directory if it doesn't exist
os.makedirs(destination_dir, exist_ok=True)

# Iterate through the missing PDB entries and copy the corresponding files
for index, row in df_missing.iterrows():
    pdb_file = os.path.join(source_dir, f"{row['uniprot_id']}.pdb")
    if os.path.isfile(pdb_file):
        shutil.copy(pdb_file, destination_dir)
        os.remove(pdb_file)