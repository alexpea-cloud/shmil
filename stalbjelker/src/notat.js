// notat.js – bygger beregningsnotatet (rev. 11) som .docx fra results.json og figurene i build/fig.
// Bruk: node notat.js <ut.docx>
const path = require('path');
const fs = require('fs');
const D = require('./doclib');
const { proj, fmt, pct, rng, P, H1, H2, H3, bullets, numbered, tbl, calc, kv, figure, spacer, pageBreak, callout, makeDoc, save,
  GREEN, AMBER, RED, INK2, AlignmentType } = D;

const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'results.json'), 'utf8'));
const FIG = path.join(__dirname, '..', 'build', 'fig');
const out = process.argv[2] || path.join(__dirname, '..', 'build', 'beregningsnotat.docx');

const b1 = R.B1, b1s = R.B1_sens, b2 = R.B2, b2t = R.B2_terrace, rob = R.robust, sn = R.snow, sec = R.section, sup = R.supports;
const W = 9410;                                   // tekstbredde i DXA (166 mm)
const OK = (t = 'OK') => ({ t, color: GREEN, bold: true, align: 'l' });
const FOR = (t) => ({ t, color: AMBER, bold: true, align: 'l' });
const ND = (t = 'Ikke dokumentert') => ({ t, color: RED, bold: true, align: 'l' });

const dl = b2.design_loads;
const L = (pred) => dl.find(pred);
const lFloor = L((d) => d.type === 'udl' && Math.abs(d.x1 - 0.10) < 1e-6);
const lSelf = L((d) => d.type === 'udl' && d.x1 === 0);
const lStair = L((d) => d.type === 'pt' && Math.abs(d.x1 - 1.20) < 1e-6);
const lGable = L((d) => d.type === 'pt' && Math.abs(d.x1 - 2.25) < 1e-6);
const lJoist = L((d) => d.type === 'pt' && Math.abs(d.x1 - 2.55) < 1e-6);

const c = [];                                     // dokumentinnhold

// ===================================================================== forside
c.push(P('BEREGNINGSNOTAT', { size: 17, bold: true, color: INK2, after: 40 }));
c.push(P('Stålbjelker B1 og B2 i 1. etasje', { size: 40, bold: true, after: 40 }));
c.push(P('Etterregning av bæreevne, nedbøyning og opplegg – konstruksjon utført i 2018', { size: 22, color: INK2, after: 200 }));
c.push(kv([
  ['Eiendom', `${proj('eiendom')} · ${proj('gnr_bnr')} · ${proj('kommune')}`],
  ['Tiltakshaver', proj('tiltakshaver')],
  ['Kommunens sak', proj('sak')],
  ['Gjelder', 'To stålbjelker IPE 180 som i 2018 erstattet bærende vegger: B1 ved kjøkkenet og B2 i gangen ved trappeåpningen. Bjelker, opplegg og videre lastføring.'],
  ['Tegninger', 'S-01, S-02 og S-03, rev. 11 (plan 1:50, snitt 1:20, detaljer 1:10)'],
  ['Revisjon', 'Rev. 11 · 10.11.2026 · erstatter tiltakshavers utkast rev. 10'],
  ['Status', '**Utkast til gjennomgang.** Overslagsberegning – ikke prosjektering med ansvarsrett. Ikke signert.'],
]));
c.push(spacer(160));

// ===================================================================== sammendrag
c.push(H1('Sammendrag'));
c.push(P('I 2018 ble to bærende vegger i 1. etasje erstattet med stålbjelker IPE 180: B1 ved kjøkkenet (spenn 3,63 m) og B2 i gangen ved trappeåpningen (spenn 3,40 m). Notatet etterregner bjelkene og oppleggene slik de er utført, etter Eurokodene med norske nasjonale tillegg. Grunnlaget er tiltakshavers oppmåling og tegning S-01 til S-03.'));
c.push(tbl([
  ['Kontroll', 'B1 kjøkken', 'B2 gang', 'Status'],
  ['Bøyemoment, M_{Ed} / M_{Rd}', `${fmt(b1.MEd, 1)} / ${fmt(sec.MRd_el, 1)} kNm = ${pct(b1.util_M)}`, `${fmt(b2.MEd, 1)} / ${fmt(sec.MRd_el, 1)} kNm = ${pct(b2.util_M)}`, FOR('OK – forutsetter fastholdt overflens')],
  ['Skjærkraft, V_{Ed} / V_{Rd}', `${fmt(b1.VEd, 1)} / ${fmt(sec.VRd, 0)} kN = ${pct(b1.util_V)}`, `${fmt(b2.VEd, 1)} / ${fmt(sec.VRd, 0)} kN = ${pct(b2.util_V)}`, OK()],
  ['Nedbøyning (grense L/300)', `${fmt(b1.delta_gq, 1)} mm = L/${fmt(b1.L_over_delta, 0)}`, `${fmt(b2.delta_gq, 1)} mm = L/${fmt(b2.L_over_delta, 0)}`, OK()],
  ['Følsomhet (se kap. 5.2 og 6.4)', `${pct(b1s.util_M)} ved full kontinuitet i bjelkelaget`, `${pct(rob.roof_strip.util)} med takstripe på gavlveggen`, OK()],
  ['Stålbjelkens steg ved opplegg', pct(b1.VEd / sup.web.FRd), pct(b2.RB / sup.web.FRd), OK()],
  ['Stendere under bjelkeendene', rng(sup.studs.B1_wall.C24.util_strong, sup.studs.B1_pipe.C24.util_strong), rng(sup.studs.B2_wall.C24.util_strong, sup.studs.B2_col.C24.util_strong), FOR('OK – forutsetter C24 og fastholdte stendere')],
  ['Trykk mot tømmerstokk over grunnmur (O2, O3)', pct(sup.c90.B1_wall.C24.util), pct(sup.c90.B2_wall.C24.util), FOR('OK – forutsetter C24')],
  ['Trykk vinkelrett på fiber i gulvbjelke (O1, O4)', 'trykkflate ikke målt', 'trykkflate ikke målt', ND()],
  ['Betongkloss (O1); stolpesko, betongsøyle og fundament (O4)', 'underlag ukjent', 'type og fundament ukjent', ND()],
], [2950, 2150, 2150, 2160], { align: ['l', 'l', 'l', 'l'], size: 17 }));
c.push(spacer(120));
c.push(H3('Hva beregningen viser'));
c.push(...bullets([
  `Begge stålbjelkene har kapasitet i bøyning og skjær med god margin. Utnyttelsen er ${pct(b1.util_M)} (B1) og ${pct(b2.util_M)} (B2) av elastisk momentkapasitet, og nedbøyningene er ${fmt(b2.util_delta * 100, 0)}–${fmt(b1.util_delta * 100, 0)} % av kontrollgrensen L/300.`,
  `Marginen holder også i følsomhetsregningene: full kontinuitet i bjelkelaget over B1 gir ${pct(b1s.util_M)}, og en takstripe på gavlveggen over B2 gir ${pct(rob.roof_strip.util)}.`,
  `Resultatene forutsetter at treverket som ligger på overflensen holder bjelkene sideveis. Uten slik fastholding er vippekapasiteten omtrent lik lasten (${rng(b2.util_ltb_6323, b1.util_ltb_6322)}). Forutsetningen er vurdert i kapittel 8 og står som kontrollpunkt.`,
  'Stålbjelkens steg, stenderne og tømmerstokken over grunnmuren har kapasitet under de angitte antakelsene.',
]));
c.push(H3('Hva som ikke er dokumentert'));
c.push(...bullets([
  'Trykk vinkelrett på fiber i gulvbjelken under stenderne ved O1 (ved pipa) og O4 (ved betongsøylen). Regnestykket krever en større trykkflate enn gulvbjelkens 48 mm bredde alene gir. Om kubbinger eller svill fordeler lasten, er ikke målt.',
  'Stolpesko, betongsøyle og fundament ved O4, og betongklossens underlag ved O1.',
  'Stålkvalitet (S235 er forutsatt) og trevirkets fasthetsklasse (C24 er forutsatt).',
]));
c.push(P('Kapittel 10 lister kontrollpunktene som kan lukke disse forholdene ved en befaring. Notatet konkluderer ikke for de delene som ikke er dokumentert.'));

