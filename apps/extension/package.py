"""
Packaging script for FailureAtlas Extension.
Ensures forward-slash ZIP archive paths (RFC 1951 / ZIP spec) for Mozilla AMO validation.
Creates both the production extension zip and the unminified source code zip.
"""
import os
import zipfile
import sys
import shutil

def package():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(base_dir, 'dist')
    repo_root = os.path.abspath(os.path.join(base_dir, '..', '..'))
    public_ext_dir = os.path.join(repo_root, 'public', 'extension')

    ext_zip_name = 'failureatlas-extension-v1.0.3.zip'
    source_zip_name = 'failureatlas-extension-source-v1.0.3.zip'

    ext_zip_path = os.path.join(base_dir, ext_zip_name)
    source_zip_path = os.path.join(base_dir, source_zip_name)

    # 1. Package production extension zip from dist/
    files_to_pack = [
        ('manifest.json', 'manifest.json'),
        ('background.js', 'background.js'),
        ('content.js', 'content.js'),
        ('popup.html', 'popup.html'),
        ('popup.css', 'popup.css'),
        ('popup.js', 'popup.js'),
        ('hackerrank-network-interceptor.js', 'hackerrank-network-interceptor.js'),
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

    if os.path.exists(ext_zip_path):
        os.remove(ext_zip_path)

    with zipfile.ZipFile(ext_zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        for rel_path, arc_name in files_to_pack:
            full_path = os.path.join(dist_dir, rel_path)
            zf.write(full_path, arcname=arc_name.replace('\\', '/'))

    print(f"Successfully packaged {ext_zip_name}")

    # 2. Package source code zip for AMO / submission reproducibility
    if os.path.exists(source_zip_path):
        os.remove(source_zip_path)

    source_root_files = [
        'README.md',
        'manifest.json',
        'package.json',
        'package-lock.json',
        'package.py',
        'tsconfig.json',
        'webpack.config.js',
        'jest.config.js',
        'popup.html',
        'popup.css',
    ]

    with zipfile.ZipFile(source_zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        # Add root config files
        for fname in source_root_files:
            fpath = os.path.join(base_dir, fname)
            if os.path.exists(fpath):
                zf.write(fpath, arcname=fname)

        # Add icons
        icons_dir = os.path.join(base_dir, 'icons')
        if os.path.exists(icons_dir):
            for f in sorted(os.listdir(icons_dir)):
                fpath = os.path.join(icons_dir, f)
                if os.path.isfile(fpath):
                    zf.write(fpath, arcname=f"icons/{f}")

        # Add src tree
        src_dir = os.path.join(base_dir, 'src')
        if os.path.exists(src_dir):
            for root, _, files in os.walk(src_dir):
                for f in sorted(files):
                    fpath = os.path.join(root, f)
                    rel = os.path.relpath(fpath, base_dir).replace('\\', '/')
                    zf.write(fpath, arcname=rel)

    print(f"Successfully packaged {source_zip_name}")

    # 3. Synchronize zip files to repository root
    shutil.copy2(ext_zip_path, os.path.join(repo_root, ext_zip_name))
    shutil.copy2(source_zip_path, os.path.join(repo_root, source_zip_name))
    print(f"Synced {ext_zip_name} and {source_zip_name} to repository root")

    # 4. Synchronize to public/extension
    if os.path.exists(public_ext_dir):
        shutil.copy2(ext_zip_path, os.path.join(public_ext_dir, ext_zip_name))
        # Keep backward-compatible v1.0.0 filename in public folder if referenced
        shutil.copy2(ext_zip_path, os.path.join(public_ext_dir, 'failureatlas-extension-v1.0.0.zip'))
        print("Synced to public/extension/ directory")

if __name__ == '__main__':
    package()
