/* A DOM small enough to run these tests in Node, and real enough that the kit
 * takes the same code paths it takes in a page. */
function makeDom() {
  const FOCUSABLE = [];
  function Node(tag) {
    const n = {
      tagName: String(tag).toUpperCase(),
      className: "",
      id: "",
      textContent: "",
      innerHTML: "",
      value: "",
      checked: false,
      disabled: false,
      hidden: false,
      style: {},
      attrs: {},
      children: [],
      parentNode: null,
      listeners: {},
      appendChild(child) {
        /* a real DOM moves a node that already has a parent */
        if (child.parentNode && child.parentNode.children) {
          child.parentNode.children = child.parentNode.children.filter((c) => c !== child);
        }
        child.parentNode = this;
        this.children.push(child);
        return child;
      },
      removeChild(child) {
        this.children = this.children.filter((c) => c !== child);
        child.parentNode = null;
        return child;
      },
      contains(node) {
        if (node === this) return true;
        return this.children.some((c) => c && c.contains && c.contains(node));
      },
      setAttribute(k, v) { this.attrs[k] = String(v); if (k === "id") this.id = String(v); },
      getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
      removeAttribute(k) { delete this.attrs[k]; },
      hasAttribute(k) { return this.attrs[k] !== undefined; },
      addEventListener(kind, fn) { (this.listeners[kind] = this.listeners[kind] || []).push(fn); },
      removeEventListener(kind, fn) {
        this.listeners[kind] = (this.listeners[kind] || []).filter((f) => f !== fn);
      },
      dispatch(kind, extra) {
        const ev = Object.assign({ type: kind, preventDefault() {}, stopPropagation() {}, target: this }, extra || {});
        (this.listeners[kind] || []).slice().forEach((fn) => fn(ev));
        return ev;
      },
      focus() { document.activeElement = this; this.focused = true; },
      click() { this.dispatch("click"); },
      querySelectorAll(sel) {
        /* only the focus-trap selector is needed */
        return this.all((x) => x.tagName === "BUTTON" || x.tagName === "INPUT" || x.tagName === "A" || x.attrs.tabindex != null);
      },
      querySelector(sel) {
        const hits = this.querySelectorAll(sel);
        return hits.length ? hits[0] : null;
      },
      all(pred, out) {
        out = out || [];
        if (pred(this)) out.push(this);
        this.children.forEach((c) => (c && c.all ? c.all(pred, out) : null));
        return out;
      }
    };
    let html = "";
    Object.defineProperty(n, "innerHTML", {
      get() { return html; },
      set(v) { html = String(v); if (v === "") n.children.length = 0; }
    });
    return n;
  }
  const doc = {
    activeElement: null,
    body: null,
    createElement: (tag) => Node(tag),
    createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }),
    listeners: {},
    addEventListener(kind, fn) { (this.listeners[kind] = this.listeners[kind] || []).push(fn); },
    removeEventListener(kind, fn) {
      this.listeners[kind] = (this.listeners[kind] || []).filter((f) => f !== fn);
    },
    dispatch(kind, extra) {
      const ev = Object.assign({ type: kind, preventDefault() {}, target: null }, extra || {});
      (this.listeners[kind] || []).slice().forEach((fn) => fn(ev));
      return ev;
    }
  };
  doc.body = Node("body");
  return doc;
}

const path = require("path");
global.document = makeDom();
const W = require(path.join(__dirname, "widgets-kit.js"));

let pass = 0, fail = 0;
function ok(n, c, e) { c ? (pass++, console.log("PASS  " + n + (e ? "  (" + e + ")" : ""))) : (fail++, console.log("FAIL  " + n + (e ? "  (" + e + ")" : ""))); }
const byClass = (root, cls) => root.all((x) => (x.className || "").split(" ").indexOf(cls) !== -1);
const byTag = (root, tag) => root.all((x) => x.tagName === tag.toUpperCase());

/* ---------- shape ---------- */
ok("version is a string", typeof W.version === "string", W.version);
const exported = Object.keys(W).filter((k) => typeof W[k] === "function");
ok("every component group is present", ["button", "actionIcon", "copyButton", "segmented", "text", "tag",
  "avatar", "groupAvatar", "icon", "image", "list", "accordion", "empty", "skeleton", "alert", "badge",
  "progress", "spinner", "result", "modal", "drawer", "toast", "tooltip", "popover", "dropdownMenu",
  "tabs", "pagination", "breadcrumb", "steps", "block", "grid", "divider", "scrollArea", "header"]
  .every((k) => typeof W[k] === "function"), exported.length + " functions");