// ===================================================================== 1
c.push(H1('1  Bakgrunn og avgrensning'));
c.push(P('Notatet gjelder de to stålbjelkene som ble montert i 2018 da to bærende vegger i 1. etasje ble fjernet (punkt 1.5 og 1.6 i redegjørelsen F1 til søknaden 18.10.2026). Arbeidene søkes godkjent i ettertid.'));
c.push(P('Notatet er en etterregning av konstruksjonen slik den står. Det bygger på:'));
c.push(...bullets([
  'tiltakshavers oppmåling og opplysninger om oppbygning og lastveier,',
  `observasjoner fra ${proj('befaring', 'befaring 03.11.2026 med fagutdannet tømrer')} om lastveier og takets konstruksjon,`,
  'tegning S-01, S-02 og S-03, rev. 11.',
]));
c.push(P('Notatet er ikke en prosjektering med ansvarsrett og ikke en uavhengig kontroll. Tallene er overslag som skal kunne etterprøves linje for linje. Mål merket «ca.» er ikke kontrollmålt. Der en opplysning er antatt og ikke dokumentert, står det uttrykkelig.'));
c.push(P('Beregningene er satt opp i 2026. De er ikke de samme som lå til grunn da bjelkene ble valgt i 2018. Hvem som bidro den gangen, er beskrevet i en egen redegjørelse.'));

// ===================================================================== 2
c.push(H1('2  Konstruksjon og lastveier'));
c.push(H2('2.1  Før og etter 2018'));
c.push(P('Før 2018 sto det bærende vegger der bjelkene ligger i dag, og en hjørnestolpe under gavlveggen i 2. etasje. Bjelkene samler den lasten veggene bar, og fører den ned i to opplegg hver. Utskiftingen tilfører ikke ny last utover bjelkenes egenvekt. Lasten er flyttet fra jevnt fordelt langs veggene til fire oppleggspunkter, O1 til O4.'));
c.push(H2('2.2  B1 – kjøkkenbjelke'));
c.push(P('B1 er en IPE 180 med spenn 3,63 m mellom oppleggssentrene. Bjelkelaget i 2. etasje ligger oppå overflensen, på tvers av bjelken. Det er 3,60 m fra ytterveggen til B1 og 1,50 m fra B1 til bodveggen i 1. etasje. Bjelkelaget består av eldre gulvbjelker og fire nye bjelker fra 2018 som går fra ytterveggen til ca. 0,5 m forbi B1.'));
c.push(...bullets([
  '**O1, ved teglsteinspipa:** to stendere 48 × 98 mm, skrudd fast i pipa, med 98 mm opplegg for bjelken. Stenderne står på en gulvbjelke 48 × 196 mm, som ligger på en IPN 200 i krypkjelleren. IPN-en hviler på en betongkloss. Lastpunktet ligger ca. 0,60 m inne på den 0,90 m lange klossen.',
  '**O2, mot grunnmuren:** to stendere 48 × 148 mm i den tidligere døråpningen i tømmerveggen (98 mm opplegg og 50 mm videre inn i veggen). Stenderne står på en tømmerstokk 148 × 148 mm rett over grunnmuren, som er ca. 0,25 m bred.',
]));
c.push(H2('2.3  B2 – gangbjelke'));
c.push(P('B2 er en IPE 180 med spenn 3,40 m. Avstanden x regnes fra oppleggssenteret ved grunnmuren (O3). B2 får bare last fra det som ligger på den:'));
c.push(...bullets([
  'gulvet i 2. etasje fra badsiden, via trappevekslingen som ligger på B2 langs trappeåpningen (x = 0,10–2,10 m). Ellers i gangen ligger bjelkene på veggene,',
  'trappa, som punktlast ved x = 1,20 m,',
  'egenvekten av gavlveggen i 2. etasje ved x ≈ 2,25 m, der den opprinnelige hjørnestolpen sto,',
  'to takbjelker under takterrassen, ved x = 2,55 og 3,15 m. Resten av terrassen bæres av veggene.',
]));
c.push(...bullets([
  '**O3, mot grunnmuren:** som O2 – to stendere 48 × 148 mm på tømmerstokk 148 × 148 mm over grunnmuren.',
  '**O4, ved betongsøylen:** to stendere 48 × 98 mm, sidestøttet. De står på en gulvbjelke 48 × 196 mm med sidekubbinger. Under gulvbjelken ligger en stålplate (opplyst 400 mm) og en stolpesko på en betongsøyle, Ø ca. 200 mm, rett under stenderne.',
]));
c.push(P('Den opprinnelige hjørnestolpen ble fjernet i 2018. Målene 2,25 m og 1,15 m på tegningene viser hvor stolpen sto. De beskriver ikke dagens opplegg, og det er ingen utkraging i dag.'));
c.push(H2('2.4  Taket'));
c.push(P('Taket er et sperretak uten mønsås. Taksperrene over trappa har opplegg på en tidligere yttervegg i 2. etasje. Denne oppleggslinjen ligger 1,70 m fra B2, det vil si 0,20 m bak badveggen, og er vist på tegning S-01 og i prinsippsnitt C–C på S-03. Etter opplysningene går taklasten via denne veggen og ytterveggen, og ikke ned i B2. Bodveggen i 2. etasje over B1 er ved befaringen vurdert å ikke bære taklast. Taklast er derfor ikke regnet inn på bjelkene, men veggenes egenvekt er tatt med. Den videre lastveien fra den tidligere ytterveggen er ikke kontrollert.'));
c.push(...figure(path.join(FIG, 'fig_path.png'), 166, 'Figur 1  Lastveier fra bjelkeendene og ned, med dokumentasjonsstatus for hvert ledd.'));

// ===================================================================== 3
c.push(H1('3  Grunnlag og forutsetninger'));
c.push(P('Beregningene følger NS-EN 1990 (pålitelighet og lastkombinasjoner), NS-EN 1991-1-1 (egenlast og nyttelast), NS-EN 1991-1-3 (snølast), NS-EN 1993-1-1 og NS-EN 1993-1-5 (stål) og NS-EN 1995-1-1 (tre), alle med norske nasjonale tillegg (NA). Tallverdier fra de nasjonale tilleggene er hentet fra åpne kilder og bør kontrolleres mot gjeldende utgave av standardene ved gjennomgang.'));
c.push(tbl([
  ['Forutsetning', 'Verdi', 'Grunnlag', 'Status'],
  ['Stålprofil', 'IPE 180: W_{el} = 146,3 cm³, W_{pl} = 166,4 cm³, I_{y} = 1 317 cm⁴, A_{vz} = 11,25 cm², 18,8 kg/m', 'Profiltabell', { t: 'Profil opplyst', align: 'l' }],
  ['Stålkvalitet', 'S235, f_{y} = 235 N/mm², E = 210 000 N/mm²', 'Laveste vanlige konstruksjonsstål', FOR('Antatt')],
  ['Partialfaktorer stål', 'γ_{M0} = γ_{M1} = 1,05', 'NS-EN 1993-1-1 NA', { t: '–', align: 'l' }],
  ['Trevirke', 'C24; C18 vist som nedre kontroll. γ_{M} = 1,25. k_{mod} = 0,8 (nyttelast) og 0,9 (snø)', 'NS-EN 1995-1-1 NA, NS-EN 338', FOR('Antatt')],
  ['Spenn og opplegg', 'B1 3,63 m og B2 3,40 m senter–senter. Opplegg ca. 98 mm', 'Oppmåling', { t: 'Målt av tiltakshaver', align: 'l' }],
  ['Egenlast', 'Etasjeskille 1,2 kN/m². Takterrasse 1,2 kN/m²', 'Anslag for trebjelkelag med gulv og himling', FOR('Anslått')],
  ['Nyttelast', 'Bolig 2,0 kN/m², trapp 3,0 kN/m², takterrasse 4,0 kN/m²', 'NS-EN 1991-1-1 NA, tabell NA.6.2, kategori A', { t: '–', align: 'l' }],
  ['Snølast', `s_{k} = ${fmt(sn.sk, 1)} kN/m² (Vefsn; 4,0 for Mosjøen og langs fjorden). Fonn mot gavlvegg høyst γ·h = ${fmt(sn.peak)} kN/m²`, 'NS-EN 1991-1-3 NA og pkt. 5.3.6', { t: 'h = 3,72 m er målt ved mønet', align: 'l' }],
  ['Lastkombinasjon', '1,35 g_{k} + 1,5 q_{k}, all variabel last fullt samtidig', 'Forenklet øvre grense for NS-EN 1990 lign. 6.10a og 6.10b', OK('På sikker side')],
  ['Pålitelighetsklasse', '1 (enebolig). Reduksjonsfaktoren k_{FI} = 0,9 er ikke brukt', 'NS-EN 1990 NA', OK('Ubrukt reserve')],
  ['Nedbøyning', 'g_{k} + q_{k} mot L/300', 'Valgt kontrollgrense, ikke forskriftskrav', { t: 'Valgt', align: 'l' }],
  ['Statisk modell', 'Fritt opplagt bjelke, spenn mellom oppleggssentre', '–', OK('På sikker side')],
  ['Sideveis fastholding', 'Overflensen holdes av bjelkelag, veksling og takbjelker. Stenderne er sammenskrudd og sideveis fastholdt', 'Se kap. 8 og 7.3', FOR('Forutsetning – kontrollpunkt')],
], [1750, 3500, 2360, 1800], { align: ['l', 'l', 'l', 'l'], size: 17, boldFirstCol: true }));

