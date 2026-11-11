# widgets-kit

[![live](https://img.shields.io/badge/live-online-22c55e)](https://drsamonline.github.io/widgets-kit/)
[![test](https://github.com/drsamonline/widgets-kit/actions/workflows/test.yml/badge.svg)](https://github.com/drsamonline/widgets-kit/actions/workflows/test.yml)
[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-blue)](LICENSE)

**The component layer for offline apps.** Zero dependencies. One file. Buttons, tags, avatars,
badges, alerts, progress, modals, drawers, toasts, tooltips, popovers, menus, tabs, accordion,
pagination, breadcrumbs, steps, skeletons, grids and headers — with the behaviours that matter
actually implemented.

## Use it

```js
var W = require("./widgets-kit.js");          // Node; in a browser it is window.Widgets

document.body.appendChild(W.button({ label: "Save", variant: "primary" }).el);

var m = W.modal({ title: "Delete?", body: "This cannot be undone." });
m.mount(document.body).open();                // focus is trapped, Escape closes

W.toastHost();  W.toast("Saved", { type: "success" });
```

## What it does

- **Action** — `button` (variants, sizes, icon, block), `actionIcon`, `actionIconGroup`,
  `copyButton` (confirms what it copied, and says so when it cannot), `segmented`
- **Display** — `text`, `tag` (closable), `avatar` (image or initials), `groupAvatar` with a
  remainder, `icon` from path data, `image`, `list` (**keyed**: the same node is reused, so a
  re-render keeps focus), `accordion`, `empty`, `skeleton`
- **Feedback** — `alert` (four kinds, live-region roles), `badge` (count, max, dot), `progress`
  (determinate and indeterminate), `spinner`, `result`, `modal`, `drawer`, `toast` with a host
- **Overlay** — `tooltip` (hover and focus, with a delay), `popover`, `dropdownMenu` (outside
  click, Escape, separators, dangerous items)
- **Nav** — `tabs` (arrow keys, Home/End, panels wired by `aria-controls`), `pagination`
  (ellipsis, disabled ends), `breadcrumb`, `steps`
- **Layout** — `block`, `grid` (auto-fill or fixed columns), `divider` (labelled or vertical),
  `scrollArea`, `header` (left, title, right)

Behaviours that are usually faked are real here: the modal traps Tab, restores focus to
whatever opened it, and closes on Escape or the backdrop; the menu closes on an outside click;
tabs move with arrow keys; the accordion keeps `aria-expanded` and the panel's `hidden` in step.

## Styling

The kit ships **no CSS**. Every element carries a plain class (`w-button`, `w-modal`,
`w-toast`…) and the state classes you would want (`is-on`, `is-open`, `is-current`,
`is-danger`). Your `design.css` styles them; nothing here imposes a look, a font or a colour.

## Verified

```
node test-node.js
206 passed, 0 failed
```

The tests run against a small DOM written inside `test-node.js`, so the kit takes the same code
paths in Node that it takes in a page. They cover every component's structure and ARIA
attributes, keyed list reuse across a reorder, the accordion's single and multiple modes, the
modal's focus trap, focus restoration, Escape and backdrop, toast dismissal and the live
region, menu selection and outside-close, tab keyboard navigation and panel wiring, the
pagination ellipsis and end states, and the focus trap wrapping in both directions.

## Consumers

None, by design — no app in the fleet is modified by this pass. The measured case: a modal is
hand-rolled in 74 files across 22 repos, tabs in 6 of 10 sampled apps, toasts in 5, dropdown
menus in 4, and focus trapping in 7. Adoption is yours, one app at a time.

## Deferred, and why

`draggablePanel`, `sideNav`/`draggableSideNav`, `guideCard`, `floatingPanel`/`floatingSheet`,
`sortableList` and `contextMenu` are not here yet. The audit recommended holding the drag-and-
dock pieces until an app asks for them; adding them later is additive.

## Support

<img src="docs/assets/support-portrait.jpg" width="72" height="72" alt="Dr. Sohil Momin" align="left" style="border-radius:50%;margin-right:1rem">

Free, offline, accountless — and staying that way. If it earned its keep:

| | |
|---|---|
| UPI (India) | `drsohilboi@ybl` — payee Dr. Sohil Momin, open amount, or scan [the QR](docs/assets/upi-qr.svg) |
| GitHub Sponsors | [github.com/sponsors/drsamonline](https://github.com/sponsors/drsamonline) |
| Ko-fi | [ko-fi.com/matneo](https://ko-fi.com/matneo) |
| PayPal | [paypal.me/drsohilmomin](https://paypal.me/drsohilmomin?locale.x=en_GB&country.x=IN) |
| My books | [Amazon author store](https://www.amazon.com/stores/author/B08ZT331LY/allbooks) |
| More apps | [drsamonline.github.io](https://drsamonline.github.io/) |
| Email | [sohilmomin2000@gmail.com](mailto:sohilmomin2000@gmail.com) |

Nothing is gated behind it: no accounts, no tracking, no network requests.

## Licence

PolyForm Noncommercial 1.0.0. (c) 2026 Dr Sohil Momin. Part of the Forge system — kits
open, orchestrator licensed.