/* ---------- action ---------- */
const btn = W.button({ label: "Save", variant: "primary" });
ok("button is a button", btn.el.tagName === "BUTTON");
ok("button has a label", byClass(btn.el, "w-button-label")[0].textContent === "Save");
ok("button carries its variant", btn.el.className.indexOf("w-button-primary") !== -1);
ok("button is type button by default", btn.el.getAttribute("type") === "button");
ok("button can be disabled", (btn.disable(true), btn.el.disabled === true));
ok("button fires onClick", (function () {
  let hit = 0;
  const b = W.button({ label: "x", onClick: () => hit++ });
  b.el.dispatch("click");
  return hit === 1;
})());
ok("button renders an icon before its label", (function () {
  const b = W.button({ label: "x", icon: "<svg></svg>" });
  return b.el.children[0].className === "w-button-icon";
})());

const ai = W.actionIcon({ label: "Settings" });
ok("action icon is labelled for a screen reader", ai.el.getAttribute("aria-label") === "Settings");
ok("action icon toggles active", (ai.setActive(true), ai.el.className.indexOf("is-active") !== -1));

const grp = W.actionIconGroup({ items: [{ label: "a" }, { label: "b" }] });
ok("icon group holds its items", byTag(grp.el, "button").length === 2);
ok("icon group is a group", grp.el.getAttribute("role") === "group");

const copy = W.copyButton({ text: "hello" });
ok("copy button has text", copy.text() === "hello");
ok("copy button reports failure without a clipboard", (function () {
  let result = null;
  const c = W.copyButton({ text: "x", onCopy: (t, ok) => (result = ok) });
  c.el.dispatch("click");
  return result === false;
})());
ok("copy button changes its label after a click", (function () {
  const c = W.copyButton({ text: "x", failedLabel: "No" });
  c.el.dispatch("click");
  return byClass(c.el, "w-copy-label")[0].textContent === "No";
})());

const seg = W.segmented({ options: ["day", "week", "month"], value: "week" });
ok("segmented marks the chosen option", seg.value() === "week");
ok("segmented is a tablist", seg.el.getAttribute("role") === "tablist");
ok("segmented marks aria-selected", (function () {
  const on = byTag(seg.el, "button").filter((b) => b.getAttribute("aria-selected") === "true");
  return on.length === 1 && on[0].getAttribute("data-value") === "week";
})());
ok("segmented emits on click", (function () {
  let seen = null;
  seg.on("change", (v) => (seen = v));
  byTag(seg.el, "button")[0].dispatch("click");
  return seen === "day" && seg.value() === "day";
})());

/* ---------- display ---------- */
ok("text renders", W.text({ text: "hi" }).el.textContent === "hi");
ok("text sets", (function () { const t = W.text({ text: "a" }); t.set("b"); return t.el.textContent === "b"; })());
ok("text carries its type", W.text({ text: "x", type: "secondary" }).el.className.indexOf("w-text-secondary") !== -1);
ok("tag renders its label", byClass(W.tag({ label: "new" }).el, "w-tag-label")[0].textContent === "new");
ok("closable tag has a close button", byClass(W.tag({ label: "x", closable: true }).el, "w-tag-close").length === 1);
ok("closable tag removes itself", (function () {
  const host = document.createElement("div");
  const t = W.tag({ label: "x", closable: true });
  host.appendChild(t.el);
  byClass(t.el, "w-tag-close")[0].dispatch("click");
  return host.children.length === 0;
})());
ok("avatar uses initials", byClass(W.avatar({ name: "Ada Lovelace" }).el, "w-avatar-text")[0].textContent === "AL");
ok("avatar uses an image when given one", byTag(W.avatar({ name: "A", src: "a.png" }).el, "img").length === 1);
ok("initials handles one word", W.initials("Arnica") === "A");
ok("group avatar shows a remainder", byClass(W.groupAvatar({ items: [{ name: "a" }, { name: "b" }, { name: "c" }, { name: "d" }, { name: "e" }], max: 3 }).el, "w-avatar-more")[0].textContent === "+2");
ok("icon renders paths", byTag(W.icon({ paths: ["M0 0h1"] }).el, "path").length === 1);
ok("icon is hidden from a screen reader unless labelled", (function () {
  const a = W.icon({ paths: ["M0 0"] }), b = W.icon({ paths: ["M0 0"], label: "Close" });
  return a.el.getAttribute("aria-hidden") === "true" && b.el.getAttribute("role") === "img";
})());
ok("image is lazy by default", W.image({ src: "a.png" }).el.getAttribute("loading") === "lazy");
ok("list renders its items", byClass(W.list({ items: ["a", "b", "c"] }).el, "w-list-item").length === 3);
ok("list is keyed, so a re-render reuses nodes", (function () {
  const l = W.list({ items: ["a", "b"], key: (x) => x });
  const first = l.el.children[0];
  l.set(["b", "a"]);
  return l.el.children[0] !== first && l.el.children[1] === first;
})());
ok("list drops removed items", (function () {
  const l = W.list({ items: ["a", "b"], key: (x) => x });
  l.set(["a"]);
  return l.size() === 1;
})());
ok("list renders custom nodes", (function () {
  const l = W.list({ items: [1, 2], render: (n) => W.text({ text: "#" + n }).el });
  return byClass(l.el, "w-text").length === 2;
})());