// ===================================================================== 4
c.push(H1('4  Laster'));
c.push(H2('4.1  Egenlaster'));
c.push(...bullets([
  '**Etasjeskille og takterrasse:** 1,2 kN/m² (anslått). Terrasseverdien omfatter takbjelker, taktro, tekking, terrassebord og himling.',
  '**Bodvegg i 2. etasje over B1:** 0,5 kN/m på B1. Lettveggen står ca. 0,5 m inne på feltet på 1,50 m, så B1 får 1,0/1,5 = 2/3 av veggens vekt. 0,5 kN/m på B1 svarer til en vegg på 0,75 kN/m.',
  '**Gavlvegg i 2. etasje over B2:** 5,0 kN som punktlast (anslått). Kontroll av anslaget: 0,6 kN/m² · 3,72 m (full mønehøyde) · 1,97 m influenslengde = 4,4 kN.',
  `**Stålbjelkene:** ${fmt(sec.IPE180.g, 2)} kN/m.`,
]));
c.push(H2('4.2  Nyttelaster'));
c.push(...bullets([
  '**Gulv i bolig:** 2,0 kN/m².',
  '**Trapp:** 3,0 kN som punktlast på B2 (anslått). Kontroll av anslaget: øvre trappeløp er ca. 0,9 × 1,55 m, og halve løpet hviler mot vekslingen. 0,7 m² · (3,0 kN/m² nyttelast + 0,5 kN/m² egenvekt) ≈ 2,5 kN.',
  '**Takterrasse:** 4,0 kN/m², som balkong i kategori A. Nyttelast på terrassen regnes ikke samtidig med snø på samme flate (NS-EN 1991-1-1 pkt. 3.3.2).',
]));
c.push(H2('4.3  Snølast og snøfonn mot gavlveggen'));
c.push(P('Takterrassen ligger inntil gavlveggen i 2. etasje. Snø kan da legge seg som en fonn mot veggen, og lasten regnes etter NS-EN 1991-1-3 pkt. 5.3.6 (tak inntil høyere byggverk):'));
c.push(calc([
  ['Snølast på mark', `s_{k} = ${fmt(sn.sk, 1)} kN/m² for Vefsn (4,0 kN/m² for Mosjøen og langs fjorden), byggested under 150 moh.`],
  ['Jevnt fordelt på terrassen', `μ_{1} · s_{k} = 0,8 · ${fmt(sn.sk, 1)} = ${fmt(sn.base, 1)} kN/m²`],
  ['Formfaktor for fonn', `μ_{w} = (b_{1} + b_{2}) / (2h) = (11,0 + 4,1) / (2 · 3,72) = ${fmt(sn.mu_w_geo)}, men høyst γ · h / s_{k} = 2,0 · 3,72 / ${fmt(sn.sk, 1)} = ${fmt(sn.mu_w_cap)}`],
  ['Ras fra øvre tak', 'μ_{s} = 0. Mønet står vinkelrett på gavlveggen, så takflatene faller ikke mot terrassen.'],
  ['Last ved veggen', `μ_{2} · s_{k} = ${fmt(sn.mu2)} · ${fmt(sn.sk, 1)} = γ · h = **${fmt(sn.peak)} kN/m²**`],
  ['Fonnlengde', `l_{s} = 2h = ${fmt(sn.ls)} m. Lasten avtar lineært til ${fmt(sn.base, 1)} kN/m² i denne avstanden.`],
  ['Ved takbjelkene på B2', `0,30 m fra veggen: ${fmt(sn.s_030)} kN/m². 0,90 m fra veggen: ${fmt(sn.s_090)} kN/m².`],
]));
c.push(P(`Grensen γ · h gjør at fonnlasten ved veggen ikke kan bli større enn ${fmt(sn.peak)} kN/m², uansett snølast på mark. Den styrer når s_{k} er ${fmt(sn.sk_limit, 1)} kN/m² eller høyere, slik den er både for Mosjøen og for Vefsn for øvrig. I beregningen er ${fmt(sn.peak)} kN/m² brukt som jevn last på begge takbjelkene. Høyden 3,72 m er målt ved mønet. Lenger ut mot raftene er veggen lavere og fonnlasten mindre. Begge deler er på sikker side.`, { before: 80 }));
c.push(...figure(path.join(FIG, 'fig_snow.png'), 150, 'Figur 2  Snøfonn mot gavlveggen etter NS-EN 1991-1-3 pkt. 5.3.6 (prinsipp).'));
c.push(H2('4.4  Lastkombinasjon'));
c.push(P('Dimensjonerende last er regnet som 1,35 g_{k} + 1,5 q_{k} med all variabel last fullt samtidig. Det er en forenkling som alltid gir like stor eller større last enn NS-EN 1990 ligning 6.10a (1,35 G + 1,5 ψ_{0} Q) og 6.10b (1,2 G + 1,5 Q_{1} + 1,5 ψ_{0} Q_{i}), med ψ_{0} = 0,7 for både nyttelast og snø:'));
c.push(tbl([
  ['Størrelse', 'Forenklet (brukt)', 'Ligning 6.10a', 'Ligning 6.10b', 'Forenklet er større med'],
  ['B1: q_{Ed}, kN/m', fmt(b1.qEd.forenklet), fmt(b1.qEd['6.10a']), fmt(b1.qEd['6.10b']), pct(b1.qEd.forenklet / Math.max(b1.qEd['6.10a'], b1.qEd['6.10b']) - 1)],
  ['B2: M_{Ed}, kNm', fmt(b2.MEd, 1), fmt(b2['6.10a'].MEd, 1), fmt(Math.max(b2['6.10b-snø'].MEd, b2['6.10b-nytte'].MEd), 1), pct(b2.MEd / b2.MEd_610 - 1)],
  ['B2: oppleggskraft O4, kN', fmt(b2.RB, 1), fmt(b2['6.10a'].RB, 1), fmt(Math.max(b2['6.10b-snø'].RB, b2['6.10b-nytte'].RB), 1), pct(b2.RB / b2.RB_610 - 1)],
], [2700, 1650, 1650, 1650, 1760], { size: 17 }));

