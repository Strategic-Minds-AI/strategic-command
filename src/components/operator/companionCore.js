export const companionCore = String.raw`#!/usr/bin/env python3
"""Strategic operator. Explicit desktop permission; no shell execution tool."""
import argparse, base64, datetime, getpass, io, json, os, pathlib, platform, re, sqlite3, sys, time, urllib.request, urllib.error, urllib.parse, webbrowser
ROOT = pathlib.Path(__file__).resolve().parent
ALLOW_INPUT = False
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError('Redirect refused. Use the service\'s final HTTPS address.')
def http(url, payload=None, headers=None, method=None):
    request = urllib.request.Request(url, data=None if payload is None else json.dumps(payload).encode(), headers={'Content-Type':'application/json', **(headers or {})}, method=method)
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=40) as response:
            raw = response.read(8*1024*1024+1)
            if len(raw)>8*1024*1024: raise RuntimeError('Response exceeds 8 MB.')
            result=json.loads(raw)
            if isinstance(result,dict) and result.get('error'): raise RuntimeError(str(result['error'])[:500])
            return result
    except urllib.error.HTTPError as error:
        message=error.read(2000).decode(errors='replace')
        raise RuntimeError('HTTP '+str(error.code)+': '+message[:500]) from None
def gui():
    import pyautogui
    pyautogui.FAILSAFE=True
    pyautogui.PAUSE=0.25
    return pyautogui
def number(value, low, high):
    if isinstance(value,bool) or not isinstance(value,int) or not low<=value<=high: raise ValueError('Coordinate or amount outside allowed range.')
    return value
def text(value, maximum=1000):
    if not isinstance(value,str) or not 1<=len(value)<=maximum: raise ValueError('Missing text or text too long.')
    return value
def safe_url(value):
    value=text(value,2000); parsed=urllib.parse.urlparse(value)
    if parsed.scheme not in ('http','https') or not parsed.hostname or parsed.username or parsed.password: raise ValueError('Use HTTP(S) without embedded credentials.')
    return value
def browser(action, args):
    url=os.environ.get('OPERATOR_BROWSER_URL','').rstrip('/')
    key=os.environ.get('OPERATOR_BROWSER_KEY','')
    if not url or not key: raise RuntimeError('Set OPERATOR_BROWSER_URL and OPERATOR_BROWSER_KEY locally for the supplied Cloud Browser engine.')
    parsed=urllib.parse.urlparse(url)
    if parsed.scheme!='https' and not (parsed.scheme=='http' and parsed.hostname in ('127.0.0.1','localhost','::1')): raise ValueError('Browser engine requires HTTPS, except localhost.')
    headers={'x-api-key':key}
    if action=='browser_health': return http(url+'/health',headers=headers)
    if action=='browser_start': return http(url+'/sessions',{},headers)
    sid=text(args.get('session_id'),100)
    if not re.fullmatch(r'[a-zA-Z0-9_-]+',sid): raise ValueError('Invalid session ID.')
    if action=='browser_close': return http(url+'/sessions/'+sid,headers=headers,method='DELETE')
    if action=='browser_screenshot': data={'action_type':'screenshot'}
    else:
        kind=args.get('action_type')
        if kind not in ('goto','click','fill','press','scroll'): raise ValueError('Unsupported browser action.')
        data={'action_type':kind,'options':{'timeout':15000}}
        if kind in ('click','fill'): data['selector']=text(args.get('selector'),500)
        if kind in ('goto','fill','press','scroll'): data['value']=safe_url(args.get('value')) if kind=='goto' else text(args.get('value'))
    return http(url+'/sessions/'+sid+'/execute',data,headers)
def execute(action, args):
    if not isinstance(args,dict): raise ValueError('Arguments must be an object.')
    if action.startswith('browser_'): return browser(action,args)
    p=gui()
    if action=='screen_info':
        size=p.size(); position=p.position()
        return {'width':size.width,'height':size.height,'cursor_x':position.x,'cursor_y':position.y,'platform':platform.system(),'input_allowed':ALLOW_INPUT}
    if action=='screenshot':
        image=p.screenshot(); original=list(image.size); image.thumbnail((1600,1200)); output=io.BytesIO(); image.convert('RGB').save(output,format='JPEG',quality=80)
        return {'image':base64.b64encode(output.getvalue()).decode(),'mimeType':'image/jpeg','original_size':original,'image_size':list(image.size)}
    if not ALLOW_INPUT: raise PermissionError('Input control is disabled. Relaunch with --allow-input only if you approve mouse and keyboard control.')
    if action=='click':
        size=p.size(); x=number(args.get('x'),0,size.width-1); y=number(args.get('y'),0,size.height-1); button=args.get('button','left')
        if button not in ('left','right','middle'): raise ValueError('Invalid button.')
        p.click(x,y,button=button)
    elif action=='type_text':
        value=text(args.get('text'))
        if any(ord(c)>127 for c in value): raise ValueError('Desktop typing supports ASCII only. Use browser fill for Unicode text.')
        p.write(value,interval=0.01)
    elif action=='press_key':
        keys=text(args.get('keys'),100).lower().split('+')
        if not 1<=len(keys)<=4 or any(k not in p.KEYBOARD_KEYS for k in keys): raise ValueError('Unknown key. Use PyAutoGUI names, e.g. ctrl+l or enter.')
        p.hotkey(*keys)
    elif action=='scroll': p.scroll(number(args.get('amount'),-30,30))
    elif action=='open_url':
        if not webbrowser.open(safe_url(args.get('url')),new=2): raise RuntimeError('The operating system did not open the URL.')
    else: raise ValueError('Unsupported action.')
    return {'ok':True,'action':action}
`;