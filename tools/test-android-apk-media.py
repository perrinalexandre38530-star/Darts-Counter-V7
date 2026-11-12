#!/usr/bin/env python3
"""Static offline-media smoke test for the Android debug APK (not a device test)."""
import re
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

APK = Path(sys.argv[1] if len(sys.argv) > 1 else 'android/app/build/outputs/apk/debug/app-debug.apk')
assert APK.is_file(), f'APK absent: {APK}'
with zipfile.ZipFile(APK) as archive:
    damaged = archive.testzip()
    assert damaged is None, f'Archive APK corrompue: {damaged}'
    names = archive.namelist()
    assert 'assets/public/index.html' in names, 'Web app index.html absent'

    samples = {
        'Killer Awena FR': (r'assets/public/assets/killer_awena_rules-[\w-]{8}\.mp4', {'video': 'h264', 'audio': 'aac'}),
        'Killer Awena EN': (r'assets/public/assets/killer_awena_rules_en-[\w-]{8}\.mp4', {'video': 'h264', 'audio': 'aac'}),
        'X01 Awena FR': (r'assets/public/assets/x01_awena_rules-[\w-]{8}\.mp4', {'video': 'h264', 'audio': 'aac'}),
        'Firefighter Canadair': (r'assets/public/sounds/darts-firefighter/canadair\.mp3', {'audio': 'mp3'}),
        'Firefighter Water': (r'assets/public/sounds/darts-firefighter/water_1\.mp3', {'audio': 'mp3'}),
    }
    with tempfile.TemporaryDirectory(prefix='mss-apk-media-') as directory:
        for label, (pattern, expected) in samples.items():
            matches = [name for name in names if re.fullmatch(pattern, name)]
            assert len(matches) == 1, f'{label}: attendu 1 média, trouvé {len(matches)}'
            filename = matches[0]
            output = Path(directory) / Path(filename).name
            with archive.open(filename) as source, output.open('wb') as dest:
                while chunk := source.read(1024 * 1024):
                    dest.write(chunk)
            result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,codec_type',
                                     '-of', 'csv=p=0', str(output)], capture_output=True, text=True, check=True)
            codecs = {}
            for line in result.stdout.splitlines():
                fields = line.split(',')
                if len(fields) == 2:
                    codec, kind = fields
                    codecs[kind] = codec
            for kind, codec in expected.items():
                assert codecs.get(kind) == codec, f'{label}: {kind} attendu {codec}, trouvé {codecs.get(kind)}'
            print(f'OK {label}: {filename} / {codecs}')
print('OK APK Android: ZIP intègre, index présent, médias hors ligne essentiels et codecs conformes')