// ===================================================================== 5
c.push(H1('5  Kjøkkenbjelke B1'));
c.push(H2('5.1  Hovedberegning'));
c.push(P('Bjelkelaget vurderes i hovedsak å virke som separate felt på hver side av B1, med lokale forsterkninger og noe samvirke. Hovedmodellen er derfor to tilstøtende felt med opplegg på stålbjelken:'));
c.push(calc([
  ['Lastbredde', '3,60 / 2 + 1,50 / 2 = 2,55 m'],
  ['Egenlast', `g_{k} = 1,2 · 2,55 + 0,5 + ${fmt(sec.IPE180.g, 2)} = ${fmt(b1.gk)} kN/m`],
  ['Nyttelast', `q_{k} = 2,0 · 2,55 = ${fmt(b1.qk)} kN/m`],
  ['Dimensjonerende last', `q_{Ed} = 1,35 · ${fmt(b1.gk)} + 1,5 · ${fmt(b1.qk)} = ${fmt(b1.qEd.forenklet)} kN/m`],
  ['Moment', `M_{Ed} = q_{Ed} · L² / 8 = ${fmt(b1.qEd.forenklet)} · 3,63² / 8 = **${fmt(b1.MEd, 1)} kNm**`],
  ['Momentkapasitet', `M_{Rd} = W_{el} · f_{y} / γ_{M0} = 146,3 · 235 / 1,05 = ${fmt(sec.MRd_el, 1)} kNm (elastisk; plastisk ${fmt(sec.MRd_pl, 1)} kNm)`],
  ['Utnyttelse', `${fmt(b1.MEd, 1)} / ${fmt(sec.MRd_el, 1)} = **${pct(b1.util_M)}**`],
  ['Skjærkraft', `V_{Ed} = q_{Ed} · L / 2 = ${fmt(b1.VEd, 1)} kN. V_{Rd} = A_{vz} · f_{y} / (√3 · γ_{M0}) = ${fmt(sec.VRd, 0)} kN. Utnyttelse ${pct(b1.util_V)}`],
  ['Nedbøyning', `δ = 5 · (g_{k} + q_{k}) · L⁴ / (384 · E · I) = 5 · ${fmt(b1.gk + b1.qk)} · 3 630⁴ / (384 · 210 000 · 1 317 · 10⁴) = **${fmt(b1.delta_gq, 1)} mm** = L/${fmt(b1.L_over_delta, 0)}`],
  ['Kontrollgrense', `L/300 = ${fmt(b1.delta_lim, 1)} mm. Også den strengere grensen L/400 = ${fmt(b1.L * 1000 / 400, 1)} mm er oppfylt. Nyttelasten alene gir ${fmt(b1.delta_q, 1)} mm (L/${fmt(b1.L_over_delta_q, 0)}).`],
]));
c.push(...figure(path.join(FIG, 'fig_b1.png'), 150, 'Figur 3  B1: last, skjærkraft og moment.'));
c.push(H2('5.2  Følsomhet: full kontinuitet i bjelkelaget'));
c.push(P(`De fire nye gulvbjelkene går forbi B1, og graden av kontinuitet er usikker. Dersom hele bjelkelaget virket som sammenhengende over B1 (to-felts bjelke 3,60 + 1,50 m), ville B1 få en lastbredde på ${fmt(R.bw_cont)} m:`));
c.push(calc([
  ['Dimensjonerende last', `q_{Ed} = ${fmt(b1s.qEd.forenklet)} kN/m`],
  ['Moment og utnyttelse', `M_{Ed} = ${fmt(b1s.MEd, 1)} kNm, det vil si **${pct(b1s.util_M)}** av elastisk kapasitet`],
  ['Nedbøyning', `${fmt(b1s.delta_gq, 1)} mm, under L/300 = ${fmt(b1s.delta_lim, 1)} mm`],
  ['Oppleggskraft', `${fmt(b1s.VEd, 1)} kN i hver ende`],
]));
c.push(P('Dette er en følsomhetsvurdering og ikke en ubetinget øvre grense. Den viser at B1 har kapasitet også om bjelkelaget fører mer last til bjelken enn hovedmodellen forutsetter.'));
c.push(H2('5.3  Vipping dersom overflensen ikke er fastholdt'));
c.push(P('Hovedberegningen forutsetter at bjelkelaget holder overflensen sideveis. Som kontroll er vippekapasiteten regnet for en bjelke uten fastholding mellom oppleggene, gaffellagret i endene og med lasten på overflensen (NS-EN 1993-1-1 pkt. 6.3.2):'));
c.push(calc([
  ['Kritisk moment', `M_{cr} = ${fmt(b1.ltb.Mcr, 1)} kNm (C_{1} = 1,127, C_{2} = 0,454, z_{g} = 90 mm)`],
  ['Slankhet', `λ_{LT} = √(W_{pl} · f_{y} / M_{cr}) = ${fmt(b1.ltb.lam)}`],
  ['Vippekapasitet', `M_{b,Rd} = ${fmt(b1.ltb.MbRd_6322, 1)} kNm (pkt. 6.3.2.2, kurve a) til ${fmt(b1.ltb.MbRd_6323, 1)} kNm (pkt. 6.3.2.3, kurve b)`],
  ['Utnyttelse', `${fmt(b1.MEd, 1)} / ${fmt(b1.ltb.MbRd_6323, 1)} til ${fmt(b1.MEd, 1)} / ${fmt(b1.ltb.MbRd_6322, 1)} = **${rng(b1.util_ltb_6323, b1.util_ltb_6322)}**`],
]));
c.push(P('Uten fastholding er altså kapasiteten omtrent lik lasten. Fastholdingen fra bjelkelaget er derfor en nødvendig forutsetning for marginen i 5.1, og ikke bare en detalj. Den er vurdert i kapittel 8.'));

