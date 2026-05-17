const state = {
  activeCalculator: "collimation",
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

const SPEED_OF_LIGHT = 299792458;

function timeToSeconds(value, unit) {
  if (unit === "fs") return value * 1e-15;
  if (unit === "ps") return value * 1e-12;
  if (unit === "ns") return value * 1e-9;
  if (unit === "us") return value * 1e-6;
  if (unit === "ms") return value * 1e-3;
  return value;
}

function bandwidthToHz(value, unit) {
  if (unit === "thz") return value * 1e12;
  if (unit === "ghz") return value * 1e9;
  if (unit === "mhz") return value * 1e6;
  if (unit === "khz") return value * 1e3;
  return value;
}

function lengthToM(value, unit) {
  if (unit === "mm") return value / 1000;
  if (unit === "cm") return value / 100;
  return value;
}

function wavelengthBandwidthToHz(centerNm, bandwidthNm) {
  const centerM = centerNm * 1e-9;
  const bandwidthM = bandwidthNm * 1e-9;
  return (SPEED_OF_LIGHT * bandwidthM) / (centerM * centerM);
}

function frequencyBandwidthToNm(centerNm, bandwidthHz) {
  const centerM = centerNm * 1e-9;
  return ((centerM * centerM * bandwidthHz) / SPEED_OF_LIGHT) * 1e9;
}

function formatBandwidthAuto(valueHz) {
  return formatScaled(valueHz, [
    { factor: 1e12, unit: "THz" },
    { factor: 1e9, unit: "GHz" },
    { factor: 1e6, unit: "MHz" },
    { factor: 1e3, unit: "kHz" },
    { factor: 1, unit: "Hz" },
  ]);
}

function setPulseBandwidthMode(mode) {
  document.querySelectorAll("[data-pb-mode]").forEach((panel) => {
    panel.hidden = panel.dataset.pbMode !== mode;
  });
}

function setPulseBandwidthKind(kind) {
  document.querySelectorAll("[data-pb-bandwidth-kind]").forEach((panel) => {
    panel.hidden = panel.dataset.pbBandwidthKind !== kind;
  });
}

function setCavityMode(mode) {
  document.querySelectorAll("[data-cav-mode]").forEach((panel) => {
    panel.hidden = panel.dataset.cavMode !== mode;
  });
}

function updatePulseBandwidth() {
  const mode = document.querySelector("#pbMode")?.value || "duration-to-bandwidth";
  const kind = document.querySelector("#pbBandwidthKind")?.value || "wavelength";
  const tbp = Number(document.querySelector("#pbShape")?.value || 0.441);
  const centerNm = numberValue("pbCenter");

  setPulseBandwidthMode(mode);
  setPulseBandwidthKind(kind);

  if (centerNm <= 0 || tbp <= 0) {
    ["pbDurationResult", "pbFreqResult", "pbWaveResult", "pbTbpResult"].forEach((id) => setText(id, null));
    return;
  }

  let durationS;
  let bandwidthHz;

  if (mode === "duration-to-bandwidth") {
    durationS = timeToSeconds(numberValue("pbDuration"), document.querySelector("#pbDurationUnit")?.value || "fs");
    if (durationS <= 0) {
      ["pbDurationResult", "pbFreqResult", "pbWaveResult", "pbTbpResult"].forEach((id) => setText(id, null));
      return;
    }
    bandwidthHz = tbp / durationS;
  } else {
    if (kind === "frequency") {
      bandwidthHz = bandwidthToHz(numberValue("pbBandwidthFreq"), document.querySelector("#pbBandwidthFreqUnit")?.value || "thz");
    } else {
      bandwidthHz = wavelengthBandwidthToHz(centerNm, numberValue("pbBandwidthNm"));
    }
    if (bandwidthHz <= 0) {
      ["pbDurationResult", "pbFreqResult", "pbWaveResult", "pbTbpResult"].forEach((id) => setText(id, null));
      return;
    }
    durationS = tbp / bandwidthHz;
  }

  setText("pbDurationResult", formatTimeAuto(durationS));
  setText("pbFreqResult", formatBandwidthAuto(bandwidthHz));
  setText("pbWaveResult", fmt(frequencyBandwidthToNm(centerNm, bandwidthHz), 5), " nm");
  setText("pbTbpResult", fmt(tbp, 4));
}

function updateCavity() {
  const mode = document.querySelector("#cavMode")?.value || "length-to-rate";
  const type = document.querySelector("#cavType")?.value || "linear";
  const index = numberValue("cavIndex");
  const roundTripFactor = type === "linear" ? 2 : 1;
  let lengthM;
  let repRateHz;

  setCavityMode(mode);

  if (index <= 0) {
    ["cavRateResult", "cavLengthResult", "cavRoundTripResult", "cavRoundTripTime"].forEach((id) => setText(id, null));
    return;
  }

  if (mode === "rate-to-length") {
    repRateHz = rateToHz(numberValue("cavRate"), document.querySelector("#cavRateUnit")?.value || "mhz");
    if (repRateHz <= 0) {
      ["cavRateResult", "cavLengthResult", "cavRoundTripResult", "cavRoundTripTime"].forEach((id) => setText(id, null));
      return;
    }
    lengthM = SPEED_OF_LIGHT / (index * repRateHz * roundTripFactor);
  } else {
    lengthM = lengthToM(numberValue("cavLength"), document.querySelector("#cavLengthUnit")?.value || "m");
    if (lengthM <= 0) {
      ["cavRateResult", "cavLengthResult", "cavRoundTripResult", "cavRoundTripTime"].forEach((id) => setText(id, null));
      return;
    }
    repRateHz = SPEED_OF_LIGHT / (index * lengthM * roundTripFactor);
  }

  const roundTripLengthM = lengthM * roundTripFactor;
  setText("cavRateResult", formatRateAuto(repRateHz));
  setText("cavLengthResult", formatLengthAuto(lengthM));
  setText("cavRoundTripResult", formatLengthAuto(roundTripLengthM));
  setText("cavRoundTripTime", formatTimeAuto(1 / repRateHz));
}

function energyToJ(value, unit) {
  if (unit === "j") return value;
  if (unit === "mj") return value / 1000;
  if (unit === "uj") return value / 1000000;
  if (unit === "nj") return value / 1000000000;
  return value / 1000000000000;
}

function rateToHz(value, unit) {
  if (unit === "ghz") return value * 1000000000;
  if (unit === "mhz") return value * 1000000;
  if (unit === "khz") return value * 1000;
  return value;
}

function formatScaled(value, scales) {
  if (!Number.isFinite(value)) return "--";
  const abs = Math.abs(value);
  const scale = scales.find((candidate) => abs >= candidate.factor) || scales[scales.length - 1];
  return `${fmt(value / scale.factor, 5)} ${scale.unit}`;
}

function formatPowerAuto(valueW) {
  return formatScaled(valueW, [
    { factor: 1, unit: "W" },
    { factor: 1e-3, unit: "mW" },
    { factor: 1e-6, unit: "uW" },
    { factor: 1e-9, unit: "nW" },
  ]);
}

function formatEnergyAuto(valueJ) {
  return formatScaled(valueJ, [
    { factor: 1, unit: "J" },
    { factor: 1e-3, unit: "mJ" },
    { factor: 1e-6, unit: "uJ" },
    { factor: 1e-9, unit: "nJ" },
    { factor: 1e-12, unit: "pJ" },
  ]);
}

function formatRateAuto(valueHz) {
  return formatScaled(valueHz, [
    { factor: 1e9, unit: "GHz" },
    { factor: 1e6, unit: "MHz" },
    { factor: 1e3, unit: "kHz" },
    { factor: 1, unit: "Hz" },
  ]);
}

function formatTimeAuto(valueS) {
  return formatScaled(valueS, [
    { factor: 1, unit: "s" },
    { factor: 1e-3, unit: "ms" },
    { factor: 1e-6, unit: "us" },
    { factor: 1e-9, unit: "ns" },
    { factor: 1e-12, unit: "ps" },
    { factor: 1e-15, unit: "fs" },
  ]);
}

function setEnergyPowerMode(mode) {
  document.querySelectorAll("[data-energy-mode]").forEach((panel) => {
    panel.hidden = panel.dataset.energyMode !== mode;
  });
}

function updateEnergyPower() {
  const mode = document.querySelector("#epMode")?.value || "energy-to-power";
  const rateHz = rateToHz(numberValue("epRateInput"), document.querySelector("#epRateUnit")?.value || "khz");
  setEnergyPowerMode(mode);

  if (rateHz <= 0) {
    ["epPowerResult", "epEnergyResult", "epRateResult", "epPeriodResult"].forEach((id) => setText(id, null));
    return;
  }

  let energyJ;
  let powerW;

  if (mode === "power-to-energy") {
    powerW = powerToW(numberValue("epPowerInput"), document.querySelector("#epPowerUnit")?.value || "w");
    if (powerW <= 0) {
      ["epPowerResult", "epEnergyResult", "epRateResult", "epPeriodResult"].forEach((id) => setText(id, null));
      return;
    }
    energyJ = powerW / rateHz;
  } else {
    energyJ = energyToJ(numberValue("epEnergyInput"), document.querySelector("#epEnergyUnit")?.value || "uj");
    if (energyJ <= 0) {
      ["epPowerResult", "epEnergyResult", "epRateResult", "epPeriodResult"].forEach((id) => setText(id, null));
      return;
    }
    powerW = energyJ * rateHz;
  }

  setText("epPowerResult", formatPowerAuto(powerW));
  setText("epEnergyResult", formatEnergyAuto(energyJ));
  setText("epRateResult", formatRateAuto(rateHz));
  setText("epPeriodResult", formatTimeAuto(1 / rateHz));
}

function formatLengthAuto(valueM) {
  return formatScaled(valueM, [
    { factor: 1000, unit: "km" },
    { factor: 1, unit: "m" },
    { factor: 1e-3, unit: "mm" },
    { factor: 1e-6, unit: "um" },
    { factor: 1e-9, unit: "nm" },
  ]);
}

function updateRayleigh() {
  const diameterUm = numberValue("rayDiameter");
  const wavelengthM = numberValue("rayWavelength") * 1e-9;
  const m2 = numberValue("rayM2");

  if (diameterUm <= 0 || wavelengthM <= 0 || m2 <= 0) {
    ["rayLength", "rayConfocal", "rayRadius", "rayDivergence"].forEach((id) => setText(id, null));
    return;
  }

  const radiusM = (diameterUm * 1e-6) / 2;
  const rayleighM = (Math.PI * radiusM * radiusM) / (m2 * wavelengthM);
  const fullAngleMrad = ((2 * m2 * wavelengthM) / (Math.PI * radiusM)) * 1000;

  setText("rayLength", formatLengthAuto(rayleighM));
  setText("rayConfocal", formatLengthAuto(2 * rayleighM));
  setText("rayRadius", fmt(radiusM * 1e6, 5), " um");
  setText("rayDivergence", fmt(fullAngleMrad, 5), " mrad");
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
  const lensDiameterMm = 25.4;
  const lensHalfPx = 112;
  const mmToPx = (2 * lensHalfPx) / lensDiameterMm;
  const inputRadius = (din / 2) * mmToPx;
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

  const l2BeamRadius = Math.max(Math.abs(topL2 - centerY), Math.abs(bottomL2 - centerY));
  const l1Fill = inputRadius / lensHalfPx;
  const l2Fill = l2BeamRadius / lensHalfPx;
  const beamOverfillsLens = l1Fill > 1 || l2Fill > 1;
  const lensTop = centerY - lensHalfPx;
  const lensBottom = centerY + lensHalfPx;
  const stateInfo = telescopeState(type, spacing, f1, f2, idealLength);

  setSvgText("telSvgTitle", type === "keplerian" ? "Keplerian Beam Expander" : "Galilean Beam Expander");
  setSvgText("telMetricSpacing", fmt(spacing, 5));
  setSvgText("telMetricCondition", type === "keplerian" ? "f1 + f2" : "f2 - |f1|");
  setSvgText("telMetricMagnification", `${fmt(mag, 4)}x`);
  setSvgText("telLens1Label", type === "keplerian" ? "L1 positive" : "L1 negative");
  setSvgText("telLens2Label", "L2 positive");
  setSvgText("telLens1F", `1 in aperture; f1 = ${fmt(f1, 5)} mm`);
  setSvgText("telLens2F", `1 in aperture; f2 = ${fmt(f2, 5)} mm`);
  setSvgText("telSpacingLabel", `d = ${fmt(spacing, 5)} mm`);
  setSvgText(
    "telInputSummary",
    `Lens aperture = 25.4 mm; L1 fill = ${fmt(l1Fill * 100, 4)}%; L2 fill = ${fmt(l2Fill * 100, 4)}%${beamOverfillsLens ? " OVERFILLED" : ""}`,
  );
  setSvgText("telStateText", stateInfo.message);

  setSvgAttr("telStateBox", { stroke: stateInfo.color });
  setSvgAttr("telLens1", { d: type === "keplerian" ? positiveLensPath(x1, lensTop, lensBottom, 22) : negativeLensPath(x1, lensTop, lensBottom, 20, 52) });
  setSvgAttr("telLens2", { d: positiveLensPath(x2, lensTop, lensBottom, 22) });
  document.querySelector("#telLens1")?.classList.toggle("tel-negative-lens", type === "galilean");
  document.querySelector("#telLens1")?.classList.toggle("tel-positive-lens", type === "keplerian");

  setSvgAttr("telLens1Label", { x: x1, y: lensTop - 18 });
  setSvgAttr("telLens2Label", { x: x2, y: lensTop - 18 });
  setSvgAttr("telLens1F", { x: x1, y: lensBottom + 24 });
  setSvgAttr("telLens2F", { x: x2, y: lensBottom + 24 });
  setSvgAttr("telSpacingLine", { x1, x2, y1: 512, y2: 512 });
  setSvgAttr("telSpacingLabel", { x: (x1 + x2) / 2, y: 530 });
  setSvgAttr("telDinLabel", { x: xStart + 2, y: Math.max(126, topIn - 10) });
  setSvgAttr("telDoutLabel", { x: Math.min(xEnd - 42, x2 + 110), y: Math.max(126, Math.min(topEnd, bottomEnd) - 16) });
  ["telBeamTop", "telBeamBottom", "telBeamFill", "telLens1", "telLens2"].forEach((id) => {
    document.querySelector(`#${id}`)?.classList.toggle("tel-overfill", beamOverfillsLens);
  });
  setSvgAttr("telBeamTop", { points: topPoints });
  setSvgAttr("telBeamBottom", { points: bottomPoints });
  setSvgAttr("telBeamFill", { points: fillPoints });
}

function updateTelescope() {
  const type = document.querySelector("#telType").value;
  const din = numberValue("telDin");
  const f1 = numberValue("telF1");
  const f2 = numberValue("telF2");
  const wavelengthM = numberValue("telWavelength") * 1e-9;
  const m2 = numberValue("telM2");
  if (din <= 0 || f1 <= 0 || f2 <= 0 || wavelengthM <= 0 || m2 <= 0) {
    ["telMag", "telDout", "telLength", "telRayleigh"].forEach((id) => setText(id, null));
    return;
  }

  const mag = f2 / f1;
  const idealLength = idealTelescopeSpacing(type, f1, f2);
  const spacing = configureTelescopeSpacingSlider(type, f1, f2, idealLength);
  const outputDiameterMm = din * mag;
  const outputRadiusM = (outputDiameterMm * 1e-3) / 2;
  const outputRayleighM = (Math.PI * outputRadiusM * outputRadiusM) / (m2 * wavelengthM);

  setText("telMag", fmt(mag, 4), " x");
  setText("telDout", fmt(outputDiameterMm, 4), " mm");
  setText("telLength", idealLength > 0 ? fmt(idealLength, 4) : "check focal lengths", idealLength > 0 ? " mm" : "");
  setText("telRayleigh", formatLengthAuto(outputRayleighM));
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
  const thetaI = degToRad(numberValue("graAlpha"));

  if (density <= 0 || wavelengthMm <= 0 || order <= 0 || !Number.isFinite(thetaI)) {
    ["graBeta", "graLittrow", "graPeriod", "graDispersion"].forEach((id) => setText(id, null));
    return;
  }

  const grooveSpacing = 1 / density;
  const sinThetaM = (order * wavelengthMm) / grooveSpacing - Math.sin(thetaI);
  const sinLittrow = (order * wavelengthMm) / (2 * grooveSpacing);
  const spacingNm = grooveSpacing * 1e6;

  setText("graPeriod", fmt(spacingNm, 5), " nm");

  if (Math.abs(sinThetaM) > 1) {
    setText("graBeta", "no solution");
    setText("graDispersion", null);
  } else {
    const thetaM = Math.asin(sinThetaM);
    const dispersion = (order / (grooveSpacing * Math.cos(thetaM))) * 1e-3;
    setText("graBeta", fmt(radToDeg(thetaM), 5), " deg");
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
  updateEnergyPower();
  updatePulseBandwidth();
  updateCavity();
  updateTelescope();
  updateRayleigh();
  updateFocus();
  updateDetector();
  updateGrating();
}

function bindEvents() {
  document.querySelectorAll(".calc-tab").forEach((button) => {
    button.addEventListener("click", () => switchCalculator(button.dataset.calculator));
  });

  ["telType", "telF1", "telF2", "telWavelength", "telM2"].forEach((id) => {
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
