const DAYS   = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const COLS   = 16;
const HALF   = 8;

const COLOR_OPTIONS = new Set(['white','yellow','blue','red']);
const THEME_OPTIONS = new Set(['charcoal','graphite','light']);

const _params = new URLSearchParams(window.location.search);

function getStoredOrQueryValue(queryKey, storageKey) {
	const fromQuery = (_params.get(queryKey) || '').trim();
	try {
		if (fromQuery) { localStorage.setItem(storageKey, fromQuery); return fromQuery; }
		return (localStorage.getItem(storageKey) || '').trim();
	} catch (_) { return fromQuery; }
}
function lsSet(key, val)  { try { localStorage.setItem(key, val); }    catch(_) {} }
function lsRemove(key)    { try { localStorage.removeItem(key); }       catch(_) {} }

// ── Colour helpers ──────────────────────────────────────────────────────────
function hexToHsl(hex) {
	let r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
	const max = Math.max(r,g,b), min = Math.min(r,g,b);
	let h, s, l = (max+min)/2;
	if (max===min) { h=s=0; } else {
		const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
		switch(max){ case r:h=((g-b)/d+(g<b?6:0))/6;break; case g:h=((b-r)/d+2)/6;break; case b:h=((r-g)/d+4)/6;break; }
	}
	return [h*360, s*100, l*100];
}
function hslToHex(h,s,l) {
	h/=360; s/=100; l/=100;
	if(s===0){const v=Math.round(l*255).toString(16).padStart(2,'0'); return '#'+v+v+v;}
	const hue2rgb=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
	const q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
	return '#'+[hue2rgb(p,q,h+1/3),hue2rgb(p,q,h),hue2rgb(p,q,h-1/3)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');
}
const ACCENT_LIGHT_MAP = {
	'#9b59b6': '#7d3c98',
	'#3498db': '#1a6ca8',
	'#2ecc71': '#1e9950',
	'#e67e22': '#b35900',
	'#e74c3c': '#a93226',
	'#1abc9c': '#14967c',
};

function applyAccentColor(hex) {
	const [h,s,l]=hexToHsl(hex);
	const lightHex = ACCENT_LIGHT_MAP[hex.toLowerCase()] || hex;
	document.documentElement.style.setProperty('--accent-well',        hslToHex(h,s,l*0.55));
	document.documentElement.style.setProperty('--accent-upper',       hex);
	document.documentElement.style.setProperty('--accent-lower',       hslToHex(h,s,l*0.85));
	document.documentElement.style.setProperty('--accent-upper-light', lightHex);
}

function accentFlip(newHex) {
	// Capture old colors before changing anything
	const cs = getComputedStyle(document.documentElement);
	const oldUpper = cs.getPropertyValue('--accent-upper').trim();

	// Apply new color immediately so it shows underneath the overlays
	applyAccentColor(newHex);

	allAccentUnits.forEach((unit, i) => {
		setTimeout(() => {
			// Old upper color falls away, revealing the new color underneath
			const ft = document.createElement('div');
			ft.className = 'flip-top';
			ft.style.background = oldUpper;
			const ftSpan = document.createElement('span'); ftSpan.className = 'flap-text';
			ft.appendChild(ftSpan);
			unit.el.insertBefore(ft, unit.hinge);
			requestAnimationFrame(() => ft.classList.add('flipping'));
			setTimeout(() => ft.remove(), 300);
		}, i * 40);
	});
}

// ── Visual config ────────────────────────────────────────────────────────────
function applyVisualConfig() {
	const colorChoice = getStoredOrQueryValue('textColor','splitflapTextColor').toLowerCase();
	const themeChoice = getStoredOrQueryValue('theme','splitflapTheme').toLowerCase();
	document.body.dataset.textColor = COLOR_OPTIONS.has(colorChoice) ? colorChoice : 'white';
	const resolvedTheme = (window.__theme || themeChoice).toLowerCase();
	document.body.dataset.theme = THEME_OPTIONS.has(resolvedTheme) ? resolvedTheme : 'charcoal';
	const deviceNameEl = document.getElementById('board-device-name');
	if (deviceNameEl) deviceNameEl.textContent = window.__deviceName || 'The Split-Flap Clock';
}

// ── Flap unit factory ────────────────────────────────────────────────────────
function createUnit(container, isAccent=false) {
	const el = document.createElement('div');
	el.className = 'flap-unit'; el.dataset.value = ' ';
	if (isAccent) el.classList.add('accent');
	const upper=document.createElement('div'); upper.className='flap-upper';
	const upperText=document.createElement('span'); upperText.className='flap-text'; upperText.textContent=' ';
	upper.appendChild(upperText);
	const lower=document.createElement('div'); lower.className='flap-lower';
	const lowerText=document.createElement('span'); lowerText.className='flap-text'; lowerText.textContent=' ';
	lower.appendChild(lowerText);
	const hinge=document.createElement('div'); hinge.className='hinge';
	el.appendChild(upper); el.appendChild(lower); el.appendChild(hinge);
	container.appendChild(el);
	return { el, upper, upperText, lower, lowerText, hinge, pendingTop:null, pendingBottom:null };
}

function createRow(container, accentSet=new Set()) {
	return Array.from({length:COLS}, (_,i) => createUnit(container, accentSet.has(i)));
}

// ── Build rows ───────────────────────────────────────────────────────────────
const accentCorners = new Set([0, COLS-1]);
const accentTopUnits    = createRow(document.getElementById('accent-row-top'), accentCorners);
const row1Units = createRow(document.getElementById('row-1'));
const row2Units = createRow(document.getElementById('row-2'));
const row3Units = createRow(document.getElementById('row-3'));
const row4Units = createRow(document.getElementById('row-4'));
const row5Units = createRow(document.getElementById('row-5'));
const accentBottomUnits = createRow(document.getElementById('accent-row-bottom'), accentCorners);
// Only the corner units are visually colored
const allAccentUnits = [accentTopUnits[0], accentTopUnits[COLS-1], accentBottomUnits[0], accentBottomUnits[COLS-1]];

// ── Flip animation ───────────────────────────────────────────────────────────
function flipTo(unit, newChar) {
	if (unit.el.dataset.value === newChar) return;
	const currentChar = unit.el.dataset.value;
	unit.el.dataset.value = newChar;
	unit.pendingTop?.remove(); unit.pendingBottom?.remove();
	const flipTop=document.createElement('div'); flipTop.className='flip-top';
	const ftText=document.createElement('span'); ftText.className='flap-text'; ftText.textContent=currentChar;
	flipTop.appendChild(ftText);
	const flipBottom=document.createElement('div'); flipBottom.className='flip-bottom';
	const fbText=document.createElement('span'); fbText.className='flap-text'; fbText.textContent=newChar;
	flipBottom.appendChild(fbText);
	unit.pendingTop=flipTop; unit.pendingBottom=flipBottom;
	unit.upperText.textContent=newChar;
	// flap-lower keeps old char while flip-bottom sweeps in — update only after it covers
	unit.el.insertBefore(flipTop, unit.hinge); unit.el.insertBefore(flipBottom, unit.hinge);
	requestAnimationFrame(()=>{ flipTop.classList.add('flipping'); flipBottom.classList.add('flipping'); });
	setTimeout(()=>{ unit.lowerText.textContent=newChar; }, 290);
	setTimeout(()=>{ unit.pendingTop?.remove(); unit.pendingBottom?.remove(); unit.pendingTop=null; unit.pendingBottom=null; }, 360);
}

// Build a cols-length array of strings (one per flap), handling surrogate-pair emoji.
// Wide chars (display width 2) occupy one real column + one blank placeholder column.
function textToColArray(text, cols) {
	const arr = [];
	for (const ch of text) { // for...of iterates by codepoint, not code unit
		if (arr.length >= cols) break;
		const cp = ch.codePointAt(0);
		const w = (cp > 0x2E7F && !(cp >= 0x2500 && cp <= 0x25FF)) ? 2 : 1;
		arr.push(ch);
		if (w === 2 && arr.length < cols) arr.push(' '); // blank placeholder for 2nd col
	}
	while (arr.length < cols) arr.push(' ');
	return arr;
}

function setRow(units, text) {
	const cols = textToColArray(text, COLS);
	for (let c=0;c<COLS;c++) flipTo(units[c], cols[c]);
}

// Set row instantly without animation — used for initial render
function setRowImmediate(units, text) {
	const cols = textToColArray(text, COLS);
	for (let c=0;c<COLS;c++) {
		const unit = units[c];
		const ch = cols[c];
		unit.el.dataset.value = ch;
		unit.upperText.textContent = ch;
		unit.lowerText.textContent = ch;
	}
}

// Write to a slice of a row (offset, length)
function setRowSlice(units, text, offset, len) {
	const cols = textToColArray(text, len);
	for (let c=0;c<len;c++) flipTo(units[offset+c], cols[c]);
}

function pad2(n) { return n.toString().padStart(2,'0'); }

// Measure display width: emoji/wide chars count as 2 columns
function displayWidth(text) {
	let w = 0;
	for (const ch of text) {
		const cp = ch.codePointAt(0);
		if (cp >= 0xFE00 && cp <= 0xFE0F) continue; // skip variation selectors
		w += 1;
	}
	return w;
}

function buildCentered(text, minLeftPad = 0) {
	const remaining = Math.max(COLS-displayWidth(text),0);
	const leftPad = Math.max(Math.floor(remaining/2), minLeftPad);
	return ' '.repeat(leftPad)+text+' '.repeat(Math.max(COLS-leftPad-displayWidth(text),0));
}

function centerIn(text, width) {
	const remaining = Math.max(width-displayWidth(text),0);
	const leftPad = Math.floor(remaining/2);
	return ' '.repeat(leftPad)+text+' '.repeat(remaining-leftPad);
}

// ── Settings ─────────────────────────────────────────────────────────────────
let use24Hour   = window.__use24Hour ?? (getStoredOrQueryValue('timeFormat','splitflapTimeFormat')==='24');
let tempUnit    = getStoredOrQueryValue('tempUnit','splitflapTempUnit') || 'C';
let showWeather = (localStorage.getItem('splitflapShowWeather') ?? 'true') === 'true';

function setTimeFormat(is24h) {
	use24Hour=is24h;
	lsSet('splitflapTimeFormat', is24h?'24':'12')
}
function setTheme(theme) {
	document.body.dataset.theme = THEME_OPTIONS.has(theme) ? theme : 'charcoal';
	lsSet('splitflapTheme', theme)
}
function setTempUnit(unit) {
	tempUnit=unit;
	lsSet('splitflapTempUnit', unit)
	if (currentMode==='clock') renderClockWeather();
}
function formatHour(h) { return pad2(use24Hour ? h : (h%12||12)); }

// ── Drift (anti burn-in) ─────────────────────────────────────────────────────
const board = document.querySelector('.board');
let driftAngle = 0;
const DRIFT_RADIUS = 35;
function driftStep() {
	driftAngle += 0.018;
	board.style.marginLeft = `${Math.sin(driftAngle)*DRIFT_RADIUS}px`;
	board.style.marginTop  = `${Math.sin(driftAngle*Math.SQRT2)*DRIFT_RADIUS}px`;
}

// ── Weather ──────────────────────────────────────────────────────────────────
const WMO_CODES = {
	0:'CLEAR',1:'CLEAR',2:'CLOUDY',3:'OVERCAST',
	45:'FOGGY',48:'FOGGY',
	51:'DRIZZLE',53:'DRIZZLE',55:'DRIZZLE',
	61:'RAIN',63:'RAIN',65:'HEAVY RAIN',
	71:'SNOW',73:'SNOW',75:'HEAVY SNOW',77:'SNOW',
	80:'SHOWERS',81:'SHOWERS',82:'SHOWERS',
	85:'SHOWERS',86:'SHOWERS',
	95:'THUNDER',96:'THUNDER',99:'THUNDER',
};

let weather = null;
let _lastWeatherStr = null;
let weatherFetchedAt = 0;
let weatherCoords = null; // { lat, lon, city }
const WEATHER_TTL = 10 * 60 * 1000;
let weatherLoadingInterval = null;

function startWeatherLoadingAnimation() {
	if (weatherLoadingInterval) return;
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	// Each column flips independently on a staggered cadence so they ripple across
	const intervals = row5Units.map((unit, col) =>
		setInterval(() => {
			if (currentMode !== 'clock') { stopWeatherLoadingAnimation(); return; }
			flipToColored(unit, chars[Math.floor(Math.random() * chars.length)]);
		}, 360 + col * 20)
	);
	weatherLoadingInterval = intervals;
}

function stopWeatherLoadingAnimation() {
	if (!weatherLoadingInterval) return;
	weatherLoadingInterval.forEach(iv => clearInterval(iv));
	weatherLoadingInterval = null;
}

function cToF(c) { return Math.round(c*9/5+32); }
function formatTemp(c) { return tempUnit==='F' ? `${cToF(c)}\u00b0F` : `${Math.round(c)}\u00b0C`; }

async function geocodeCity(cityName) {
	const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
	const data = await res.json();
	if (!data.results?.length) return null;
	const r = data.results[0];
	return { lat: r.latitude, lon: r.longitude, city: r.name.toUpperCase().substring(0, 10) };
}


async function fetchWeather(forceRefresh=false) {
	if (!weatherCoords) return;
	if (!forceRefresh && Date.now()-weatherFetchedAt < WEATHER_TTL && weather) return;
	const wasEmpty = !weather;
	try {
		const { lat, lon, city } = weatherCoords;
		const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`);
		const wData = await wRes.json();
		const cur = wData.current;
		const daily = wData.daily;
		weather = {
			city,
			condition: WMO_CODES[cur.weather_code] || '',
			temp: cur.temperature_2m,
			feelsLike: cur.apparent_temperature,
			hi: daily.temperature_2m_max[0],
			lo: daily.temperature_2m_min[0],
		};
		weatherFetchedAt = Date.now();
		// If loading animation was running, stop it and scramble to real value
		if (wasEmpty && currentMode === 'clock') {
			const blank = ' '.repeat(COLS);
			const [r4, r5] = getWeatherRows(blank);
			document.getElementById('row-5').dataset.placeholder = 'false';
			setRow(row4Units, r4);
			setRow(row5Units, r5);
			_lastWeatherStr = r4 + r5;
		}
	} catch(e) {
		stopWeatherLoadingAnimation();
		weather = weather || null;
	}
}



// ── MODE: Clock & Weather ────────────────────────────────────────────────────
function getWeatherRows(blank) {
	if (!weather || weather.temp === null) {
		const placeholder = (!weatherCoords && !storedCity) ? 'SET A CITY' : 'FETCHING..';
		return [blank, buildCentered(placeholder)];
	}
	const tempStr = formatTemp(weather.temp);
	const cond = weather.condition || '';
	const combined = cond ? `${tempStr} ${cond}` : tempStr;
	if (combined.length <= COLS) {
		return [blank, buildCentered(combined)];
	}
	return [buildCentered(tempStr), buildCentered(cond)];
}
function renderClockWeather() {
	if (currentMode !== 'clock') return;
	const now = new Date();

	const blank = ' '.repeat(COLS);
	const dateStr = buildCentered(`${pad2(now.getDate())} ${MONTHS[now.getMonth()]}`);
	const timeStr = buildCentered(`${formatHour(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`);
	const dayStr  = buildCentered(DAYS[now.getDay()], 4);

	if (showWeather) {
		// Rows 1–3: clock, row 4: gap, row 5: weather
		setRow(row1Units, dateStr);
		setRow(row2Units, timeStr);
		setRow(row3Units, dayStr);

		if (!weatherLoadingInterval) {
			const [r4, r5] = getWeatherRows(blank);
			const weatherStr = r4 + r5;
			if (weatherStr !== _lastWeatherStr) {
				_lastWeatherStr = weatherStr;
				document.getElementById('row-5').dataset.placeholder = !weather ? 'true' : 'false';
				setRow(row4Units, r4);
				setRow(row5Units, r5);
			}
		}
	} else {
		// No weather — vertically center date/time/day across 5 rows (rows 2–4)
		setRow(row1Units, blank);
		setRow(row2Units, dateStr);
		setRow(row3Units, timeStr);
		setRow(row4Units, dayStr);
		setRow(row5Units, blank);
	}

}

// ── MODE: Message & Quotes ───────────────────────────────────────────────────
const ALL_QUOTES = [
	'THE BEST TIME TO START WAS YESTERDAY',
	'MAKE IT SIMPLE BUT SIGNIFICANT',
	'STAY CURIOUS',
	'LESS IS MORE',
	'DO GOOD WORK',
	'ONE DAY OR DAY ONE',
	'CREATE THINGS WORTH MAKING',
	'SHOW UP EVERY DAY',
	'KEEP GOING',
	'MAKE YOUR MARK',
	'GOOD THINGS TAKE TIME',
	'DREAM BIG START SMALL',
	'ACT AS IF FAILURE IS IMPOSSIBLE',
	'THE SECRET IS TO BEGIN',
	'DONE IS BETTER THAN PERFECT',
	'WORK HARD IN SILENCE',
	'BE THE ENERGY YOU WANT TO SEE',
	'PROGRESS NOT PERFECTION',
	'START WHERE YOU ARE',
	'USE WHAT YOU HAVE',
	'DO WHAT YOU CAN',
	'SMALL STEPS EVERY DAY',
	'YOUR ONLY LIMIT IS YOU',
	'MAKE IT HAPPEN',
	'STAY FOCUSED AND NEVER GIVE UP',
	'BELIEVE IN YOUR JOURNEY',
	'CREATE YOUR OWN SUNSHINE',
	'EMBRACE THE PROCESS',
	'ENJOY THE RIDE',
	'LIVE WITH INTENTION',
];

// Which quotes are enabled — stored as Set of indices
let enabledQuotes = new Set(ALL_QUOTES.map((_, i) => i));
try {
	const stored = localStorage.getItem('splitflapEnabledQuotes');
	if (stored) enabledQuotes = new Set(JSON.parse(stored));
} catch(_) {}

let quoteIndex    = parseInt(localStorage.getItem('splitflapQuoteIndex') || '0');
let customMessage = null;
try {
	const _stored = localStorage.getItem('splitflapCustomMessage');
	if (_stored) customMessage = JSON.parse(_stored);
} catch(_) {}
let quoteInterval = null;

const CONTENT_ROWS = 5; // rows 1-5

// Balanced wrap: try all break points and minimise max-line-length variance
function wrapBalanced(text, cols) {
	const words = text.split(' ');
	if (words.length === 1) return [text.substring(0, cols)];

	// Try every possible number of lines (1 to words.length)
	// and pick the split that gives the most balanced lengths
	let best = null, bestScore = Infinity;

	function tryBreaks(wordList, maxCols) {
		// Greedy wrap into as-few-lines-as-possible then score variance
		const lines = [];
		let cur = '';
		for (const w of wordList) {
			if ((cur + (cur ? ' ' : '') + w).length <= maxCols) {
				cur += (cur ? ' ' : '') + w;
			} else {
				if (cur) lines.push(cur);
				cur = w; // never truncate words
			}
		}
		if (cur) lines.push(cur);
		return lines;
	}

	// Try wrapping at decreasing column widths to find balanced split
	for (let c = cols; c >= Math.ceil(cols * 0.5); c--) {
		const lines = tryBreaks(words, c);
		if (lines.length > 4) break; // too many lines, stop
		const lengths = lines.map(l => l.length);
		const max = Math.max(...lengths), min = Math.min(...lengths);
		const score = max - min + lines.length * 0.5; // prefer fewer lines, balanced
		if (score < bestScore) { bestScore = score; best = lines; }
	}
	return best || tryBreaks(words, cols);
}

const SPARKLE_CHARS = ['✦', '✧', '✶', '✷', '✸', '✹', '◆', '◇'];
const SPARKLE_SET   = new Set(SPARKLE_CHARS);
let sparkleTimers = [];

function stopSparkles() {
	sparkleTimers.forEach(t => clearInterval(t));
	sparkleTimers = [];
	document.querySelectorAll('[data-sparkle]').forEach(el => el.removeAttribute('data-sparkle'));
}

function triggerSparkleFlip(unit) {
	const char = unit.el.dataset.value;
	if (!SPARKLE_SET.has(char)) return;
	unit.pendingTop?.remove(); unit.pendingBottom?.remove();
	const flipTop = document.createElement('div'); flipTop.className = 'flip-top';
	const ftText = document.createElement('span'); ftText.className = 'flap-text'; ftText.textContent = char;
	flipTop.appendChild(ftText);
	const flipBottom = document.createElement('div'); flipBottom.className = 'flip-bottom';
	const fbText = document.createElement('span'); fbText.className = 'flap-text'; fbText.textContent = char;
	flipBottom.appendChild(fbText);
	unit.pendingTop = flipTop; unit.pendingBottom = flipBottom;
	unit.el.insertBefore(flipTop, unit.hinge); unit.el.insertBefore(flipBottom, unit.hinge);
	requestAnimationFrame(() => { flipTop.classList.add('flipping'); flipBottom.classList.add('flipping'); });
	setTimeout(() => { unit.pendingTop?.remove(); unit.pendingBottom?.remove(); unit.pendingTop = null; unit.pendingBottom = null; }, 360);
}

function startSparkles(activeUnits) {
	stopSparkles();
	const sparkleUnits = activeUnits.filter(u => SPARKLE_SET.has(u.el.dataset.value));
	if (!sparkleUnits.length) return;
	sparkleUnits.forEach(u => { u.el.dataset.sparkle = 'true'; });
	const iv = setInterval(() => { sparkleUnits.forEach(u => triggerSparkleFlip(u)); }, 2400);
	sparkleTimers.push(iv);
}

function sp() { return SPARKLE_CHARS[Math.floor(Math.random() * 4)]; }

// Build a row string with text at a given alignment within COLS
function alignText(text, align) {
	const w = displayWidth(text);
	const pad = Math.max(COLS - w, 0);
	if (align === 'left')   return text + ' '.repeat(pad);
	if (align === 'right')  return ' '.repeat(pad) + text;
	// center
	const l = Math.ceil(pad / 2);
	return ' '.repeat(l) + text + ' '.repeat(pad - l);
}

function spLeft()  { return sp() + ' '.repeat(COLS - 1); }
function spRight() { return ' '.repeat(COLS - 1) + sp(); }

let _cascadeTimeouts = [];
function cancelCascade() {
	_cascadeTimeouts.forEach(t => clearTimeout(t));
	_cascadeTimeouts = [];
}

function renderMessageCentered(text) {
	cancelCascade();
	stopSparkles();
	const contentRows = [row1Units, row2Units, row3Units, row4Units, row5Units];
	// Wrap at 14 chars — margin breathing room but fits longer quotes in 3 lines
	const lines = wrapBalanced(text, 14);
	const blank = ' '.repeat(COLS);
	let layout;

	// Deterministic pick — same text always gets the same template
	const textHash = Math.abs([...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0));
	const pick = arr => arr[textHash % arr.length];

	if (lines.length === 1) {
		// Single line — poster layouts with lots of breathing room
		const templates = [
			// Left-aligned, sparkle bottom-right
			[spLeft(), blank, alignText(lines[0], 'left'), blank, spRight()],
			// Right-aligned, sparkle top-left
			[spLeft(), blank, alignText(lines[0], 'right'), blank, spRight()],
			// Centered, sparkles in far corners
			[spLeft(), blank, alignText(lines[0], 'center'), blank, spRight()],
			// Low placement — left aligned, sparkle top-right
			[spRight(), blank, blank, alignText(lines[0], 'left'), spLeft()],
		];
		layout = pick(templates);

	} else if (lines.length === 2) {
		// Two lines — always a gap row between them
		const templates = [
			// Both left, sparkle top-right / bottom-right
			[spRight(), alignText(lines[0], 'left'), blank, alignText(lines[1], 'left'), spRight()],
			// Offset: line1 left, line2 right, sparkles opposing
			[spLeft(), alignText(lines[0], 'left'), blank, alignText(lines[1], 'right'), spRight()],
			// Both centered, sparkles in corners
			[spLeft(), alignText(lines[0], 'center'), blank, alignText(lines[1], 'center'), spRight()],
			// Line1 right, line2 left (converging)
			[spRight(), alignText(lines[0], 'right'), blank, alignText(lines[1], 'left'), spLeft()],
		];
		layout = pick(templates);

	} else if (lines.length === 3) {
		// Three lines — no gap rows (5 rows = 3 text + 2 sparkle)
		const templates = [
			// All left, sparkle top-right and bottom-right
			[spRight(), alignText(lines[0], 'left'), alignText(lines[1], 'left'), alignText(lines[2], 'left'), spRight()],
			// Staggered: left / center / right
			[spLeft(), alignText(lines[0], 'left'), alignText(lines[1], 'center'), alignText(lines[2], 'right'), spRight()],
			// All centered, sparkles flanking
			[spLeft(), alignText(lines[0], 'center'), alignText(lines[1], 'center'), alignText(lines[2], 'center'), spRight()],
		];
		layout = pick(templates);

	} else if (lines.length === 4) {
		// 4 lines: text fills rows 1-4, single sparkle bottom-right on row 5
		const templates = [
			[alignText(lines[0], 'left'), alignText(lines[1], 'left'), alignText(lines[2], 'left'), alignText(lines[3], 'left'), spRight()],
			[alignText(lines[0], 'center'), alignText(lines[1], 'center'), alignText(lines[2], 'center'), alignText(lines[3], 'center'), spRight()],
			[spLeft(), alignText(lines[0], 'left'), alignText(lines[1], 'left'), alignText(lines[2], 'left'), alignText(lines[3], 'left')],
		];
		layout = pick(templates);

	} else {
		// 5+ lines: fill vertically, no sparkles
		const topPad = Math.floor((CONTENT_ROWS - lines.length) / 2);
		layout = contentRows.map((_, i) => {
			const lineIdx = i - topPad;
			return (lineIdx >= 0 && lineIdx < lines.length) ? alignText(lines[lineIdx], 'center') : blank;
		});
	}

	// Set all rows directly — use immediate for first paint so blank→blank isn't skipped
	contentRows.forEach((row, i) => setRowImmediate(row, layout[i]));

	// Start sparkle animation after a brief settle
	const allUnits = contentRows.flat();
	const sparkleT = setTimeout(() => startSparkles(allUnits), 400);
	_cascadeTimeouts.push(sparkleT);
}

function getActiveQuotes() {
	return ALL_QUOTES.filter((_, i) => enabledQuotes.has(i));
}

function nextQuote() {
	if (customMessage) return;
	const active = getActiveQuotes();
	if (!active.length) return;
	quoteIndex = (quoteIndex + 1) % active.length;
	renderMessageCentered(active[quoteIndex]);
	lsSet('splitflapQuoteIndex', quoteIndex);
	lsSet('splitflapLastQuoteTime', Date.now());
	updateQuoteCountdown();
}

function updateQuoteCountdown() {
	const timeEl = document.getElementById('quote-countdown-time');
	if (!timeEl) return;
	const last = parseInt(localStorage.getItem('splitflapLastQuoteTime') || '0');
	if (!last) { timeEl.textContent = '—'; return; }
	const remainMs = quoteRotationInterval - (Date.now() - last);
	if (remainMs <= 0) { timeEl.textContent = '—'; return; }
	const totalMins = Math.ceil(remainMs / 60000);
	const hrs = Math.floor(totalMins / 60);
	const mins = totalMins % 60;
	timeEl.textContent = hrs > 0 ? `${hrs}hr${hrs !== 1 ? 's' : ''} ${mins}min${mins !== 1 ? 's' : ''}` : `${mins}min${mins !== 1 ? 's' : ''}`;
}

let quoteRotationInterval = parseInt(localStorage.getItem('splitflapQuoteInterval') || '3600000');

function showCurrentQuote() {
	if (customMessage) return;
	const active = getActiveQuotes();
	if (!active.length) return;
	renderMessageCentered(active[quoteIndex % active.length]);
}

function startQuotes() {
	customMessage = null;
	lsRemove('splitflapCustomMessage')
	showCurrentQuote();
	quoteInterval = setInterval(nextQuote, quoteRotationInterval);
}

function stopQuotes() {
	clearInterval(quoteInterval);
	quoteInterval = null;
	stopSparkles();
}

// ── Mode management ──────────────────────────────────────────────────────────
let currentMode = localStorage.getItem('splitflapMode') || 'clock';
let clockInterval = null;

function clearBoard() {
	[row1Units,row2Units,row3Units,row4Units,row5Units].forEach(r=>setRow(r,' '.repeat(COLS)));
	document.getElementById('row-5').dataset.placeholder = 'false';
}

function renderClockImmediate() {
	const now = new Date();
	const blank = ' '.repeat(COLS);
	const dateStr = buildCentered(`${pad2(now.getDate())} ${MONTHS[now.getMonth()]}`);
	const timeStr = buildCentered(`${formatHour(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`);
	const dayStr  = buildCentered(DAYS[now.getDay()], 4);
	if (showWeather) {
		setRowImmediate(row1Units, dateStr);
		setRowImmediate(row2Units, timeStr);
		setRowImmediate(row3Units, dayStr);
		const [r4, r5] = getWeatherRows(blank);
		document.getElementById('row-5').dataset.placeholder = (!weather || weather.temp === null) ? 'true' : 'false';
		setRowImmediate(row4Units, r4);
		setRowImmediate(row5Units, r5);
		_lastWeatherStr = r4 + r5;
	} else {
		setRowImmediate(row1Units, blank);
		setRowImmediate(row2Units, dateStr);
		setRowImmediate(row3Units, timeStr);
		setRowImmediate(row4Units, dayStr);
		setRowImmediate(row5Units, blank);
	}
}

function startClockMode() {
	stopQuotes();
	clearInterval(clockInterval);
	renderClockImmediate(); // paint instantly so flaps are never blank
	renderClockWeather(); driftStep();
	clockInterval = setInterval(()=>{ renderClockWeather(); driftStep(); }, 1000);
	setInterval(fetchWeather, WEATHER_TTL);
}

function renderCustomLines(lines) {
	stopSparkles();
	const contentRows = [row1Units, row2Units, row3Units, row4Units, row5Units];
	const topPad = Math.floor((CONTENT_ROWS - GRID_ROWS) / 2);
	contentRows.forEach((row, i) => {
		const lineIdx = i - topPad;
		setRow(row, (lineIdx >= 0 && lineIdx < lines.length) ? lines[lineIdx] : ' '.repeat(COLS));
	});
	const allUnits = contentRows.flat();
	const sparkleT = setTimeout(() => startSparkles(allUnits), 400);
	_cascadeTimeouts.push(sparkleT);
}

function startMessageMode() {
	clearInterval(clockInterval);
	clockInterval = null;
	if (customMessage) {
		renderCustomLines(customMessage);
	} else {
		startQuotes();
	}
}

function switchMode(mode) {
	if (mode===currentMode) return;
	currentMode=mode;
	lsSet('splitflapMode', mode)

	// Stop everything first
	clearInterval(clockInterval); clockInterval = null;
	stopWeatherLoadingAnimation();
	stopQuotes();

	// Update tab states + slide indicator
	document.querySelectorAll('.mode-tab').forEach(btn=>{
		btn.classList.toggle('active', btn.dataset.mode===mode);
	});
	updateTabIndicator(mode);

	updateQuoteNav();
	clearBoard();
	// Wait for board clear flips to finish before rendering new content
	setTimeout(() => {
		if (mode==='clock') startClockMode();
		else if (mode==='message') startMessageMode();
	}, 400);
}

// ── Startup scramble ─────────────────────────────────────────────────────────
const SCRAMBLE_CHARS  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:- ';
const SCRAMBLE_COLORS = ['#9b59b6','#3498db','#2ecc71','#e67e22','#e74c3c','#1abc9c'];

function randomChar() {
	return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

function flipToColored(unit, newChar) {
	if (unit.el.dataset.value === newChar) return;
	const currentChar = unit.el.dataset.value;
	unit.el.dataset.value = newChar;
	unit.pendingTop?.remove(); unit.pendingBottom?.remove();

	const flipTop = document.createElement('div'); flipTop.className = 'flip-top';
	const ftText  = document.createElement('span'); ftText.className  = 'flap-text'; ftText.textContent = currentChar;
	flipTop.appendChild(ftText);

	const flipBottom = document.createElement('div'); flipBottom.className = 'flip-bottom';
	const fbText     = document.createElement('span'); fbText.className     = 'flap-text'; fbText.textContent = newChar;
	flipBottom.appendChild(fbText);

	let flashColor = null;
	if (Math.random() < 0.45) {
		flashColor = SCRAMBLE_COLORS[Math.floor(Math.random() * SCRAMBLE_COLORS.length)];
		flipTop.style.background    = flashColor;
		flipBottom.style.background = flashColor;
	}

	unit.pendingTop = flipTop; unit.pendingBottom = flipBottom;
	unit.upperText.textContent = newChar;
	unit.el.insertBefore(flipTop, unit.hinge); unit.el.insertBefore(flipBottom, unit.hinge);
	requestAnimationFrame(() => { flipTop.classList.add('flipping'); flipBottom.classList.add('flipping'); });
	setTimeout(() => {
		unit.lowerText.textContent = newChar;
	}, 290);
	setTimeout(() => {
		unit.pendingTop?.remove(); unit.pendingBottom?.remove();
		unit.pendingTop = null; unit.pendingBottom = null;
	}, 500);
}

// scrambleRows: animates a specific set of rows then settles to finalRows content.
// rowPairs: array of { units, finalText }
// duration: total ms for the scramble
function scrambleRows(rowPairs, duration, onDone) {
	const FLIP_INTERVAL = 90;
	const timeouts = [];
	const intervals = [];
	const finalChars = []; // { unit, char } for cleanup guarantee

	rowPairs.forEach(({ units, finalText }, rowIdx) => {
		const text = (finalText || '').padEnd(COLS).substring(0, COLS);
		units.forEach((unit, col) => {
			const finalChar = text[col];
			const startDelay = col * 30 + rowIdx * 15;

			if (finalChar === ' ') {
				const t = setTimeout(() => flipTo(unit, ' '), startDelay);
				timeouts.push(t);
				return;
			}

			finalChars.push({ unit, char: finalChar });
			// Guarantee stopAt fires before the cleanup (leave 150ms buffer)
			const maxStopAt = duration - startDelay - 150;
			const stopAt = Math.min(
				duration * 0.52 + col * (duration * 0.28 / COLS) + Math.random() * 80,
				maxStopAt
			);

			const t = setTimeout(() => {
				const iv = setInterval(() => flipToColored(unit, randomChar()), FLIP_INTERVAL + Math.floor(Math.random() * 40));
				intervals.push(iv);
				const stop = setTimeout(() => {
					clearInterval(iv);
					flipTo(unit, finalChar);
				}, stopAt);
				timeouts.push(stop);
			}, startDelay);
			timeouts.push(t);
		});
	});

	setTimeout(() => {
		intervals.forEach(iv => clearInterval(iv));
		timeouts.forEach(t => clearTimeout(t));
		// Guarantee every unit lands on its final char
		finalChars.forEach(({ unit, char }) => flipTo(unit, char));
		if (onDone) onDone();
	}, duration);
}

function scrambleBoard(finalRows, onDone) {
	const allContentRows = [row1Units, row2Units, row3Units, row4Units, row5Units];
	const rowPairs = allContentRows.map((units, i) => ({ units, finalText: finalRows[i] || '' }));
	scrambleRows(rowPairs, 2600, onDone);
}

// ── Init ─────────────────────────────────────────────────────────────────────
applyVisualConfig();

const ACCENT_PRESETS = ['#9b59b6','#3498db','#2ecc71','#e67e22','#e74c3c','#1abc9c'];
const storedAccent = window.__accentColor || getStoredOrQueryValue('accentColor','splitflapAccentColor') || ACCENT_PRESETS[0];
applyAccentColor(storedAccent);

// ── Modal ────────────────────────────────────────────────────────────────────
const modalOverlay = document.getElementById('modal-overlay');

let _countdownInterval = null;
let _modalSnapshot = null;
let _modalSaved = false;

function closeModal() {
	if (!_modalSaved && _modalSnapshot) {
		customMessage = _modalSnapshot.customMessage;
		if (_modalSnapshot.mode !== currentMode) {
			switchMode(_modalSnapshot.mode);
		} else if (currentMode === 'message') {
			if (customMessage) { stopQuotes(); renderCustomLines(customMessage); }
			else startQuotes();
		}
	}
	_modalSnapshot = null;
	_modalSaved = false;
	modalOverlay.classList.remove('visible');
	clearInterval(_countdownInterval);
	_countdownInterval = null;
}

document.getElementById('btn-customize').addEventListener('click', openModal);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-save').addEventListener('click', () => {
	_modalSaved = true;
	const customChecked = document.querySelector('input[name="msg-mode"][value="custom"]')?.checked;
	const messageTabActive = document.getElementById('tab-message')?.classList.contains('active');
	if (messageTabActive) {
		if (customChecked) {
			const lines = gridCells.map(row => row.map(c => c.value || ' ').join(''));
			customMessage = lines;
			lsSet('splitflapCustomMessage', JSON.stringify(lines))
			if (currentMode !== 'message') switchMode('message');
			else { stopQuotes(); renderCustomLines(lines); }
		} else {
			customMessage = null;
			lsRemove('splitflapCustomMessage')
			if (currentMode !== 'message') switchMode('message');
			else startQuotes();
		}
	}
	closeModal();
});
modalOverlay.addEventListener('click', e=>{ if(e.target===modalOverlay) closeModal(); });

// Swatches
const swatchContainer = document.getElementById('color-swatches');
ACCENT_PRESETS.forEach(hex=>{
	const btn=document.createElement('button');
	btn.className='swatch'+(hex===storedAccent?' active':'');
	btn.dataset.color=hex; btn.style.background=hex;
	btn.addEventListener('click',()=>{
		lsSet('splitflapAccentColor', hex);
		accentFlip(hex);
		swatchContainer.querySelectorAll('.swatch').forEach(s=>s.classList.toggle('active',s===btn));
	});
	swatchContainer.appendChild(btn);
});

// City autocomplete
const cityInput     = document.getElementById('city-input');
const cityDropdown  = document.getElementById('city-dropdown');
const cityClearBtn  = document.getElementById('city-clear-btn');
let cityResults     = [];
let highlightedIdx  = -1;
let searchDebounce  = null;

function updateCityClearBtn() {
	cityClearBtn.classList.toggle('visible', !!cityInput.value.trim());
}

let storedCity = getStoredOrQueryValue('city', 'splitflapCity');
if (storedCity) { cityInput.value = storedCity; updateCityClearBtn(); }

cityClearBtn.addEventListener('click', () => {
	cityInput.value = '';
	storedCity = null;
	weatherCoords = null;
	weather = null;
	weatherFetchedAt = 0;
	_lastWeatherStr = null;
	lsRemove('splitflapCity')
	stopWeatherLoadingAnimation();
	updateCityClearBtn();
	closeDropdown();
	if (currentMode === 'clock') {
		document.getElementById('row-5').dataset.placeholder = 'true';
		setRow(row5Units, buildCentered('SET A CITY'));
	}
});

async function searchCities(query) {
	if (query.length < 2) { closeDropdown(); return; }
	try {
		const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`);
		const data = await res.json();
		cityResults = data.results || [];
		renderDropdown();
	} catch(_) { closeDropdown(); }
}

function renderDropdown() {
	cityDropdown.innerHTML = '';
	highlightedIdx = -1;
	if (!cityResults.length) { closeDropdown(); return; }
	cityResults.forEach((r, i) => {
		const li = document.createElement('li');
		const sub = [r.admin1, r.country].filter(Boolean).join(', ');
		li.innerHTML = `<div>${r.name}</div>${sub ? `<div class="city-sub">${sub}</div>` : ''}`;
		li.addEventListener('mousedown', e => { e.preventDefault(); selectCity(i); });
		cityDropdown.appendChild(li);
	});
	cityDropdown.classList.add('open');
}

function closeDropdown() {
	cityDropdown.classList.remove('open');
	cityDropdown.innerHTML = '';
	cityResults = [];
	highlightedIdx = -1;
}

function setHighlight(idx) {
	const items = cityDropdown.querySelectorAll('li');
	items.forEach((li, i) => li.classList.toggle('highlighted', i === idx));
	highlightedIdx = idx;
}

async function selectCity(idx) {
	const r = cityResults[idx];
	if (!r) return;
	weatherCoords = { lat: r.latitude, lon: r.longitude, city: r.name.toUpperCase().substring(0, 10) };
	cityInput.value = r.name;
	updateCityClearBtn();
	lsSet('splitflapCity', r.name)
	closeDropdown();
	weather = null; weatherFetchedAt = 0;
	await fetchWeather(true);
	if (currentMode === 'clock') renderClockWeather();
}

cityInput.addEventListener('input', () => {
	updateCityClearBtn();
	clearTimeout(searchDebounce);
	searchDebounce = setTimeout(() => searchCities(cityInput.value.trim()), 250);
});

cityInput.addEventListener('keydown', e => {
	const items = cityDropdown.querySelectorAll('li');
	if (e.key === 'ArrowDown') {
		e.preventDefault();
		setHighlight(Math.min(highlightedIdx + 1, items.length - 1));
	} else if (e.key === 'ArrowUp') {
		e.preventDefault();
		setHighlight(Math.max(highlightedIdx - 1, 0));
	} else if (e.key === 'Enter') {
		e.preventDefault();
		if (highlightedIdx >= 0) selectCity(highlightedIdx);
		else if (cityResults.length) selectCity(0);
	} else if (e.key === 'Escape') {
		closeDropdown();
	}
});

document.addEventListener('click', e => {
	if (!cityInput.contains(e.target) && !cityDropdown.contains(e.target)) closeDropdown();
});

// Weather toggle
const weatherToggle = document.getElementById('weather-toggle');
const weatherSettings = document.getElementById('weather-settings');
weatherToggle.checked = showWeather;
weatherSettings.style.display = showWeather ? '' : 'none';
weatherToggle.addEventListener('change', () => {
	showWeather = weatherToggle.checked;
	lsSet('splitflapShowWeather', showWeather)
	weatherSettings.style.display = showWeather ? '' : 'none';
	if (currentMode === 'clock') {
		_lastWeatherStr = null;
		stopWeatherLoadingAnimation();
		// Clear all 5 rows first, then re-render
		[row1Units,row2Units,row3Units,row4Units,row5Units].forEach(r => setRow(r, ' '.repeat(COLS)));
		setTimeout(() => renderClockWeather(), 400);
	}
});

const formatPicker=document.getElementById('time-format-picker');
formatPicker.value=use24Hour?'24':'12';
formatPicker.addEventListener('change',e=>setTimeFormat(e.target.value==='24'));

const tempPicker=document.getElementById('temp-unit-picker');
tempPicker.value=tempUnit;
tempPicker.addEventListener('change',e=>setTempUnit(e.target.value));

const themeSwatches = document.querySelectorAll('.theme-swatch');
const currentTheme = document.body.dataset.theme || 'charcoal';
themeSwatches.forEach(btn => {
	btn.classList.toggle('active', btn.dataset.theme === currentTheme);
	btn.addEventListener('click', () => {
		setTheme(btn.dataset.theme);
		themeSwatches.forEach(b => b.classList.toggle('active', b === btn));
	});
});

// Mode tabs + sliding indicator
const tabIndicator = document.getElementById('mode-tab-indicator');

function updateTabIndicator(mode) {
	const activeTab = document.querySelector(`.mode-tab[data-mode="${mode}"]`);
	const tabsEl = document.getElementById('mode-tabs');
	if (!activeTab || !tabIndicator || !tabsEl) return;
	const pad = parseInt(getComputedStyle(tabsEl).paddingLeft) || 5;
	tabIndicator.style.width = activeTab.offsetWidth + 'px';
	// offsetLeft is relative to parent — subtract padding since indicator starts at left:pad
	tabIndicator.style.transform = `translateX(${activeTab.offsetLeft - pad}px)`;
}

document.querySelectorAll('.mode-tab').forEach(btn=>{
	btn.addEventListener('click', () => switchMode(btn.dataset.mode));
});

// ── Quote nav ────────────────────────────────────────────────────────────────
const quoteNavEl = document.getElementById('quote-nav');

function updateQuoteNav() {
	const show = currentMode === 'message' && !customMessage;
	quoteNavEl.classList.toggle('visible', show);
}

document.getElementById('btn-prev-quote').addEventListener('click', () => {
	if (customMessage) return;
	const active = getActiveQuotes();
	if (!active.length) return;
	quoteIndex = (quoteIndex - 1 + active.length) % active.length;
	showCurrentQuote();
});

document.getElementById('btn-next-quote').addEventListener('click', () => {
	if (customMessage) return;
	nextQuote();
});

// Init tab states + indicator to match restored mode
updateQuoteNav();
requestAnimationFrame(() => {
	document.querySelectorAll('.mode-tab').forEach(btn => {
		btn.classList.toggle('active', btn.dataset.mode === currentMode);
	});
	updateTabIndicator(currentMode);
});

// ── Modal tabs ────────────────────────────────────────────────────────────────
document.querySelectorAll('.modal-tab').forEach(tab => {
	tab.addEventListener('click', () => {
		document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
		document.querySelectorAll('.modal-tab-panel').forEach(p => p.classList.remove('active'));
		tab.classList.add('active');
		document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
	});
});

// Auto-switch to relevant tab when modal opens
function openModal() {
	_modalSaved = false;
	_modalSnapshot = { customMessage: customMessage ? JSON.parse(JSON.stringify(customMessage)) : null, mode: currentMode };
	modalOverlay.classList.add('visible');
	updateQuoteCountdown();
	_countdownInterval = setInterval(updateQuoteCountdown, 60000);
	// Always open on Display tab
	const targetTab = 'display';
	document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === targetTab));
	document.querySelectorAll('.modal-tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${targetTab}`));
	// Restore custom message state if saved
	if (customMessage) {
		const customRadio = document.querySelector('input[name="msg-mode"][value="custom"]');
		if (customRadio) { customRadio.checked = true; customRadio.dispatchEvent(new Event('change')); }
		customMessage.forEach((line, r) => {
			const trimmed = line.trimEnd();
			for (let c = 0; c < COLS; c++) {
				if (gridCells[r] && gridCells[r][c]) gridCells[r][c].value = trimmed[c] === ' ' || trimmed[c] === undefined ? '' : (trimmed[c] || '');
			}
		});
	}
}

// ── Quotes list ───────────────────────────────────────────────────────────────
const quotesList = document.getElementById('quotes-list');

function buildQuotesList() {
	quotesList.innerHTML = '';
	ALL_QUOTES.forEach((q, i) => {
		const item = document.createElement('div');
		item.className = 'quote-item' + (enabledQuotes.has(i) ? ' active' : '');
		item.innerHTML = `
			<div class="quote-check">
				<svg width="10" height="8" viewBox="0 0 10 8" fill="none">
					<path d="M1 4l3 3 5-6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</div>
			<div class="quote-text">${q}</div>`;
		item.addEventListener('click', () => {
			if (enabledQuotes.has(i)) {
				if (enabledQuotes.size > 1) enabledQuotes.delete(i);
			} else {
				enabledQuotes.add(i);
			}
			lsSet('splitflapEnabledQuotes', JSON.stringify([...enabledQuotes]))
			item.classList.toggle('active', enabledQuotes.has(i));
		});
		quotesList.appendChild(item);
	});
}
buildQuotesList();

// Interval buttons
document.querySelectorAll('.interval-btn').forEach(btn => {
	const val = parseInt(btn.dataset.interval);
	btn.classList.toggle('active', val === quoteRotationInterval);
	btn.addEventListener('click', () => {
		quoteRotationInterval = val;
		lsSet('splitflapQuoteInterval', val)
		document.querySelectorAll('.interval-btn').forEach(b => b.classList.toggle('active', b === btn));
		// Restart quote timer with new interval — don't advance the quote
		if (currentMode === 'message' && !customMessage) {
			clearInterval(quoteInterval);
			quoteInterval = setInterval(nextQuote, quoteRotationInterval);
		}
		updateQuoteCountdown();
	});
});

// ── Message mode radio ────────────────────────────────────────────────────────
const msgPanelQuotes = document.getElementById('msg-panel-quotes');
const msgPanelCustom = document.getElementById('msg-panel-custom');
const quotesIntervalRow = document.querySelector('.quotes-interval');
document.querySelectorAll('input[name="msg-mode"]').forEach(radio => {
	radio.addEventListener('change', () => {
		const isQuotes = radio.value === 'quotes';
		msgPanelQuotes.style.display = isQuotes ? '' : 'none';
		quotesIntervalRow.style.display = isQuotes ? '' : 'none';
		msgPanelCustom.style.display = isQuotes ? 'none' : '';
		// Preview on board immediately
		if (isQuotes) {
			customMessage = null;
			if (currentMode !== 'message') switchMode('message');
			else startQuotes();
		} else {
			const lines = gridCells.map(row => row.map(c => c.value || ' ').join(''));
			customMessage = lines;
			if (currentMode !== 'message') switchMode('message');
			else { stopQuotes(); renderCustomLines(lines); }
		}
		updateQuoteNav();
	});
});

// ── Flap grid input ───────────────────────────────────────────────────────────
const GRID_ROWS = 5;
const flapGridEl = document.getElementById('flap-grid-input');
const gridCells = [];

function addAccentRow() {
	for (let c = 0; c < COLS; c++) {
		const div = document.createElement('div');
		div.className = (c === 0 || c === COLS - 1) ? 'flap-cell-accent' : 'flap-cell-accent-plain';
		flapGridEl.appendChild(div);
	}
}

addAccentRow(); // top accent row

for (let r = 0; r < GRID_ROWS; r++) {
	const rowCells = [];
	for (let c = 0; c < COLS; c++) {
		const inp = document.createElement('input');
		inp.type = 'text';
		inp.maxLength = 1;
		inp.className = 'flap-cell-input';
		inp.dataset.row = r;
		inp.dataset.col = c;

		inp.addEventListener('keydown', e => {
			const ri = +inp.dataset.row, ci = +inp.dataset.col;
			if (e.key === 'Backspace') {
				if (inp.value === '' && ci > 0) { e.preventDefault(); gridCells[ri][ci-1].focus(); gridCells[ri][ci-1].value = ''; }
			} else if (e.key === 'ArrowLeft' && ci > 0) { gridCells[ri][ci-1].focus(); }
			else if (e.key === 'ArrowRight' && ci < COLS-1) { gridCells[ri][ci+1].focus(); }
			else if (e.key === 'ArrowUp' && ri > 0) { gridCells[ri-1][ci].focus(); }
			else if (e.key === 'ArrowDown' && ri < GRID_ROWS-1) { gridCells[ri+1][ci].focus(); }
		});

		inp.addEventListener('input', () => {
			const raw = inp.value;
			// Allow sparkle chars as-is, otherwise uppercase last char
			const ch = [...raw].pop() || '';
			inp.value = SPARKLE_SET.has(ch) ? ch : ch.toUpperCase();
			const ri = +inp.dataset.row, ci = +inp.dataset.col;
			if (inp.value && ci < COLS-1) gridCells[ri][ci+1].focus();
		});

		flapGridEl.appendChild(inp);
		rowCells.push(inp);
	}
	gridCells.push(rowCells);
}

addAccentRow(); // bottom accent row

// ── Sparkle chip picker ───────────────────────────────────────────────────────
let lastFocusedCell = null;
gridCells.flat().forEach(inp => {
	inp.addEventListener('focus', () => { lastFocusedCell = inp; });
});

const sparkleChipsEl = document.getElementById('sparkle-chips');
// Animate chips through the sparkle chars so user sees the cycling effect
let chipAnimIdx = 0;
const CHIP_SPARKLES = SPARKLE_CHARS.slice(0, 6); // show first 6 chars as chips
CHIP_SPARKLES.forEach((ch) => {
	const chip = document.createElement('button');
	chip.className = 'sparkle-chip';
	chip.textContent = ch;
	chip.title = 'Insert sparkle';
	chip.addEventListener('mousedown', e => {
		e.preventDefault(); // don't steal focus from grid cell
		const target = lastFocusedCell || gridCells[0][0];
		target.value = ch;
		// Move focus to next cell
		const ri = +target.dataset.row, ci = +target.dataset.col;
		if (ci < COLS - 1) gridCells[ri][ci + 1].focus();
		else target.focus();
	});
	sparkleChipsEl.appendChild(chip);
});

// Animate the chips to cycle through sparkle chars (preview of the animation)
setInterval(() => {
	chipAnimIdx = (chipAnimIdx + 1) % SPARKLE_CHARS.length;
	const chips = sparkleChipsEl.querySelectorAll('.sparkle-chip');
	chips.forEach((chip, i) => {
		chip.textContent = SPARKLE_CHARS[(chipAnimIdx + i) % SPARKLE_CHARS.length];
	});
}, 1800);


document.getElementById('flap-grid-clear').addEventListener('click', () => {
	gridCells.flat().forEach(c => { c.value = ''; });
	gridCells[0][0].focus();
});

// Keyboard
document.addEventListener('keydown',e=>{
	if (e.key==='Escape') closeModal();
});

// Build the first frame of clock content to pass to scramble
function getClockFinalRows() {
	const now = new Date();
	const blank = ' '.repeat(COLS);
	const dateStr = buildCentered(`${pad2(now.getDate())} ${MONTHS[now.getMonth()]}`);
	const timeStr = buildCentered(`${formatHour(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`);
	const dayStr  = buildCentered(DAYS[now.getDay()], 4);
	if (showWeather) {
		const [r4, r5] = getWeatherRows(blank);
		return [dateStr, timeStr, dayStr, r4, r5];
	}
	return [blank, dateStr, timeStr, dayStr, blank];
}


// ── Init: start immediately, fetch weather in parallel
function init() {
	if (currentMode === 'message') {
		startMessageMode();
	} else {
		startClockMode();
	}

	if (showWeather && storedCity) {
		geocodeCity(storedCity).then(coords => {
			if (coords) { weatherCoords = coords; fetchWeather(true); }
		});
	}
}

init();