// ===================================================================== 6
c.push(H1('6  Gangbjelke B2'));
c.push(H2('6.1  Lastmodell'));
c.push(P(`Takbjelkene under terrassen ligger c/c 0,60 m og er sammenhengende over B2, med felt på 1,50 m og 1,65 m. Midtopplegget på en to-felts bjelke tar mer enn halve lasten. Lasten på B2 per takbjelke er ${fmt(b2.kR, 3)} m · 0,60 m · last per m², det vil si ${pct(b2.kR / 3.15)} av lasten på bjelken. Snøfonn mot gavlveggen er dimensjonerende:`));
c.push(tbl([
  ['Last', 'Plassering x, m', 'g_{k}', 'q_{k}', 'Dim. last'],
  ['Gulv via veksling: (1,2 + 2,0) kN/m² · 0,75 m + veksling og rekkverk 0,5 kN/m', '0,10–2,10', `${fmt(lFloor.gk)} kN/m`, `${fmt(lFloor.qk)} kN/m`, `${fmt(lFloor.Ed)} kN/m`],
  ['Trapp (anslått)', '1,20', '–', `${fmt(lStair.qk)} kN`, `${fmt(lStair.Ed)} kN`],
  ['Gavlvegg i 2. etasje (anslått)', '2,25', `${fmt(lGable.gk)} kN`, '–', `${fmt(lGable.Ed)} kN`],
  [`Takbjelke, hver: ${fmt(b2.kR, 3)} · 0,60 · (1,2 og ${fmt(sn.peak)}) kN/m²`, '2,55 og 3,15', `${fmt(lJoist.gk)} kN`, `${fmt(lJoist.qk)} kN`, `${fmt(lJoist.Ed)} kN`],
  ['Egenvekt IPE 180', '0–3,40', `${fmt(lSelf.gk)} kN/m`, '–', `${fmt(lSelf.Ed)} kN/m`],
], [4350, 1250, 1150, 1150, 1510], { size: 17 }));
c.push(H2('6.2  Hovedberegning – snøfonn mot gavlveggen'));
c.push(calc([
  ['Oppleggskraft O4', `R_{B} = (${fmt(lFloor.Ed)} · 2,0 · 1,10 + ${fmt(lSelf.Ed)} · 3,40 · 1,70 + ${fmt(lStair.Ed)} · 1,20 + ${fmt(lGable.Ed)} · 2,25 + ${fmt(lJoist.Ed)} · (2,55 + 3,15)) / 3,40 = **${fmt(b2.RB, 1)} kN**`],
  ['Oppleggskraft O3', `R_{A} = ${fmt(b2.RA + b2.RB, 1)} − ${fmt(b2.RB, 1)} = ${fmt(b2.RA, 1)} kN`],
  ['Største moment', `ved x = ${fmt(b2.x_M)} m: M_{Ed} = ${fmt(b2.RA, 1)} · 2,25 − ${fmt(lFloor.Ed)} · 2,0 · 1,15 − ${fmt(lSelf.Ed)} · 2,25² / 2 − ${fmt(lStair.Ed)} · 1,05 = **${fmt(b2.MEd, 1)} kNm**`],
  ['Utnyttelse', `${fmt(b2.MEd, 1)} / ${fmt(sec.MRd_el, 1)} = **${pct(b2.util_M)}**`],
  ['Skjærkraft', `V_{Ed} = R_{B} = ${fmt(b2.RB, 1)} kN. Utnyttelse ${pct(b2.util_V)} av V_{Rd} = ${fmt(sec.VRd, 0)} kN`],
  ['Nedbøyning', `**${fmt(b2.delta_gq, 1)} mm** = L/${fmt(b2.L_over_delta, 0)} ved x = ${fmt(b2.x_delta)} m (g_{k} + q_{k}, regnet numerisk). Kontrollgrense L/300 = ${fmt(b2.delta_lim, 1)} mm; også L/400 = ${fmt(b2.L * 1000 / 400, 1)} mm er oppfylt.`],
]));
c.push(...figure(path.join(FIG, 'fig_b2.png'), 150, 'Figur 4  B2: last, skjærkraft og moment for snøfonn mot gavlveggen.'));
c.push(H2('6.3  Terrassebruk i stedet for snø'));
c.push(P(`Med nyttelast 4,0 kN/m² på terrassen i stedet for snøfonn blir M_{Ed} = ${fmt(b2t.MEd, 1)} kNm (${pct(b2t.util_M)}) og oppleggskraften ved O4 ${fmt(b2t.RB, 1)} kN. Snøfonn er altså dimensjonerende.`));
c.push(H2('6.4  Følsomhet og reserve'));
c.push(tbl([
  ['Tilfelle', 'M_{Ed}, kNm', 'Utnyttelse', 'Oppleggskraft O4, kN'],
  ['Hovedberegning (6.2)', fmt(b2.MEd, 1), pct(b2.util_M), fmt(b2.RB, 1)],
  ['Gulvlast med lastbredde 1,50 m på x = 0–2,25 m, i stedet for 0,75 m med veksling og trapp', fmt(rob.alt_bw150.MEd, 1), pct(rob.alt_bw150.util), fmt(rob.alt_bw150.RB, 1)],
  [`Gavlveggen bærer i tillegg en takstripe på 0,6 m: ${fmt(rob.roof_strip.Pg)} kN egenlast og ${fmt(rob.roof_strip.Ps)} kN snø`, fmt(rob.roof_strip.MEd, 1), pct(rob.roof_strip.util), fmt(rob.roof_strip.RB, 1)],
], [5000, 1300, 1300, 1810], { size: 17 }));
c.push(P(`Takstripen er regnet som 0,6 m · 1,97 m influenslengde, med 0,7 kN/m² egenlast og snø 0,8 · ${fmt(sn.sk, 1)} = ${fmt(sn.base, 1)} kN/m². Den dekker muligheten for at ytterste sperrepar og takutstikket hviler på gavlveggen. Bjelken tåler ${fmt(rob.dP_to_100, 1)} kN ekstra dimensjonerende punktlast ved gavlveggen før elastisk momentkapasitet er nådd.`, { before: 80 }));
c.push(H2('6.5  Vipping dersom overflensen ikke er fastholdt'));
c.push(P(`Regnet på samme måte som for B1 blir M_{cr} = ${fmt(b2.ltb.Mcr, 1)} kNm og M_{b,Rd} = ${fmt(b2.ltb.MbRd_6322, 1)}–${fmt(b2.ltb.MbRd_6323, 1)} kNm. Utnyttelsen uten fastholding er ${rng(b2.util_ltb_6323, b2.util_ltb_6322)}. Momentforløpet er regnet som for jevnt fordelt last, som er på sikker side. Også for B2 er fastholdingen av overflensen en nødvendig forutsetning.`));

// ===================================================================== 7
c.push(H1('7  Opplegg og videre lastføring'));
c.push(H2('7.1  Oppleggskrefter'));
c.push(tbl([
  ['Opplegg', 'Plassering', 'Forenklet (brukt), kN', 'NS-EN 1990 lign. 6.10a/b, kN'],
  ['O1', 'B1 ved teglsteinspipa', fmt(sup.R.B1_pipe, 1), fmt(sup.R_610.B1_pipe, 1)],
  ['O2', 'B1 mot grunnmuren', fmt(sup.R.B1_wall, 1), fmt(sup.R_610.B1_wall, 1)],
  ['O3', 'B2 mot grunnmuren', fmt(sup.R.B2_wall, 1), fmt(sup.R_610.B2_wall, 1)],
  ['O4', 'B2 ved betongsøylen', fmt(sup.R.B2_col, 1), fmt(sup.R_610.B2_col, 1)],
], [1100, 3300, 2400, 2610], { align: ['l', 'l', 'r', 'r'], size: 17, boldFirstCol: true }));
c.push(H2('7.2  Stålbjelkens steg ved opplegg'));
c.push(P(`Steget er kontrollert for konsentrert oppleggskraft uten stivere, etter NS-EN 1993-1-5 kapittel 6 (endeopplegg, oppleggslengde 98 mm). Med k_{F} = ${fmt(sup.web.kF)}, effektiv lastlengde l_{y} = ${fmt(sup.web.ly, 0)} mm og λ_{F} = ${fmt(sup.web.lamF)} blir χ_{F} = 1,0 og F_{Rd} = 235 · ${fmt(sup.web.ly, 0)} · 5,3 / 1,05 = ${fmt(sup.web.FRd, 0)} kN. Største oppleggskraft er ${fmt(sup.R.B2_col, 1)} kN, det vil si ${pct(sup.R.B2_col / sup.web.FRd)}. Steget trenger ikke stivere.`));
c.push(H2('7.3  Stendere'));
c.push(P('Stenderne er regnet for trykk med knekking etter NS-EN 1995-1-1 pkt. 6.3.2. Stenderne er 48 mm tykke og svært slanke om den svake aksen. Kapasiteten avhenger derfor av at de er sammenskrudd og holdt sideveis, slik de er beskrevet (skrudd fast i pipa, stående i tømmerveggen, sidestøttet). Tabellen viser kapasiteten med og uten slik fastholding:'));
const st = sup.studs;
const srow = (key, name, dim, h) => [name, dim, `${fmt(h)} m`, `${fmt(st[key].C24.strong.NRd, 0)} / ${fmt(st[key].C18.strong.NRd, 0)}`,
  `${pct(st[key].C24.util_strong)} / ${pct(st[key].C18.util_strong)}`, `${fmt(st[key].C24.weak.NRd, 0)} (${pct(st[key].C24.util_weak)})`];
