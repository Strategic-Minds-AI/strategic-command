export const companionWorker = String.raw`
def run_worker(config_path):
    config=json.loads(pathlib.Path(config_path).read_text())
    endpoint=config.get('endpoint',''); token=config.get('token',''); device=config.get('device_id','')
    parsed=urllib.parse.urlparse(endpoint)
    if parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password: raise ValueError('The app endpoint must be HTTPS.')
    if not re.fullmatch(r'[a-f0-9]{64}',token): raise ValueError('Invalid pairing token. Download a new pairing from the app.')
    gui()  # Fail visibly if this machine has no usable desktop.
    database=sqlite3.connect(str(ROOT/'operator-receipts.sqlite3'))
    database.execute('CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, success INTEGER, result TEXT, reported INTEGER DEFAULT 0, lease TEXT)'); database.commit()
    if 'lease' not in [r[1] for r in database.execute('PRAGMA table_info(receipts)')]: database.execute('ALTER TABLE receipts ADD COLUMN lease TEXT'); database.commit()
    def call(operation, **values):
        return http(endpoint,{'operation':operation,'device_id':device,**values},{'x-operator-token':token})
    print('Operator connected to configured workspace. Ctrl+C stops this process. Move mouse to a screen corner for emergency stop.',file=sys.stderr)
    failures=0
    while True:
        try:
            for saved_id,saved_success,saved_result,saved_lease in database.execute('SELECT id,success,result,lease FROM receipts WHERE reported=0 AND lease IS NOT NULL').fetchall():
                try:
                    call('complete',command_id=saved_id,lease=saved_lease,success=bool(saved_success),uncertain=saved_result.startswith('Execution started;'),result=saved_result)
                    database.execute('UPDATE receipts SET reported=1 WHERE id=?',(saved_id,)); database.commit()
                except Exception as error:
                    if str(error).startswith(('HTTP 401:','HTTP 403:','HTTP 404:')): raise
                    break
            response=call('poll',platform=platform.system(),input_allowed=ALLOW_INPUT,browser_configured=bool(os.environ.get('OPERATOR_BROWSER_URL') and os.environ.get('OPERATOR_BROWSER_KEY')))
            command=response.get('command')
            if command:
                cid=command['id']; lease=command['lease']
                previous=database.execute('SELECT success,result FROM receipts WHERE id=?',(cid,)).fetchone()
                if previous: success,result=previous
                else:
                    allowed=call('authorize',command_id=cid,lease=lease).get('allowed')
                    if not allowed: success,result=0,'Device paused, command expired, or access revoked before execution.'
                    else:
                        database.execute('INSERT INTO receipts(id,success,result,lease) VALUES(?,?,?,?)',(cid,0,'Execution started; result unknown. Inspect before repeating.',lease)); database.commit()
                        print('Running '+command['action']+' ('+cid+')',file=sys.stderr)
                        try:
                            result=json.dumps(execute(command['action'],command.get('arguments',{})),ensure_ascii=True)[:4900]; success=1
                        except Exception as error:
                            success=0; result=str(error)[:4900]
                            if type(error).__name__=='FailSafeException':
                                call('complete',command_id=cid,lease=lease,success=False,result='Emergency mouse-corner stop. Companion exited.')
                                print('Emergency stop activated.',file=sys.stderr); return
                    database.execute('INSERT OR REPLACE INTO receipts(id,success,result,reported,lease) VALUES(?,?,?,0,?)',(cid,success,result,lease)); database.commit()
                # Never retry the desktop action if delivery of its receipt fails.
                for attempt in range(5):
                    try:
                        call('complete',command_id=cid,lease=lease,success=bool(success),result=result)
                        database.execute('UPDATE receipts SET reported=1 WHERE id=?',(cid,)); database.commit(); break
                    except Exception:
                        if attempt==4: raise
                        time.sleep(2)
            failures=0; time.sleep(5)
        except KeyboardInterrupt: print('Operator stopped.',file=sys.stderr); return
        except Exception as error:
            failures+=1; print('Connection warning: '+str(error)[:500],file=sys.stderr)
            if str(error).startswith('HTTP 401:'): print('Pairing expired or revoked. Create a new pairing.',file=sys.stderr); return
            time.sleep(min(60,5*failures))
`;