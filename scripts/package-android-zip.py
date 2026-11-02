import os
import zipfile

# Ensure directories exist
for folder in ['data', 'dist']:
    if not os.path.exists(folder):
        os.makedirs(folder, exist_ok=True)

output_zip_data = os.path.join('data', 'nexus-iptv-pro-android.zip')
output_zip_dist = os.path.join('dist', 'nexus-iptv-pro-android.zip')

print(f"Creating zip at: {output_zip_data}")

with zipfile.ZipFile(output_zip_data, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # Add android directory
    for root, dirs, files in os.walk('android'):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = file_path
            zipf.write(file_path, arcname)

    # Add capacitor.config.ts
    if os.path.exists('capacitor.config.ts'):
        zipf.write('capacitor.config.ts', 'capacitor.config.ts')

    # Add package.json
    if os.path.exists('package.json'):
        zipf.write('package.json', 'package.json')

# Copy to dist as well
import shutil
shutil.copyfile(output_zip_data, output_zip_dist)

file_size_mb = os.path.getsize(output_zip_data) / (1024 * 1024)
print(f"Successfully generated {output_zip_data} and {output_zip_dist} ({file_size_mb:.2f} MB)")
