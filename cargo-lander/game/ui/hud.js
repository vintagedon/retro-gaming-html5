// The HUD projector: the only thing between a snapshot and the DOM.
// It holds a last value per field and touches an element only when
// that value changed. It copies display strings verbatim and formats
// core-computed ratios as the kit's percentage-valued custom
// properties; it never divides game quantities and never imports
// CONFIG. Capacities come from the snapshot maxima.
export function createHudProjector(refs) {
  const cache = new Map();

  function setVar(el, name, value) {
    const key = `${el.dataset.hudField}:${name}`;
    if (cache.get(key) === value) return;
    cache.set(key, value);
    el.style.setProperty(name, value);
  }

  function setAttr(el, name, value) {
    const key = `${el.dataset.hudField}:attr:${name}`;
    if (cache.get(key) === value) return;
    cache.set(key, value);
    el.setAttribute(name, value);
  }

  function setShown(el, shown) {
    const key = `${el.dataset.hudField}:shown`;
    if (cache.get(key) === shown) return;
    cache.set(key, shown);
    if (shown) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
  }

  function setText(el, value) {
    const key = `${el.dataset.hudField}:text`;
    if (cache.get(key) === value) return;
    cache.set(key, value);
    el.textContent = value;
  }

  function pct(ratio) {
    const bounded = Math.min(1, Math.max(0, ratio));
    return `${(bounded * 100).toFixed(2)}%`;
  }

  return {
    project(snapshot) {
      setVar(refs.fuelMeter, '--gc-meter-value', pct(snapshot.fuelRatio));

      setVar(refs.hullMeter, '--gc-meter-value', pct(snapshot.hullRatio));
      setVar(refs.hullMeter, '--gc-meter-trail-value', pct(snapshot.hullPrevRatio));
      setVar(refs.hullMeter, '--gc-meter-segments', String(snapshot.hullSegmentsMax));

      setVar(refs.thrustMeter, '--gc-meter-value', pct(snapshot.thrustLevel));
      setVar(refs.thrustMeter, '--gc-meter-segments', String(snapshot.thrustNotchesMax));

      setVar(refs.craftMeter, '--gc-meter-value', pct(snapshot.craftRatio));
      setVar(refs.craftMeter, '--gc-meter-pips', String(snapshot.craftMax));

      setText(refs.altitudeValue, snapshot.altitudeDisplay);
      setText(refs.velocityValue, snapshot.velocityDisplay);
      setText(refs.fuelValue, snapshot.fuelDisplay);
      setText(refs.impactBadge, snapshot.lastImpact === null ? 'NONE' : snapshot.lastImpact.toUpperCase());
      setAttr(refs.impactBadge, 'data-band', snapshot.lastImpact === null ? 'none' : snapshot.lastImpact);

      if (refs.overlay) {
        const banner = overlayFor(snapshot);
        setText(refs.overlayTitle, banner.title);
        setText(refs.overlayHint, banner.hint);
        setShown(refs.overlay, banner.visible);
      }
    }
  };
}

function overlayFor(snapshot) {
  if (snapshot.paused) {
    return { title: 'PAUSED', hint: 'P to resume', visible: true };
  }
  if (snapshot.outcome === 'landed') {
    return { title: 'LANDED', hint: 'ENTER to fly a fresh run', visible: true };
  }
  if (snapshot.outcome === 'run-over') {
    return { title: 'RUN OVER', hint: 'ENTER to start a fresh run', visible: true };
  }
  if (snapshot.craftState === 'destroyed') {
    return {
      title: 'CRAFT LOST',
      hint: `R to retry with ${snapshot.craftRemaining} craft left`,
      visible: true
    };
  }
  return { title: '', hint: '', visible: false };
}
