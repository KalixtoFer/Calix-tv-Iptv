import os
import zipfile

for folder in ['data', 'dist']:
    if not os.path.exists(folder):
        os.makedirs(folder, exist_ok=True)

output_zip = os.path.join('data', 'nexus-iptv-pro-github-ready.zip')
output_dist_zip = os.path.join('dist', 'nexus-iptv-pro-github-ready.zip')

print(f"Creating GitHub ready bundle: {output_zip}")

ignored_dirs = {'node_modules', '.git', '.aistudio', 'dist', '.cache'}

with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk('.'):
        # Allow .github specifically, ignore other hidden directories like .git
        dirs[:] = [d for d in dirs if d not in ignored_dirs and (not d.startswith('.') or d == '.github')]
        
        for file in files:
            if file.endswith('.zip') or (file.startswith('.env') and file != '.env.example'):
                continue
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, '.')
            zipf.write(file_path, rel_path)

import shutil
shutil.copyfile(output_zip, output_dist_zip)

file_size_mb = os.path.getsize(output_zip) / (1024 * 1024)
print(f"Successfully generated GitHub ready bundle ({file_size_mb:.2f} MB)")