const acc = W.accordion({ items: [{ title: "One", content: "first" }, { title: "Two", content: "second" }], defaultOpen: 0 });
ok("accordion has two headers", byClass(acc.el, "w-accordion-header").length === 2);
ok("accordion opens the default", acc.isOpen(0) === true && acc.isOpen(1) === false);
ok("accordion marks aria-expanded", byClass(acc.el, "w-accordion-header")[0].getAttribute("aria-expanded") === "true");
ok("accordion panel is hidden when closed", (function () {
  const panels = byClass(acc.el, "w-accordion-panel");
  return panels[0].hidden === false && panels[1].hidden === true;
})());
ok("accordion toggles on click", (function () {
  byClass(acc.el, "w-accordion-header")[1].dispatch("click");
  return acc.isOpen(1) === true && acc.isOpen(0) === false;
})());
ok("accordion closes on a second click", (function () {
  byClass(acc.el, "w-accordion-header")[1].dispatch("click");
  return acc.isOpen(1) === false;
})());
ok("multiple accordion keeps several open", (function () {
  const a = W.accordion({ multiple: true, items: [{ title: "a" }, { title: "b" }], defaultOpen: [0] });
  a.open(1);
  return a.isOpen(0) && a.isOpen(1);
})());
ok("accordion emits change", (function () {
  let seen = null;
  const a = W.accordion({ items: [{ title: "x" }], onchange: null });
  a.on("change", (v) => (seen = v));
  byClass(a.el, "w-accordion-header")[0].dispatch("click");
  return seen === 0;
})());

ok("empty shows a title", byClass(W.empty({ title: "Nothing" }).el, "w-empty-title")[0].textContent === "Nothing");
ok("empty defaults its title", byClass(W.empty({}).el, "w-empty-title")[0].textContent === "Nothing here");
ok("skeleton has one line by default", byClass(W.skeleton({}).el, "w-skeleton-line").length === 1);
ok("skeleton takes a line count", byClass(W.skeleton({ lines: 3 }).el, "w-skeleton-line").length === 3);
ok("skeleton is hidden from a screen reader", W.skeleton({}).el.getAttribute("aria-hidden") === "true");

/* ---------- feedback ---------- */
const alert = W.alert({ type: "error", title: "Failed", message: "Try again" });
ok("alert carries its type", alert.el.className.indexOf("w-alert-error") !== -1);
ok("an error alert is a live alert", alert.el.getAttribute("role") === "alert");
ok("a note alert is a status", W.alert({ type: "info" }).el.getAttribute("role") === "status");
ok("alert renders its message", byClass(alert.el, "w-alert-message")[0].textContent === "Try again");
ok("closable alert removes itself", (function () {
  const host = document.createElement("div");
  const a = W.alert({ message: "x", closable: true });
  host.appendChild(a.el);
  byClass(a.el, "w-alert-close")[0].dispatch("click");
  return host.children.length === 0;
})());

ok("badge shows a count", W.badge({ count: 5 }).el.textContent === "5");
ok("badge caps at max", W.badge({ count: 120, max: 99 }).el.textContent === "99+");
ok("badge can be a dot", W.badge({ dot: true }).el.className.indexOf("is-dot") !== -1);
ok("badge sets", (function () { const b = W.badge({ count: 1 }); b.set(7); return b.el.textContent === "7"; })());

const prog = W.progress({ value: 30 });
ok("progress exposes its value", prog.value() === 30);
ok("progress sets aria-valuenow", prog.el.getAttribute("aria-valuenow") === "30");
ok("progress fills", byClass(prog.el, "w-progress-fill")[0].style.width === "30%");
ok("progress clamps above 100", (function () { prog.set(140); return byClass(prog.el, "w-progress-fill")[0].style.width === "100%"; })());
ok("progress clamps below 0", (function () { prog.set(-5); return byClass(prog.el, "w-progress-fill")[0].style.width === "0%"; })());
ok("indeterminate progress drops its value", (function () {
  const p = W.progress({ indeterminate: true });
  return p.el.getAttribute("aria-valuenow") === null && p.el.className.indexOf("is-indeterminate") !== -1;
})());
ok("progress finishes", (function () { prog.finish(); return prog.value() === 100; })());

