const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const COLS = 12;
const COLOR_OPTIONS = new Set(['white', 'yellow', 'blue', 'red']);
const THEME_OPTIONS = new Set(['charcoal', 'graphite', 'light']);

// Parse once — reused by all getStoredOrQueryValue calls
const _params = new URLSearchParams(window.location.search);

function getStoredOrQueryValue(queryKey, storageKey) {
	const fromQuery = (_params.get(queryKey) || '').trim();
	try {
		if (fromQuery) {
			localStorage.setItem(storageKey, fromQuery);
			return fromQuery;
		}
		return (localStorage.getItem(storageKey) || '').trim();
	} catch (_) {
		return fromQuery;
	}
}


function hexToHsl(hex) {
	let r = parseInt(hex.slice(1, 3), 16) / 255;
	let g = parseInt(hex.slice(3, 5), 16) / 255;
	let b = parseInt(hex.slice(5, 7), 16) / 255;
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	let h, s, l = (max + min) / 2;
	if (max === min) {
		h = s = 0;
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
			case g: h = ((b - r) / d + 2) / 6; break;
			case b: h = ((r - g) / d + 4) / 6; break;
		}
	}
	return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
	h /= 360; s /= 100; l /= 100;
	let r, g, b;
	if (s === 0) {
		r = g = b = l;
	} else {
		const hue2rgb = (p, q, t) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}
	return '#' + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

function applyAccentColor(hex) {
	const [h, s, l] = hexToHsl(hex);
	document.documentElement.style.setProperty('--accent-well', hslToHex(h, s, l * 0.55));
	document.documentElement.style.setProperty('--accent-upper', hex);
	document.documentElement.style.setProperty('--accent-lower', hslToHex(h, s, l * 0.85));
}

function applyVisualConfig() {
	const colorChoice = getStoredOrQueryValue('textColor', 'splitflapTextColor').toLowerCase();
	const themeChoice = getStoredOrQueryValue('theme', 'splitflapTheme').toLowerCase();

	document.body.dataset.textColor = COLOR_OPTIONS.has(colorChoice) ? colorChoice : 'white';

	// Swift injection wins over localStorage for theme
	const resolvedTheme = (window.__theme || themeChoice).toLowerCase();
	document.body.dataset.theme = THEME_OPTIONS.has(resolvedTheme) ? resolvedTheme : 'charcoal';

	const deviceNameEl = document.getElementById('board-device-name');
	if (deviceNameEl) {
		deviceNameEl.textContent = window.__deviceName || 'The Split-Flap Clock';
	}
}

// Builds one flap unit imperatively and returns cached child references,
// avoiding repeated querySelector calls during animation.
function createUnit(container, isAccent = false) {
	const el = document.createElement('div');
	el.className = 'flap-unit';
	el.dataset.value = ' ';
	if (isAccent) el.classList.add('accent');

	const upper = document.createElement('div');
	upper.className = 'flap-upper';
	const upperText = document.createElement('span');
	upperText.className = 'flap-text';
	upperText.textContent = ' ';
	upper.appendChild(upperText);

	const lower = document.createElement('div');
	lower.className = 'flap-lower';
	const lowerText = document.createElement('span');
	lowerText.className = 'flap-text';
	lowerText.textContent = ' ';
	lower.appendChild(lowerText);

	const hinge = document.createElement('div');
	hinge.className = 'hinge';

	el.appendChild(upper);
	el.appendChild(lower);
	el.appendChild(hinge);
	container.appendChild(el);

	return { el, upper, upperText, lower, lowerText, hinge, pendingTop: null, pendingBottom: null };
}

function createRow(container, accentSet = new Set()) {
	return Array.from({ length: COLS }, (_, i) => createUnit(container, accentSet.has(i)));
}

const accentCorners = new Set([0, COLS - 1]);
createRow(document.getElementById('accent-row-top'), accentCorners);
const dateUnits = createRow(document.getElementById('date-row'));
const timeUnits = createRow(document.getElementById('time-row'));
const dayUnits = createRow(document.getElementById('day-row'));
createRow(document.getElementById('accent-row-bottom'), accentCorners);

