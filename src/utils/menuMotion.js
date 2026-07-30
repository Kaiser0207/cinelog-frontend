export function setMenuElementsVisible(panel, layers = [], visible = false) {
  if (!panel) return;
  const transform = visible
    ? 'translate3d(0, 0, 0)'
    : 'translate3d(-100%, 0, 0)';
  [panel, ...layers].forEach((element) => {
    element.style.transform = transform;
  });
  panel.querySelectorAll('.sm-item-label').forEach((element) => {
    element.style.transform = visible ? 'translate(0, 0) rotate(0deg)' : '';
  });
  panel.querySelectorAll('.sm-item').forEach((element) => {
    element.style.setProperty('--sm-num-opacity', visible ? '1' : '0');
  });
}