ok("spinner is a status", W.spinner({}).el.getAttribute("role") === "status");
ok("result renders a title", byClass(W.result({ title: "Saved" }).el, "w-result-title")[0].textContent === "Saved");
ok("result takes actions", (function () {
  const r = W.result({ title: "x", actions: [W.button({ label: "Again" })] });
  return byClass(r.el, "w-result-actions")[0].children.length === 1;
})());

/* ---------- modal ---------- */
const modal = W.modal({ title: "Delete?", body: "This cannot be undone.", actions: [W.button({ label: "Delete" })] });
ok("modal starts closed", modal.isOpen() === false && modal.el.hidden === true);
ok("modal is a dialog", modal.box.getAttribute("role") === "dialog");
ok("modal is aria-modal", modal.box.getAttribute("aria-modal") === "true");
ok("modal labels itself with its title", !!modal.box.getAttribute("aria-labelledby"));
ok("modal opens", (modal.open(), modal.isOpen() === true && modal.el.hidden === false));
ok("modal renders its body", modal.body.children.length > 0);
ok("modal has a footer with the action", byClass(modal.box, "w-modal-foot")[0].children.length === 1);
ok("Escape closes the modal", (function () {
  document.dispatch("keydown", { key: "Escape" });
  return modal.isOpen() === false;
})());
ok("the close button closes", (function () {
  modal.open();
  byClass(modal.box, "w-modal-close")[0].dispatch("click");
  return modal.isOpen() === false;
})());
ok("the backdrop closes", (function () {
  modal.open();
  byClass(modal.el, "w-backdrop")[0].dispatch("click");
  return modal.isOpen() === false;
})());
ok("closeOnBackdrop false keeps it open", (function () {
  const m = W.modal({ title: "x", closeOnBackdrop: false });
  m.open();
  byClass(m.el, "w-backdrop")[0].dispatch("click");
  return m.isOpen() === true;
})());
ok("modal restores focus to where it was", (function () {
  const trigger = W.button({ label: "open" });
  document.body.appendChild(trigger.el);
  trigger.el.focus();
  const m = W.modal({ title: "x" });
  m.mount(document.body);
  m.open();
  m.close();
  return document.activeElement === trigger.el;
})());
ok("modal emits open and close", (function () {
  const seen = [];
  const m = W.modal({ title: "x" });
  m.on("open", (v) => seen.push(v));
  m.open(); m.close();
  return seen.join(",") === "true,false";
})());

/* ---------- drawer ---------- */
const drawer = W.drawer({ title: "Filters", side: "left", body: "content" });
ok("drawer carries its side", drawer.box.className.indexOf("w-drawer-left") !== -1);
ok("drawer opens", (drawer.open(), drawer.isOpen() === true));
ok("drawer closes on Escape", (function () {
  document.dispatch("keydown", { key: "Escape" });
  return drawer.isOpen() === false;
})());
ok("drawer defaults to the right", W.drawer({}).box.className.indexOf("w-drawer-right") !== -1);

/* ---------- toast ---------- */
const t1 = W.toast("Saved");
ok("toast mounts into a host", t1.el.parentNode === W.toastHost());
ok("toast host is a live region", W.toastHost().getAttribute("aria-live") === "polite");
ok("toast renders its message", byClass(t1.el, "w-toast-text")[0].textContent === "Saved");
ok("toast dismisses itself", (function () {
  const before = W.toastHost().children.length;
  t1.dismiss();
  return W.toastHost().children.length === before - 1;
})());
ok("toast close button dismisses", (function () {
  const t = W.toast("x");
  const before = W.toastHost().children.length;
  byClass(t.el, "w-toast-close")[0].dispatch("click");
  return W.toastHost().children.length === before - 1;
})());
ok("toast takes a type", W.toast("x", { type: "success" }).el.className.indexOf("w-toast-success") !== -1);
ok("a zero duration toast stays", (function () {
  const t = W.toast("sticky", { duration: 0 });
  return t.el.parentNode !== null;
})());

/* ---------- overlay ---------- */
const tip = W.tooltip({ content: "Tip text", anchor: W.button({ label: "hover" }) });
ok("tooltip starts hidden", tip.visible() === false);
ok("tooltip is a tooltip", byClass(tip.el, "w-tooltip")[0].getAttribute("role") === "tooltip");
ok("tooltip shows on hover", (function () {
  tip.el.dispatch("mouseenter");
  return tip.el.children.length === 2;
})());
ok("tooltip hides on leave", (function () { tip.el.dispatch("mouseleave"); return tip.visible() === false; })());

