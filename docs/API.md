# widgets-kit — API reference

**Version 1.1.0.** **The component layer for offline apps.** Zero dependencies. One file. Buttons, tags, avatars, badges, alerts, progress, modals, drawers, toasts, tooltips, popovers, menus, tabs, accordion, pagination, breadcrumbs, steps, skeletons, grids and headers — with the behaviours that matter actually implemented.

Generated from the source in this repository: every name, argument and
note below is read out of the kit file, so it cannot describe a function
that is not there.

```js
<script src="widgets-kit.js"></script>
Widgets.button(...)
// or: const Widgets = require('./widgets-kit.js')
```

## The surface (44 entries)

| Name | Arguments | What it does |
|---|---|---|
| `Widgets.button` | `(props)` | — |
| `Widgets.actionIcon` | `(props)` | — |
| `Widgets.actionIconGroup` | `(props)` | — |
| `Widgets.copyButton` | `(props)` | A copy button that confirms, and says what it copied. |
| `Widgets.segmented` | `(props)` | — |
| `Widgets.text` | `(props)` | — |
| `Widgets.tag` | `(props)` | — |
| `Widgets.avatar` | `(props)` | — |
| `Widgets.groupAvatar` | `(props)` | — |
| `Widgets.icon` | `(props)` | An inline SVG from path data: the zero-dependency way to ship an icon. |
| `Widgets.image` | `(props)` | — |
| `Widgets.list` | `(props)` | — |
| `Widgets.accordion` | `(props)` | — |
| `Widgets.empty` | `(props)` | — |
| `Widgets.skeleton` | `(props)` | — |
| `Widgets.alert` | `(props)` | — |
| `Widgets.badge` | `(props)` | — |
| `Widgets.progress` | `(props)` | — |
| `Widgets.spinner` | `(props)` | — |
| `Widgets.result` | `(props)` | — |
| `Widgets.modal` | `(props)` | — |
| `Widgets.drawer` | `(props)` | — |
| `Widgets.toastHost` | `()` | — |
| `Widgets.toast` | `(message, opts)` | — |
| `Widgets.tooltip` | `(props)` | — |
| `Widgets.popover` | `(props)` | — |
| `Widgets.dropdownMenu` | `(props)` | A menu: opens from a trigger, closes on outside click, Escape, or a pick. |
| `Widgets.tabs` | `(props)` | — |
| `Widgets.pages` | `(current, total, around)` | Pages with ellipsis: 1 ... 4 5 6 ... 20 |
| `Widgets.pagination` | `(props)` | — |
| `Widgets.breadcrumb` | `(props)` | — |
| `Widgets.steps` | `(props)` | — |
| `Widgets.block` | `(props)` | — |
| `Widgets.grid` | `(props)` | — |
| `Widgets.divider` | `(props)` | — |
| `Widgets.scrollArea` | `(props)` | — |
| `Widgets.header` | `(props)` | — |
| `Widgets.moveItem` | `(arr, from, to)` | — |
| `Widgets.slotAt` | `(y, tops, heights)` | Which slot a pointer at y is over, given the item heights. -1 means none. |
| `Widgets.sortableList` | `(props)` | — |
| `Widgets.contextMenu` | `(props)` | — |
| `Widgets.clampTo` | `(x, y, w, h, pw, ph)` | — |
| `Widgets.floatingPanel` | `(props)` | — |
| `Widgets.sideNav` | `(props)` | — |

## Notes

- Zero dependencies, one file, no build step: it works from `file://`, from a
  `<script>` tag and from Node.
- The version above is the `VERSION` file in this repository; a pinned copy is
  what an app vendors.
