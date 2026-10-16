"""Opt-in deployment check of provider connectivity. No user data or secrets logged."""
import json
import os
import urllib.error
import urllib.request

def run():
    if os.environ.get('SEARCH_DIAGNOSTICS') != 'true': return
    token=os.environ.get('TAVILY_API_KEY','')
    if not token:
        print('Provider diagnostic: Tavily key missing',flush=True);return
    body=json.dumps({'query':'Blender official website','search_depth':'basic','max_results':1,'include_answer':False}).encode()
    request=urllib.request.Request('https://api.tavily.com/search',data=body,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json','User-Agent':'BookmarkSearch/1.0'})
    try:
        with urllib.request.urlopen(request,timeout=8) as response:
            data=json.load(response)
            print('Provider diagnostic: Tavily HTTP '+str(response.status)+' results='+str(len(data.get('results',[]))),flush=True)
    except urllib.error.HTTPError as error:
        print('Provider diagnostic: Tavily HTTP '+str(error.code),flush=True)
    except Exception as error:
        print('Provider diagnostic: Tavily '+type(error).__name__,flush=True)