const pop = W.popover({ content: "Body", label: "More" });
ok("popover starts closed", pop.isOpen() === false);
ok("popover opens on its trigger", (function () {
  byClass(pop.el, "w-popover-trigger")[0].dispatch("click");
  return pop.isOpen() === true;
})());
ok("popover marks aria-expanded", byClass(pop.el, "w-popover-trigger")[0].getAttribute("aria-expanded") === "true");
ok("popover closes on a second click", (function () {
  byClass(pop.el, "w-popover-trigger")[0].dispatch("click");
  return pop.isOpen() === false;
})());

const menu = W.dropdownMenu({ label: "Actions", items: [{ label: "Edit", value: "edit" }, { separator: true }, { label: "Delete", value: "del", danger: true }] });
ok("menu starts closed", menu.isOpen() === false);
ok("menu is a menu", byClass(menu.el, "w-menu")[0].getAttribute("role") === "menu");
ok("menu has a separator", byClass(menu.el, "w-menu-sep").length === 1);
ok("menu marks a dangerous item", byClass(menu.el, "is-danger").length === 1);
ok("menu opens", (byClass(menu.el, "w-menu-trigger")[0].dispatch("click"), menu.isOpen() === true));
ok("menu closes after a pick", (function () {
  let picked = null;
  const m = W.dropdownMenu({ items: [{ label: "A", value: "a", onSelect: (v) => (picked = v) }] });
  m.open();
  byClass(m.el, "w-menu-item")[0].dispatch("click");
  return picked === "a" && m.isOpen() === false;
})());
ok("menu emits select", (function () {
  let seen = null;
  menu.on("select", (v) => (seen = v));
  menu.open();
  byClass(menu.el, "w-menu-item")[0].dispatch("click");
  return seen === "edit";
})());
ok("menu closes on Escape", (function () {
  menu.open();
  document.dispatch("keydown", { key: "Escape" });
  return menu.isOpen() === false;
})());

/* ---------- nav ---------- */
const tabs = W.tabs({ items: [{ label: "One", content: "first" }, { label: "Two", content: "second" }] });
ok("tabs select the first by default", tabs.value() === 0);
ok("tabs are a tablist", byClass(tabs.el, "w-tabs")[0].getAttribute("role") === "tablist");
ok("tabs mark aria-selected", (function () {
  const t = byClass(tabs.el, "w-tab");
  return t[0].getAttribute("aria-selected") === "true" && t[1].getAttribute("aria-selected") === "false";
})());
ok("tabs render the active panel", tabs.panel.children.length === 1);
ok("tabs switch on click", (function () {
  byClass(tabs.el, "w-tab")[1].dispatch("click");
  return tabs.value() === 1;
})());
ok("tabs wire the panel to its tab", (function () {
  const t = byClass(tabs.el, "w-tab")[1];
  return tabs.panel.getAttribute("aria-labelledby") === t.getAttribute("id");
})());
ok("tabs emit change", (function () {
  let seen = null;
  tabs.on("change", (v) => (seen = v));
  byClass(tabs.el, "w-tab")[0].dispatch("click");
  return seen === 0;
})());
ok("arrow keys move between tabs", (function () {
  byClass(tabs.el, "w-tab")[0].dispatch("keydown", { key: "ArrowRight" });
  return byClass(tabs.el, "w-tab")[1].focused === true;
})());

ok("pages lists every page when they are few", W.pages(3, 5, 2).join(",") === "1,2,3,4,5", W.pages(3, 5, 2).join(","));
ok("pages collapses the middle", W.pages(10, 20).join(",") === "1,...,9,10,11,...,20", W.pages(10, 20).join(","));
ok("pages never repeats an ellipsis", W.pages(4, 20).join(",").indexOf("......") === -1);

const pg = W.pagination({ total: 5, value: 1 });
ok("pagination marks the current page", byClass(pg.el, "is-current")[0].textContent === "1");
ok("pagination disables prev on the first page", byClass(pg.el, "w-page-prev")[0].disabled === true);
ok("pagination goes to a page", (function () {
  byClass(pg.el, "w-page").filter((b) => b.getAttribute("data-page") === "3")[0].dispatch("click");
  return pg.value() === 3;
})());
ok("pagination steps forward", (function () { byClass(pg.el, "w-page-next")[0].dispatch("click"); return pg.value() === 4; })());
ok("pagination stops at the end", (function () {
  pg.set(5);
  return byClass(pg.el, "w-page-next")[0].disabled === true;
})());
ok("pagination ignores out-of-range pages", (function () {
  pg.set(99);
  return pg.value() === 5;
})());
ok("pagination emits change", (function () {
  let seen = null;
  pg.on("change", (v) => (seen = v));
  pg.set(2);
  return seen === 2;
})());
ok("pagination is a nav with a label", pg.el.getAttribute("role") === null && pg.el.getAttribute("aria-label") === "Pagination");

