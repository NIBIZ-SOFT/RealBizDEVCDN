/*
 ComboSelect - Lightweight combobox (input + dropdown) bound to a native <select>
 Usage:
   new ComboSelect('#MySelect', {
     ajaxUrl: './index.php?...',
     projectSelect: '#ProjectID', // optional: selector to send id param
     limit: 50,
     placeholder: 'Search...'
   });
*/
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("jquery"));
  } else {
    root.ComboSelect = factory(root.jQuery || root.$);
  }
})(typeof self !== "undefined" ? self : this, function ($) {
  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function getPlaceholder(selectEl) {
    if (
      selectEl.options &&
      selectEl.options.length &&
      selectEl.options[0].value === ""
    ) {
      return {
        value: selectEl.options[0].value,
        text: selectEl.options[0].text,
      };
    }
    return { value: "", text: "-- Select --" };
  }

  function ComboSelect(selectorOrEl, opts) {
    this.selectEl =
      typeof selectorOrEl === "string"
        ? document.querySelector(selectorOrEl)
        : selectorOrEl;
    if (!this.selectEl) throw new Error("ComboSelect: select not found");
    this.opts = Object.assign(
      { ajaxUrl: "", projectSelect: null, limit: 50, placeholder: "Search..." },
      opts || {}
    );
    this._typingXhr = null;
    this._build();
  }

  ComboSelect.prototype._build = function () {
    if (this.selectEl.dataset.comboAttached === "1") return;

    var wrapper = createEl("div", "combo-select position-relative");
    this.selectEl.parentNode.insertBefore(wrapper, this.selectEl);
    wrapper.appendChild(this.selectEl);
    this.wrapper = wrapper;

    // hide native select but keep in DOM for form submit
    this.selectEl.style.position = "absolute";
    this.selectEl.style.left = "-9999px";

    this.inputEl = createEl("input", "form-control");
    this.inputEl.type = "text";
    this.inputEl.placeholder = this.opts.placeholder;
    wrapper.insertBefore(this.inputEl, this.selectEl);

    this.menu = createEl("div", "combo-menu shadow");
    var m = this.menu.style;
    m.position = "absolute";
    m.top = "100%";
    m.left = 0;
    m.right = 0;
    m.zIndex = 1050;
    m.background = "#fff";
    m.border = "1px solid #dee2e6";
    m.borderTop = "0";
    m.maxHeight = "260px";
    m.overflowY = "auto";
    m.display = "none";
    wrapper.appendChild(this.menu);

    this._bind();
    this.selectEl.dataset.comboAttached = "1";
  };

  ComboSelect.prototype._bind = function () {
    var self = this;

    function render(items) {
      self.menu.innerHTML = "";
      if (!items || !items.length) {
        self.menu.appendChild(
          createEl("div", "px-3 py-2 text-muted", "No results")
        );
        return;
      }
      // skip placeholder
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (i === 0 && it.value === "") continue;
        var div = createEl("div", "combo-item px-3 py-2");
        div.style.cursor = "pointer";
        div.textContent = it.text;
        div.dataset.value = it.value;
        self.menu.appendChild(div);
      }
    }

    function snapshot() {
      var out = [];
      var opts = self.selectEl.options;
      for (var i = 0; i < opts.length; i++)
        out.push({ value: opts[i].value, text: opts[i].text });
      return out;
    }

    function show() {
      self.menu.style.display = "block";
    }
    function hide() {
      self.menu.style.display = "none";
    }

    this.menu.addEventListener("click", function (e) {
      var t = e.target.closest(".combo-item");
      if (!t) return;
      var val = t.dataset.value,
        txt = t.textContent;
      self.selectEl.value = val;
      self.inputEl.value = txt;
      hide();
      var hideName = document.getElementById("HideProductName");
      if (hideName) hideName.value = txt;
    });

    this.inputEl.addEventListener("focus", function () {
      render(snapshot());
      show();
    });
    document.addEventListener("click", function (e) {
      if (!self.wrapper.contains(e.target)) hide();
    });

    var debTimer = null;
    this.inputEl.addEventListener("input", function () {
      clearTimeout(debTimer);
      var q = this.value || "";
      debTimer = setTimeout(function () {
        if (!self.opts.ajaxUrl || typeof $ !== "function") {
          // fallback local filter
          var s = snapshot().filter(function (o) {
            return o.text.toLowerCase().indexOf(q.toLowerCase()) !== -1;
          });
          render(s);
          show();
          return;
        }
        // abort in-flight
        if (self._typingXhr && typeof self._typingXhr.abort === "function")
          self._typingXhr.abort();
        var projectId = 0;
        if (self.opts.projectSelect) {
          var ps = document.querySelector(self.opts.projectSelect);
          if (ps) projectId = ps.value || 0;
        }
        self._typingXhr = $.ajax({
          url: self.opts.ajaxUrl,
          type: "POST",
          dataType: "json",
          data: {
            id: projectId,
            action: "search_products_lite",
            q: q,
            limit: self.opts.limit || 50,
          },
        }).done(function (data) {
          // sync <select>
          var placeholder = getPlaceholder(self.selectEl);
          self.selectEl.innerHTML = "";
          var opt0 = createEl("option");
          opt0.value = placeholder.value;
          opt0.text = placeholder.text;
          self.selectEl.appendChild(opt0);
          var arr = Array.isArray(data) ? data : [];
          for (var i = 0; i < arr.length; i++) {
            var it = arr[i];
            var opt = createEl("option");
            opt.value = it.ProductsID;
            opt.text = (it.FloorNumber || "") + "-" + (it.FlatType || "");
            self.selectEl.appendChild(opt);
          }
          render(snapshot());
          show();
        });
      }, 200);
    });

    // set initial text
    var sel = this.selectEl.options[this.selectEl.selectedIndex];
    if (sel && sel.value) this.inputEl.value = sel.text;
  };

  return ComboSelect;
});
