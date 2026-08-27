import re
import os

with open('purpose-bridge.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract styles
style_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL | re.IGNORECASE)
styles = style_match.group(1) if style_match else ''
content = re.sub(r'<style>.*?</style>', '', content, flags=re.DOTALL | re.IGNORECASE)

os.makedirs('src/styles', exist_ok=True)
with open('src/styles/global.css', 'w', encoding='utf-8') as f:
    f.write(styles)

# Extract head
head_match = re.search(r'<head>(.*?)</head>', content, re.DOTALL | re.IGNORECASE)
head_content = head_match.group(1) if head_match else ''

# Extract body
body_match = re.search(r'<body[^>]*>(.*?)</body>', content, re.DOTALL | re.IGNORECASE)
body_content = body_match.group(1) if body_match else ''

layout_astro = f"""---
import '../styles/global.css';
---
<!DOCTYPE html>
<html lang="en">
<head>
    {head_content}
</head>
<body>
    <slot />
</body>
</html>
"""
with open('src/layouts/Layout.astro', 'w', encoding='utf-8') as f:
    f.write(layout_astro)

index_astro = f"""---
import Layout from '../layouts/Layout.astro';
---
<Layout>
    {body_content}
</Layout>
"""
with open('src/pages/index.astro', 'w', encoding='utf-8') as f:
    f.write(index_astro)