const bc = W.breadcrumb({ items: [{ label: "Home", href: "/" }, { label: "Docs", href: "/docs" }, { label: "Here" }] });
ok("breadcrumb is a nav", bc.el.tagName === "NAV");
ok("breadcrumb links the parents", byTag(bc.el, "a").length === 2);
ok("breadcrumb marks the last as current", (function () {
  const items = byClass(bc.el, "w-breadcrumb-item");
  return items[items.length - 1].all((x) => x.getAttribute && x.getAttribute("aria-current") === "page").length === 1;
})());

const st = W.steps({ items: [{ label: "One" }, { label: "Two" }, { label: "Three" }], current: 1 });
ok("steps mark the current one", byClass(st.el, "w-step-current").length === 1);
ok("steps mark the done one", byClass(st.el, "w-step-done").length === 1);
ok("steps mark the todo one", byClass(st.el, "w-step-todo").length === 1);
ok("steps show a tick when done", (function () {
  st.set(2);
  return byClass(st.el, "w-step-done").length === 2;
})());
ok("steps stop at the last", (function () { st.next(); return st.current() === 2; })());
ok("steps stop at the first", (function () { st.set(0); st.prev(); return st.current() === 0; })());

/* ---------- layout ---------- */
ok("block holds children", W.block({ children: ["a", "b"] }).el.children.length === 2);
ok("block can be a column", W.block({ direction: "column" }).el.className.indexOf("is-column") !== -1);
ok("grid sets its columns", W.grid({ columns: 3 }).el.style.gridTemplateColumns === "repeat(3, minmax(0, 1fr))");
ok("grid can auto-fill", W.grid({ min: 180 }).el.style.gridTemplateColumns.indexOf("180px") !== -1);
ok("grid sets its gap", W.grid({ gap: 12 }).el.style.gap === "12px");
ok("divider is a separator", W.divider({}).el.getAttribute("role") === "separator");
ok("vertical divider says so", W.divider({ vertical: true }).el.getAttribute("aria-orientation") === "vertical");
ok("divider takes a label", byClass(W.divider({ label: "or" }).el, "w-divider-label")[0].textContent === "or");
ok("scroll area scrolls", W.scrollArea({ maxHeight: 200 }).el.style.overflow === "auto");
ok("scroll area is focusable", W.scrollArea({}).el.getAttribute("tabindex") === "0");
ok("header renders a title", byClass(W.header({ title: "Cases" }).el, "w-header-title")[0].textContent === "Cases");
ok("header takes left and right slots", (function () {
  const h = W.header({ left: W.button({ label: "back" }), right: W.button({ label: "new" }), title: "x" });
  return byClass(h.el, "w-header-left")[0].children.length === 1 && byClass(h.el, "w-header-right")[0].children.length === 1;
})());

/* ---------- focus trap ---------- */
ok("trapFocus returns a remover", (function () {
  const box = document.createElement("div");
  const off = W.trapFocus(box);
  return typeof off === "function";
})());
ok("trapFocus wraps focus at the end", (function () {
  const box = document.createElement("div");
  const a = document.createElement("button"), b = document.createElement("button");
  box.appendChild(a); box.appendChild(b);
  W.trapFocus(box);
  b.focus();
  box.dispatch("keydown", { key: "Tab" });
  return document.activeElement === a;
})());
ok("trapFocus wraps backwards at the start", (function () {
  const box = document.createElement("div");
  const a = document.createElement("button"), b = document.createElement("button");
  box.appendChild(a); box.appendChild(b);
  W.trapFocus(box);
  a.focus();
  box.dispatch("keydown", { key: "Tab", shiftKey: true });
  return document.activeElement === b;
})());


/* ---------- sortable list ---------- */
ok("moveItem moves an item forward", JSON.stringify(W.moveItem(["a","b","c"], 0, 2)) === '["b","c","a"]');
ok("moveItem moves an item back", JSON.stringify(W.moveItem(["a","b","c"], 2, 0)) === '["c","a","b"]');
ok("moveItem of the same index is a copy", JSON.stringify(W.moveItem(["a","b"], 1, 1)) === '["a","b"]');
ok("moveItem out of range is a copy", JSON.stringify(W.moveItem(["a","b"], 5, 0)) === '["a","b"]');
ok("moveItem does not mutate the input", (function () {
  const src = ["a","b","c"]; W.moveItem(src, 0, 2); return src.join(",") === "a,b,c";
})());
ok("slotAt finds the slot under a point", W.slotAt(25, [0,20,40], [20,20,20]) === 1);
ok("slotAt above everything is -1", W.slotAt(-5, [0,20], [20,20]) === -1);
ok("slotAt past the end is -1", W.slotAt(100, [0,20], [20,20]) === -1);

