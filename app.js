const state = {
  activeCalculator: "per",
  telescopeSpacingMode: "auto",
  telescopeSignature: "",
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

function powerToW(value, unit) {
  if (unit === "w") return value;
  if (unit === "mw") return value / 1000;
  return value / 1000000;
}

function updatePer() {
  const pMax = numberValue("powMax");
  const pMin = numberValue("powMin");
  const maxUnit = document.querySelector("#powMaxUnit")?.value || "mw";
  const minUnit = document.querySelector("#powMinUnit")?.value || "mw";
  if (pMax <= 0 || pMin <= 0) {
    ["powRatioDb", "powRatioLinear", "powMinMax", "powDelta"].forEach((id) => setText(id, null));
    return;
  }

  const pMaxW = powerToW(pMax, maxUnit);
  const pMinW = powerToW(pMin, minUnit);
  if (pMaxW <= 0 || pMinW <= 0) {
    ["powRatioDb", "powRatioLinear", "powMinMax", "powDelta"].forEach((id) => setText(id, null));
    return;
  }

  const ratio = pMaxW / pMinW;
  const ratioDb = 10 * Math.log10(ratio);
  const minMaxPercent = (pMinW / pMaxW) * 100;
  const deltaMw = (pMaxW - pMinW) * 1000;

  setText("powRatioDb", fmt(ratioDb, 5), " dB");
  setText("powRatioLinear", `${fmt(ratio, 5)}:1`);
  setText("powMinMax", fmt(minMaxPercent, 5), " %");
  setText("powDelta", fmt(deltaMw, 5), " mW");
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

function setSvgText(id, value) {
  const element = document.querySelector(`#${id}`);
  if (element) element.textContent = value;
}

function setSvgAttr(id, attrs) {
  const element = document.querySelector(`#${id}`);
  if (!element) return;
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
}

function setSvgVisible(id, visible) {
  const element = document.querySelector(`#${id}`);
  if (element) element.style.display = visible ? "" : "none";
}

function positiveLensPath(x, top = 142, bottom = 498, bow = 28) {
  const mid = (top + bottom) / 2;
  return `M ${x} ${top} Q ${x + bow} ${mid} ${x} ${bottom} Q ${x - bow} ${mid} ${x} ${top}`;
}

function negativeLensPath(x, top = 172, bottom = 468, bow = 22, width = 52) {
  const mid = (top + bottom) / 2;
  return `M ${x - width / 2} ${top} Q ${x} ${mid} ${x - width / 2} ${bottom} L ${x + width / 2} ${bottom} Q ${x} ${mid} ${x + width / 2} ${top} Z`;
}

function idealTelescopeSpacing(type, f1, f2) {
  return type === "keplerian" ? f1 + f2 : f2 - f1;
}

function configureTelescopeSpacingSlider(type, f1, f2, idealLength) {
  const slider = document.querySelector("#telSpacing");
  const value = document.querySelector("#telSpacingValue");
  const reset = document.querySelector("#telSpacingReset");
  const valid = Number.isFinite(idealLength) && idealLength > 0;
  if (!slider || !value) return valid ? idealLength : NaN;

  const signature = `${type}:${f1}:${f2}`;
  if (state.telescopeSignature !== signature) {
    state.telescopeSignature = signature;
    state.telescopeSpacingMode = "auto";
  }

  const min = valid
    ? Math.max(1, Math.round(type === "keplerian" ? f1 * 0.6 : idealLength * 0.35))
    : 1;
  const max = valid
    ? Math.max(min + 1, Math.round(idealLength + f2 * 0.8))
    : 2;
  slider.min = String(min);
  slider.max = String(max);
  slider.disabled = !valid;
  if (reset) reset.disabled = !valid;

  let spacing = Number(slider.value);
  if (!valid || state.telescopeSpacingMode === "auto" || !Number.isFinite(spacing)) {
    spacing = valid ? idealLength : min;
  }
  spacing = Math.min(Math.max(spacing, min), max);
  slider.value = String(Math.round(spacing));
  value.textContent = valid ? `${fmt(spacing, 5)} mm` : "--";
  return spacing;
}

function telescopeState(type, spacing, f1, f2, idealLength) {
  const tolerance = Math.max(0.5, Math.abs(idealLength) * 0.003);
  if (type === "keplerian") {
    if (Math.abs(spacing - idealLength) <= tolerance) {
      return { color: "#4ade80", message: "State: d = f1 + f2 (Collimated)" };
    }
    if (Math.abs(spacing - f1) <= tolerance) {
      return { color: "#ef4444", message: "State: d = f1 (Focus on L2)" };
    }
    if (spacing < f1) {
      return { color: "#fca5a5", message: "State: d < f1 (Converging)" };
    }
    if (spacing < idealLength) {
      return { color: "#fbbf24", message: "State: f1 < d < f1 + f2 (Diverging)" };
    }
    return { color: "#60a5fa", message: "State: d > f1 + f2 (Converging)" };
  }

  if (Math.abs(spacing - idealLength) <= tolerance) {
    return { color: "#4ade80", message: "State: d = f2 - |f1| (Collimated)" };
  }
  if (spacing < idealLength) {
    return { color: "#fbbf24", message: "State: d < f2 - |f1| (Diverging)" };
  }
  return { color: "#60a5fa", message: "State: d > f2 - |f1| (Converging)" };
}

function updateTelescopeSvg(type, din, f1, f2, mag, idealLength, spacing) {
  const svg = document.querySelector("#telDynamicSvg");
  if (!svg) return;

  const centerY = 320;
  const xStart = 62;
  const xEnd = 838;
  const x1 = 205;
  const slider = document.querySelector("#telSpacing");
  const maxSpacing = slider ? Number(slider.max) : Math.max(idealLength, spacing, 1);
  const scale = Math.min(3, Math.max(1.2, (xEnd - 110 - x1) / Math.max(maxSpacing, 1)));
  const spacingPx = Math.max(1, spacing * scale);
  const x2 = x1 + spacingPx;
  const inputRadius = 42;
  const f1Px = Math.max(f1 * scale, 1);
  const f2Px = Math.max(f2 * scale, 1);

  let topPoints;
  let bottomPoints;
  let fillPoints;
  let topL2;
  let bottomL2;
  let topEnd;
  let bottomEnd;

  const topIn = centerY - inputRadius;
  const bottomIn = centerY + inputRadius;

  if (type === "keplerian") {
    const focusX = x1 + f1Px;
    const mTopMiddle = inputRadius / f1Px;
    const hTopL2 = -mTopMiddle * (x2 - focusX);
    topL2 = centerY + hTopL2;
    const mTopOut = mTopMiddle - (-hTopL2 / f2Px);
    topEnd = topL2 + mTopOut * (xEnd - x2);

    const mBottomMiddle = -inputRadius / f1Px;
    const hBottomL2 = -mBottomMiddle * (x2 - focusX);
    bottomL2 = centerY + hBottomL2;
    const mBottomOut = mBottomMiddle - (-hBottomL2 / f2Px);
    bottomEnd = bottomL2 + mBottomOut * (xEnd - x2);

    topPoints = `${xStart},${topIn} ${x1},${topIn} ${x2},${topL2} ${xEnd},${topEnd}`;
    bottomPoints = `${xStart},${bottomIn} ${x1},${bottomIn} ${x2},${bottomL2} ${xEnd},${bottomEnd}`;
    fillPoints = `${xStart},${topIn} ${x1},${topIn} ${x2},${topL2} ${xEnd},${topEnd} ${xEnd},${bottomEnd} ${x2},${bottomL2} ${x1},${bottomIn} ${xStart},${bottomIn}`;

    setSvgAttr("telFocusDot", { cx: focusX, cy: centerY, r: 4 });
    setSvgAttr("telFocusLabel", { x: focusX, y: centerY + 28 });
    setSvgText("telFocusLabel", "F1");
    ["telFocusDot", "telFocusLabel"].forEach((id) => setSvgVisible(id, true));
    ["telVirtualTop", "telVirtualBottom"].forEach((id) => setSvgVisible(id, false));
  } else {
    const virtualFocusX = x1 - f1Px;
    const mTopIn = -inputRadius / f1Px;
    const hTopL2 = mTopIn * (x2 - virtualFocusX);
    topL2 = centerY + hTopL2;
    const mTopOut = mTopIn - (hTopL2 / f2Px);
    topEnd = topL2 + mTopOut * (xEnd - x2);

    const mBottomIn = inputRadius / f1Px;
    const hBottomL2 = mBottomIn * (x2 - virtualFocusX);
    bottomL2 = centerY + hBottomL2;
    const mBottomOut = mBottomIn - (hBottomL2 / f2Px);
    bottomEnd = bottomL2 + mBottomOut * (xEnd - x2);

    topPoints = `${xStart},${topIn} ${x1},${topIn} ${x2},${topL2} ${xEnd},${topEnd}`;
    bottomPoints = `${xStart},${bottomIn} ${x1},${bottomIn} ${x2},${bottomL2} ${xEnd},${bottomEnd}`;
    fillPoints = `${xStart},${topIn} ${x1},${topIn} ${x2},${topL2} ${xEnd},${topEnd} ${xEnd},${bottomEnd} ${x2},${bottomL2} ${x1},${bottomIn} ${xStart},${bottomIn}`;

    setSvgAttr("telVirtualTop", { x1: virtualFocusX, y1: centerY, x2: x1, y2: topIn });
    setSvgAttr("telVirtualBottom", { x1: virtualFocusX, y1: centerY, x2: x1, y2: bottomIn });
    ["telVirtualTop", "telVirtualBottom"].forEach((id) => setSvgVisible(id, true));
    ["telFocusDot", "telFocusLabel"].forEach((id) => setSvgVisible(id, false));
  }

  const lens2Radius = Math.max(Math.abs(topL2 - centerY), Math.abs(bottomL2 - centerY), inputRadius * mag);
  const lens2Top = Math.max(118, centerY - lens2Radius - 55);
  const lens2Bottom = Math.min(522, centerY + lens2Radius + 55);
  const stateInfo = telescopeState(type, spacing, f1, f2, idealLength);

  setSvgText("telSvgTitle", type === "keplerian" ? "Keplerian Beam Expander" : "Galilean Beam Expander");
  setSvgText("telMetricSpacing", fmt(spacing, 5));
  setSvgText("telMetricCondition", type === "keplerian" ? "f1 + f2" : "f2 - |f1|");
  setSvgText("telMetricMagnification", `${fmt(mag, 4)}x`);
  setSvgText("telLens1Label", type === "keplerian" ? "L1 positive" : "L1 negative");
  setSvgText("telLens2Label", "L2 positive");
  setSvgText("telLens1F", `f1 = ${fmt(f1, 5)} mm`);
  setSvgText("telLens2F", `f2 = ${fmt(f2, 5)} mm`);
  setSvgText("telSpacingLabel", `d = ${fmt(spacing, 5)} mm`);
  setSvgText("telInputSummary", `f1 = ${fmt(f1, 5)} mm, f2 = ${fmt(f2, 5)} mm, ideal d = ${fmt(idealLength, 5)} mm`);
  setSvgText("telStateText", stateInfo.message);

  setSvgAttr("telStateBox", { stroke: stateInfo.color });
  setSvgAttr("telLens1", { d: type === "keplerian" ? positiveLensPath(x1, 172, 468, 24) : negativeLensPath(x1, 178, 462, 24, 56) });
  setSvgAttr("telLens2", { d: positiveLensPath(x2, lens2Top, lens2Bottom, 28) });
  document.querySelector("#telLens1")?.classList.toggle("tel-negative-lens", type === "galilean");
  document.querySelector("#telLens1")?.classList.toggle("tel-positive-lens", type === "keplerian");

  setSvgAttr("telLens1Label", { x: x1, y: 156 });
  setSvgAttr("telLens2Label", { x: x2, y: lens2Top - 18 });
  setSvgAttr("telLens1F", { x: x1, y: 488 });
  setSvgAttr("telLens2F", { x: x2, y: lens2Bottom + 24 });
  setSvgAttr("telSpacingLine", { x1, x2, y1: 512, y2: 512 });
  setSvgAttr("telSpacingLabel", { x: (x1 + x2) / 2, y: 530 });
  setSvgAttr("telDoutLabel", { x: Math.min(xEnd - 42, x2 + 110), y: Math.min(topEnd, bottomEnd) - 16 });
  setSvgAttr("telBeamTop", { points: topPoints });
  setSvgAttr("telBeamBottom", { points: bottomPoints });
  setSvgAttr("telBeamFill", { points: fillPoints });
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
  const idealLength = idealTelescopeSpacing(type, f1, f2);
  const spacing = configureTelescopeSpacingSlider(type, f1, f2, idealLength);
  setText("telMag", fmt(mag, 4), " x");
  setText("telDout", fmt(din * mag, 4), " mm");
  setText("telLength", idealLength > 0 ? fmt(idealLength, 4) : "check focal lengths", idealLength > 0 ? " mm" : "");
  setText("telAngular", fmt(1 / mag, 4), " x");
  if (idealLength > 0 && Number.isFinite(spacing)) {
    updateTelescopeSvg(type, din, f1, f2, mag, idealLength, spacing);
  }
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

  ["telType", "telF1", "telF2"].forEach((id) => {
    const control = document.querySelector(`#${id}`);
    const resetSpacing = () => {
      state.telescopeSpacingMode = "auto";
      state.telescopeSignature = "";
    };
    control?.addEventListener("input", resetSpacing);
    control?.addEventListener("change", resetSpacing);
  });

  const telSpacing = document.querySelector("#telSpacing");
  telSpacing?.addEventListener("input", () => {
    state.telescopeSpacingMode = "manual";
  });

  document.querySelector("#telSpacingReset")?.addEventListener("click", () => {
    state.telescopeSpacingMode = "auto";
    state.telescopeSignature = "";
    updateCalculators();
  });

  document.querySelectorAll(".calc-input").forEach((input) => {
    input.addEventListener("input", updateCalculators);
    input.addEventListener("change", updateCalculators);
  });
}

bindEvents();
updateCalculators();
