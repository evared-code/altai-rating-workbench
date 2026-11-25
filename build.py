import json,re
old=open('v1/index.html',encoding='utf-8').read().split('\n')
head='\n'.join(old[:old.index('</style>')])  # up to before </style>
ex_line=[l for l in old if l.startswith('const EXAMPLE = ')][0]
css=open('src/extra.css',encoding='utf-8').read()
body=open('src/body.html',encoding='utf-8').read()
app=open('src/app.js',encoding='utf-8').read()
data=json.load(open('data/altai-plan.json',encoding='utf-8'))
draft=json.load(open('data/holder-draft-326501.json',encoding='utf-8'))
out=head+'\n'+css+'</style>\n\n</head>\n<body>\n'+body+'''
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
<script>
const DATA = '''+json.dumps(data,ensure_ascii=False)+''';
const DRAFT = '''+json.dumps(draft,ensure_ascii=False)+''';
'''+ex_line+'\n'+app+'</script>\n\n</body>\n</html>\n'
open('index.html','w',encoding='utf-8').write(out)
print(len(out))
