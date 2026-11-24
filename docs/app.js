(function () {
  const SAMPLES = {
    limits: {
      file: "limits_definition.tex",
      latex: String.raw`\section*{Limits. Definitions}

\textbf{Precise Definition:} We say $\lim_{x \to a} f(x) = L$ if for every $\varepsilon > 0$ there is $\delta > 0$ such that
\[
0 < |x - a| < \delta \implies |f(x) - L| < \varepsilon.
\]`,
    },
    matrices: {
      file: "spectral_theorem.tex",
      latex: String.raw`\section*{Eigenvalues \& Diagonalization}

Find $\lambda$ where $\det(A - \lambda I) = 0$:
\[
A = \begin{pmatrix} 4 & 1 \\ 2 & 3 \end{pmatrix}, \quad
\det(A - \lambda I) = (\lambda - 5)(\lambda - 2) = 0
\]
\begin{equation}
\lambda_1 = 5,\; \lambda_2 = 2 \implies A = P D P^{-1}
\end{equation}`,
    },
    integrals: {
      file: "gaussian_integral.tex",
      latex: String.raw`\section*{Gaussian \& Contour Integrals}

Let $I = \int_{-\infty}^{\infty} e^{-x^2}\,dx$. Passing to polar coordinates gives
\[
I^2 = \int_0^{2\pi} \int_0^{\infty} e^{-r^2} r\,dr\,d\theta = \pi \implies I = \sqrt{\pi}.
\]`,
    },
  };

  const THEMES = {
    Madrid: "Classic rounded blocks",
    Warsaw: "High-contrast seminar bar",
    Berlin: "Teal progress header",
  };

  const MCP_COMMAND = "npx -y @opentex-app/mcp setup";

  let activeSample = "limits";

  function sanitizeFilename(name, fallback = "opentex-document") {
    const cleaned = (name || fallback)
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/^_+|_+$/g, "");
    return cleaned || fallback;
  }

  function openInOverleaf(latex, title) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://www.overleaf.com/docs";
    form.target = "_blank";
    form.style.display = "none";

    const snip = document.createElement("input");
    snip.type = "hidden";
    snip.name = "snip";
    snip.value = latex;

    const snipName = document.createElement("input");
    snipName.type = "hidden";
    snipName.name = "snip_name";
    snipName.value = `${sanitizeFilename(title)}.tex`;

    form.append(snip, snipName);
    document.body.appendChild(form);
    form.submit();
    form.remove();
  }

async function writeClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the selection copy path.
    }
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy failed");
}

  function bindCopy(button, getText) {
    if (!button) return;
    const label = button.querySelector(".copy-label");
    const copyIcon = button.querySelector(".copy-icon");
    const checkIcon = button.querySelector(".check-icon");
    let timer = 0;

    button.addEventListener("click", async () => {
      try {
        await writeClipboard(getText());
        if (label) label.textContent = "Copied";
        setHidden(copyIcon, true);
        setHidden(checkIcon, false);
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (label) label.textContent = "Copy";
          setHidden(copyIcon, false);
          setHidden(checkIcon, true);
        }, 1800);
      } catch {
        if (label) label.textContent = "Copy";
        setHidden(copyIcon, false);
        setHidden(checkIcon, true);
      }
    });
  }

function setHidden(el, hidden) {
  if (!el) return;
  el.toggleAttribute("hidden", hidden);
}

function showOnly(selector, attr, id) {
  document.querySelectorAll(selector).forEach((node) => {
    setHidden(node, node.getAttribute(attr) !== id);
  });
}

  const navToggle = document.getElementById("nav-toggle");
  const mobileNav = document.getElementById("mobile-nav");
  const menuIcon = document.getElementById("icon-menu");
  const closeIcon = document.getElementById("icon-close");

  function setMobileNav(open) {
    if (!mobileNav || !navToggle) return;
    setHidden(mobileNav, !open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    setHidden(menuIcon, open);
    setHidden(closeIcon, !open);
  }

  if (navToggle) {
    navToggle.addEventListener("click", () => {
      setMobileNav(mobileNav.hidden);
    });
  }

  if (mobileNav) {
    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMobileNav(false));
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMobileNav(false);
  });

  const sampleButtons = document.querySelectorAll("[data-sample-btn]");
  const sampleFile = document.getElementById("sample-file");

  sampleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-sample-btn");
      if (!SAMPLES[id]) return;
      activeSample = id;
      sampleButtons.forEach((item) => {
        const on = item === button;
        item.classList.toggle("is-active", on);
        item.setAttribute("aria-pressed", on ? "true" : "false");
      });
      showOnly("[data-sample-panel]", "data-sample-panel", id);
      if (sampleFile) sampleFile.textContent = SAMPLES[id].file;
    });
  });

  bindCopy(document.getElementById("copy-sample"), () => SAMPLES[activeSample].latex);
  bindCopy(document.getElementById("copy-mcp"), () => MCP_COMMAND);

  const overleafButton = document.getElementById("open-overleaf");
  if (overleafButton) {
    overleafButton.addEventListener("click", () => {
      const sample = SAMPLES[activeSample];
      openInOverleaf(sample.latex, sample.file);
    });
  }

  const stepButtons = document.querySelectorAll("[data-step-btn]");
  const stepCurrent = document.getElementById("step-current");
  stepButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-step-btn");
      stepButtons.forEach((item) => {
        const on = item === button;
        item.classList.toggle("is-selected", on);
        item.setAttribute("aria-pressed", on ? "true" : "false");
      });
      showOnly("[data-step-file]", "data-step-file", id);
      showOnly("[data-step-badge]", "data-step-badge", id);
      showOnly("[data-step-panel]", "data-step-panel", id);
      if (stepCurrent) stepCurrent.textContent = String(Number(id) + 1);
    });
  });

  const toolButtons = document.querySelectorAll("[data-tool-btn]");
  toolButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-tool-btn");
      toolButtons.forEach((item) => {
        const on = item === button;
        item.classList.toggle("is-selected", on);
        item.setAttribute("aria-pressed", on ? "true" : "false");
      });
      showOnly("[data-tool-panel]", "data-tool-panel", id);
    });
  });

  const themeButtons = document.querySelectorAll("[data-theme-btn]");
  const slide = document.getElementById("slide");
  const themeLabel = document.getElementById("theme-label");
  const themeName = document.getElementById("theme-name");
  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-theme-btn");
      if (!THEMES[id]) return;
      themeButtons.forEach((item) => {
        const on = item === button;
        item.classList.toggle("is-active", on);
        item.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (slide) slide.setAttribute("data-theme", id);
      if (themeLabel) themeLabel.textContent = THEMES[id];
      if (themeName) themeName.textContent = id;
    });
  });

  document.querySelectorAll(".faq-item").forEach((item) => {
    const toggle = item.querySelector(".faq-toggle");
    const answer = item.querySelector(".faq-answer");
    if (!toggle || !answer) return;
    toggle.addEventListener("click", () => {
      const willOpen = !item.classList.contains("is-open");
      document.querySelectorAll(".faq-item").forEach((other) => {
        const otherToggle = other.querySelector(".faq-toggle");
        const otherAnswer = other.querySelector(".faq-answer");
        other.classList.remove("is-open");
        setHidden(otherAnswer, true);
        if (otherToggle) otherToggle.setAttribute("aria-expanded", "false");
      });
      if (willOpen) {
        item.classList.add("is-open");
        setHidden(answer, false);
        toggle.setAttribute("aria-expanded", "true");
      }
    });
  });
})();
