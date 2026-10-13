(function () {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");

  function setNav(open) {
    if (!toggle || !nav) return;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    const label = toggle.querySelector(".sr-only");
    if (label) label.textContent = open ? "Close menu" : "Open menu";
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setNav(false);
    });
  }

  const FIRST_MOVE = {
    organize:
      "List every fact you know, then separate what is confirmed from what is still a guess.",
    checklist:
      "Write down each document you have been asked for, and mark which ones you can already locate.",
    plan: "Name one practical action that does not depend on anyone else, and put a date next to it.",
    followups:
      "Record the last contact: who, when, what they said, and when you will check again.",
    progress:
      "Compare what is finished with what is still open, and note the status in one sentence.",
  };

  const form = document.querySelector("#problem-form");
  if (form) {
    const keys = ["name", "contact", "category", "description", "assistance", "consent"];

    function fieldError(key) {
      return form.querySelector('[data-error-for="' + key + '"]');
    }

    function clearField(key) {
      const input = form.elements[key];
      const error = fieldError(key);
      if (error) {
        error.hidden = true;
        error.textContent = "";
      }
      if (!input) return;
      input.removeAttribute("aria-invalid");
      const hint = document.getElementById(key + "-hint");
      if (hint) input.setAttribute("aria-describedby", hint.id);
      else input.removeAttribute("aria-describedby");
    }

    function showErrors(errors) {
      const summary = form.querySelector("[data-form-summary]");
      const invalid = Object.keys(errors);
      if (summary) {
        summary.hidden = invalid.length === 0;
        summary.textContent = invalid.length
          ? "Please fix the highlighted fields. Nothing has been sent."
          : "";
      }
      keys.forEach(function (key) {
        const input = form.elements[key];
        const error = fieldError(key);
        if (!input || !error) return;
        if (errors[key]) {
          error.hidden = false;
          error.textContent = errors[key];
          input.setAttribute("aria-invalid", "true");
          const hint = document.getElementById(key + "-hint");
          input.setAttribute(
            "aria-describedby",
            [hint ? hint.id : "", error.id].filter(Boolean).join(" "),
          );
        } else {
          clearField(key);
        }
      });
    }

    function validate() {
      const errors = {};
      const name = form.name.value.trim();
      const contact = form.contact.value.trim();
      const description = form.description.value.trim();
      if (name.length < 2) errors.name = "Please enter your name.";
      if (!contact) {
        errors.contact = "Enter an email, phone number, or another way to reach you.";
      } else if (contact.indexOf("@") !== -1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
        errors.contact = "That email does not look complete. You can also enter a phone number.";
      } else if (contact.indexOf("@") === -1 && contact.length < 6) {
        errors.contact = "Add a little more detail so someone could actually reach you.";
      }
      if (!form.category.value) errors.category = "Choose the category that fits best.";
      if (description.length < 24) {
        errors.description = "Add a few sentences so the next step is easier to see.";
      }
      if (!form.assistance.value) errors.assistance = "Choose the kind of help you want.";
      if (!form.consent.checked) {
        errors.consent = "Please confirm the privacy notice before using the demo.";
      }
      return errors;
    }

    form.addEventListener("input", function (event) {
      const target = event.target;
      if (!target.name) return;
      clearField(target.name);
      const summary = form.querySelector("[data-form-summary]");
      if (summary && !form.querySelector("[aria-invalid='true']")) summary.hidden = true;
    });

    form.addEventListener("change", function (event) {
      const target = event.target;
      if (target && target.name) clearField(target.name);
    });

    form.addEventListener("submit", function () {
      const errors = validate();
      showErrors(errors);
      const firstKey = keys.filter(function (key) {
        return errors[key];
      })[0];
      if (firstKey) {
        const input = form.elements[firstKey];
        if (input && input.focus) input.focus();
        return;
      }

      const optional = function (value) {
        const text = value.trim();
        return text ? text : "Not provided";
      };
      const assistance = form.assistance.options[form.assistance.selectedIndex];
      const setText = function (id, value) {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
      };
      setText("confirm-name", form.name.value.trim());
      setText("confirm-contact", form.contact.value.trim());
      setText("confirm-category", form.category.value);
      setText("confirm-description", form.description.value.trim());
      setText("confirm-actions", optional(form.actionsTaken.value));
      setText("confirm-documents", optional(form.documentsKnown.value));
      setText("confirm-status", optional(form.currentStatus.value));
      setText("confirm-assistance", assistance ? assistance.text : "");
      setText(
        "confirm-move",
        FIRST_MOVE[form.assistance.value] ||
          "Write down the single next action and when you will check on it.",
      );

      form.hidden = true;
      const done = document.getElementById("confirmation");
      if (done) {
        done.hidden = false;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        done.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        const heading = document.getElementById("confirmation-title");
        if (heading) heading.focus();
      }
    });

    const reset = document.querySelector("[data-form-reset]");
    if (reset) {
      reset.addEventListener("click", function () {
        form.reset();
        keys.forEach(clearField);
        const summary = form.querySelector("[data-form-summary]");
        if (summary) summary.hidden = true;
        form.hidden = false;
        const done = document.getElementById("confirmation");
        if (done) done.hidden = true;
        const name = form.elements.name;
        if (name) name.focus();
      });
    }
  }

  const app = document.querySelector("#passport-app");
  if (!app) return;

  const initial = app.innerHTML;

  function openToggles() {
    return Array.prototype.slice
      .call(app.querySelectorAll("[data-toggle]"))
      .filter(function (button) {
        return button.getAttribute("aria-pressed") !== "true";
      })
      .sort(function (a, b) {
        return Number(a.dataset.stepOrder) - Number(b.dataset.stepOrder);
      });
  }

  function syncPassport() {
    const toggles = app.querySelectorAll("[data-toggle]");
    let done = 0;
    Array.prototype.forEach.call(toggles, function (button) {
      if (button.getAttribute("aria-pressed") === "true") done += 1;
    });
    const total = toggles.length;
    const bar = app.querySelector("[data-progress-bar]");
    const text = app.querySelector("[data-progress-text]");
    const progress = app.querySelector("[data-progress]");
    const pct = total ? Math.round((done / total) * 100) : 0;
    if (bar) bar.style.width = pct + "%";
    if (text) text.textContent = done + " of " + total + " items settled";
    if (progress) {
      progress.setAttribute("aria-valuenow", String(done));
      progress.setAttribute("aria-valuemin", "0");
      progress.setAttribute("aria-valuemax", String(total));
    }
    const next = app.querySelector("[data-next-step]");
    const saved = app.querySelector("[data-closure-saved]");
    const closureOn = saved && !saved.hidden;
    if (next) {
      const pending = openToggles();
      if (pending[0] && pending[0].dataset.next) next.textContent = pending[0].dataset.next;
      else if (closureOn) next.textContent = "Nothing is pending in this sample.";
      else {
        next.textContent =
          "Review the record, then write a closure note if you are finished on your side.";
      }
    }
    const status = app.querySelector("[data-case-status]");
    if (status) status.textContent = closureOn ? "Closure noted" : "Open";
  }

  app.addEventListener("click", function (event) {
    const reset = event.target.closest("[data-reset]");
    if (reset) {
      app.innerHTML = initial;
      syncPassport();
      return;
    }

    const button = event.target.closest("[data-toggle]");
    if (button && app.contains(button)) {
      const turnOn = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(turnOn));
      button.textContent = turnOn ? button.dataset.labelOn : button.dataset.labelOff;
      button.classList.toggle("is-done", turnOn);
      button.classList.toggle("is-open", !turnOn);
      syncPassport();
      return;
    }

    const save = event.target.closest("[data-save-closure]");
    if (!save) return;
    const note = app.querySelector("#closure-note");
    const error = app.querySelector("[data-closure-error]");
    const text = note ? note.value.trim() : "";
    if (text.length < 3) {
      if (error) {
        error.hidden = false;
        error.textContent = "Write a sentence about the status you want to record.";
      }
      if (note) note.focus();
      return;
    }
    if (error) error.hidden = true;
    const saved = app.querySelector("[data-closure-saved]");
    const out = app.querySelector("[data-closure-text]");
    if (out) out.textContent = text;
    if (saved) saved.hidden = false;
    syncPassport();
  });

  app.addEventListener("submit", function (event) {
    const followForm = event.target.closest("[data-followup-form]");
    if (!followForm) return;
    const note = followForm.querySelector("textarea");
    const channel = followForm.querySelector("select");
    const error = followForm.querySelector("[data-followup-error]");
    const text = note ? note.value.trim() : "";
    if (text.length < 3) {
      if (error) {
        error.hidden = false;
        error.textContent = "Add a short note so the history stays useful.";
      }
      if (note) note.focus();
      return;
    }
    if (error) error.hidden = true;
    const list = app.querySelector("[data-followups]");
    if (!list || !channel) return;
    const item = document.createElement("li");
    item.className = "timeline-item";
    const when = document.createElement("p");
    when.className = "timeline-when";
    const date = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
    when.textContent = date + " · " + channel.value + " · Demo entry";
    const body = document.createElement("p");
    body.textContent = text;
    item.append(when, body);
    list.append(item);
    if (note) note.value = "";
  });

  syncPassport();
})();