c.push(tbl([
  ['Opplegg', 'Stendere', 'Høyde', 'N_{Rd} fastholdt, C24 / C18, kN', 'Utnyttelse C24 / C18', 'N_{Rd} uten fastholding, C24, kN'],
  srow('B1_pipe', 'O1', '2 × 48 × 98', 2.07),
  srow('B1_wall', 'O2', '2 × 48 × 148', 2.07),
  srow('B2_wall', 'O3', '2 × 48 × 148', 2.22),
  srow('B2_col', 'O4', '2 × 48 × 98', 2.22),
], [1000, 1500, 950, 2100, 1800, 2060], { align: ['l', 'l', 'r', 'r', 'r', 'r'], size: 17, boldFirstCol: true }));
c.push(P('Med fastholding er utnyttelsen høyst 64 %, også med C18. Uten fastholding ville stenderne ved O1 og O4 ikke hatt tilstrekkelig kapasitet. Fastholdingen er derfor et kontrollpunkt. Trykket mellom stålflensen og stendertoppen (endeved) er høyst ' + `${fmt(st.B2_col.sigma_c0, 1)} N/mm² og uten betydning.`, { before: 80 }));
c.push(H2('7.4  Trykk vinkelrett på fiber under stenderne'));
c.push(P('Der stenderne står på liggende treverk, gir oppleggskraften trykk vinkelrett på fiberretningen. Kontrollen følger NS-EN 1995-1-1 pkt. 6.1.5: σ_{c,90,d} = F / A_{ef} ≤ k_{c,90} · f_{c,90,d}. Den effektive flaten A_{ef} er kontaktflaten forlenget med 30 mm i hver ende langs fiberretningen. Det er regnet med C24 (f_{c,90,k} = 2,5 N/mm²), k_{c,90} = 1,25 og k_{mod} = 0,8 for B1 (nyttelast) og 0,9 for B2 (snø).'));
const c9 = sup.c90;
c.push(tbl([
  ['Opplegg', 'Flate', 'A_{ef}, cm²', 'σ_{c,90,d}', 'k_{c,90} · f_{c,90,d}', 'Utnyttelse', 'Status'],
  ['O2', 'Stendere 96 × 148 på tømmerstokk', fmt(c9.B1_wall.A_ef / 100, 0), fmt(c9.B1_wall.sigma), fmt(c9.B1_wall.C24.fRd), pct(c9.B1_wall.C24.util), FOR('OK – C24 antatt')],
  ['O3', 'Stendere 96 × 148 på tømmerstokk', fmt(c9.B2_wall.A_ef / 100, 0), fmt(c9.B2_wall.sigma), fmt(c9.B2_wall.C24.fRd), pct(c9.B2_wall.C24.util), FOR('OK – C24 antatt')],
  ['O1', 'Stendere på gulvbjelke, bare bjelkens bredde 48 mm', fmt(c9.B1_pipe.A_joist_only / 100, 0), fmt(c9.B1_pipe.sigma_joist_only), fmt(c9.B1_pipe.C24.fRd), pct(c9.B1_pipe.C24.util_joist_only), ND()],
  ['O4', 'Stendere på gulvbjelke, bare bjelkens bredde 48 mm', fmt(c9.B2_col.A_joist_only / 100, 0), fmt(c9.B2_col.sigma_joist_only), fmt(c9.B2_col.C24.fRd), pct(c9.B2_col.C24.util_joist_only), ND()],
  ['O4', 'Som over, men sidekubbingene bærer med (98 mm bredde)', fmt(c9.B2_col.A_with_blocking / 100, 0), fmt(c9.B2_col.sigma_with_blocking), fmt(c9.B2_col.C24.fRd), pct(c9.B2_col.C24.util_with_blocking), ND()],
], [950, 2950, 850, 900, 1250, 1050, 1460], { align: ['l', 'l', 'r', 'r', 'r', 'r', 'l'], size: 17, boldFirstCol: true }));
c.push(P('Spenninger i N/mm². For O2 og O3 er det god margin, også med C18 (57 % og 35 %).', { size: 17, color: INK2, before: 60 }));
c.push(callout([
  P('**O1 og O4 kan ikke dokumenteres med opplysningene som foreligger.**', { after: 70 }),
  P(`Dersom bare gulvbjelkens 48 mm bredde bærer, er trykkflaten for liten. Regnestykket krever en effektiv flate på minst ${fmt(c9.B1_pipe.C24.A_req / 100, 0)} cm² ved O1 og ${fmt(c9.B2_col.C24.A_req / 100, 0)} cm² ved O4 (${fmt(c9.B1_pipe.C24.A_req / 100 * 1.25, 0)} og ${fmt(c9.B2_col.C24.A_req / 100 * 1.25, 0)} cm² dersom k_{c,90} settes til 1,0). Ved O4 er det opplyst om sidekubbinger. Bærer de fullt ut, er flaten ${fmt(c9.B2_col.A_with_blocking / 100, 0)} cm², som er på grensen. Det samme gjelder flaten mellom gulvbjelken og IPN-flensen (O1) og mellom gulvbjelken og stålplaten (O4). Regnes snøen som halvårslast (k_{mod} = 0,8) i stedet for korttidslast, øker kravet ved O4 med 12 %.`, { after: 70 }),
  P('For høyt trykk vinkelrett på fiber gir sammentrykking av treverket og setning ved opplegget. Det gir ikke brudd i stålbjelken, men forholdet må avklares. Trykkflatene må kontrollmåles på stedet (kap. 10, punkt 1 og 2).', { after: 0 }),
], RED, 'FCF1F0'));
c.push(H2('7.5  IPN 200 og betongkloss ved O1'));
c.push(P('Etter opplysningene sto den fjernede veggen i samme linje som B1, over IPN 200 i krypkjelleren. Veggen belastet da IPN-en langs hele lengden. Etter 2018 kommer lasten fra 2. etasje ned i to punkter: ved O1 rett over betongklossen, og ved O2 direkte i grunnmuren. Bøyepåkjenningen i IPN 200 fra 2. etasje er dermed blitt mindre, ikke større. IPN 200 er ikke regnet nærmere.'));
c.push(P(`Lasten på betongklossen fra 2. etasje er ${fmt(sup.R.B1_pipe, 1)} kN. Den er av samme størrelse som før, dersom den fjernede veggen belastet IPN-en langs hele lengden. Klossens fundamentering og underlag er ikke dokumentert.`));
c.push(H2('7.6  Stolpesko, betongsøyle og fundament ved O4'));
c.push(P(`Trykkspenningen i betongsøylen er ${fmt(sup.R.B2_col, 1)} kN / (π · 100² mm²) = ${fmt(sup.column.sigma, 1)} N/mm², som er lavt for betong. Stolpeskoens type og kapasitet, søylens fundament og massene under er ikke dokumentert. Disse delene kan ikke vurderes uten undersøkelse på stedet.`));
c.push(H2('7.7  Grunnmur ved O2 og O3'));
c.push(P(`Oppleggskreftene på ${fmt(sup.R.B1_wall, 1)} kN (O2) og ${fmt(sup.R.B2_wall, 1)} kN (O3) går via tømmerstokken ned i grunnmuren, som fra før bærer tømmerveggen. Fordelt over 0,3 m lengde gir største last et trykk på ca. 0,5 N/mm² mot grunnmurens topp, som er lite for betong og mur. Grunnmurens tilstand og fundament er ikke undersøkt.`));

// ===================================================================== 8
c.push(H1('8  Sideveis fastholding av overflensen'));
c.push(P('Momentkapasiteten i kapittel 5 og 6 forutsetter at overflensen, som er i trykk, ikke kan bevege seg sideveis.'));
c.push(...bullets([
  '**B1:** bjelkelaget ligger på overflensen med ca. 0,6 m avstand langs hele spennet.',
  '**B2:** trappevekslingen ligger langs overflensen fra x ≈ 0,1 til 2,1 m. Bjelken under gavlveggen og de to takbjelkene ligger på flensen ved x = 2,25, 2,55 og 3,15 m.',
]));
c.push(P('Kraften som trengs for å holde en trykkflens på plass, er liten. Vanlig praksis regner 2,5 % av flenskraften (ca. 2 % etter NS-EN 1993-1-1 pkt. 5.3.3):'));
c.push(calc([
  ['Flenskraft B1', `N_{f} = M_{Ed} / (h − t_{f}) = ${fmt(b1.MEd, 1)} / 0,172 = ${fmt(b1.restraint.Nf, 0)} kN. 2,5 % = ${fmt(b1.restraint.F_25pct, 1)} kN, fordelt på bjelkelaget`],
  ['Flenskraft B2', `N_{f} = ${fmt(b2.MEd, 1)} / 0,172 = ${fmt(b2.restraint.Nf, 0)} kN. 2,5 % = ${fmt(b2.restraint.F_25pct, 1)} kN`],
  ['Last på flensen', `B1: ${fmt(b1.restraint.load, 0)} kN. B2: ${fmt(b2.restraint.load, 0)} kN`],
  ['Friksjon tre mot stål', `μ = 0,2 gir ${fmt(b1.restraint.friction_02, 0)} kN (B1) og ${fmt(b2.restraint.friction_02, 0)} kN (B2), om lag tre ganger kravet`],
]));
c.push(P('Friksjonen alene er altså regnemessig tilstrekkelig, på to vilkår: bjelkelaget må selv være holdt sideveis av gulvet (skivevirkning), og det må ligge an mot flensen. Dette er en vurdering og ikke en dokumentert innfesting. Hvordan treverket er festet til eller ligger an mot overflensen, er derfor et kontrollpunkt (kap. 10, punkt 6 og 7).', { before: 80 }));

