/**
 * SmartSelect - Lightweight Searchable Dropdown System Made By Rsm Monaem https://github.com/rsmmonaem

 * For Nibiz Soft
 * Auto-initializes on elements with class "smart-select"
 * Usage: Add class "smart-select" to any <select> element
 */

(function () {
  "use strict";

  // SmartSelect Class
  function SmartSelect(element, options) {
    this.element = element;
    this.options = options || {};
    this.isOpen = false;
    this.filteredOptions = [];
    this.selectedIndex = element.selectedIndex;
    this.init();
  }

  SmartSelect.prototype.init = function () {
    // Create wrapper
    this.wrapper = document.createElement("div");
    this.wrapper.className = "smart-select-wrapper";

    // Create display element
    this.display = document.createElement("div");
    this.display.className = "smart-select-display";
    this.updateDisplay();
    this.display.addEventListener("click", this.toggle.bind(this));

    // Create dropdown
    this.dropdown = document.createElement("div");
    this.dropdown.className = "smart-select-dropdown";

    // Create search input
    this.searchInput = document.createElement("input");
    this.searchInput.type = "text";
    this.searchInput.className = "smart-select-search";
    this.searchInput.placeholder = this.options.placeholder || "Search...";
    this.searchInput.addEventListener("input", this.filter.bind(this));
    this.searchInput.addEventListener("keydown", this.handleKeydown.bind(this));

    // Create options container
    this.optionsContainer = document.createElement("div");
    this.optionsContainer.className = "smart-select-options";

    // Build options
    this.buildOptions();

    // Assemble dropdown
    this.dropdown.appendChild(this.searchInput);
    this.dropdown.appendChild(this.optionsContainer);

    // Assemble wrapper
    this.wrapper.appendChild(this.display);
    this.wrapper.appendChild(this.dropdown);

    // Hide original select
    this.element.style.display = "none";
    this.element.parentNode.insertBefore(this.wrapper, this.element);
    this.wrapper.appendChild(this.element);

    // Listen for changes on the original select element (only if not updating internally)
    var self = this;
    this.element.addEventListener("change", function () {
      if (!self._updating) {
        self.syncFromSelect();
      }
    });

    // Observe changes to the select element's children (options added via AJAX)
    if (typeof MutationObserver !== "undefined") {
      this.optionsObserver = new MutationObserver(function(mutations) {
        if (!self._updating) {
          self.syncFromSelect();
        }
      });
      this.optionsObserver.observe(this.element, { childList: true });
    }

    // Close on outside click
    document.addEventListener("click", this.handleOutsideClick.bind(this));

    // Update selected index from element
    this.selectedIndex = this.element.selectedIndex;
  };

  SmartSelect.prototype.buildOptions = function () {
    this.optionsContainer.innerHTML = "";
    this.filteredOptions = [];

    // Update selected index from element
    this.selectedIndex = this.element.selectedIndex;

    var options = this.element.options;
    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      var optionElement = document.createElement("div");
      optionElement.className = "smart-select-option";

      // Check if this option is selected
      if (i === this.selectedIndex || option.selected) {
        optionElement.classList.add("selected");
      }

      optionElement.textContent = option.text || option.textContent || "";
      optionElement.dataset.index = i;
      optionElement.dataset.value = option.value || "";

      var self = this;
      optionElement.addEventListener(
        "click",
        (function (idx) {
          return function () {
            self.selectOption(idx);
          };
        })(i)
      );

      this.optionsContainer.appendChild(optionElement);
      this.filteredOptions.push(optionElement);
    }
  };

  SmartSelect.prototype.getSelectedText = function () {
    var selectedIndex = this.element.selectedIndex;
    if (selectedIndex >= 0 && this.element.options[selectedIndex]) {
      return this.element.options[selectedIndex].text;
    }
    return this.options.placeholder || "Select an option...";
  };

  SmartSelect.prototype.updateDisplay = function () {
    this.display.textContent = this.getSelectedText();
  };

  SmartSelect.prototype.syncFromSelect = function () {
    // Sync when the select element value changes programmatically
    this.selectedIndex = this.element.selectedIndex;
    this.updateDisplay();
    this.buildOptions();
  };

  SmartSelect.prototype.toggle = function (e) {
    e.stopPropagation();
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  };

  SmartSelect.prototype.open = function () {
    this.isOpen = true;
    this.wrapper.classList.add("open");
    this.searchInput.value = "";
    this.filter();
    setTimeout(
      function () {
        this.searchInput.focus();
      }.bind(this),
      10
    );
  };

  SmartSelect.prototype.close = function () {
    this.isOpen = false;
    this.wrapper.classList.remove("open");
    this.searchInput.value = "";
    this.filter();
  };

  SmartSelect.prototype.filter = function () {
    var searchTerm = this.searchInput.value.toLowerCase();
    var hasVisible = false;

    this.filteredOptions.forEach(function (optionEl) {
      var text = optionEl.textContent.toLowerCase();
      if (text.indexOf(searchTerm) !== -1) {
        optionEl.style.display = "";
        hasVisible = true;
      } else {
        optionEl.style.display = "none";
      }
    });

    if (!hasVisible && searchTerm) {
      this.optionsContainer.innerHTML =
        '<div class="smart-select-no-results">No results found</div>';
    } else if (
      this.optionsContainer.querySelector(".smart-select-no-results")
    ) {
      this.buildOptions();
      this.filter();
    }
  };

  SmartSelect.prototype.selectOption = function (index) {
    if (index < 0 || index >= this.element.options.length) {
      return;
    }

    this.element.selectedIndex = index;
    this.selectedIndex = index;
    this.updateDisplay();
    this.close();

    // Update selected state in options
    this.filteredOptions.forEach(function (opt, idx) {
      if (idx === index) {
        opt.classList.add("selected");
      } else {
        opt.classList.remove("selected");
      }
    });

    // Trigger change event (but prevent infinite loop)
    var event = new Event("change", { bubbles: true });
    // Use a flag to prevent re-syncing
    this._updating = true;
    this.element.dispatchEvent(event);
    this._updating = false;
  };

  SmartSelect.prototype.handleKeydown = function (e) {
    var visibleOptions = Array.from(this.filteredOptions).filter(function (
      opt
    ) {
      return opt.style.display !== "none";
    });

    var currentIndex = visibleOptions.findIndex(function (opt) {
      return opt.classList.contains("selected");
    });

    if (e.key === "ArrowDown") {
      e.preventDefault();
      var nextIndex = (currentIndex + 1) % visibleOptions.length;
      this.highlightOption(visibleOptions[nextIndex]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      var prevIndex =
        currentIndex <= 0 ? visibleOptions.length - 1 : currentIndex - 1;
      this.highlightOption(visibleOptions[prevIndex]);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (currentIndex >= 0) {
        var selectedOption = visibleOptions[currentIndex];
        var index = parseInt(selectedOption.dataset.index);
        this.selectOption(index);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      this.close();
    }
  };

  SmartSelect.prototype.highlightOption = function (optionEl) {
    this.filteredOptions.forEach(function (opt) {
      opt.classList.remove("highlighted");
    });
    optionEl.classList.add("highlighted");
    optionEl.scrollIntoView({ block: "nearest" });
  };

  SmartSelect.prototype.handleOutsideClick = function (e) {
    if (!this.wrapper.contains(e.target)) {
      this.close();
    }
  };

  // Auto-initialize function
  function autoInit() {
    var selects = document.querySelectorAll("select.smart-select, select.smart-ajax-select");
    selects.forEach(function (select) {
      if (!select.smartSelectInstance) {
        // Wait a bit if select has no options yet (might be dynamically loaded)
        if (select.options.length === 0) {
          setTimeout(function () {
            if (select.options.length > 0 || select.querySelector("option")) {
              select.smartSelectInstance = new SmartSelect(select);
            }
          }, 100);
        } else {
          select.smartSelectInstance = new SmartSelect(select);
        }
      } else {
        // Refresh existing instance if select value changed
        if (select.smartSelectInstance.selectedIndex !== select.selectedIndex) {
          select.smartSelectInstance.syncFromSelect();
        }
      }
    });
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }

  // Re-initialize dynamically added selects
  if (typeof MutationObserver !== "undefined") {
    var observer = new MutationObserver(function (mutations) {
      autoInit();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Expose globally
  window.SmartSelect = SmartSelect;
  window.initSmartSelect = autoInit;
})();
