import test from 'node:test';
import assert from 'node:assert/strict';
import { setMenuElementsVisible } from '../src/utils/menuMotion.js';

function fakeElement() {
  const properties = new Map();
  return {
    style: {
      transform: '',
      setProperty(name, value) {
        properties.set(name, value);
      },
      getPropertyValue(name) {
        return properties.get(name) || '';
      },
    },
  };
}

function fixture() {
  const label = fakeElement();
  const item = fakeElement();
  const panel = fakeElement();
  panel.querySelectorAll = (selector) =>
    selector === '.sm-item-label' ? [label] : [item];
  return { panel, layer: fakeElement(), label, item };
}

test('menu fallback makes the panel and its content visible', () => {
  const { panel, layer, label, item } = fixture();

  setMenuElementsVisible(panel, [layer], true);

  assert.equal(panel.style.transform, 'translate3d(0, 0, 0)');
  assert.equal(layer.style.transform, 'translate3d(0, 0, 0)');
  assert.equal(label.style.transform, 'translate(0, 0) rotate(0deg)');
  assert.equal(item.style.getPropertyValue('--sm-num-opacity'), '1');
});

test('menu fallback parks the panel and layers off screen when closed', () => {
  const { panel, layer, item } = fixture();

  setMenuElementsVisible(panel, [layer], false);

  assert.equal(panel.style.transform, 'translate3d(-100%, 0, 0)');
  assert.equal(layer.style.transform, 'translate3d(-100%, 0, 0)');
  assert.equal(item.style.getPropertyValue('--sm-num-opacity'), '0');
});
