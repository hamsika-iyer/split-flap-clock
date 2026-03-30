# Split-Flap Clock

A browser-based split-flap display screensaver that shows the time, weather, and scrolling messages — styled after the classic mechanical departure boards found in airports and train stations.

## Features

**Clock & Weather mode**
- Displays current time (12h or 24h format), day of week, and date
- Optional live weather for any city — temperature, condition, and high/low
- Celsius or Fahrenheit

**Message mode**
- Cycles through a curated set of quotes on a configurable interval (hourly or daily)
- Navigate quotes manually with previous/next controls
- Custom message mode: type your own text into the flap grid with optional sparkle effects

**Customization**
- Three board themes: Charcoal, Graphite, Light
- Accent color for the top and bottom rows (white, yellow, blue, red, and more)
- All settings persist via `localStorage`

## Usage

Open `index.html` directly in a browser — no build step or server required.

### URL parameters

Settings can also be passed as query parameters (they override stored values):

| Parameter   | Values                          | Description          |
|-------------|---------------------------------|----------------------|
| `textColor` | `white`, `yellow`, `blue`, `red`| Flap text color      |
| `theme`     | `charcoal`, `graphite`, `light` | Board theme          |

Example: `index.html?theme=light&textColor=yellow`

## Files

```
index.html   — markup and modal UI
script.js    — all display logic, animation, weather API, and settings
style.css    — board, flap, and modal styling
favicon.svg  — SVG icon
```
