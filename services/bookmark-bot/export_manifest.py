"""Export confirmed bot entries for the existing reviewed catalog publication pipeline."""
import argparse
import datetime
import json
from store import Store

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('database')
    args=parser.parse_args()
    items=Store(args.database).items()
    print(json.dumps({'reviewedAt':datetime.date.today().isoformat(),
        'source':'User-confirmed Telegram bot imports; review URLs before public publication.',
        'groups':{'bot':[]},'items':[{'url':i['url'],'name':i['title'],'group':'bot',
        'ru':i['ownerNote'],'en':i['noteEN'],'tags':i['tags']} for i in items]},ensure_ascii=False,indent=2))

if __name__=='__main__':
    main()
