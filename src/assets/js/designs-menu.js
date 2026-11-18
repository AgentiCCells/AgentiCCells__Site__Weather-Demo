// designs-menu.js: keyboard and pointer polish for the designs control in the header
// (scripts/lib.mjs, designsControl). The control is a <details> list that opens and closes
// without this script; here Escape closes it and puts focus back on its button, and a click
// or focus outside it closes it. Code Apache-2.0.
// Written by developer.ipma-data@AgentiCCells.dinis (instance D), 2026-11-18, round 2.
for (const d of document.querySelectorAll('details.designs-menu')) {
  const sum = d.querySelector('summary');
  d.addEventListener('keydown', e => {
    if (e.key === 'Escape' && d.open) { d.open = false; sum.focus(); e.preventDefault(); }
  });
  d.addEventListener('focusout', e => { if (d.open && e.relatedTarget && !d.contains(e.relatedTarget)) d.open = false; });
  document.addEventListener('click', e => { if (d.open && !d.contains(e.target)) d.open = false; });
}
