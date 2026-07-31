# BlogVerse V15 Theme Audit Report

## 1. Root cause

The frontend accumulated several versioned CSS layers (`styles.css`, `ui-v11.css`, `admin-v13.css`, and the V14 emergency contrast layer). Those files contained overlapping root variables, hardcoded neutral colors, theme-specific selectors, and high-specificity overrides. The same component could therefore receive a background from one file and text from another. The Explore hero also forced white text and a dark background in both themes.

## 2. Theme files created or modified

Created:

- `frontend/src/theme-tokens-v15.css`
- `frontend/src/theme-components-v15.css`
- `frontend/scripts/verify-theme-v15.mjs`
- `frontend/scripts/audit-theme-v15.py`
- `frontend/theme-audit-v15.html`

Modified:

- `frontend/src/main.jsx`
- `frontend/src/context/ThemeContext.jsx`
- `frontend/src/components/Navbar.jsx`
- `frontend/index.html`
- `frontend/package.json`

The old `theme-contrast-v14.css` file is retained for history but is no longer imported.

## 3. Pages and components covered

Routes inspected in source and covered by the final semantic component layer:

- Home `/`
- Explore `/explore`
- Communities `/communities`
- About `/about`
- Contact `/contact`
- Post details `/post/:slug`
- Public and own profile `/profile/:id`, `/profile`
- Sign in and registration `/login`, `/register`
- Forgot and reset password
- Dashboard
- Create and edit post
- Bookmarks
- Account settings
- Admin account management and post moderation
- Loading, empty, error, modal, prompt, footer, navbar and 404 states

Component groups covered include navigation, cards, forms, buttons, chips, badges, tables, community replies, article content, profile panels, admin panels, dialogs, alerts, skeletons, scrollbars and mobile navigation.

## 4. Centralized semantic token system

V15 defines separate light and dark values for semantic tokens such as:

- page and surface backgrounds
- primary, secondary and muted text
- headings and inverse text
- borders and dividers
- inputs, placeholders and disabled fields
- links and icons
- primary, success, warning, danger and information states
- overlays, shadows and focus rings
- chips, cards and navbar surfaces

Legacy variables such as `--ink`, `--paper`, `--muted`, `--surface`, and `--border-color` are mapped to the semantic tokens so existing components continue working without layout or logic changes.

## 5. Hardcoded colors replaced

Theme-sensitive neutral colors for text, surfaces, forms, navigation, tables, cards, community content, profile content and admin content are now resolved through semantic variables. Raw colors remain only where intentional, such as BlogVerse purple/teal gradients, dark editorial banners, semantic status colors and code blocks.

The new final component layer has zero non-accessibility `!important` declarations. The only remaining `!important` declarations are inside the reduced-motion accessibility block.

## 6. Theme persistence

- Theme is stored under `blogverse_theme`.
- `document.documentElement.dataset.theme` is the single DOM source of truth.
- Stored preference is restored after refresh.
- System preference is used only when no stored preference exists.
- System changes are followed only while the user has not selected a fixed theme.
- Initial inline HTML logic prevents a wrong-theme flash.
- Theme toggle exposes an accessible `aria-pressed` state.

## 7. Accessibility and contrast

Automated semantic-token checks passed at or above 4.5:1 for:

- primary, secondary and muted text
- input text and placeholders
- links
- chips
- success messages
- danger messages

Additional improvements include visible focus rings, themed disabled/read-only fields, autofill support, forced-colors support, reduced-motion support and status labels that include text rather than color alone.

## 8. Responsive verification

Chromium rendered the representative theme fixture at:

- 320px
- 375px
- 768px
- 1024px
- 1440px

for both light and dark themes. Ten screenshots were generated. The audit checked 658 visible component samples and reported zero hidden or transparent visible-text failures.

## 9. Source and syntax verification

Passed in the generation environment:

- 29 JavaScript/JSX files parsed with the TypeScript parser
- 6 CSS files parsed with PostCSS
- Backend JavaScript syntax checks
- Route and page file matrix
- Semantic token presence
- 18 semantic contrast pairs
- Theme import order
- Theme persistence checks
- Responsive breakpoint checks
- ZIP integrity

## 10. Build, lint and test limitation

A complete Vite production build could not run in the generation environment because its internal npm registry returned `404 Not Found` for `@vitejs/plugin-react`. The project itself was not the cause of that registry failure. The project does not currently define a lint script or a unit-test script.

Run `verify-v15-theme.bat` on the target laptop. It runs the V15 source verifier and the actual local `npm run build` using the installed dependencies.