// ===================================================================== 9
c.push(H1('9  Resultatoversikt'));
c.push(tbl([
  ['Kontroll', 'Påkjenning', 'Kapasitet', 'Utnyttelse', 'Status'],
  [{ t: 'B1 – kjøkkenbjelke, L = 3,63 m', span: 5, bold: true, fill: 'F6F7F9', align: 'l' }],
  ['Moment', `${fmt(b1.MEd, 1)} kNm`, `${fmt(sec.MRd_el, 1)} kNm`, pct(b1.util_M), FOR('OK – fastholdt overflens')],
  ['Skjær', `${fmt(b1.VEd, 1)} kN`, `${fmt(sec.VRd, 0)} kN`, pct(b1.util_V), OK()],
  ['Nedbøyning', `${fmt(b1.delta_gq, 1)} mm`, `${fmt(b1.delta_lim, 1)} mm`, pct(b1.util_delta), OK()],
  ['Følsomhet: lastbredde 3,71 m', `${fmt(b1s.MEd, 1)} kNm`, `${fmt(sec.MRd_el, 1)} kNm`, pct(b1s.util_M), OK()],
  ['Vipping uten fastholding', `${fmt(b1.MEd, 1)} kNm`, `${fmt(b1.ltb.MbRd_6322, 1)}–${fmt(b1.ltb.MbRd_6323, 1)} kNm`, rng(b1.util_ltb_6323, b1.util_ltb_6322), FOR('Viser at fastholding er nødvendig')],
  [{ t: 'B2 – gangbjelke, L = 3,40 m', span: 5, bold: true, fill: 'F6F7F9', align: 'l' }],
  ['Moment (snøfonn)', `${fmt(b2.MEd, 1)} kNm`, `${fmt(sec.MRd_el, 1)} kNm`, pct(b2.util_M), FOR('OK – fastholdt overflens')],
  ['Skjær', `${fmt(b2.VEd, 1)} kN`, `${fmt(sec.VRd, 0)} kN`, pct(b2.util_V), OK()],
  ['Nedbøyning', `${fmt(b2.delta_gq, 1)} mm`, `${fmt(b2.delta_lim, 1)} mm`, pct(b2.util_delta), OK()],
  ['Terrassebruk 4,0 kN/m²', `${fmt(b2t.MEd, 1)} kNm`, `${fmt(sec.MRd_el, 1)} kNm`, pct(b2t.util_M), OK()],
  ['Følsomhet: takstripe på gavlveggen', `${fmt(rob.roof_strip.MEd, 1)} kNm`, `${fmt(sec.MRd_el, 1)} kNm`, pct(rob.roof_strip.util), OK()],
  ['Vipping uten fastholding', `${fmt(b2.MEd, 1)} kNm`, `${fmt(b2.ltb.MbRd_6322, 1)}–${fmt(b2.ltb.MbRd_6323, 1)} kNm`, rng(b2.util_ltb_6323, b2.util_ltb_6322), FOR('Viser at fastholding er nødvendig')],
  [{ t: 'Opplegg', span: 5, bold: true, fill: 'F6F7F9', align: 'l' }],
  ['Stålbjelkens steg (størst ved O4)', `${fmt(sup.R.B2_col, 1)} kN`, `${fmt(sup.web.FRd, 0)} kN`, pct(sup.R.B2_col / sup.web.FRd), OK()],
  ['Stendere, fastholdt (størst ved O4)', `${fmt(sup.R.B2_col, 1)} kN`, `${fmt(st.B2_col.C24.strong.NRd, 0)} kN`, pct(st.B2_col.C24.util_strong), FOR('OK – C24 og fastholding')],
  ['Tømmerstokk over grunnmur (størst ved O2)', `${fmt(c9.B1_wall.sigma)} N/mm²`, `${fmt(c9.B1_wall.C24.fRd)} N/mm²`, pct(c9.B1_wall.C24.util), FOR('OK – C24 antatt')],
  ['Gulvbjelke under stendere, O1', `${fmt(c9.B1_pipe.sigma_joist_only, 1)} N/mm²`, `${fmt(c9.B1_pipe.C24.fRd, 1)} N/mm²`, '–', ND()],
  ['Gulvbjelke under stendere, O4', `${fmt(c9.B2_col.sigma_with_blocking, 1)}–${fmt(c9.B2_col.sigma_joist_only, 1)} N/mm²`, `${fmt(c9.B2_col.C24.fRd, 2)} N/mm²`, '–', ND()],
  ['Betongkloss O1; stolpesko, søyle og fundament O4', '–', '–', '–', ND()],
], [3100, 1500, 1500, 1200, 2110], { align: ['l', 'r', 'r', 'r', 'l'], size: 17 }));

// ===================================================================== 10
c.push(H1('10  Kontrollpunkter på stedet'));
c.push(P('Punktene under kan lukke det som ikke er dokumentert. Tabellen er laget for å fylles ut ved befaring, med måltall, bilder og signatur.'));
const cp = [
  ['1', 'Trykkflate under stenderne ved O1', `Mål bredde og lengde på treverket stenderne står på (gulvbjelke, kubbinger, svill), og anlegget mot IPN-flensen. Regnestykket krever ca. ${fmt(c9.B1_pipe.C24.A_req / 100, 0)}–${fmt(c9.B1_pipe.C24.A_req / 100 * 1.25, 0)} cm².`],
  ['2', 'Trykkflate under stenderne ved O4', `Ligger sidekubbingene an mot stenderne oppe og mot stålplaten nede? Mål plate og kubbinger. Regnestykket krever ca. ${fmt(c9.B2_col.C24.A_req / 100, 0)}–${fmt(c9.B2_col.C24.A_req / 100 * 1.25, 0)} cm².`],
  ['3', 'Stolpesko ved O4', 'Type og fabrikat, feste til søyle og gulvbjelke.'],
  ['4', 'Betongsøyle og fundament ved O4', 'Diameter, høyde, fundamentflate og masser. Riss eller setning?'],
  ['5', 'Betongkloss ved O1', 'Mål, tilstand og underlag.'],
  ['6', 'Bjelkelaget mot overflensen på B1', 'Feste eller anlegg (spiker, beslag, lasker) langs hele bjelken.'],
  ['7', 'Veksling og takbjelker mot overflensen på B2', 'Feste eller anlegg ved x = 0,1–2,1 m og ved 2,25, 2,55 og 3,15 m.'],
  ['8', 'Stenderne ved O1–O4', 'Er de sammenskrudd og festet til pipe, tømmervegg eller sidestøtte? Utbøyning?'],
  ['9', 'Gavlveggen over B2', 'Hviler ytterste sperrepar eller takutstikket på gavlveggen?'],
  ['10', 'Tidligere yttervegg i 2. etasje', 'Hva står veggen på i 1. etasje, 0,20 m bak badveggen?'],
  ['11', 'Synlige deformasjoner', 'Nedbøyning av B1 og B2 (snor eller laser), riss i himling og vegger over oppleggene, knusemerker i treverk.'],
  ['12', 'Stålkvalitet', 'Valsemerking på bjelkene, eller ordre og faktura fra leverandøren i 2018.'],
];
c.push(tbl([['Nr.', 'Kontrollpunkt', 'Hva som måles eller observeres', 'Resultat', 'Dato / sign.'],
  ...cp.map((r) => [r[0], { t: r[1], bold: true, align: 'l' }, r[2], '', ''])],
  [500, 2150, 3700, 1760, 1300], { align: ['l', 'l', 'l', 'l', 'l'], size: 17, padV: 70 }));

