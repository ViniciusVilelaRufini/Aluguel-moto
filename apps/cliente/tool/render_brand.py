"""Gera assets/brand/*.png a partir da geometria de design-system/assets/logo/
(app-icon.svg / logo-mark.svg) com o Chrome headless.

Uso (em apps/cliente): python tool/render_brand.py assets/brand
Depois: dart run flutter_launcher_icons && dart run flutter_native_splash:create
(descarte a mudanca que o splash faz no AndroidManifest.xml).
Variavel CHROME para outro caminho do navegador.
"""
import subprocess, os, sys, pathlib, tempfile
MARK = '''<g fill="none" stroke="{c}" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="132" r="22" stroke-width="12"/><circle cx="140" cy="132" r="22" stroke-width="12"/><polyline points="62,64 90,124 120,52" stroke-width="16"/><line x1="40" y1="132" x2="70" y2="82" stroke-width="11"/><line x1="120" y1="52" x2="140" y2="132" stroke-width="11"/><line x1="46" y1="62" x2="78" y2="62" stroke-width="12"/><line x1="108" y1="44" x2="138" y2="44" stroke-width="12"/></g>'''
G='#34C25C'; W='#FFFFFF'
def page(size, body):
    return f'<!doctype html><html><head><style>html,body{{margin:0;padding:0;background:transparent;overflow:hidden}}svg{{display:block}}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">{body}</svg></body></html>'
jobs = {}
# iOS/master icon: full square green (Apple rounds), symbol at the exact app-icon.svg scale/position.
s = 1024/180
jobs['icon'] = (1024, f'<rect width="1024" height="1024" fill="{G}"/><g transform="scale({s})"><g transform="translate(22 18) scale(.76)">{MARK.format(c=W)}</g></g>')
# Adaptive foreground: the 180-unit icon maps to the visible 72dp of the 108dp canvas (center 66.7%).
v = 1024*72/108; o = (1024-v)/2
jobs['icon_foreground'] = (1024, f'<g transform="translate({o} {o}) scale({v/180})"><g transform="translate(22 18) scale(.76)">{MARK.format(c=W)}</g></g>')
# Splash: mark box 576px (180 units) with the mark bbox (12..168, 38..160 -> center 90,99) centered on 1152.
k = 576/180; tx = 576 - 90*k; ty = 576 - 99*k
for name in ['splash','splash_dark','splash_android12','splash_android12_dark']:
    jobs[name] = (1152, f'<g transform="translate({tx} {ty}) scale({k})">{MARK.format(c=G)}</g>')
chrome = os.environ.get('CHROME', r'C:\Program Files\Google\Chrome\Application\chrome.exe')
out = os.path.abspath(sys.argv[1])
tmp = tempfile.mkdtemp()
for name,(size,body) in jobs.items():
    html = os.path.join(tmp, f'{name}.html')
    open(html,'w').write(page(size, body))
    png = os.path.join(out, f'{name}.png')
    subprocess.run([chrome,'--headless=new','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--default-background-color=00000000',f'--window-size={size},{size}',f'--screenshot={png}',pathlib.Path(html).as_uri()],check=True,capture_output=True)
    print(name, 'ok')