const sort = W.sortableList({ items: ["a","b","c"] });
ok("a sortable renders one row per item", sort.el.children.length === 3);
ok("rows are draggable", sort.el.children[0].getAttribute("draggable") === "true");
ok("items() is a copy", (function () { const a = sort.items(); a.push("x"); return sort.items().length === 3; })());
ok("move reorders and reports", (function () {
  let seen = null;
  const s = W.sortableList({ items: ["a","b","c"], onMove: function (f, t, items) { seen = [f, t, items.join("")]; } });
  s.move(0, 2);
  return s.items().join("") === "bca" && seen[0] === 0 && seen[1] === 2 && seen[2] === "bca";
})());
ok("move emits an event", (function () {
  let got = null;
  const s = W.sortableList({ items: ["a","b"] }).on("move", function (e) { got = e; });
  s.move(1, 0);
  return got && got.from === 1 && got.to === 0 && got.items.join("") === "ba";
})());
ok("a no-op move does not report", (function () {
  let calls = 0;
  const s = W.sortableList({ items: ["a","b"], onMove: function () { calls++; } });
  s.move(0, 0);
  return calls === 0;
})());
ok("set replaces the items", (function () {
  const s = W.sortableList({ items: ["a"] });
  s.set(["x","y"]); return s.items().join("") === "xy" && s.el.children.length === 2;
})());
ok("keyboard alt+down moves a row", (function () {
  const s = W.sortableList({ items: ["a","b","c"] });
  s.el.children[0].dispatch("keydown", { key: "ArrowDown", altKey: true });
  return s.items().join("") === "bac";
})());
ok("keyboard alt+up at the top does nothing", (function () {
  const s = W.sortableList({ items: ["a","b"] });
  s.el.children[0].dispatch("keydown", { key: "ArrowUp", altKey: true });
  return s.items().join("") === "ab";
})());
ok("drop reorders from the dragged row", (function () {
  const s = W.sortableList({ items: ["a","b","c"] });
  s.el.children[0].dispatch("dragstart", {});
  s.el.children[2].dispatch("drop", {});
  return s.items().join("") === "bca";
})());

/* ---------- context menu ---------- */
ok("a context menu starts closed", W.contextMenu({ items: [{ value: "x" }] }).isOpen() === false);
ok("opening records the point", (function () {
  const m = W.contextMenu({ items: [{ value: "x" }] });
  m.open(12, 34);
  return m.isOpen() === true && m.x === 12 && m.y === 34;
})());
ok("the menu is placed at the point", (function () {
  const m = W.contextMenu({ items: [{ value: "x" }] });
  m.open(12, 34);
  return m.el.style.left === "12px" && m.el.style.top === "34px";
})());
ok("a separator renders", (function () {
  const m = W.contextMenu({ items: [{ value: "a" }, { separator: true }, { value: "b" }] });
  return m.el.children.length === 3 && m.el.children[1].getAttribute("role") === "separator";
})());
ok("a danger item is marked", (function () {
  const m = W.contextMenu({ items: [{ value: "del", danger: true }] });
  return m.el.children[0].className.indexOf("is-danger") !== -1;
})());
ok("choosing an item closes and reports", (function () {
  let chosen = null;
  const m = W.contextMenu({ items: [{ value: "copy", onSelect: function (v) { chosen = v; } }] });
  m.open(0, 0);
  m.el.children[0].dispatch("click", {});
  return chosen === "copy" && m.isOpen() === false;
})());
ok("a disabled item does nothing", (function () {
  let chosen = null;
  const m = W.contextMenu({ items: [{ value: "x", disabled: true, onSelect: function (v) { chosen = v; } }] });
  m.open(0, 0);
  m.el.children[0].dispatch("click", {});
  return chosen === null && m.isOpen() === true;
})());
ok("opening emits the point", (function () {
  let at = null;
  const m = W.contextMenu({ items: [{ value: "x" }] }).on("open", function (p) { at = p; });
  m.open(5, 6);
  return at && at.x === 5 && at.y === 6;
})());
ok("closing twice is harmless", (function () {
  const m = W.contextMenu({ items: [{ value: "x" }] });
  m.open(0, 0); m.close(); m.close();
  return m.isOpen() === false;
})());


/* ---------- floating panel ---------- */
ok("clampTo keeps a panel inside", JSON.stringify(W.clampTo(-5, 999, 100, 50, 400, 300)) === '{"x":0,"y":250}');
ok("clampTo passes through when it fits", JSON.stringify(W.clampTo(10, 20, 100, 50, 400, 300)) === '{"x":10,"y":20}');
ok("clampTo pins to 0 when the panel is bigger", JSON.stringify(W.clampTo(50, 50, 500, 400, 400, 300)) === '{"x":0,"y":0}');

