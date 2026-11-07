"""Builds a claude.ai Artifact page from film/index.html.

The artifact publisher wraps the page in its own <html>/<head>/<body>, so the
document wrappers are stripped, and Google Fonts are added as a fallback for the
bundled font files. Usage: python3 tools/build_artifact.py <out.html>
"""
import re, sys, pathlib

src = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
html = src.read_text(encoding='utf-8')
for pat in [r'<!doctype html>\s*', r'<html[^>]*>\s*', r'</html>\s*', r'<head>\s*', r'</head>\s*',
            r'<body>\s*', r'</body>\s*', r'<meta charset="utf-8">\s*', r'<meta name="viewport"[^>]*>\s*']:
    html = re.sub(pat, '', html, flags=re.I)
fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700'
         '&family=JetBrains+Mono:wght@500&display=swap">\n')
html = html.replace('</title>\n', '</title>\n' + fonts, 1)
pathlib.Path(sys.argv[1]).write_text(html, encoding='utf-8')
print('wrote', sys.argv[1], len(html), 'bytes')