function flipTo(unit, newChar) {
	if (unit.el.dataset.value === newChar) return;
	const currentChar = unit.el.dataset.value;
	unit.el.dataset.value = newChar;

	// Cancel any in-progress flip
	unit.pendingTop?.remove();
	unit.pendingBottom?.remove();

	const flipTop = document.createElement('div');
	flipTop.className = 'flip-top';
	const ftText = document.createElement('span');
	ftText.className = 'flap-text';
	ftText.textContent = currentChar;
	flipTop.appendChild(ftText);

	const flipBottom = document.createElement('div');
	flipBottom.className = 'flip-bottom';
	const fbText = document.createElement('span');
	fbText.className = 'flap-text';
	fbText.textContent = newChar;
	flipBottom.appendChild(fbText);

	unit.pendingTop = flipTop;
	unit.pendingBottom = flipBottom;

	unit.upperText.textContent = newChar;
	unit.el.insertBefore(flipTop, unit.hinge);
	unit.el.insertBefore(flipBottom, unit.hinge);

	requestAnimationFrame(() => {
		flipTop.classList.add('flipping');
		flipBottom.classList.add('flipping');
	});

	setTimeout(() => {
		unit.lowerText.textContent = newChar;
		unit.pendingTop?.remove();
		unit.pendingBottom?.remove();
		unit.pendingTop = null;
		unit.pendingBottom = null;
	}, 700);
}

function setRow(units, text) {
	const padded = text.padEnd(COLS).substring(0, COLS);
	for (let c = 0; c < COLS; c++) {
		flipTo(units[c], padded[c]);
	}
}

function pad2(n) {
	return n.toString().padStart(2, '0');
}

function buildRowCentered(text) {
	const remaining = Math.max(COLS - text.length, 0);
	const leftPad = Math.ceil(remaining / 2);
	return ' '.repeat(leftPad) + text + ' '.repeat(remaining - leftPad);
}

let use24Hour = window.__use24Hour ?? (getStoredOrQueryValue('timeFormat', 'splitflapTimeFormat') === '24');

function setTimeFormat(is24h) {
	use24Hour = is24h;
	try { localStorage.setItem('splitflapTimeFormat', is24h ? '24' : '12'); } catch (_) {}
}

function setTheme(theme) {
	document.body.dataset.theme = THEME_OPTIONS.has(theme) ? theme : 'charcoal';
	try { localStorage.setItem('splitflapTheme', theme); } catch (_) {}
}

function formatHour(h) {
	return pad2(use24Hour ? h : (h % 12 || 12));
}

function update() {
	const now = new Date();
	setRow(dateUnits, buildRowCentered(`${pad2(now.getDate())} ${MONTHS[now.getMonth()]}`));
	setRow(timeUnits, buildRowCentered(`${formatHour(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`));
	setRow(dayUnits, buildRowCentered(DAYS[now.getDay()]));
}

// Anti burn-in: Lissajous drift — two incommensurable frequencies (1 and √2)
// ensure the path never exactly repeats, spreading load across all pixel positions.
const board = document.querySelector('.board');
let driftAngle = 0;
const DRIFT_RADIUS = 35;
function driftStep() {
	driftAngle += 0.018;
	board.style.marginLeft = `${Math.sin(driftAngle) * DRIFT_RADIUS}px`;
	board.style.marginTop  = `${Math.sin(driftAngle * Math.SQRT2) * DRIFT_RADIUS}px`;
}

applyVisualConfig();

const ACCENT_PRESETS = ['#9b59b6', '#3498db', '#2ecc71', '#e67e22', '#e74c3c', '#1abc9c'];

const storedAccent = window.__accentColor || getStoredOrQueryValue('accentColor', 'splitflapAccentColor') || ACCENT_PRESETS[0];
applyAccentColor(storedAccent);

// Settings panel
const settingsPanel = document.getElementById('settings-panel');

// Colour swatches — generated from ACCENT_PRESETS so Swift and JS stay in sync
const swatchContainer = document.getElementById('color-swatches');
ACCENT_PRESETS.forEach(hex => {
	const btn = document.createElement('button');
	btn.className = 'swatch' + (hex === storedAccent ? ' active' : '');
	btn.dataset.color = hex;
	btn.style.background = hex;
	btn.addEventListener('click', () => {
		try { localStorage.setItem('splitflapAccentColor', hex); } catch (_) {}
		applyAccentColor(hex);
		swatchContainer.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s === btn));
	});
	swatchContainer.appendChild(btn);
});

const formatPicker = document.getElementById('time-format-picker');
formatPicker.value = use24Hour ? '24' : '12';
formatPicker.addEventListener('change', e => {
	setTimeFormat(e.target.value === '24');
});

const themePicker = document.getElementById('theme-picker');
themePicker.value = document.body.dataset.theme || 'charcoal';
themePicker.addEventListener('change', e => {
	setTheme(e.target.value);
});

document.addEventListener('keydown', e => {
	if (e.key === 's' || e.key === 'S') {
		const visible = settingsPanel.classList.toggle('visible');
		document.body.style.cursor = visible ? 'default' : 'none';
	}
});

update();
driftStep();
setInterval(() => { update(); driftStep(); }, 1000);
