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

function setCollimationMethod(method) {
  document.querySelectorAll("[data-col-method]").forEach((panel) => {
    panel.hidden = panel.dataset.colMethod !== method;
  });
  document.querySelectorAll("[data-col-formula]").forEach((panel) => {
    panel.hidden = panel.dataset.colFormula !== method;
  });
}

function updateCollimation() {
  const method = document.querySelector("#colMethod")?.value || "mfd";
  setCollimationMethod(method);

  let diameter;
  let divergenceMrad;
  let wavelengthNm;

  if (method === "na") {
    wavelengthNm = numberValue("colWavelengthNa");
    const na = numberValue("colNaInput");
    const coreUm = numberValue("colCore");
    const fMm = numberValue("colFocalNa");
    if (wavelengthNm <= 0 || na <= 0 || coreUm <= 0 || fMm <= 0) {
      ["colDiameter", "colDivergence", "colRayleigh"].forEach((id) => setText(id, null));
      return;
    }

    diameter = 2 * fMm * na;
    divergenceMrad = coreUm / fMm;
  } else {
    wavelengthNm = numberValue("colWavelength");
    const wavelengthUm = wavelengthNm / 1000;
    const mfdUm = numberValue("colMfd");
    const fMm = numberValue("colFocalMfd");
    if (wavelengthNm <= 0 || wavelengthUm <= 0 || mfdUm <= 0 || fMm <= 0) {
      ["colDiameter", "colDivergence", "colRayleigh"].forEach((id) => setText(id, null));
      return;
    }

    diameter = (4 * wavelengthUm * fMm) / (Math.PI * mfdUm);
    divergenceMrad = mfdUm / fMm;
  }

  const wavelengthMm = wavelengthNm * 1e-6;
  const collimatedRadiusMm = diameter / 2;
  const rayleighLengthM = (Math.PI * collimatedRadiusMm * collimatedRadiusMm) / wavelengthMm / 1000;

  setText("colDiameter", fmt(diameter, 4), " mm");
  setText("colDivergence", fmt(divergenceMrad, 4), " mrad");
  setText("colRayleigh", fmt(rayleighLengthM, 4), " m");
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
    setText("focSpotSize", null);
    return;
  }

  const wavelengthUm = wavelengthNm / 1000;
  const spotSizeUm = (1.27 * m2 * wavelengthUm * fMm) / beamDiameter;

  setText("focSpotSize", fmt(spotSizeUm, 4), " um");
}

const detectorProfiles = {
  dataray_cmos: {
    coefficient: 127.63,
    sensor: "1 inch CMOS, 11.3 x 11.3 mm active area",
    resolution: "2048 x 2048, 5.5 x 5.5 um pixels",
    spectral: "355 - 1150 nm",
    condition: "ND-4, 40 us exposure, 85% ADC",
  },
};

function fmtPower(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "--";
}

function chartCoord(value, minValue, maxValue, lowPixel, highPixel) {
  const logValue = Math.log10(value);
  const logMin = Math.log10(minValue);
  const logMax = Math.log10(maxValue);
  return lowPixel + ((logValue - logMin) / (logMax - logMin)) * (highPixel - lowPixel);
}

function updateDetectorChart(beamDiameter, powerLimit, coefficient) {
  const curve = document.querySelector("#detChartCurve");
  const point = document.querySelector("#detChartPoint");
  const label = document.querySelector("#detChartLabel");
  if (!curve || !point || !label) return;

  const chart = { left: 76, right: 666, top: 28, bottom: 224, minD: 0.05, maxD: 2, minP: 0.01, maxP: 1000 };
  const diameters = [0.05, 0.07, 0.1, 0.15, 0.2, 0.3, 0.4, 0.7, 1.0, 1.5, 2.0];
  const points = diameters
    .map((diameter) => {
      const power = coefficient * diameter * diameter;
      const x = chartCoord(diameter, chart.minD, chart.maxD, chart.left, chart.right);
      const y = chartCoord(power, chart.minP, chart.maxP, chart.bottom, chart.top);
      return `${fmt(x, 6)},${fmt(y, 6)}`;
    })
    .join(" ");
  curve.setAttribute("points", points);

  if (beamDiameter <= 0 || powerLimit <= 0) {
    point.style.opacity = "0";
    label.style.opacity = "0";
    return;
  }

  const clampedD = Math.min(Math.max(beamDiameter, chart.minD), chart.maxD);
  const clampedP = Math.min(Math.max(powerLimit, chart.minP), chart.maxP);
  const x = chartCoord(clampedD, chart.minD, chart.maxD, chart.left, chart.right);
  const y = chartCoord(clampedP, chart.minP, chart.maxP, chart.bottom, chart.top);
  point.setAttribute("cx", x);
  point.setAttribute("cy", y);
  point.style.opacity = "1";
  label.setAttribute("x", Math.min(x + 12, chart.right - 88));
  label.setAttribute("y", Math.max(y - 12, chart.top + 18));
  label.textContent = `${fmtPower(powerLimit)} mW`;
  label.style.opacity = "1";
}

function updateDetectorModelDetails(profile) {
  const details = document.querySelector("#detModelDetails");
  if (!details) return;
  details.hidden = !profile;
  if (!profile) return;

  setText("detSensorSpec", profile.sensor);
  setText("detResolutionSpec", profile.resolution);
  setText("detSpectralSpec", profile.spectral);
  setText("detConditionSpec", profile.condition);
}

function updateDetector() {
  const model = document.querySelector("#detModel")?.value || "dataray_cmos";
  const profile = detectorProfiles[model];
  const beamDiameter = numberValue("detBeam");

  updateDetectorModelDetails(profile);

  if (!profile || beamDiameter <= 0) {
    setText("detLimit", null);
    updateDetectorChart(0, 0, profile?.coefficient || 1);
    return;
  }

  const limit = profile.coefficient * beamDiameter * beamDiameter;
  setText("detLimit", fmtPower(limit), " mW");
  updateDetectorChart(beamDiameter, limit, profile.coefficient);
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
  updateDetector();
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
