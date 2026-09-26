/* Reserve booking widget loader.
   <div data-reserve="metropolis"></div>
   <script src="https://YOUR-DOMAIN/embed.js" async></script> */
(function () {
  var script = document.currentScript;
  var base = script && script.src ? script.src.replace(/\/embed\.js.*$/, "") : "";
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = "1";
    var slug = el.getAttribute("data-reserve");
    var channel = el.getAttribute("data-channel") || "website";
    var iframe = document.createElement("iframe");
    iframe.src = base + "/" + encodeURIComponent(slug) + "?embed=1&channel=" + encodeURIComponent(channel);
    iframe.style.cssText = "width:100%;max-width:480px;border:0;border-radius:22px;min-height:640px;display:block;margin:0 auto;background:transparent";
    iframe.setAttribute("title", "Κράτηση τραπεζιού");
    iframe.setAttribute("loading", "lazy");
    el.appendChild(iframe);
    window.addEventListener("message", function (e) {
      if (e.source === iframe.contentWindow && e.data && e.data.type === "reserve:height") {
        iframe.style.minHeight = "0";
        iframe.style.height = e.data.height + "px";
      }
    });
  }
  function run() { document.querySelectorAll("[data-reserve]").forEach(mount); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