// ===================================================================== 11
c.push(H1('11  Konklusjon'));
c.push(P(`Med forutsetningene i kapittel 3 viser etterregningen at begge stålbjelkene har tilstrekkelig kapasitet i bøyning og skjær. Utnyttelsen er ${pct(b1.util_M)} for B1 og ${pct(b2.util_M)} for B2 av elastisk momentkapasitet, og nedbøyningene ligger under kontrollgrensen L/300. Det gjelder også i følsomhetsregningene.`));
c.push(P('Resultatet forutsetter at overflensen er sideveis fastholdt av treverket som ligger på den, at stenderne er sideveis fastholdt, og at stål og trevirke minst har de antatte kvalitetene.'));
c.push(P('For oppleggene er stålbjelkens steg, stenderne og tømmerstokken over grunnmuren regnet og funnet tilstrekkelige under de samme antakelsene. Trykk vinkelrett på fiber i gulvbjelken ved O1 og O4, stolpeskoen, betongsøylen med fundament og betongklossens underlag er ikke dokumentert. Notatet konkluderer derfor ikke for disse delene. De må kontrollmåles og vurderes av en fagkyndig før oppleggene kan dokumenteres i sin helhet.'));
c.push(P('Notatet er et utkast til gjennomgang. Det erstatter ikke prosjektering eller kontroll fra foretak med ansvarsrett dersom kommunen krever det.'));

// ===================================================================== 12
c.push(H1('12  Gjennomgang og signatur'));
c.push(P('Feltet «Gjennomgått av» fylles ut bare av den som faktisk har gått gjennom beregningene i denne revisjonen. Signaturen bekrefter gjennomgang av dette notatet. Den bekrefter ikke prosjekteringen fra 2018, og den er ikke en erklæring om ansvarsrett.', { keepNext: true }));
c.push(tbl([
  ['Rolle', 'Navn og kompetanse', 'Sted og dato', 'Signatur'],
  [{ t: 'Utarbeidet av', bold: true, align: 'l' }, `${proj('tiltakshaver')}, tiltakshaver`, '', ''],
  [{ t: 'Gjennomgått av', bold: true, align: 'l' }, '', '', ''],
], [1800, 3400, 2000, 2210], { align: ['l', 'l', 'l', 'l'], size: 18, padV: 260 }));

// ===================================================================== vedlegg A
c.push(H1('Vedlegg A  Mellomregninger'));
c.push(H2('A.1  Vipping (kap. 5.3 og 6.5)'));
c.push(P('M_{cr} = C_{1} · (π² E I_{z} / L²) · [ √( I_{w} / I_{z} + L² G I_{t} / (π² E I_{z}) + (C_{2} z_{g})² ) − C_{2} z_{g} ], med I_{z} = 100,9 cm⁴, I_{t} = 4,79 cm⁴, I_{w} = 7 431 cm⁶, G = 80 770 N/mm² og z_{g} = 90 mm (last på overflens).'));
c.push(tbl([
  ['Størrelse', 'B1, L = 3,63 m', 'B2, L = 3,40 m'],
  ['M_{cr}, kNm', fmt(b1.ltb.Mcr, 1), fmt(b2.ltb.Mcr, 1)],
  ['λ_{LT} = √(W_{pl} f_{y} / M_{cr})', fmt(b1.ltb.lam, 3), fmt(b2.ltb.lam, 3)],
  ['χ_{LT}, pkt. 6.3.2.2 (kurve a, α = 0,21)', fmt(b1.ltb.chi_6322, 3), fmt(b2.ltb.chi_6322, 3)],
  ['χ_{LT,mod}, pkt. 6.3.2.3 (kurve b, λ_{LT,0} = 0,4, β = 0,75, k_{c} = 0,94)', fmt(b1.ltb.chi_6323, 3), fmt(b2.ltb.chi_6323, 3)],
  ['M_{b,Rd} = χ_{LT} · W_{pl} · f_{y} / γ_{M1}, kNm', `${fmt(b1.ltb.MbRd_6322, 1)} / ${fmt(b1.ltb.MbRd_6323, 1)}`, `${fmt(b2.ltb.MbRd_6322, 1)} / ${fmt(b2.ltb.MbRd_6323, 1)}`],
], [5200, 2100, 2110], { size: 17 }));
c.push(H2('A.2  Steg under oppleggskraft (kap. 7.2)'));
c.push(P(`NS-EN 1993-1-5 kap. 6, endeopplegg (type c) med s_{s} = 98 mm og c = 0: h_{w} = ${fmt(sup.web.hw, 0)} mm, k_{F} = 2 + 6 (s_{s} + c) / h_{w} = ${fmt(sup.web.kF)}, F_{cr} = 0,9 k_{F} E t_{w}³ / h_{w} = ${fmt(sup.web.Fcr, 0)} kN, l_{y} = ${fmt(sup.web.ly, 0)} mm, λ_{F} = √(l_{y} t_{w} f_{y} / F_{cr}) = ${fmt(sup.web.lamF)}, χ_{F} = 0,5 / λ_{F} ≤ 1,0, F_{Rd} = f_{y} χ_{F} l_{y} t_{w} / γ_{M1} = ${fmt(sup.web.FRd, 0)} kN.`));
c.push(H2('A.3  Stendere (kap. 7.3)'));
c.push(P('NS-EN 1995-1-1 pkt. 6.3.2 med β_{c} = 0,2: λ_{rel} = (λ / π) · √(f_{c,0,k} / E_{0,05}), k = 0,5 (1 + β_{c} (λ_{rel} − 0,3) + λ_{rel}²), k_{c} = 1 / (k + √(k² − λ_{rel}²)), N_{Rd} = 2 · k_{c} · f_{c,0,d} · b · h. C24: f_{c,0,k} = 21 N/mm², E_{0,05} = 7 400 N/mm². C18: 18 og 6 000 N/mm².'));
const arow = (key, name) => [name, fmt(st[key].C24.strong.lam, 0), fmt(st[key].C24.strong.kc, 3), fmt(st[key].C24.strong.fc0d, 2), fmt(st[key].C24.strong.NRd, 1),
  fmt(st[key].C24.weak.lam, 0), fmt(st[key].C24.weak.kc, 3), fmt(st[key].C24.weak.NRd, 1)];
c.push(tbl([
  ['Opplegg', 'λ sterk akse', 'k_{c}', 'f_{c,0,d}, N/mm²', 'N_{Rd}, kN', 'λ svak akse', 'k_{c}', 'N_{Rd}, kN'],
  arow('B1_pipe', 'O1: 2 × 48 × 98, 2,07 m'), arow('B1_wall', 'O2: 2 × 48 × 148, 2,07 m'),
  arow('B2_wall', 'O3: 2 × 48 × 148, 2,22 m'), arow('B2_col', 'O4: 2 × 48 × 98, 2,22 m'),
], [2700, 1000, 800, 1200, 900, 1000, 800, 1010], { size: 17 }));
c.push(P('Verdiene gjelder C24. «Sterk akse» forutsetter at stenderne er holdt i den tynne retningen. «Svak akse» er to frittstående stendere uten fastholding.', { size: 17, color: INK2, before: 60 }));
c.push(H2('A.4  Takbjelkenes last på B2 (kap. 6.1)'));
c.push(P(`To-felts sammenhengende bjelke med felt L_{1} = 1,50 m og L_{2} = 1,65 m og jevnt fordelt last w: støttemoment M_{B} = w (L_{1}³ + L_{2}³) / (8 (L_{1} + L_{2})) = 0,312 w. Reaksjon på midtopplegget: R_{B} = w (L_{1} + L_{2}) / 2 + M_{B} (1/L_{1} + 1/L_{2}) = ${fmt(b2.kR, 3)} w. Med samme formel gir feltene 3,60 m og 1,50 m over B1 lastbredden ${fmt(R.bw_cont)} m i kap. 5.2.`));

const doc = makeDoc({
  title: `Beregningsnotat – stålbjelker B1 og B2, ${proj('filprefiks', 'eiendom')}`,
  headerText: [`${proj('filprefiks', 'Eiendom')} · Beregningsnotat stålbjelker B1 og B2`, 'Rev. 11 · 10.11.2026 · Utkast til gjennomgang'],
  children: c,
});
save(doc, out);
