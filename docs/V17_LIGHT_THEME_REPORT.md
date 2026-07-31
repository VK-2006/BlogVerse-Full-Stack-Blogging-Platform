# BlogVerse V17 Light Theme Report

## Scope

Only `[data-theme="light"]` is modified. Dark theme selectors, variables and component rules are not changed.

## Root cause fixed

The original About and Contact hero styles hardcoded white heading/paragraph colors for dark gradient heroes. Later universal page-header styles changed those hero surfaces to a light background, producing white or faded copy on a light surface. V17 adds a final, light-only cascade layer that explicitly pairs light surfaces with dark readable typography.

## Main changes

- New `frontend/src/light-theme-v17.css`, imported last.
- Refined light semantic palette for page, surfaces, text, borders, inputs, chips and navigation.
- About hero: dark heading, dark supporting copy, visible eyebrow, light purple/teal background, readable CTA and visual notes.
- Contact hero: dark heading, dark supporting copy, visible eyebrow and light gradient.
- Contact cards/form: explicit readable headings, labels, inputs, placeholders, notes, success and error states.
- Responsive fixes at 920px, 700px and 480px.

## Automated source checks

- Light CSS imported last: PASS
- Dark selectors in V17 CSS: 0
- All qualified V17 selectors scoped to light theme: PASS
- CSS parse/brace balance: PASS
- Core contrast pairs: PASS

## Core contrast ratios

- Primary body text on page: 15.24:1
- Secondary body text on page: 7.36:1
- About/Contact heading on hero: 15.65:1
- About/Contact paragraph on hero: 7.55:1
- Chip text: 8.67:1
- Input text: 16.27:1
- Placeholder text: 4.68:1

## Limitation

The generation environment could not complete a reliable Chromium screenshot because its headless browser process stalled. Source parsing and contrast calculations passed. The included Windows verifier runs the source checks and, when dependencies are installed, the actual Vite production build on the user's laptop.