const fp = W.floatingPanel({ title: "Tools", x: 30, y: 40, width: 200, height: 120 });
ok("a floating panel starts closed", fp.isOpen() === false);
ok("it opens", (function () { fp.open(); return fp.isOpen() === true; })());
ok("it is placed where asked", fp.el.style.left === "30px" && fp.el.style.top === "40px");
ok("it takes the size it was given", fp.el.style.width === "200px" && fp.el.style.height === "120px");
ok("it carries its title", fp.el.children[0].children[0].textContent === "Tools");
ok("moveTo repositions it", (function () { fp.moveTo(5, 6); const p = fp.pos(); return p.x === 5 && p.y === 6; })());
ok("resize changes its size", (function () { fp.resize(300, 150); const s = fp.size(); return s.w === 300 && s.h === 150; })());
ok("clamp keeps it in the parent", (function () { fp.moveTo(999, 999); fp.clamp(400, 300); const p = fp.pos(); return p.x === 100 && p.y === 150; })());
ok("dragging the header moves it", (function () {
  const d = W.floatingPanel({ x: 0, y: 0, width: 100, height: 100 });
  d.open();
  d.el.children[0].dispatch("pointerdown", { clientX: 10, clientY: 10 });
  d.el.dispatch("pointermove", { clientX: 60, clientY: 40 });
  const p = d.pos();
  return p.x === 50 && p.y === 30;
})());
ok("pointerup ends the drag", (function () {
  const d = W.floatingPanel({ x: 0, y: 0 });
  d.open();
  d.el.children[0].dispatch("pointerdown", { clientX: 0, clientY: 0 });
  d.el.dispatch("pointerup", {});
  d.el.dispatch("pointermove", { clientX: 50, clientY: 50 });
  return d.pos().x === 0;
})());
ok("closing emits", (function () {
  let seen = null;
  const d = W.floatingPanel({}).on("open", function (v) { seen = v; });
  d.open(); d.close();
  return seen === false;
})());

/* ---------- side navigation ---------- */
const sn = W.sideNav({ items: [{ value: "home", label: "Home" }, { value: "docs", label: "Docs" }, { value: "off", label: "Off", disabled: true }] });
ok("sideNav renders one button per item", sn.el.children.length === 3);
ok("the first item is current by default", sn.value() === "home" && sn.el.children[0].className.indexOf("is-current") !== -1);
ok("the current item is marked for a screen reader", sn.el.children[0].getAttribute("aria-current") === "page");
ok("selecting changes the current", (function () { sn.select("docs"); return sn.value() === "docs"; })());
ok("and marks the new one", sn.el.children[1].className.indexOf("is-current") !== -1 && sn.el.children[0].className.indexOf("is-current") === -1);
ok("a click selects", (function () { sn.el.children[0].dispatch("click", {}); return sn.value() === "home"; })());
ok("a disabled item cannot be selected", (function () { sn.select("off"); return sn.value() === "home"; })());
ok("an unknown value is ignored", (function () { sn.select("nope"); return sn.value() === "home"; })());
ok("selecting the current item does not re-emit", (function () {
  let calls = 0;
  const s = W.sideNav({ items: [{ value: "a" }], onSelect: function () { calls++; } });
  s.select("a");
  return calls === 0;
})());
ok("select emits", (function () {
  let got = null;
  const s = W.sideNav({ items: [{ value: "a" }, { value: "b" }] }).on("select", function (v) { got = v; });
  s.select("b");
  return got === "b";
})());
ok("collapse hides the labels", (function () {
  const s = W.sideNav({ items: [{ value: "a", label: "A" }] });
  s.collapse(true);
  return s.collapsed() === true && s.el.className.indexOf("is-collapsed") !== -1 && s.el.children[0].getAttribute("title") === "A";
})());
ok("collapse toggles", (function () {
  const s = W.sideNav({ items: [{ value: "a" }] });
  s.collapse(); const one = s.collapsed(); s.collapse(); return one === true && s.collapsed() === false;
})());
ok("set replaces the items", (function () {
  const s = W.sideNav({ items: [{ value: "a" }] });
  s.set([{ value: "x" }, { value: "y" }]);
  return s.items().length === 2 && s.el.children.length === 2;
})());

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);

/* ---------- the paired button stylesheet ---------- */
(function () {
  const css = W.buttonCss();
  ok("buttonCss exists", typeof css === "string" && css.length > 100);
  ok("primary pairs its own label variable", /\.w-button-primary\{[^}]*color:var\(--w-on-primary\)/.test(css));
  ok("no hard-coded white label", !/#fff|#ffffff|TextLightSolid/.test(css));
  ok("custom prefix is honoured", W.buttonCss({ prefix: "--t" }).indexOf("var(--t-on-primary)") !== -1);
})();
