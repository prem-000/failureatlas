"""
Packaging script for FailureAtlas Extension.
Ensures forward-slash ZIP archive paths (RFC 1951 / ZIP spec) for Mozilla AMO validation.
"""
import os
import zipfile
import sys

def package():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(base_dir, 'dist')
    zip_name = 'failureatlas-extension-v1.0.3.zip'
    zip_path = os.path.join(base_dir, zip_name)

    files_to_pack = [
        ('manifest.json', 'manifest.json'),
        ('background.js', 'background.js'),
        ('content.js', 'content.js'),
        ('popup.html', 'popup.html'),
        ('popup.css', 'popup.css'),
        ('popup.js', 'popup.js'),
        (os.path.join('icons', 'icon-16.png'), 'icons/icon-16.png'),
        (os.path.join('icons', 'icon-32.png'), 'icons/icon-32.png'),
        (os.path.join('icons', 'icon-48.png'), 'icons/icon-48.png'),
        (os.path.join('icons', 'icon-128.png'), 'icons/icon-128.png'),
    ]

    for rel_path, arc_name in files_to_pack:
        full_path = os.path.join(dist_dir, rel_path)
        if not os.path.exists(full_path):
            print(f"Error: Missing required build file: {full_path}")
            sys.exit(1)
        if "\\" in arc_name:
            print(f"Error: Backslash found in archive entry name: {arc_name}")
            sys.exit(1)

    if os.path.exists(zip_path):
        os.remove(zip_path)

    with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        for rel_path, arc_name in files_to_pack:
            full_path = os.path.join(dist_dir, rel_path)
            zf.write(full_path, arcname=arc_name)

    print(f"Successfully packaged {zip_name}")

if __name__ == '__main__':
    package()
