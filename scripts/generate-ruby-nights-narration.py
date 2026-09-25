"""Generate static narration using a local backend credential. Never writes credentials.
Usage: python3 scripts/generate-ruby-nights-narration.py [segment-id ...] [--manifest-only]
Requires ffmpeg; optional GEMINI_API_KEY overrides the local backend configuration.
"""
import base64, hashlib, json, os, re, subprocess, sys, tempfile, time, urllib.request, urllib.error
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
MODEL = 'gemini-3.1-flash-tts-preview'
VOICE = 'Charon'
STYLE = ('You are a warm adult male narrator sharing a personal project with a small friendly audience in a cafe. '
         'Speak clear conversational English with a gentle smile, natural pauses, and an unhurried pace around 135 words per minute. '
         'Be modest, sincere and relaxed, never promotional or theatrical. Keep a consistent natural male voice. '
         'Pronounce Bantera as ban-TEH-rah. Read only the transcript, exactly as written. Do not read these instructions. ')
segments = json.loads((ROOT/'scripts/ruby-nights-narration.json').read_text())
def fingerprint_for(segment):
    return hashlib.sha256((MODEL+VOICE+STYLE+json.dumps(segment,sort_keys=True)).encode()).hexdigest()

output = ROOT/'public/ruby-nights/narration'
output.mkdir(parents=True, exist_ok=True)
manifest_only = '--manifest-only' in sys.argv
key = os.environ.get('GEMINI_API_KEY')
if not key and not manifest_only:
    config = json.loads((ROOT.parent/'backend/BanteraApi/appsettings.Development.json').read_text())
    key = next(k for k in config['Gemini']['ApiKeys'] if k.startswith('AIza'))
selected = set(sys.argv[1:]) - {'--manifest-only'}
unknown = selected - {seg['id'] for seg in segments}
if unknown: raise SystemExit('Unknown segment IDs: '+', '.join(sorted(unknown)))
for seg in segments:
    if manifest_only or seg.get('kind') == 'video' or (selected and seg['id'] not in selected): continue
    dest = output/(seg['id']+'.mp3')
    fingerprint = fingerprint_for(seg)
    stamp = output/(seg['id']+'.sha256')
    if dest.exists() and stamp.exists() and stamp.read_text()==fingerprint:
        print('Cached:',seg['id'],flush=True); continue
    prompt = (seg.get('direction') or STYLE)+'\n\nTRANSCRIPT:\n'+seg['text']
    body={'contents':[{'parts':[{'text':prompt}]}], 'generationConfig':{'responseModalities':['AUDIO'],'speechConfig':{'voiceConfig':{'prebuiltVoiceConfig':{'voiceName':VOICE}}}}}
    data = None
    for attempt in range(4):
        req=urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/'+MODEL+':generateContent', data=json.dumps(body).encode(),headers={'Content-Type':'application/json','x-goog-api-key':key})
        try:
            data=json.load(urllib.request.urlopen(req,timeout=180)); break
        except urllib.error.HTTPError as e:
            print('Generation status',e.code,'for',seg['id'],flush=True)
            error=json.loads(e.read()).get('error',{})
            message=error.get('message','').replace(key,'[REDACTED]')
            print(message[:1600],flush=True)
            for detail in error.get('details',[]):
                if detail.get('@type','').endswith(('QuotaFailure','RetryInfo')): print(json.dumps(detail).replace(key,'[REDACTED]'),flush=True)
            if any('PerDay' in violation.get('quotaId','') for detail in error.get('details',[]) for violation in detail.get('violations',[])):
                raise SystemExit('Daily quota exhausted. Retry after the provider resets the quota.')
            if e.code not in (429,500,502,503,504) or attempt==3: raise SystemExit('Generation stopped; no credentials logged.')
            retry = next((d.get('retryDelay') for d in error.get('details',[]) if d.get('@type','').endswith('RetryInfo')), None)
            delay = float(retry.rstrip('s')) + 1 if retry else min(15*(attempt+1),45)
            if delay > 60: raise SystemExit('Provider requires a longer wait. Retry generation later.')
            time.sleep(delay)
        except (TimeoutError, OSError):
            if attempt==3: raise SystemExit('Generation timed out; retry the segment.')
            time.sleep(5)
    parts=data.get('candidates',[{}])[0].get('content',{}).get('parts',[])
    inline=next((p['inlineData'] for p in parts if 'inlineData' in p),None)
    if not inline: raise SystemExit('No audio returned for '+seg['id'])
    pcm=base64.b64decode(inline['data'])
    rate=int(re.search(r'rate=(\d+)',inline.get('mimeType','')).group(1)) if 'rate=' in inline.get('mimeType','') else 24000
    with tempfile.TemporaryDirectory(prefix='bantera-narration-') as tmp:
        raw=Path(tmp)/'audio.pcm'; raw.write_bytes(pcm)
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','s16le','-ar',str(rate),'-ac','1','-i',str(raw),'-af','loudnorm=I=-18:TP=-2:LRA=9','-c:a','libmp3lame','-b:a','96k',str(dest)],check=True)
    stamp.write_text(fingerprint)
    print('Generated:',seg['id'],dest.stat().st_size,'bytes',flush=True)
# Public manifest contains only text, URLs, durations and cues, never credentials.
missing = [seg['id'] for seg in segments if seg.get('kind') != 'video' and not (output/(seg['id']+'.mp3')).exists()]
if missing: print('Remaining recordings: '+', '.join(missing), flush=True)
manifest=[]
for seg in segments:
    item={k:v for k,v in seg.items() if k not in ('direction','effect')}
    if seg.get('kind')!='video':
        dest=output/(seg['id']+'.mp3')
        stamp=output/(seg['id']+'.sha256')
        fingerprint=fingerprint_for(seg)
        if not dest.exists() or not stamp.exists() or stamp.read_text()!=fingerprint:
            item.update(kind='audio',available=False)
            manifest.append(item)
            continue
        duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(dest)]))
        if duration<0.5: raise SystemExit('Audio unexpectedly short: '+seg['id'])
        item.update(kind='audio',src='/ruby-nights/narration/'+dest.name+'?v='+fingerprint[:12],duration=round(duration,3))
    manifest.append(item)
(ROOT/'src/app/ruby-nights/narration.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Manifest:',len(manifest),'segments',flush=True)
