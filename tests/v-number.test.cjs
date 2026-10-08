// Run with: node --test tests/v-number.test.cjs
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const root = join(__dirname, "..");
const elements = new Map();
const context = vm.createContext({
  document: { querySelector: (selector) => elements.get(selector) },
});
vm.runInContext(readFileSync(join(root, "lp-cutoffs.js"), "utf8"), context);
const app = readFileSync(join(root, "app.js"), "utf8");
vm.runInContext(app.slice(0, app.lastIndexOf("\nbindEvents();")), context);
const calculate = context.calculateVNumber;
const atV = (v) => calculate(v / Math.PI, 1, 1000);
const labels = (result) => Array.from(result.modes, ({ l, m }) => `${l},${m}`);

test("diameter and wavelength units: 25 um / 0.065 NA / 1064 nm", () => {
  const result = calculate(25, 0.065, 1064);
  assert.ok(Math.abs(result.v - 4.798015095943058) < 1e-12);
  assert.deepEqual(labels(result), ["0,1", "1,1", "0,2", "2,1"]);
  assert.equal(result.spatialCount, 6);
});

test("single mode means one LP family, one spatial mode, two polarizations", () => {
  const result = atV(2);
  assert.deepEqual(labels(result), ["0,1"]);
  assert.equal(result.spatialCount, 1);
  assert.equal(atV(1e-12).spatialCount, 1);
});

test("LP11 cutoff: below, at, and above the published first J0 zero", () => {
  const cutoff = 2.404825557695773;
  assert.deepEqual(labels(atV(cutoff - 1e-7)), ["0,1"]);
  assert.deepEqual(labels(atV(cutoff)), ["0,1"]);
  assert.equal(atV(cutoff).atCutoff.length, 1);
  assert.deepEqual(labels(atV(cutoff + 1e-7)), ["0,1", "1,1"]);
  assert.equal(atV(cutoff + 1e-7).spatialCount, 3);
});

test("LP02 and LP21 share the first J1 zero, not the LP11 cutoff", () => {
  const cutoff = 3.831705970207512;
  assert.equal(atV(cutoff - 1e-7).modes.length, 2);
  assert.equal(atV(cutoff).atCutoff.length, 2);
  assert.deepEqual(labels(atV(cutoff + 1e-7)), ["0,1", "1,1", "0,2", "2,1"]);
  assert.equal(atV(cutoff + 1e-7).spatialCount, 6);
});

test("higher-order mode enumeration includes radial and azimuthal families", () => {
  assert.equal(atV(6).modes.length, 6);
  assert.equal(atV(6).spatialCount, 10);
  assert.equal(atV(10).modes.length, 15);
  assert.equal(atV(10).spatialCount, 27);
  assert.ok(labels(atV(10)).includes("0,3"));
  assert.ok(labels(atV(10)).includes("7,1"));
});

test("invalid, empty-as-zero and overflowing inputs produce no result", () => {
  for (const value of [0, -1, NaN, Infinity, -Infinity]) {
    assert.equal(calculate(value, 0.06, 1064), null);
    assert.equal(calculate(25, value, 1064), null);
    assert.equal(calculate(25, 0.06, value), null);
  }
  assert.equal(calculate(Number.MAX_VALUE, 1, 1), null);
});

test("large V never presents a truncated list as a complete modal count", () => {
  assert.equal(atV(100).complete, true);
  const result = atV(100.001);
  assert.equal(result.complete, false);
  assert.equal(result.spatialCount, null);
  assert.equal(result.modes.length, 0);
});

test("rendered outputs clear stale modes and recover after invalid inputs", () => {
  for (const id of ["vnDiameter", "vnNa", "vnWavelength", "vnModesTable", "vnModeRows", "vnModeNote", "vnValue", "vnRegime", "vnFamilyCount", "vnSpatialCount", "vnPolarizedCount"]) {
    elements.set(`#${id}`, { value: "", textContent: "", innerHTML: "", hidden: false });
  }
  elements.get("#vnDiameter").value = "25";
  elements.get("#vnNa").value = "0.065";
  elements.get("#vnWavelength").value = "1064";
  context.updateVNumber();
  assert.equal(elements.get("#vnPolarizedCount").textContent, "12");
  assert.equal(elements.get("#vnModeRows").innerHTML.match(/<tr>/g).length, 4);
  elements.get("#vnDiameter").value = "";
  context.updateVNumber();
  assert.equal(elements.get("#vnValue").textContent, "--");
  assert.equal(elements.get("#vnModeRows").innerHTML, "");
  assert.equal(elements.get("#vnModesTable").hidden, true);
  elements.get("#vnDiameter").value = "6";
  context.updateVNumber();
  assert.equal(elements.get("#vnFamilyCount").textContent, "1");
  assert.equal(elements.get("#vnPolarizedCount").textContent, "2");
  elements.get("#vnDiameter").value = "1000";
  context.updateVNumber();
  assert.equal(elements.get("#vnFamilyCount").textContent, "--");
  assert.equal(elements.get("#vnModesTable").hidden, true);
  assert.match(elements.get("#vnPolarizedCount").textContent, /^≈ /);
});
