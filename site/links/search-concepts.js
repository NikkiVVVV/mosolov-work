// Evidence-based vocabulary expansion; never invents catalog entries or features.
export function conceptQuery(query){
 return query.replace(/payment\s+(?:screen|page)|checkout\s+(?:screen|page)/gi,'оплата').replace(/плат[её]жн[а-я]*\s+экран[а-я]*/giu,'оплата').replace(/экран[а-я]*\s+оплат[а-я]*/giu,'оплата');
}
export function conceptTerms(word){
 if(/^оплат|^платеж|^payment|^checkout/.test(word))return ['оплат','платеж','payment','checkout','пейвол','paywall','тариф','pricing'];
 if(/^пейвол|^paywall/.test(word))return ['пейвол','paywall'];
 if(/^тариф|^pricing/.test(word))return ['тариф','pricing'];
 if(/^типог|^шрифт|^font|^typogra/.test(word))return ['типог','шрифт','font','typeface'];
 if(/^animation|^animated|^motion/.test(word))return ['анимац','animated','animation','motion'];
 if(/^tools?$/.test(word))return ['инструмент','tool'];
 if(/^references?$|^inspiration/.test(word))return ['реф','reference','inspiration'];
 if(/^interactive|^interaction/.test(word))return ['интерактив','interactive','interaction'];
 if(/^icons?/.test(word))return ['икон','icon'];
 if(/^cursor/.test(word))return ['курсор','cursor'];
 if(/^кирил|^cyril/.test(word))return ['кирил','cyril'];
 if(/^бесплат|^free/.test(word))return ['бесплат','free'];
 return [word];
}
