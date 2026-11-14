# Changelog
## 1.2.0 — 2026-11-14
### Added
- `W.buttonCss({prefix})` — the opt-in stylesheet the kit never shipped, because the
  caller styles the classes. It pairs every filled button with its own label variable
  (`--w-on-primary`), which is the pair eighteen fleet pages got wrong: a label pinned
  to white on a surface that flips to near-white reads at 1.16:1.
- The kit still ships no CSS on import. `buttonCss()` returns a string; injecting it is
  the caller's decision.

### Verified
- 4 assertions on the stylesheet: the primary rule binds its own label variable, no
  literal white, custom prefix honoured
## 1.0.0 — 2026-11-09
### Added
- 37 components with no CSS: button, actionIcon, actionIconGroup, copyButton, segmented; text, tag, avatar, groupAvatar, icon, image, list, accordion, empty, skeleton; alert, badge, progress, spinner, result, modal, drawer, toast; tooltip, popover, dropdownMenu; tabs, pagination, breadcrumb, steps; block, grid, divider, scrollArea, header
- modals trap Tab, restore focus and close on Escape and backdrop; menus close on outside click; keyed lists reuse nodes

### Verified
- 152 assertions
- 74 files across 22 repos hand-roll a modal, 6 of 10 sampled apps hand-roll tabs

PolyForm Noncommercial 1.0.0. (c) 2026 Dr Sohil Momin.
