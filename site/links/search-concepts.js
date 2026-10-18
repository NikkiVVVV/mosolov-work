// Evidence-based vocabulary expansion; never invents catalog entries or features.
export function conceptQuery(query){
 return query.replace(/плат[её]жн[а-я]*\s+экран[а-я]*/giu,'оплата').replace(/экран[а-я]*\s+оплат[а-я]*/giu,'оплата');
}
export function conceptTerms(word){
 if(/^оплат|^платеж|^payment|^checkout/.test(word))return ['оплат','платеж','payment','checkout','пейвол','paywall','тариф','pricing'];
 if(/^пейвол|^paywall/.test(word))return ['пейвол','paywall'];
 if(/^тариф|^pricing/.test(word))return ['тариф','pricing'];
 if(/^типог|^шрифт|^font/.test(word))return ['типог','шрифт','font','typeface'];
 if(/^кирил|^cyril/.test(word))return ['кирил','cyril'];
 if(/^бесплат|^free/.test(word))return ['бесплат','free'];
 return [word];
}
