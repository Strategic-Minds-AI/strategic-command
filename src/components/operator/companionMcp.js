export const companionMcp = String.raw`
def tool(name,description,properties=None,required=None):
    return {'name':name,'description':description,'inputSchema':{'type':'object','properties':properties or {},'required':required or []}}
S={'type':'string'}; I={'type':'integer'}
TOOLS=[
 tool('screen_info','Get primary-screen dimensions and mouse position.'),
 tool('screenshot','Observe the primary desktop. Returns an image plus original and resized dimensions. Convert image coordinates to original screen coordinates before clicking.'),
 tool('click','Click a primary-screen coordinate. Requires --allow-input.',{'x':I,'y':I,'button':{'type':'string','enum':['left','right','middle']}},['x','y']),
 tool('type_text','Type up to 1000 ASCII characters into the focused application. Requires --allow-input.',{'text':S},['text']),
 tool('press_key','Press up to 4 PyAutoGUI key names joined with +, e.g. ctrl+l. Requires --allow-input.',{'keys':S},['keys']),
 tool('scroll','Scroll between -30 and 30 notches. Requires --allow-input.',{'amount':I},['amount']),
 tool('open_url','Open an HTTP(S) URL in the local default browser. Requires --allow-input.',{'url':S},['url']),
 tool('browser_health','Check the configured Cloud Browser engine. Requires local OPERATOR_BROWSER_URL and OPERATOR_BROWSER_KEY.'),
 tool('browser_start','Start a session in the configured Cloud Browser engine.'),
 tool('browser_action','Run a bounded browser action in an existing session.',{'session_id':S,'action_type':{'type':'string','enum':['goto','click','fill','press','scroll']},'selector':S,'value':S},['session_id','action_type']),
 tool('browser_screenshot','Observe a Cloud Browser session. Returns an MCP image.',{'session_id':S},['session_id']),
 tool('browser_close','Close an existing Cloud Browser session.',{'session_id':S},['session_id'])]
def run_mcp():
    names={t['name'] for t in TOOLS}
    for line in sys.stdin:
        request=None
        try:
            if len(line)>100000: raise ValueError('Request too large.')
            request=json.loads(line)
            if not isinstance(request,dict): raise ValueError('Object required.')
            if 'id' not in request: continue
            method=request.get('method'); params=request.get('params') or {}
            if method=='initialize':
                version=params.get('protocolVersion')
                if version not in ('2024-11-05','2025-03-26','2025-06-18'): version='2024-11-05'
                result={'protocolVersion':version,'capabilities':{'tools':{}},'serverInfo':{'name':'xtreme-operator','version':'1.0.0'}}
            elif method=='ping': result={}
            elif method=='tools/list': result={'tools':TOOLS}
            elif method=='tools/call':
                try:
                    name=params.get('name')
                    if name not in names: raise ValueError('Unknown tool.')
                    value=execute(name,params.get('arguments') or {})
                    if name in ('screenshot','browser_screenshot'):
                        image=value.get('image') or value.get('base64')
                        if not image: raise RuntimeError('No screenshot returned.')
                        metadata={k:v for k,v in value.items() if k not in ('image','base64')}
                        result={'content':[{'type':'text','text':json.dumps(metadata)},{'type':'image','mimeType':value.get('mimeType','image/png'),'data':image}]}
                    else: result={'content':[{'type':'text','text':json.dumps(value)}]}
                except Exception as error:
                    result={'isError':True,'content':[{'type':'text','text':str(error)[:1000]}]}
                    if type(error).__name__=='FailSafeException':
                        print(json.dumps({'jsonrpc':'2.0','id':request['id'],'result':result}),flush=True); return
            else:
                print(json.dumps({'jsonrpc':'2.0','id':request['id'],'error':{'code':-32601,'message':'Method not found'}}),flush=True); continue
            print(json.dumps({'jsonrpc':'2.0','id':request['id'],'result':result}),flush=True)
        except Exception as error:
            print(json.dumps({'jsonrpc':'2.0','id':request.get('id') if isinstance(request,dict) else None,'error':{'code':-32600,'message':str(error)[:300]}}),flush=True)
def main():
    global ALLOW_INPUT
    parser=argparse.ArgumentParser(description='User-approved desktop control and local MCP server.')
    parser.add_argument('--worker',action='store_true'); parser.add_argument('--mcp',action='store_true'); parser.add_argument('--allow-input',action='store_true')
    parser.add_argument('--config',default=str(ROOT/'operator-device.json')); parser.add_argument('--print-mcp-config',action='store_true')
    args=parser.parse_args(); ALLOW_INPUT=args.allow_input
    if pathlib.Path(args.config).is_file():
        local_config=json.loads(pathlib.Path(args.config).read_text())
        if local_config.get('browser_url'): os.environ.setdefault('OPERATOR_BROWSER_URL',local_config['browser_url'])
        if local_config.get('browser_key'): os.environ.setdefault('OPERATOR_BROWSER_KEY',local_config['browser_key'])
    if args.print_mcp_config:
        print(json.dumps({'mcpServers':{'xtreme-operator':{'command':sys.executable,'args':[str(pathlib.Path(__file__).resolve()),'--mcp']+(['--allow-input'] if ALLOW_INPUT else [])}}},indent=2)); return
    if ALLOW_INPUT: print('Mouse and keyboard control is enabled. Agents can act with your desktop permissions. Do not leave sensitive apps open unnecessarily.',file=sys.stderr)
    if args.mcp: run_mcp()
    elif args.worker: run_worker(args.config)
    else: parser.print_help()
if __name__=='__main__': main()
`;