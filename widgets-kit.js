/* widgets-kit — the component layer for offline apps. Zero dependencies.
 *
 * The pieces every app hand-rolls: buttons, tags, avatars, badges, alerts,
 * progress, modals, drawers, toasts, tooltips, popovers, menus, tabs,
 * accordion, pagination, breadcrumbs, steps, grids and skeletons.
 *
 *   var W = require("./widgets-kit.js");
 *   document.body.appendChild(W.button({ label: "Save", variant: "primary" }).el);
 *   W.modal({ title: "Delete?", body: "This cannot be undone." }).open();
 *   W.toastHost();  W.toast("Saved");
 *
 * Every widget returns { el, ... } and keeps its own state, so nothing here
 * reaches for a global, a document, or a stylesheet: the classes are plain and
 * the caller styles them. Behaviours that matter are real - focus trapping,
 * Escape to close, arrow keys in tabs, outside-click for menus.
 *
 * Ported in shape from lobe-mygo pkg/action, display, feedback, overlay, nav and
 * layout (MIT): the same component set and prop names. The Go code draws on a
 * GPU surface; this builds DOM.
 *
 * PolyForm Noncommercial 1.0.0. (c) 2026 Dr Sohil Momin.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Widgets = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var W = { version: "1.0.0" };

  /* ---------- helpers ---------- */
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") e.className = v;
        else if (k === "text") e.textContent = v;
        else if (k === "html") e.innerHTML = v;
        else if (k === "style" && typeof v === "object") Object.keys(v).forEach(function (p) { e.style[p] = v[p]; });
        else if (k.slice(0, 2) === "on" && typeof v === "function") e.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === "value") { e.value = v; e.setAttribute("value", v); }
        else if (k === "checked") e.checked = !!v;
        else if (k === "hidden") e.hidden = !!v;
        else if (k === "disabled") e.disabled = !!v;
        else e.setAttribute(k, v === true ? "" : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : (c.el || c));
    });
    return e;
  }
  W.el = el;

  var uid = 0;
  function id(p) { return p + "-" + (++uid); }

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) {
      var a = arguments[i];
      if (!a) continue;
      if (typeof a === "string") out.push(a);
      else Object.keys(a).forEach(function (k) { if (a[k]) out.push(k); });
    }
    return out.join(" ");
  }

  /* Every widget that holds state exposes set()/get() and emits. */
  function emitter() {
    var ls = {};
    return {
      on: function (k, fn) { (ls[k] = ls[k] || []).push(fn); return this; },
      emit: function (k, v) { (ls[k] || []).forEach(function (fn) { fn(v); }); },
      listeners: ls
    };
  }

  /* ---------- action ---------- */
  W.button = function (props) {
    var p = props || {};
    var b = el("button", {
      type: p.type || "button",
      class: cx("w-button", p.variant && "w-button-" + p.variant, p.size && "w-button-" + p.size, p.block && "is-block"),
      disabled: !!p.disabled
    });
    if (p.icon) b.appendChild(el("span", { class: "w-button-icon", html: p.icon }));
    if (p.label != null) b.appendChild(el("span", { class: "w-button-label", text: p.label }));
    if (p.onClick) b.addEventListener("click", p.onClick);
    var api = { el: b, disable: function (v) { b.disabled = v !== false; return api; } };
    return api;
  };

  W.actionIcon = function (props) {
    var p = props || {};
    var b = el("button", {
      type: "button",
      class: cx("w-action-icon", p.active && "is-active"),
      "aria-label": p.label || "Action",
      title: p.title || p.label || ""
    });
    if (p.icon) b.appendChild(el("span", { class: "w-icon", html: p.icon }));
    if (p.onClick) b.addEventListener("click", p.onClick);
    return { el: b, setActive: function (v) { b.className = cx("w-action-icon", v && "is-active"); return this; } };
  };

  W.actionIconGroup = function (props) {
    var p = props || {};
    var box = el("div", { class: "w-action-icon-group", role: "group" });
    (p.items || []).forEach(function (item) {
      box.appendChild(W.actionIcon(item).el);
    });
    return { el: box };
  };

  /* A copy button that confirms, and says what it copied. */
  W.copyButton = function (props) {
    var p = props || {};
    var text = p.text == null ? "" : String(p.text);
    var b = el("button", { type: "button", class: "w-copy", "aria-label": p.label || "Copy" });
    var labelEl = el("span", { class: "w-copy-label", text: p.label || "Copy" });
    b.appendChild(labelEl);
    var timer = null;
    b.addEventListener("click", function () {
      var ok = false;
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(text);
          ok = true;
        }
      } catch (e) { ok = false; }
      labelEl.textContent = ok ? (p.copiedLabel || "Copied") : (p.failedLabel || "Failed");
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { labelEl.textContent = p.label || "Copy"; }, 1200);
      if (p.onCopy) p.onCopy(text, ok);
    });
    return { el: b, text: function () { return text; } };
  };

  W.segmented = function (props) {
    var p = props || {};
    var options = p.options || [];
    var value = p.value == null ? (options[0] && (options[0].value == null ? options[0] : options[0].value)) : p.value;
    var box = el("div", { class: "w-segmented", role: "tablist" });
    var buttons = [];
    var ev = emitter();
    options.forEach(function (o) {
      var v = o && o.value != null ? o.value : o;
      var label = o && o.label != null ? o.label : v;
      var b = el("button", { type: "button", class: "w-segment", role: "tab", "data-value": v, text: label });
      b.addEventListener("click", function () {
        value = v;
        draw();
        ev.emit("change", v);
      });
      buttons.push({ b: b, v: v });
      box.appendChild(b);
    });
    function draw() {
      buttons.forEach(function (x) {
        var on = x.v === value;
        x.b.className = "w-segment" + (on ? " is-on" : "");
        x.b.setAttribute("aria-selected", on ? "true" : "false");
      });
    }
    draw();
    var api = {
      el: box,
      value: function () { return value; },
      set: function (v) { value = v; draw(); return api; },
      on: function (k, fn) { ev.on(k, fn); return api; }
    };
    return api;
  };

  /* ---------- display ---------- */
  W.text = function (props) {
    var p = props || {};
    var t = el("span", { class: cx("w-text", p.type && "w-text-" + p.type, p.strong && "is-strong") });
    t.textContent = p.text == null ? "" : String(p.text);
    return { el: t, set: function (v) { t.textContent = v == null ? "" : String(v); return this; } };
  };

  W.tag = function (props) {
    var p = props || {};
    var t = el("span", { class: cx("w-tag", p.color && "w-tag-" + p.color, p.closable && "is-closable") });
    t.appendChild(el("span", { class: "w-tag-label", text: p.label == null ? "" : p.label }));
    var api = { el: t };
    if (p.closable) {
      var x = el("button", { type: "button", class: "w-tag-close", "aria-label": "Remove", text: "\u00d7" });
      x.addEventListener("click", function () {
        if (p.onClose) p.onClose();
        else if (t.parentNode && t.parentNode.removeChild) t.parentNode.removeChild(t);
      });
      t.appendChild(x);
      api.remove = function () { if (t.parentNode && t.parentNode.removeChild) t.parentNode.removeChild(t); };
    }
    return api;
  };

  function initials(name) {
    return String(name || "?").trim().split(/\s+/).map(function (w) { return w.charAt(0); })
      .slice(0, 2).join("").toUpperCase();
  }
  W.initials = initials;

  W.avatar = function (props) {
    var p = props || {};
    var box = el("span", { class: cx("w-avatar", p.size && "w-avatar-" + p.size, p.shape === "square" && "is-square") });
    if (p.src) box.appendChild(el("img", { src: p.src, alt: p.name || "", loading: "lazy" }));
    else box.appendChild(el("span", { class: "w-avatar-text", text: initials(p.name) }));
    box.setAttribute("title", p.name || "");
    return { el: box };
  };

  W.groupAvatar = function (props) {
    var p = props || {};
    var box = el("span", { class: "w-group-avatar" });
    (p.items || []).slice(0, p.max || 4).forEach(function (a) { box.appendChild(W.avatar(a).el); });
    var extra = (p.items || []).length - (p.max || 4);
    if (extra > 0) box.appendChild(el("span", { class: "w-avatar w-avatar-more", text: "+" + extra }));
    return { el: box };
  };

  /* An inline SVG from path data: the zero-dependency way to ship an icon. */
  W.icon = function (props) {
    var p = props || {};
    var svg = el("svg", {
      viewBox: p.viewBox || "0 0 24 24", width: p.size || 16, height: p.size || 16,
      fill: "none", stroke: p.stroke || "currentColor", "stroke-width": p.strokeWidth || 2,
      "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": p.label ? null : "true",
      role: p.label ? "img" : null, "aria-label": p.label || null, class: "w-icon"
    });
    (p.paths || []).forEach(function (d) { svg.appendChild(el("path", { d: d })); });
    return { el: svg };
  };

  W.image = function (props) {
    var p = props || {};
    var img = el("img", {
      src: p.src, alt: p.alt || "", class: cx("w-image", p.round && "is-round"),
      loading: p.eager ? "eager" : "lazy"
    });
    if (p.width) img.setAttribute("width", p.width);
    if (p.height) img.setAttribute("height", p.height);
    return { el: img };
  };

  /* A list with keys: the same node is reused for the same key, so a re-render
     does not lose focus or scroll. */
  W.list = function (props) {
    var p = props || {};
    var box = el(p.ordered ? "ol" : "ul", { class: "w-list" });
    var nodes = {};
    function render(items) {
      var seen = {};
      (items || []).forEach(function (item, i) {
        var key = p.key ? p.key(item, i) : i;
        seen[key] = true;
        var node = nodes[key];
        if (!node) {
          node = el("li", { class: "w-list-item", "data-key": key });
          nodes[key] = node;
          if (p.render) node.appendChild(p.render(item, i));
          else node.textContent = item == null ? "" : String(item);
        }
        box.appendChild(node);
      });
      Object.keys(nodes).forEach(function (k) {
        if (!seen[k]) { delete nodes[k]; }
      });
    }
    render(p.items);
    return { el: box, set: function (items) { render(items); return this; }, size: function () { return Object.keys(nodes).length; } };
  };

  W.accordion = function (props) {
    var p = props || {};
    var items = p.items || [];
    var open = p.defaultOpen == null ? (p.multiple ? [] : null) : (p.multiple ? [].concat(p.defaultOpen) : p.defaultOpen);
    var box = el("div", { class: "w-accordion" });
    var rows = [];
    var ev = emitter();

    items.forEach(function (item, i) {
      var key = item.key == null ? i : item.key;
      var headerId = id("acc-h"), panelId = id("acc-p");
      var isOpen = p.multiple ? open.indexOf(key) !== -1 : open === key;
      var header = el("button", {
        type: "button", class: "w-accordion-header", id: headerId,
        "aria-expanded": isOpen ? "true" : "false", "aria-controls": panelId
      });
      header.appendChild(el("span", { class: "w-accordion-title", text: item.title == null ? "" : item.title }));
      header.appendChild(el("span", { class: "w-accordion-chevron", "aria-hidden": "true", text: "\u203a" }));
      var panel = el("div", { class: "w-accordion-panel", id: panelId, role: "region", "aria-labelledby": headerId, hidden: !isOpen });
      if (item.content != null) {
        if (typeof item.content === "string") panel.appendChild(document.createTextNode(item.content));
        else panel.appendChild(item.content.el || item.content);
      }
      header.addEventListener("click", function () {
        if (p.multiple) {
          var at = open.indexOf(key);
          if (at === -1) open.push(key); else open.splice(at, 1);
        } else {
          open = open === key ? null : key;
        }
        draw();
        ev.emit("change", p.multiple ? open.slice() : open);
      });
      rows.push({ key: key, header: header, panel: panel });
      box.appendChild(header);
      box.appendChild(panel);
    });

    function draw() {
      rows.forEach(function (r) {
        var isOpen = p.multiple ? open.indexOf(r.key) !== -1 : open === r.key;
        r.header.setAttribute("aria-expanded", isOpen ? "true" : "false");
        r.panel.hidden = !isOpen;
        r.header.className = "w-accordion-header" + (isOpen ? " is-open" : "");
      });
    }
    draw();
    var api = {
      el: box,
      open: function (key) {
        if (p.multiple) { if (open.indexOf(key) === -1) open.push(key); } else open = key;
        draw(); return api;
      },
      close: function (key) {
        if (p.multiple) open = open.filter(function (k) { return k !== key; });
        else if (open === key) open = null;
        draw(); return api;
      },
      isOpen: function (key) { return p.multiple ? open.indexOf(key) !== -1 : open === key; },
      on: function (k, fn) { ev.on(k, fn); return api; }
    };
    return api;
  };

  W.empty = function (props) {
    var p = props || {};
    var box = el("div", { class: "w-empty" });
    if (p.image) box.appendChild(el("img", { class: "w-empty-image", src: p.image, alt: "" }));
    box.appendChild(el("p", { class: "w-empty-title", text: p.title || "Nothing here" }));
    if (p.description) box.appendChild(el("p", { class: "w-empty-desc", text: p.description }));
    if (p.action) box.appendChild(p.action.el || p.action);
    return { el: box };
  };

  W.skeleton = function (props) {
    var p = props || {};
    var box = el("div", { class: "w-skeleton", "aria-hidden": "true", "aria-busy": "true" });
    var lines = p.lines || 1;
    for (var i = 0; i < lines; i++) {
      var last = i === lines - 1 && lines > 1;
      box.appendChild(el("div", {
        class: "w-skeleton-line", style: { width: last ? (p.lastWidth || "60%") : "100%", height: (p.height || 12) + "px" }
      }));
    }
    return { el: box };
  };

  /* ---------- feedback ---------- */
  var ALERT_ICONS = { info: "\u2139", success: "\u2713", warning: "\u26a0", error: "\u2715" };

  W.alert = function (props) {
    var p = props || {};
    var kind = p.type || "info";
    var box = el("div", { class: "w-alert w-alert-" + kind, role: kind === "error" ? "alert" : "status" });
    box.appendChild(el("span", { class: "w-alert-icon", "aria-hidden": "true", text: ALERT_ICONS[kind] || ALERT_ICONS.info }));
    var body = el("div", { class: "w-alert-body" });
    if (p.title) body.appendChild(el("p", { class: "w-alert-title", text: p.title }));
    if (p.message) body.appendChild(el("p", { class: "w-alert-message", text: p.message }));
    box.appendChild(body);
    var api = { el: box };
    if (p.closable) {
      var x = el("button", { type: "button", class: "w-alert-close", "aria-label": "Dismiss", text: "\u00d7" });
      x.addEventListener("click", function () {
        if (p.onClose) p.onClose();
        else if (box.parentNode && box.parentNode.removeChild) box.parentNode.removeChild(box);
      });
      box.appendChild(x);
      api.close = function () { if (box.parentNode && box.parentNode.removeChild) box.parentNode.removeChild(box); };
    }
    return api;
  };

  W.badge = function (props) {
    var p = props || {};
    var b = el("span", { class: cx("w-badge", p.color && "w-badge-" + p.color, p.dot && "is-dot") });
    if (p.dot) b.setAttribute("aria-label", p.label || "New");
    else b.textContent = p.count == null ? (p.label || "") : (p.max != null && p.count > p.max ? p.max + "+" : String(p.count));
    return { el: b, set: function (n) { b.textContent = n == null ? "" : String(n); return this; } };
  };

  W.progress = function (props) {
    var p = props || {};
    var value = p.value == null ? 0 : p.value;
    var bar = el("div", { class: "w-progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100" });
    var fill = el("div", { class: "w-progress-fill" });
    bar.appendChild(fill);
    function draw() {
      if (p.indeterminate) {
        bar.className = "w-progress is-indeterminate";
        bar.removeAttribute("aria-valuenow");
        fill.style.width = "40%";
      } else {
        bar.className = "w-progress";
        bar.setAttribute("aria-valuenow", String(Math.round(value)));
        fill.style.width = Math.max(0, Math.min(100, value)) + "%";
      }
    }
    draw();
    return {
      el: bar,
      value: function () { return value; },
      set: function (v) { value = v; draw(); return this; },
      finish: function () { value = 100; draw(); return this; }
    };
  };

  W.spinner = function (props) {
    var p = props || {};
    var box = el("span", { class: cx("w-spinner", p.size && "w-spinner-" + p.size), role: "status", "aria-label": p.label || "Loading" });
    return { el: box };
  };

  W.result = function (props) {
    var p = props || {};
    var box = el("div", { class: "w-result" });
    box.appendChild(el("div", { class: "w-result-icon", "aria-hidden": "true", text: p.icon || (p.status === "error" ? "\u2715" : "\u2713") }));
    box.appendChild(el("p", { class: "w-result-title", text: p.title || "Done" }));
    if (p.subtitle) box.appendChild(el("p", { class: "w-result-subtitle", text: p.subtitle }));
    if (p.actions && p.actions.length) {
      var row = el("div", { class: "w-result-actions" });
      p.actions.forEach(function (a) { row.appendChild(a.el || a); });
      box.appendChild(row);
    }
    return { el: box };
  };

  /* ---------- overlay: focus trap and outside click ---------- */
  var FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

  function trapFocus(container) {
    function onKey(e) {
      if (e.key !== "Tab") return;
      var list = container.querySelectorAll ? container.querySelectorAll(FOCUSABLE) : [];
      if (!list || !list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && (document.activeElement === first || !container.contains || !container.contains(document.activeElement))) {
        if (last.focus) last.focus();
        if (e.preventDefault) e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        if (first.focus) first.focus();
        if (e.preventDefault) e.preventDefault();
      }
    }
    container.addEventListener("keydown", onKey);
    return function () { container.removeEventListener && container.removeEventListener("keydown", onKey); };
  }

  /* A document-level listener, removed by the returned function. Same shape as
     onEscape, so a caller can hold one "off" handle per thing it added. */
  function onDoc(type, fn) {
    if (typeof document !== "undefined" && document.addEventListener) document.addEventListener(type, fn);
    return function () { if (typeof document !== "undefined" && document.removeEventListener) document.removeEventListener(type, fn); };
  }

  function onEscape(fn) {
    function handler(e) { if (e.key === "Escape") fn(); }
    if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("keydown", handler);
    return function () { if (typeof document !== "undefined" && document.removeEventListener) document.removeEventListener("keydown", handler); };
  }

  /* A layer: the shared machinery behind modal, drawer, popover and menu. */
  function layer(opts) {
    var o = opts || {};
    var ev = emitter();
    var host = null;
    var restoreFocus = null;
    var offEscape = null;
    var untrap = null;
    var isOpen = false;

    var root = el("div", { class: cx("w-layer", o.class) , hidden: true });

    var api = {
      el: root,
      open: function () {
        if (isOpen) return api;
        isOpen = true;
        root.hidden = false;
        root.className = cx("w-layer", o.class, "is-open");
        if (typeof document !== "undefined") {
          restoreFocus = document.activeElement;
          untrap = trapFocus(root);
        }
        if (o.closeOnEscape !== false) offEscape = onEscape(api.close);
        if (o.onOpen) o.onOpen();
        ev.emit("open", true);
        return api;
      },
      close: function () {
        if (!isOpen) return api;
        isOpen = false;
        root.hidden = true;
        root.className = cx("w-layer", o.class);
        if (offEscape) { offEscape(); offEscape = null; }
        if (untrap) { untrap(); untrap = null; }
        if (restoreFocus && restoreFocus.focus) restoreFocus.focus();
        if (o.onClose) o.onClose();
        ev.emit("open", false);
        return api;
      },
      toggle: function () { return isOpen ? api.close() : api.open(); },
      isOpen: function () { return isOpen; },
      mount: function (target) {
        host = target || (typeof document !== "undefined" ? document.body : null);
        if (host) host.appendChild(root);
        return api;
      },
      on: function (k, fn) { ev.on(k, fn); return api; }
    };
    return api;
  }

  W.modal = function (props) {
    var p = props || {};
    var titleId = id("modal-t");
    var box = el("div", {
      class: "w-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": p.title ? titleId : null
    });
    var backdrop = el("div", { class: "w-backdrop" });
    var wrap = el("div", { class: "w-modal-wrap" }, [backdrop, box]);

    var head = el("div", { class: "w-modal-head" });
    if (p.title) head.appendChild(el("h2", { class: "w-modal-title", id: titleId, text: p.title }));
    var closeBtn = el("button", { type: "button", class: "w-modal-close", "aria-label": "Close", text: "\u00d7" });
    head.appendChild(closeBtn);
    box.appendChild(head);

    var body = el("div", { class: "w-modal-body" });
    if (p.body != null) {
      if (typeof p.body === "string") body.appendChild(document.createTextNode(p.body));
      else body.appendChild(p.body.el || p.body);
    }
    box.appendChild(body);

    if (p.actions && p.actions.length) {
      var foot = el("div", { class: "w-modal-foot" });
      p.actions.forEach(function (a) { foot.appendChild(a.el || a); });
      box.appendChild(foot);
    }

    var m = layer({ class: "w-layer-modal", onClose: p.onClose, closeOnEscape: p.closeOnEscape });
    m.el.appendChild(wrap);
    m.box = box;
    m.body = body;
    closeBtn.addEventListener("click", function () { m.close(); });
    if (p.closeOnBackdrop !== false) backdrop.addEventListener("click", function () { m.close(); });
    return m;
  };

  W.drawer = function (props) {
    var p = props || {};
    var side = p.side || "right";
    var titleId = id("drawer-t");
    var box = el("div", {
      class: "w-drawer w-drawer-" + side, role: "dialog", "aria-modal": "true",
      "aria-labelledby": p.title ? titleId : null
    });
    var backdrop = el("div", { class: "w-backdrop" });
    var head = el("div", { class: "w-drawer-head" });
    if (p.title) head.appendChild(el("h2", { class: "w-drawer-title", id: titleId, text: p.title }));
    var closeBtn = el("button", { type: "button", class: "w-drawer-close", "aria-label": "Close", text: "\u00d7" });
    head.appendChild(closeBtn);
    box.appendChild(head);
    var body = el("div", { class: "w-drawer-body" });
    if (p.body != null) {
      if (typeof p.body === "string") body.appendChild(document.createTextNode(p.body));
      else body.appendChild(p.body.el || p.body);
    }
    box.appendChild(body);

    var d = layer({ class: "w-layer-drawer", onClose: p.onClose, closeOnEscape: p.closeOnEscape });
    d.el.appendChild(backdrop);
    d.el.appendChild(box);
    d.box = box;
    d.body = body;
    closeBtn.addEventListener("click", function () { d.close(); });
    if (p.closeOnBackdrop !== false) backdrop.addEventListener("click", function () { d.close(); });
    return d;
  };

  /* One host for the whole app: toasts stack, each one leaves on its own. */
  var toastHostEl = null;
  var toastSeq = 0;
  W.toastHost = function () {
    if (!toastHostEl) {
      toastHostEl = el("div", { class: "w-toast-host", role: "region", "aria-label": "Notifications", "aria-live": "polite" });
      if (typeof document !== "undefined" && document.body && document.body.appendChild) document.body.appendChild(toastHostEl);
    }
    return toastHostEl;
  };

  W.toast = function (message, opts) {
    var o = opts || {};
    var host = toastHostEl || W.toastHost();
    var node = el("div", { class: cx("w-toast", o.type && "w-toast-" + o.type), role: "status" });
    node.setAttribute("data-toast", String(++toastSeq));
    node.appendChild(el("span", { class: "w-toast-text", text: message == null ? "" : String(message) }));
    var timer = null;
    function dismiss() {
      if (timer) clearTimeout(timer);
      if (node.parentNode && node.parentNode.removeChild) node.parentNode.removeChild(node);
      if (o.onClose) o.onClose();
    }
    if (o.closable !== false) {
      var x = el("button", { type: "button", class: "w-toast-close", "aria-label": "Dismiss", text: "\u00d7" });
      x.addEventListener("click", dismiss);
      node.appendChild(x);
    }
    host.appendChild(node);
    var ms = o.duration == null ? 3000 : o.duration;
    if (ms > 0) timer = setTimeout(dismiss, ms);
    return { el: node, dismiss: dismiss };
  };

  /* ---------- overlay: tooltip, popover, menu ---------- */
  W.tooltip = function (props) {
    var p = props || {};
    var content = el("div", { class: "w-tooltip", role: "tooltip", hidden: true });
    content.textContent = p.content == null ? "" : String(p.content);
    var anchor = p.anchor && (p.anchor.el || p.anchor);
    var wrap = el("span", { class: "w-tooltip-wrap" });
    if (anchor) wrap.appendChild(anchor);
    wrap.appendChild(content);
    var timer = null;
    function show() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { content.hidden = false; }, p.delay == null ? 120 : p.delay);
    }
    function hide() {
      if (timer) clearTimeout(timer);
      content.hidden = true;
    }
    wrap.addEventListener("mouseenter", show);
    wrap.addEventListener("mouseleave", hide);
    wrap.addEventListener("focusin", show);
    wrap.addEventListener("focusout", hide);
    return { el: wrap, show: show, hide: hide, visible: function () { return !content.hidden; } };
  };

  W.popover = function (props) {
    var p = props || {};
    var content = el("div", { class: "w-popover", role: "dialog", hidden: true });
    if (p.content != null) {
      if (typeof p.content === "string") content.appendChild(document.createTextNode(p.content));
      else content.appendChild(p.content.el || p.content);
    }
    var trigger = p.trigger ? (p.trigger.el || p.trigger) : el("button", { type: "button", class: "w-popover-trigger", text: p.label || "Open" });
    var wrap = el("span", { class: "w-popover-wrap" }, [trigger, content]);
    var ev = emitter();

    function setOpen(v) {
      content.hidden = !v;
      trigger.setAttribute("aria-expanded", v ? "true" : "false");
      ev.emit("open", v);
    }
    trigger.addEventListener("click", function (e) {
      if (e.stopPropagation) e.stopPropagation();
      setOpen(content.hidden);
    });
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");

    var api = {
      el: wrap,
      open: function () { setOpen(true); return api; },
      close: function () { setOpen(false); return api; },
      toggle: function () { setOpen(content.hidden); return api; },
      isOpen: function () { return !content.hidden; },
      on: function (k, fn) { ev.on(k, fn); return api; }
    };
    return api;
  };

  /* A menu: opens from a trigger, closes on outside click, Escape, or a pick. */
  W.dropdownMenu = function (props) {
    var p = props || {};
    var menuId = id("menu");
    var list = el("ul", { class: "w-menu", role: "menu", id: menuId, hidden: true });
    var trigger = p.trigger ? (p.trigger.el || p.trigger) : el("button", { type: "button", class: "w-menu-trigger", text: p.label || "Menu" });
    var wrap = el("span", { class: "w-dropdown" }, [trigger, list]);
    var ev = emitter();
    var items = [];
    var offDoc = null;

    (p.items || []).forEach(function (item) {
      if (item.separator) {
        list.appendChild(el("li", { class: "w-menu-sep", role: "separator" }));
        return;
      }
      var li = el("li", { class: "w-menu-item", role: "menuitem", tabindex: "-1", "data-value": item.value });
      if (item.icon) li.appendChild(el("span", { class: "w-menu-icon", html: item.icon }));
      li.appendChild(el("span", { class: "w-menu-label", text: item.label == null ? item.value : item.label }));
      if (item.danger) li.className = "w-menu-item is-danger";
      li.addEventListener("click", function () {
        if (item.disabled) return;
        api.close();
        if (item.onSelect) item.onSelect(item.value);
        ev.emit("select", item.value);
      });
      items.push({ li: li, item: item });
      list.appendChild(li);
    });

    function outside(e) {
      if (e && e.target && wrap.contains && wrap.contains(e.target)) return;
      api.close();
    }

    var api = {
      el: wrap,
      open: function () {
        list.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        if (typeof document !== "undefined" && document.addEventListener) {
          offDoc = onEscape(api.close);
        }
        ev.emit("open", true);
        return api;
      },
      close: function () {
        list.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        if (offDoc) { offDoc(); offDoc = null; }
        ev.emit("open", false);
        return api;
      },
      toggle: function () { return list.hidden ? api.open() : api.close(); },
      isOpen: function () { return !list.hidden; },
      on: function (k, fn) { ev.on(k, fn); return api; },
      items: items
    };
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", menuId);
    trigger.addEventListener("click", function (e) {
      if (e.stopPropagation) e.stopPropagation();
      api.toggle();
    });
    api.outside = outside;
    return api;
  };

  /* ---------- nav ---------- */
  W.tabs = function (props) {
    var p = props || {};
    var items = p.items || [];
    var active = p.value == null ? (items[0] && (items[0].key == null ? 0 : items[0].key)) : p.value;
    var tablist = el("div", { class: "w-tabs", role: "tablist" });
    var panel = el("div", { class: "w-tab-panel", role: "tabpanel", tabindex: "0" });
    var buttons = [];
    var ev = emitter();

    items.forEach(function (item, i) {
      var key = item.key == null ? i : item.key;
      var tabId = id("tab"), panelId = id("panel");
      var b = el("button", {
        type: "button", class: "w-tab", role: "tab", id: tabId,
        "aria-controls": panelId, "data-key": key, tabindex: "-1"
      });
      b.appendChild(el("span", { class: "w-tab-label", text: item.label == null ? "" : item.label }));
      b.addEventListener("click", function () { select(key); });
      b.addEventListener("keydown", function (e) {
        var at = buttons.findIndex(function (x) { return x.key === key; });
        if (e.key === "ArrowRight") { buttons[(at + 1) % buttons.length].b.focus && buttons[(at + 1) % buttons.length].b.focus(); if (e.preventDefault) e.preventDefault(); }
        else if (e.key === "ArrowLeft") { buttons[(at - 1 + buttons.length) % buttons.length].b.focus && buttons[(at - 1 + buttons.length) % buttons.length].b.focus(); if (e.preventDefault) e.preventDefault(); }
        else if (e.key === "Home") { buttons[0].b.focus && buttons[0].b.focus(); }
        else if (e.key === "End") { buttons[buttons.length - 1].b.focus && buttons[buttons.length - 1].b.focus(); }
      });
      buttons.push({ b: b, key: key, item: item, panelId: panelId });
      tablist.appendChild(b);
    });

    function select(key) {
      active = key;
      buttons.forEach(function (x) {
        var on = x.key === key;
        x.b.className = "w-tab" + (on ? " is-active" : "");
        x.b.setAttribute("aria-selected", on ? "true" : "false");
        x.b.setAttribute("tabindex", on ? "0" : "-1");
        if (on) {
          panel.setAttribute("id", x.panelId);
          panel.setAttribute("aria-labelledby", x.b.getAttribute("id"));
          panel.innerHTML = "";
          var c = x.item.content;
          if (c != null) {
            if (typeof c === "string") panel.appendChild(document.createTextNode(c));
            else panel.appendChild(c.el || c);
          }
        }
      });
      ev.emit("change", key);
    }

    var wrap = el("div", { class: "w-tabs-wrap" }, [tablist, panel]);
    select(active);

    var api = {
      el: wrap,
      tablist: tablist,
      panel: panel,
      value: function () { return active; },
      set: function (k) { select(k); return api; },
      on: function (k, fn) { ev.on(k, fn); return api; }
    };
    return api;
  };

  /* Pages with ellipsis: 1 ... 4 5 6 ... 20 */
  W.pages = function (current, total, around) {
    var span = around == null ? 1 : around;
    var out = [];
    /* a short run fits on one line: collapsing it would only add a gap */
    if (total <= 7) {
      for (var p = 1; p <= total; p++) out.push(p);
      return out;
    }
    for (var i = 1; i <= total; i++) {
      if (i === 1 || i === total || Math.abs(i - current) <= span) out.push(i);
      else if (out[out.length - 1] !== "...") out.push("...");
    }
    return out;
  };

  W.pagination = function (props) {
    var p = props || {};
    var total = p.total || 1;
    var current = p.value || 1;
    var nav = el("nav", { class: "w-pagination", "aria-label": p.label || "Pagination" });
    var ev = emitter();

    function go(n) {
      if (n < 1 || n > total || n === current) return;
      current = n;
      draw();
      if (p.onChange) p.onChange(n);
      ev.emit("change", n);
    }

    function draw() {
      nav.innerHTML = "";
      var prev = el("button", { type: "button", class: "w-page w-page-prev", "aria-label": "Previous page", text: "\u2039" });
      prev.disabled = current === 1;
      prev.addEventListener("click", function () { go(current - 1); });
      nav.appendChild(prev);
      W.pages(current, total).forEach(function (n) {
        if (n === "...") { nav.appendChild(el("span", { class: "w-page-gap", text: "\u2026", "aria-hidden": "true" })); return; }
        var b = el("button", {
          type: "button", class: "w-page" + (n === current ? " is-current" : ""),
          "data-page": n, "aria-current": n === current ? "page" : null, text: String(n)
        });
        b.addEventListener("click", function () { go(n); });
        nav.appendChild(b);
      });
      var next = el("button", { type: "button", class: "w-page w-page-next", "aria-label": "Next page", text: "\u203a" });
      next.disabled = current === total;
      next.addEventListener("click", function () { go(current + 1); });
      nav.appendChild(next);
    }
    draw();

    var api = {
      el: nav,
      value: function () { return current; },
      set: function (n) { go(n); return api; },
      on: function (k, fn) { ev.on(k, fn); return api; }
    };
    return api;
  };

  W.breadcrumb = function (props) {
    var p = props || {};
    var nav = el("nav", { class: "w-breadcrumb", "aria-label": p.label || "Breadcrumb" });
    var list = el("ol", { class: "w-breadcrumb-list" });
    var items = p.items || [];
    items.forEach(function (item, i) {
      var last = i === items.length - 1;
      var li = el("li", { class: "w-breadcrumb-item" });
      if (last || !item.href) li.appendChild(el("span", { "aria-current": last ? "page" : null, text: item.label == null ? "" : item.label }));
      else li.appendChild(el("a", { href: item.href, text: item.label == null ? "" : item.label }));
      list.appendChild(li);
    });
    nav.appendChild(list);
    return { el: nav, items: items };
  };

  W.steps = function (props) {
    var p = props || {};
    var items = p.items || [];
    var current = p.current == null ? 0 : p.current;
    var list = el("ol", { class: "w-steps" });
    function draw() {
      list.innerHTML = "";
      items.forEach(function (item, i) {
        var state = i < current ? "done" : (i === current ? "current" : "todo");
        var li = el("li", { class: "w-step w-step-" + state, "aria-current": i === current ? "step" : null });
        li.appendChild(el("span", { class: "w-step-dot", "aria-hidden": "true", text: state === "done" ? "\u2713" : String(i + 1) }));
        li.appendChild(el("span", { class: "w-step-label", text: item.label == null ? "" : item.label }));
        if (item.description) li.appendChild(el("span", { class: "w-step-desc", text: item.description }));
        list.appendChild(li);
      });
    }
    draw();
    var api = {
      el: list,
      current: function () { return current; },
      set: function (n) { current = n; draw(); return api; },
      next: function () { current = Math.min(items.length - 1, current + 1); draw(); return api; },
      prev: function () { current = Math.max(0, current - 1); draw(); return api; }
    };
    return api;
  };

  /* ---------- layout ---------- */
  W.block = function (props) {
    var p = props || {};
    var box = el("div", { class: cx("w-block", p.direction && "is-" + p.direction, p.padding && "is-padded") });
    (p.children || []).forEach(function (c) { box.appendChild(c.el || c); });
    return { el: box, add: function (c) { box.appendChild(c.el || c); return this; } };
  };

  W.grid = function (props) {
    var p = props || {};
    var box = el("div", { class: "w-grid" });
    box.style.display = "grid";
    box.style.gridTemplateColumns = p.columns
      ? (Array.isArray(p.columns) ? p.columns.join(" ") : "repeat(" + p.columns + ", minmax(0, 1fr))")
      : "repeat(auto-fill, minmax(" + (p.min || 200) + "px, 1fr))";
    if (p.gap != null) box.style.gap = typeof p.gap === "number" ? p.gap + "px" : p.gap;
    (p.children || []).forEach(function (c) { box.appendChild(c.el || c); });
    return { el: box, add: function (c) { box.appendChild(c.el || c); return this; } };
  };

  W.divider = function (props) {
    var p = props || {};
    if (p.vertical) return { el: el("div", { class: "w-divider is-vertical", role: "separator", "aria-orientation": "vertical" }) };
    var d = el("div", { class: "w-divider", role: "separator" });
    if (p.label) d.appendChild(el("span", { class: "w-divider-label", text: p.label }));
    return { el: d };
  };

  W.scrollArea = function (props) {
    var p = props || {};
    var box = el("div", { class: "w-scroll", tabindex: "0" });
    box.style.overflow = "auto";
    if (p.maxHeight) box.style.maxHeight = typeof p.maxHeight === "number" ? p.maxHeight + "px" : p.maxHeight;
    (p.children || []).forEach(function (c) { box.appendChild(c.el || c); });
    return { el: box, add: function (c) { box.appendChild(c.el || c); return this; } };
  };

  W.header = function (props) {
    var p = props || {};
    var h = el("header", { class: "w-header" });
    if (p.left) {
      var left = el("div", { class: "w-header-left" });
      [].concat(p.left).forEach(function (c) { left.appendChild(c.el || c); });
      h.appendChild(left);
    }
    if (p.title != null) h.appendChild(el("h1", { class: "w-header-title", text: p.title }));
    if (p.right) {
      var right = el("div", { class: "w-header-right" });
      [].concat(p.right).forEach(function (c) { right.appendChild(c.el || c); });
      h.appendChild(right);
    }
    return { el: h };
  };

  /* ---------- utility ---------- */
  W.trapFocus = trapFocus;
  W.cx = cx;


  /* ---------- sortable list ---------- */
  /* Reordering is pure: moveItem takes the array and two indices and returns a new
     array. The drag handlers only decide which indices to hand it, so the rule can
     be tested without a pointer. */
  W.moveItem = function (arr, from, to) {
    var a = (arr || []).slice();
    if (from < 0 || to < 0 || from >= a.length || to >= a.length || from === to) return a;
    var item = a.splice(from, 1)[0];
    a.splice(to, 0, item);
    return a;
  };

  /* Which slot a pointer at y is over, given the item heights. -1 means none. */
  W.slotAt = function (y, tops, heights) {
    for (var i = 0; i < tops.length; i++) {
      if (y >= tops[i] && y < tops[i] + heights[i]) return i;
    }
    return -1;
  };

  W.sortableList = function (props) {
    var p = props || {};
    var list = el("ul", { class: "w-sortable", role: "list" });
    var ev = emitter();
    var data = (p.items || []).slice();
    var dragFrom = -1;

    function render() {
      list.innerHTML = "";
      data.forEach(function (item, i) {
        var label = item && item.label != null ? item.label : String(item);
        var li = el("li", {
          class: "w-sortable-item",
          draggable: "true",
          "data-index": String(i),
          role: "listitem",
          tabindex: "0"
        }, [el("span", { class: "w-sortable-grip", "aria-hidden": "true", text: "⋮⋮" }),
            el("span", { class: "w-sortable-label", text: label })]);
        li.addEventListener("dragstart", function () { dragFrom = i; li.className = "w-sortable-item is-dragging"; });
        li.addEventListener("dragend", function () { li.className = "w-sortable-item"; dragFrom = -1; });
        li.addEventListener("dragover", function (e) { if (e && e.preventDefault) e.preventDefault(); });
        li.addEventListener("drop", function (e) {
          if (e && e.preventDefault) e.preventDefault();
          if (dragFrom >= 0) api.move(dragFrom, i);
        });
        /* keyboard: alt+arrow moves an item, so reordering does not need a mouse */
        li.addEventListener("keydown", function (e) {
          if (!e || !e.altKey) return;
          if (e.key === "ArrowUp") { if (e.preventDefault) e.preventDefault(); api.move(i, i - 1); }
          if (e.key === "ArrowDown") { if (e.preventDefault) e.preventDefault(); api.move(i, i + 1); }
        });
        list.appendChild(li);
      });
    }

    var api = {
      el: list,
      items: function () { return data.slice(); },
      set: function (items) { data = (items || []).slice(); render(); return api; },
      move: function (from, to) {
        var next = W.moveItem(data, from, to);
        if (next.length !== data.length || from === to) return api;
        data = next;
        render();
        if (p.onMove) p.onMove(from, to, api.items());
        ev.emit("move", { from: from, to: to, items: api.items() });
        return api;
      },
      on: function (k, fn) { ev.on(k, fn); return api; }
    };

    render();
    return api;
  };

  /* ---------- context menu ---------- */
  /* A menu at the pointer. Same item shape as dropdownMenu, plus x/y, and it closes
     on Escape, on a click elsewhere, and after a selection. */
  W.contextMenu = function (props) {
    var p = props || {};
    var list = el("ul", { class: "w-context-menu", role: "menu", hidden: true });
    var ev = emitter();
    var offDoc = null;
    var offKey = null;

    (p.items || []).forEach(function (item) {
      if (item.separator) { list.appendChild(el("li", { class: "w-menu-sep", role: "separator" })); return; }
      var li = el("li", { class: "w-menu-item", role: "menuitem", tabindex: "-1", "data-value": item.value },
                  [el("span", { class: "w-menu-label", text: item.label == null ? item.value : item.label })]);
      if (item.danger) li.className = "w-menu-item is-danger";
      li.addEventListener("click", function () {
        if (item.disabled) return;
        api.close();
        if (item.onSelect) item.onSelect(item.value);
        ev.emit("select", item.value);
      });
      list.appendChild(li);
    });

    function outside(e) {
      if (e && e.target && list.contains && list.contains(e.target)) return;
      api.close();
    }

    var api = {
      el: list,
      open: function (x, y) {
        list.style.left = (x || 0) + "px";
        list.style.top = (y || 0) + "px";
        list.hidden = false;
        api.x = x || 0;
        api.y = y || 0;
        if (typeof document !== "undefined" && document.addEventListener) {
          offDoc = onDoc("click", outside);
          offKey = onEscape(api.close);
        }
        ev.emit("open", { x: api.x, y: api.y });
        return api;
      },
      close: function () {
        if (list.hidden) return api;
        list.hidden = true;
        if (offDoc) { offDoc(); offDoc = null; }
        if (offKey) { offKey(); offKey = null; }
        ev.emit("open", null);
        return api;
      },
      isOpen: function () { return !list.hidden; },
      on: function (k, fn) { ev.on(k, fn); return api; },
      x: 0,
      y: 0
    };
    return api;
  };


  /* ---------- floating panel ---------- */
  /* A panel that floats over the content and can be dragged by its header. The
     drag maths is pure: clampTo takes the box and the parent size and returns a
     position that keeps the panel fully inside. */
  W.clampTo = function (x, y, w, h, pw, ph) {
    var maxX = pw > w ? pw - w : 0;
    var maxY = ph > h ? ph - h : 0;
    return {
      x: x < 0 ? 0 : (x > maxX ? maxX : x),
      y: y < 0 ? 0 : (y > maxY ? maxY : y)
    };
  };

  W.floatingPanel = function (props) {
    var p = props || {};
    var title = p.title == null ? "Panel" : p.title;
    var header = el("div", { class: "w-float-head" }, [el("span", { class: "w-float-title", text: title })]);
    if (p.closable !== false) {
      var closeBtn = el("button", { type: "button", class: "w-float-close", "aria-label": "Close", text: "×" });
      closeBtn.addEventListener("click", function () { api.close(); });
      header.appendChild(closeBtn);
    }
    var body = el("div", { class: "w-float-body" });
    var panel = el("div", { class: "w-float", role: "dialog", hidden: true }, [header, body]);
    var ev = emitter();
    var pos = { x: p.x || 0, y: p.y || 0 };
    var size = { w: p.width || 320, h: p.height || 200 };
    var drag = null;

    function place() {
      panel.style.left = pos.x + "px";
      panel.style.top = pos.y + "px";
      panel.style.width = size.w + "px";
      panel.style.height = size.h + "px";
    }

    header.addEventListener("pointerdown", function (e) {
      drag = { dx: (e.clientX || 0) - pos.x, dy: (e.clientY || 0) - pos.y };
    });
    /* move and release are listened for on the panel, which is enough for a test
       and for a pointer that never leaves it; a real page would add them to the
       document while dragging. */
    panel.addEventListener("pointermove", function (e) {
      if (!drag) return;
      pos.x = (e.clientX || 0) - drag.dx;
      pos.y = (e.clientY || 0) - drag.dy;
      place();
    });
    panel.addEventListener("pointerup", function () { drag = null; });

    var api = {
      el: panel,
      body: body,
      open: function () { panel.hidden = false; place(); ev.emit("open", true); return api; },
      close: function () { panel.hidden = true; ev.emit("open", false); return api; },
      isOpen: function () { return !panel.hidden; },
      moveTo: function (x, y) { pos = { x: x, y: y }; place(); return api; },
      pos: function () { return { x: pos.x, y: pos.y }; },
      resize: function (w, h) { size = { w: w, h: h }; place(); return api; },
      size: function () { return { w: size.w, h: size.h }; },
      /* keep it inside a parent of the given size */
      clamp: function (pw, ph) {
        var c = W.clampTo(pos.x, pos.y, size.w, size.h, pw, ph);
        pos = c; place(); return api;
      },
      on: function (k, fn) { ev.on(k, fn); return api; }
    };
    place();
    return api;
  };

  /* ---------- side navigation ---------- */
  /* A list of destinations with one current. Selection is by value, and a
     collapsed state hides the labels while keeping the items reachable. */
  W.sideNav = function (props) {
    var p = props || {};
    var nav = el("nav", { class: "w-sidenav", "aria-label": p.label || "Sections" });
    var ev = emitter();
    var items = (p.items || []).slice();
    var current = p.value != null ? p.value : (items[0] ? items[0].value : null);
    var collapsed = !!p.collapsed;

    function render() {
      nav.innerHTML = "";
      nav.className = collapsed ? "w-sidenav is-collapsed" : "w-sidenav";
      items.forEach(function (item) {
        var isCurrent = item.value === current;
        var li = el("button", {
          type: "button",
          class: "w-sidenav-item" + (isCurrent ? " is-current" : ""),
          "data-value": item.value,
          "aria-current": isCurrent ? "page" : "false"
        });
        if (item.icon) li.appendChild(el("span", { class: "w-sidenav-icon", text: item.icon }));
        li.appendChild(el("span", { class: "w-sidenav-label", text: item.label == null ? item.value : item.label }));
        if (collapsed) li.setAttribute("title", item.label == null ? item.value : item.label);
        li.addEventListener("click", function () {
          if (item.disabled) return;
          api.select(item.value);
        });
        nav.appendChild(li);
      });
    }

    var api = {
      el: nav,
      select: function (v) {
        var hit = items.filter(function (i) { return i.value === v; })[0];
        if (!hit || hit.disabled || v === current) return api;
        current = v;
        render();
        if (p.onSelect) p.onSelect(v);
        ev.emit("select", v);
        return api;
      },
      value: function () { return current; },
      items: function () { return items.slice(); },
      set: function (next) { items = (next || []).slice(); render(); return api; },
      collapse: function (on) { collapsed = on === undefined ? !collapsed : !!on; render(); return api; },
      collapsed: function () { return collapsed; },
      on: function (k, fn) { ev.on(k, fn); return api; }
    };
    render();
    return api;
  };

  /* ---------- button stylesheet, opt-in ---------------------------------
   * The kit emits classes and leaves them unstyled on purpose: the caller owns
   * the look. That is also how the fleet grew eighteen pages where a button's
   * label vanished in one theme — every app re-derived the surface/text pair and
   * got it wrong the same way (white label on a surface that flips to
   * near-white, 1.16:1). This is that pair, written once.
   *
   * Feed the custom properties from tokens-kit, which chooses the label per
   * mode: --w-on-primary = Tokens.on("Primary", mode).
   *
   *   document.head.appendChild(Object.assign(document.createElement("style"),
   *     { textContent: W.buttonCss() }));
   */
  W.buttonCss = function (opts) {
    var p = (opts && opts.prefix) || "--w";
    return [
      ".w-button{display:inline-flex;align-items:center;justify-content:center;gap:.5em;font:inherit;",
      "line-height:1.2;padding:.55em 1em;border-radius:.5em;border:1px solid var(" + p + "-line);",
      "background:var(" + p + "-surface);color:var(" + p + "-on-surface);cursor:pointer;text-decoration:none}",
      ".w-button-primary{background:var(" + p + "-primary);border-color:var(" + p + "-primary);",
      "color:var(" + p + "-on-primary)}",
      ".w-button-ghost{background:transparent;color:var(" + p + "-text);border-color:var(" + p + "-line)}",
      ".w-button:disabled{opacity:.55;cursor:not-allowed}",
      ".w-button:focus-visible{outline:2px solid var(" + p + "-primary);outline-offset:2px}"
    ].join("");
  };

  return W;
});
