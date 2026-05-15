const state = {
  activeCalculator: "per",
};

function numberValue(id) {
  const value = Number(document.querySelector(`#${id}`).value);
  return Number.isFinite(value) ? value : NaN;
}

function setText(id, value, unit = "") {
  document.querySelector(`#${id}`).textContent = value === null ? "--" : `${value}${unit}`;
}

function fmt(value, digits = 3) {
  if (!Number.isFinite(value)) return "--";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 0.001 || abs >= 100000)) {
    return value.toExponential(2);
  }
  return Number(value.toPrecision(digits)).toString();
}

function degToRad(value) {
  return (value * Math.PI) / 180;
}

function radToDeg(value) {
  return (value * 180) / Math.PI;
}

function switchCalculator(name) {
  state.activeCalculator = name;
  document.querySelectorAll(".calc-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.calculator === name);
  });
  document.querySelectorAll(".calc-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `calc-${name}`);
  });
}

function updatePer() {
  const pMax = numberValue("perPmax");
  const pMin = numberValue("perPmin");
  if (pMax <= 0 || pMin <= 0) {
    setText("perDb", null);
    setText("perLeakage", null);
    setText("perPurity", null);
    setText("perRatio", null);
    return;
  }

  const ratio = pMax / pMin;
  const perDb = 10 * Math.log10(ratio);
  const leakage = (pMin / pMax) * 100;
  const purity = (pMax / (pMax + pMin)) * 100;
  setText("perDb", fmt(perDb, 4), " dB");
  setText("perLeakage", fmt(leakage, 4), " %");
  setText("perPurity", fmt(purity, 5), " %");
  setText("perRatio", `${fmt(ratio, 4)}:1`);
}

function updateCollimation() {
  const wavelengthMm = numberValue("colWavelength") * 1e-6;
  const mfdMm = numberValue("colMfd") * 1e-3;
  const fMm = numberValue("colFocal");
  const w0 = mfdMm / 2;
  if (wavelengthMm <= 0 || w0 <= 0 || fMm <= 0) {
    ["colDiameter", "colNa", "colZr", "colDiv"].forEach((id) => setText(id, null));
    return;
  }

  const modeHalfAngle = wavelengthMm / (Math.PI * w0);
  const wCol = fMm * modeHalfAngle;
  const diameter = 2 * wCol;
  const zrM = (Math.PI * wCol * wCol) / wavelengthMm / 1000;
  const div = wavelengthMm / (Math.PI * wCol);

  setText("colDiameter", fmt(diameter, 4), " mm");
  setText("colNa", fmt(modeHalfAngle * 1000, 4), " mrad");
  setText("colZr", fmt(zrM, 4), " m");
  setText("colDiv", fmt(div * 1000, 4), " mrad");
}

function updateTelescope() {
  const type = document.querySelector("#telType").value;
  const din = numberValue("telDin");
  const f1 = numberValue("telF1");
  const f2 = numberValue("telF2");
  if (din <= 0 || f1 <= 0 || f2 <= 0) {
    ["telMag", "telDout", "telLength", "telAngular"].forEach((id) => setText(id, null));
    return;
  }

  const mag = f2 / f1;
  const length = type === "keplerian" ? f1 + f2 : f1 - f2;
  setText("telMag", fmt(mag, 4), " x");
  setText("telDout", fmt(din * mag, 4), " mm");
  setText("telLength", length > 0 ? fmt(length, 4) : "check signs", length > 0 ? " mm" : "");
  setText("telAngular", fmt(1 / mag, 4), " x");
}

function updateFocus() {
  const beamDiameter = numberValue("focBeamDiameter");
  const m2 = numberValue("focM2");
  const wavelengthNm = numberValue("focWavelength");
  const fMm = numberValue("focFocal");

  if (beamDiameter <= 0 || m2 <= 0 || wavelengthNm <= 0 || fMm <= 0) {
    ["focSpotSize", "focSubstitution"].forEach((id) => setText(id, null));
    return;
  }

  const spotSizeUm = (1.27 * m2 * wavelengthNm * fMm) / (1000 * beamDiameter);
  const substitution = `1.27 x ${fmt(m2, 5)} x ${fmt(wavelengthNm, 6)} x ${fmt(fMm, 5)} / (1000 x ${fmt(
    beamDiameter,
    5,
  )})`;

  setText("focSpotSize", fmt(spotSizeUm, 4), " um");
  setText("focSubstitution", `${substitution} = ${fmt(spotSizeUm, 4)} um`);
}

function updateGrating() {
  const density = numberValue("graDensity");
  const wavelengthMm = numberValue("graWavelength") * 1e-6;
  const order = numberValue("graOrder");
  const alpha = degToRad(numberValue("graAlpha"));

  if (density <= 0 || wavelengthMm <= 0 || order <= 0 || !Number.isFinite(alpha)) {
    ["graBeta", "graLittrow", "graPeriod", "graDispersion"].forEach((id) => setText(id, null));
    return;
  }

  const d = 1 / density;
  const sinBeta = (order * wavelengthMm) / d - Math.sin(alpha);
  const sinLittrow = (order * wavelengthMm) / (2 * d);
  const periodNm = d * 1e6;

  setText("graPeriod", fmt(periodNm, 5), " nm");

  if (Math.abs(sinBeta) > 1) {
    setText("graBeta", "no solution");
    setText("graDispersion", null);
  } else {
    const beta = Math.asin(sinBeta);
    const dispersion = (order / (d * Math.cos(beta))) * 1e-3;
    setText("graBeta", fmt(radToDeg(beta), 5), " deg");
    setText("graDispersion", fmt(dispersion, 4), " mrad/nm");
  }

  if (Math.abs(sinLittrow) > 1) {
    setText("graLittrow", "no solution");
  } else {
    setText("graLittrow", fmt(radToDeg(Math.asin(sinLittrow)), 5), " deg");
  }
}

function updateCalculators() {
  updatePer();
  updateCollimation();
  updateTelescope();
  updateFocus();
  updateGrating();
}

function bindEvents() {
  document.querySelectorAll(".calc-tab").forEach((button) => {
    button.addEventListener("click", () => switchCalculator(button.dataset.calculator));
  });

  document.querySelectorAll(".calc-input").forEach((input) => {
    input.addEventListener("input", updateCalculators);
    input.addEventListener("change", updateCalculators);
  });
}

bindEvents();
updateCalculators();
