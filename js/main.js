/* ============================================
   FROM BEAN TO CUP — Vega-Lite Loader
   Loads each .vl.json spec and renders it
   into the matching container on the page.
   ============================================ */

// --- Reading progress bar ---
(function () {
  var bar = document.getElementById('progress-bar');
  if (!bar) return;
  window.addEventListener('scroll', function () {
    var scrolled = document.documentElement.scrollTop || document.body.scrollTop;
    var total = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    bar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
  }, { passive: true });
})();

// --- Scroll fade-in via IntersectionObserver ---
(function () {
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;
  var targets = document.querySelectorAll('section, .stat-card, .vis-wrapper');
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  targets.forEach(function (el) {
    el.classList.add('fade-in');
    observer.observe(el);
  });
})();

// Shared vega-embed options applied to every chart
const embedOpts = {
  actions: false,          // hide export/source buttons
  renderer: "svg",         // SVG for crisp text at any zoom
  config: {
    font: "Source Sans 3, sans-serif",
    title: {
      font: "Playfair Display, serif",
      subtitleFont: "Source Sans 3, sans-serif"
    },
    axis: {
      labelFont: "Source Sans 3, sans-serif",
      titleFont: "Source Sans 3, sans-serif"
    },
    legend: {
      labelFont: "Source Sans 3, sans-serif",
      titleFont: "Source Sans 3, sans-serif"
    },
    header: {
      labelFont: "Source Sans 3, sans-serif",
      titleFont: "Source Sans 3, sans-serif"
    }
  }
};

// Each entry maps a CSS selector to its Vega-Lite spec file.
// The spec files live in  js/  and contain inline data so no
// additional data files are needed at runtime.
const specs = [
  { selector: "#vis1",  file: "js/vis1_world_map.vl.json" },
  { selector: "#vis2",  file: "js/vis2_top_origins.vl.json" },
  { selector: "#vis3",  file: "js/vis3_region_donut.vl.json" },
  { selector: "#vis4",  file: "js/vis4_price_vs_volume.vl.json" },
  { selector: "#vis5",  file: "js/vis5_quality_scores.vl.json" },
  { selector: "#vis6",  file: "js/vis6_melbourne_map.vl.json" },
  { selector: "#vis7",  file: "js/vis7_cafe_growth.vl.json" },
  { selector: "#vis8",  file: "js/vis8_seating.vl.json" },
  { selector: "#vis9",  file: "js/vis9_heatmap.vl.json" },
  { selector: "#vis10", file: "js/vis10_quality_vs_value.vl.json" },
  { selector: "#vis11", file: "js/vis11_region_breakdown.vl.json" },
  { selector: "#vis12", file: "js/vis12_small_multiples.vl.json" }
];

// Wire cross-chart interactions after all embeds complete
function setupCrossChart(views) {
  var v3 = views['#vis3'];
  var v11 = views['#vis11'];
  if (!v3 || !v11) return;

  // Clicking a donut slice in vis3 highlights that region in vis11
  v3.addEventListener('click', function (event, item) {
    if (!item || !item.datum) {
      v11.signal('selectedRegion', null).run();
      return;
    }
    var region = item.datum.region;
    var current = v11.signal('selectedRegion');
    v11.signal('selectedRegion', current === region ? null : region).run();
  });

  // Clicking a bar in vis11 toggles its own region highlight
  v11.addEventListener('click', function (event, item) {
    if (!item || !item.datum) {
      v11.signal('selectedRegion', null).run();
      return;
    }
    var region = item.datum.region;
    var current = v11.signal('selectedRegion');
    v11.signal('selectedRegion', current === region ? null : region).run();
  });
}

// Render every spec once the DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  var chartViews = {};

  // Mark each chart wrapper as loading so the shimmer skeleton shows
  specs.forEach(function (item) {
    var el = document.querySelector(item.selector);
    if (el && el.parentElement) {
      el.parentElement.classList.add('vis-loading');
    }
  });

  var embedPromises = specs.map(function (item) {
    return fetch(item.file)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.json();
      })
      .then(function (spec) {
        // Make single-view charts fill their container width.
        // Faceted specs (spec.spec exists) must keep their per-panel width so
        // Vega-Lite respects the "columns" setting — setting width:"container"
        // on the outer faceted spec causes it to ignore columns and pack as
        // many panels as fit horizontally.
        // Arc/pie marks use fixed pixel radii so container width doesn't help them.
        var isFaceted = !!spec.spec;
        var isArc = spec.mark === 'arc' || (spec.mark && spec.mark.type === 'arc');
        if (!isFaceted && !isArc) {
          spec.width = "container";
          spec.autosize = { type: "fit", contains: "padding" };
        }
        return vegaEmbed(item.selector, spec, embedOpts);
      })
      .then(function (result) {
        chartViews[item.selector] = result.view;
        var el = document.querySelector(item.selector);
        if (el && el.parentElement) {
          el.parentElement.classList.remove('vis-loading');
        }
      })
      .catch(function (err) {
        var el = document.querySelector(item.selector);
        if (el) {
          if (el.parentElement) el.parentElement.classList.remove('vis-loading');
          el.innerHTML =
            '<p style="color:#c0392b;padding:12px;">Error loading ' +
            item.file + ': ' + err.message + '</p>';
        }
      });
  });

  Promise.all(embedPromises).then(function () {
    setupCrossChart(chartViews);
  });
});
