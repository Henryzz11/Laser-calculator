const state = {
  activeCalculator: null,
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

function showHome() {
  state.activeCalculator = null;
  const shell = document.querySelector(".calculator-shell");
  shell?.classList.add("home-mode");
  shell?.classList.remove("detail-mode");
  document.querySelectorAll(".calc-tab").forEach((button) => {
    button.classList.remove("active");
  });
  document.querySelectorAll(".calc-panel").forEach((panel) => {
    panel.classList.remove("active");
  });
}

function setBeamModeTabState(name) {
  document.querySelectorAll(".beam-mode-tab").forEach((button) => {
    const active = button.dataset.calculatorTarget === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function switchCalculator(name) {
  state.activeCalculator = name;
  const shell = document.querySelector(".calculator-shell");
  shell?.classList.remove("home-mode");
  shell?.classList.add("detail-mode");
  document.querySelectorAll(".calc-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.calculator === name);
  });
  document.querySelectorAll(".calc-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `calc-${name}`);
  });
  setBeamModeTabState(name);
  window.scrollTo({ top: 0, behavior: "smooth" });
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
const PLANCK_CONSTANT = 6.62607015e-34;

const GAIN_RECOVERY_MEDIA = {
  er_zblan: {
    lifetimeMs: 6.9,
    defaultPresetValue: "er972",
    defaultAreaValue: "er_clad_250",
    presets: [
      { value: "er965", label: "965 nm pump, σa = 0.60", wavelengthNm: 965, sigmaAbsE25: 0.6, sigmaEmE25: 0 },
      { value: "er972", label: "972 nm pump, σa = 1.75", wavelengthNm: 972, sigmaAbsE25: 1.75, sigmaEmE25: 0 },
      { value: "er976", label: "976 nm pump, σa = 2.10", wavelengthNm: 976, sigmaAbsE25: 2.1, sigmaEmE25: 0 },
    ],
    areaPresets: [
      { value: "er_clad_250", label: "250 um cladding", diameterUm: 250 },
    ],
  },
  yb_fiber: {
    lifetimeMs: 0.77,
    defaultPresetValue: "yb976",
    defaultAreaValue: "yb_clad_250",
    presets: [
      { value: "yb976", label: "976 nm pump, σa = σe = 25", wavelengthNm: 976, sigmaAbsE25: 25, sigmaEmE25: 25 },
    ],
    areaPresets: [
      { value: "yb_core_6_6", label: "6.6 um SM core pump", diameterUm: 6.6 },
      { value: "yb_clad_250", label: "250 um cladding", diameterUm: 250 },
      { value: "yb_clad_400", label: "400 um cladding", diameterUm: 400 },
    ],
  },
};

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
  const mode = document.querySelector("#epMode")?.value || "power-to-energy";
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
  const diameterMm = numberValue("rayDiameter");
  const wavelengthM = numberValue("rayWavelength") * 1e-9;
  const m2 = numberValue("rayM2");

  if (diameterMm <= 0 || wavelengthM <= 0 || m2 <= 0) {
    ["rayLength", "rayConfocal"].forEach((id) => setText(id, null));
    return;
  }

  const radiusM = (diameterMm * 1e-3) / 2;
  const rayleighM = (Math.PI * radiusM * radiusM) / (m2 * wavelengthM);
  const diameterAtRayleighMm = diameterMm * Math.sqrt(2);

  setText("rayLength", formatLengthAuto(rayleighM));
  setText("rayConfocal", fmt(diameterAtRayleighMm, 5), " mm");
}

function estimatedEndcapRipplePercent(fiberDiameterUm, beamDiameterUm) {
  if (fiberDiameterUm <= 0 || beamDiameterUm <= 0) return NaN;
  const apertureToBeamRatio = fiberDiameterUm / beamDiameterUm;
  return 200 * Math.exp(-(apertureToBeamRatio * apertureToBeamRatio));
}

function fusedSilicaIndex(wavelengthUm) {
  const lambda2 = wavelengthUm * wavelengthUm;
  const n2 = 1
    + (0.6961663 * lambda2) / (lambda2 - 0.0684043 ** 2)
    + (0.4079426 * lambda2) / (lambda2 - 0.1162414 ** 2)
    + (0.8974794 * lambda2) / (lambda2 - 9.896161 ** 2);
  return Math.sqrt(n2);
}

function endcapLengthForDiameter(rayleighM, fiberMfdUm, targetDiameterUm) {
  const targetRatio = targetDiameterUm / fiberMfdUm;
  return targetRatio <= 1 ? 0 : rayleighM * Math.sqrt((targetRatio * targetRatio) - 1);
}

function setEndcapMode(mode) {
  document.querySelectorAll("[data-end-mode]").forEach((panel) => {
    panel.hidden = panel.dataset.endMode !== mode;
  });
}

function updateEndcap() {
  const wavelengthNm = numberValue("endWavelength");
  const wavelengthM = wavelengthNm * 1e-9;
  const wavelengthUm = wavelengthNm / 1000;
  const index = fusedSilicaIndex(wavelengthUm);
  const fiberMfdUm = numberValue("endInitialDiameter");
  const fiberDiameterUm = numberValue("endFiberDiameter");
  const mode = document.querySelector("#endMode")?.value || "cw";
  const outputIds = [
    "endLength",
    "endSafeDiameter",
    "endTargetRipple",
    "endApertureCheck",
  ];
  setEndcapMode(mode);

  if (
    wavelengthM <= 0 ||
    !Number.isFinite(index) ||
    fiberMfdUm <= 0 ||
    fiberDiameterUm <= 0
  ) {
    outputIds.forEach((id) => setText(id, null));
    return;
  }

  let safeDiameterUm = NaN;

  if (mode === "pulse") {
    const pulseEnergyJ = numberValue("endPulseEnergy") * 1e-3;
    const effectiveDurationNs = numberValue("endPulseDuration");
    const referenceDurationNs = 1;
    const referenceThresholdJPerCm2 = numberValue("endPulseThreshold");
    const safetyFactor = numberValue("endPulseSafetyFactor");
    if (pulseEnergyJ < 0 || effectiveDurationNs <= 0 || referenceThresholdJPerCm2 <= 0 || safetyFactor < 1) {
      outputIds.forEach((id) => setText(id, null));
      return;
    }
    const burstThresholdJPerCm2 = referenceThresholdJPerCm2 * Math.sqrt(effectiveDurationNs / referenceDurationNs);
    const allowedFluenceJPerCm2 = burstThresholdJPerCm2 / safetyFactor;
    const allowedFluenceJPerM2 = allowedFluenceJPerCm2 * 1e4;
    const safeRadiusM = Math.sqrt((2 * pulseEnergyJ) / (Math.PI * allowedFluenceJPerM2));
    safeDiameterUm = safeRadiusM * 2 * 1e6;
  } else {
    const cwPowerW = numberValue("endCwPower");
    const thresholdMwPerCm2 = numberValue("endCwThreshold");
    const safetyFactor = numberValue("endCwSafetyFactor");
    if (cwPowerW < 0 || thresholdMwPerCm2 <= 0 || safetyFactor < 1) {
      outputIds.forEach((id) => setText(id, null));
      return;
    }
    const allowedIntensityMwPerCm2 = thresholdMwPerCm2 / safetyFactor;
    const allowedIntensityWPerM2 = allowedIntensityMwPerCm2 * 1e10;
    const safeRadiusM = Math.sqrt((2 * cwPowerW) / (Math.PI * allowedIntensityWPerM2));
    safeDiameterUm = safeRadiusM * 2 * 1e6;
  }

  if (!Number.isFinite(safeDiameterUm) || safeDiameterUm < 0) {
    outputIds.forEach((id) => setText(id, null));
    return;
  }

  const outputDiameterUm = Math.max(fiberMfdUm, safeDiameterUm);
  const waistRadiusM = (fiberMfdUm * 1e-6) / 2;
  const rayleighM = (Math.PI * index * waistRadiusM * waistRadiusM) / wavelengthM;
  const requiredLengthM = endcapLengthForDiameter(rayleighM, fiberMfdUm, outputDiameterUm);
  const apertureToOutputRatio = fiberDiameterUm / outputDiameterUm;
  const outputRipplePercent = estimatedEndcapRipplePercent(fiberDiameterUm, outputDiameterUm);

  let apertureCheck = safeDiameterUm <= fiberMfdUm ? "Already below threshold at fiber MFD" : "Low clipping ripple";
  if (apertureToOutputRatio < 1) {
    apertureCheck = "Required beam is larger than the aperture";
  } else if (apertureToOutputRatio < 1.6) {
    apertureCheck = "High clipping ripple expected";
  } else if (apertureToOutputRatio < 2.29) {
    apertureCheck = "Moderate clipping ripple expected";
  }

  setText("endLength", fmt(requiredLengthM * 1000, 5), " mm");
  setText("endSafeDiameter", fmt(outputDiameterUm, 5), " um");
  setText("endTargetRipple", `±${fmt(outputRipplePercent, 4)}`, " %");
  setText("endApertureCheck", apertureCheck);
}


function updateFeedback() {
  const nFiber = numberValue("fbIndex");
  const naClad = numberValue("fbNa");

  if (nFiber <= 0 || naClad <= 0) {
    setText("fbAlphaMin", null);
    return;
  }

  const acceptanceRatio = naClad / nFiber;
  if (acceptanceRatio > 1) {
    setText("fbAlphaMin", "no solution");
    return;
  }

  const thetaMax = radToDeg(Math.asin(acceptanceRatio));
  const alphaMin = thetaMax / 2;
  setText("fbAlphaMin", fmt(alphaMin, 5), " deg");
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
  const clearAperture = numberValue("colClearAperture");
  const outputIds = ["colDiameter", "colDivergence", "colRayleigh", "colLensFill"];
  setCollimationMethod(method);

  let diameter;
  let divergenceMrad;
  let wavelengthNm;
  let focalMm;

  if (clearAperture <= 0) {
    outputIds.forEach((id) => setText(id, null));
    return;
  }

  if (method === "na") {
    wavelengthNm = numberValue("colWavelengthNa");
    const na = numberValue("colNaInput");
    const coreUm = numberValue("colCore");
    const fMm = numberValue("colFocalNa");
    if (wavelengthNm <= 0 || na <= 0 || coreUm <= 0 || fMm <= 0) {
      outputIds.forEach((id) => setText(id, null));
      return;
    }

    focalMm = fMm;
    diameter = 2 * fMm * na;
    divergenceMrad = coreUm / fMm;
  } else {
    wavelengthNm = numberValue("colWavelength");
    const wavelengthUm = wavelengthNm / 1000;
    const mfdUm = numberValue("colMfd");
    const fMm = numberValue("colFocalMfd");
    if (wavelengthNm <= 0 || wavelengthUm <= 0 || mfdUm <= 0 || fMm <= 0) {
      outputIds.forEach((id) => setText(id, null));
      return;
    }

    focalMm = fMm;
    diameter = (4 * wavelengthUm * fMm) / (Math.PI * mfdUm);
    divergenceMrad = mfdUm / fMm;
  }

  const wavelengthMm = wavelengthNm * 1e-6;
  const collimatedRadiusMm = diameter / 2;
  const rayleighLengthM = (Math.PI * collimatedRadiusMm * collimatedRadiusMm) / wavelengthMm / 1000;
  const analysis = fNumberAnalysis(focalMm, diameter, clearAperture);

  setText("colDiameter", fmt(diameter, 4), " mm");
  setText("colDivergence", fmt(divergenceMrad, 4), " mrad");
  setText("colRayleigh", fmt(rayleighLengthM, 4), " m");
  setText("colLensFill", analysis ? fmt(analysis.fill, 5) : null, analysis ? " %" : "");
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


const DEFAULT_LENS_APERTURE_MM = 25.4;

function fNumberAnalysis(focalMm, beamDiameterMm, clearApertureMm = DEFAULT_LENS_APERTURE_MM) {
  if (focalMm <= 0 || beamDiameterMm <= 0 || clearApertureMm <= 0) return null;

  const effectiveDiameter = Math.min(beamDiameterMm, clearApertureMm);
  const fNumber = focalMm / beamDiameterMm;
  const effectiveFNumber = focalMm / effectiveDiameter;
  const halfAngleRad = Math.atan(effectiveDiameter / (2 * focalMm));
  return {
    fNumber,
    effectiveFNumber,
    halfAngleDeg: radToDeg(halfAngleRad),
    airNa: Math.sin(halfAngleRad),
    fill: (beamDiameterMm / clearApertureMm) * 100,
  };
}

function fNumberWarning(analysis) {
  if (!analysis) return "--";

  const warnings = [];
  if (analysis.fill >= 100) {
    warnings.push("Beam clips the clear aperture.");
  } else if (analysis.fill >= 85) {
    warnings.push("Beam is close to the clear aperture.");
  }

  if (analysis.effectiveFNumber < 4) {
    warnings.push("If using a plano-convex lens: strong spherical aberration risk.");
  } else if (analysis.effectiveFNumber < 8) {
    warnings.push("If using a plano-convex lens: check spherical aberration.");
  } else {
    warnings.push("If using a plano-convex lens, spherical aberration is usually mild when beam fill is modest.");
  }

  return warnings.join(" ");
}

function telescopeLensWarning(l1Analysis, l2Analysis) {
  if (!l1Analysis || !l2Analysis) return "--";

  const maxFill = Math.max(l1Analysis.fill, l2Analysis.fill);
  const minFNumber = Math.min(l1Analysis.effectiveFNumber, l2Analysis.effectiveFNumber);
  const warnings = [];

  if (maxFill >= 100) {
    warnings.push("Beam overfills the 1 inch lens aperture.");
  } else if (maxFill >= 85) {
    warnings.push("Beam is close to the 1 inch clear aperture.");
  }

  if (minFNumber < 4) {
    warnings.push("Low f/#: simple singlet lenses can show strong spherical aberration.");
  } else if (minFNumber < 8) {
    warnings.push("Moderate f/#: check spherical aberration if using simple singlets.");
  } else if (warnings.length === 0) {
    warnings.push("Aperture fill and f/# look gentle for this telescope.");
  }

  return warnings.join(" ");
}

function updateFNumber() {
  const focal = numberValue("fnFocal");
  const beamDiameter = numberValue("fnBeamDiameter");
  const clearAperture = numberValue("fnClearAperture");
  const ids = ["fnNumber", "fnEffective", "fnHalfAngle", "fnFill", "fnWarning"];
  const analysis = fNumberAnalysis(focal, beamDiameter, clearAperture);

  if (!analysis) {
    ids.forEach((id) => setText(id, null));
    return;
  }

  setText("fnNumber", fmt(analysis.fNumber, 5));
  setText("fnEffective", fmt(analysis.effectiveFNumber, 5));
  setText("fnHalfAngle", fmt(analysis.halfAngleDeg, 5), " deg");
  setText("fnFill", fmt(analysis.fill, 5), " %");
  setText("fnWarning", fNumberWarning(analysis));
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
  const outputIds = ["telMag", "telDout", "telLength", "telRayleigh", "telFNumberL1", "telFNumberL2", "telLensFill", "telLensWarning"];
  if (din <= 0 || f1 <= 0 || f2 <= 0 || wavelengthM <= 0 || m2 <= 0) {
    outputIds.forEach((id) => setText(id, null));
    return;
  }

  const mag = f2 / f1;
  const idealLength = idealTelescopeSpacing(type, f1, f2);
  const spacing = configureTelescopeSpacingSlider(type, f1, f2, idealLength);
  const outputDiameterMm = din * mag;
  const outputRadiusM = (outputDiameterMm * 1e-3) / 2;
  const outputRayleighM = (Math.PI * outputRadiusM * outputRadiusM) / (m2 * wavelengthM);
  const l1Analysis = fNumberAnalysis(f1, din, DEFAULT_LENS_APERTURE_MM);
  const l2Analysis = fNumberAnalysis(f2, outputDiameterMm, DEFAULT_LENS_APERTURE_MM);

  setText("telMag", fmt(mag, 4), " x");
  setText("telDout", fmt(outputDiameterMm, 4), " mm");
  setText("telLength", idealLength > 0 ? fmt(idealLength, 4) : "check focal lengths", idealLength > 0 ? " mm" : "");
  setText("telRayleigh", formatLengthAuto(outputRayleighM));
  setText("telFNumberL1", l1Analysis ? fmt(l1Analysis.effectiveFNumber, 5) : null);
  setText("telFNumberL2", l2Analysis ? fmt(l2Analysis.effectiveFNumber, 5) : null);
  setText(
    "telLensFill",
    l1Analysis && l2Analysis ? `L1: ${fmt(l1Analysis.fill, 4)}%, L2: ${fmt(l2Analysis.fill, 4)}%` : null,
  );
  setText("telLensWarning", telescopeLensWarning(l1Analysis, l2Analysis));
  if (idealLength > 0 && Number.isFinite(spacing)) {
    updateTelescopeSvg(type, din, f1, f2, mag, idealLength, spacing);
  }
}

function updateFocus() {
  const beamDiameter = numberValue("focBeamDiameter");
  const m2 = numberValue("focM2");
  const wavelengthNm = numberValue("focWavelength");
  const fMm = numberValue("focFocal");
  const clearAperture = numberValue("focClearAperture");
  const outputIds = ["focSpotSize", "focLensFill"];

  if (beamDiameter <= 0 || m2 <= 0 || wavelengthNm <= 0 || fMm <= 0 || clearAperture <= 0) {
    outputIds.forEach((id) => setText(id, null));
    return;
  }

  const wavelengthUm = wavelengthNm / 1000;
  const spotSizeUm = (1.27 * m2 * wavelengthUm * fMm) / beamDiameter;
  const analysis = fNumberAnalysis(fMm, beamDiameter, clearAperture);

  setText("focSpotSize", fmt(spotSizeUm, 4), " um");
  setText("focLensFill", analysis ? fmt(analysis.fill, 5) : null, analysis ? " %" : "");
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




function syncGratingPair(sliderId, numberId, sourceId) {
  const slider = document.querySelector(`#${sliderId}`);
  const number = document.querySelector(`#${numberId}`);
  if (!slider || !number) return;
  if (sourceId === sliderId) number.value = slider.value;
  if (sourceId === numberId) slider.value = number.value;
}

function updateGratingSvg(thetaIDeg, thetaMDeg, order, evanescent) {
  const origin = { x: 130, y: 200 };
  const origin2 = { x: 130, y: 250 };
  const lineLength = 400;

  const setLine = (id, x1, y1, x2, y2) => setSvgAttr(id, { x1, y1, x2, y2 });
  const thetaIRad = degToRad(thetaIDeg);
  const dxI = Math.cos(thetaIRad) * lineLength;
  const dyI = -Math.sin(thetaIRad) * lineLength;

  setLine("graRayIn1", origin.x + dxI, origin.y + dyI, origin.x, origin.y);
  setLine("graRayIn2", origin2.x + dxI, origin2.y + dyI, origin2.x, origin2.y);

  const arcRadius = 100;
  const arcX = origin.x + arcRadius * Math.cos(thetaIRad);
  const arcY = origin.y - arcRadius * Math.sin(thetaIRad);
  setSvgAttr("graArcThetaI", { d: `M ${origin.x + arcRadius} ${origin.y} A ${arcRadius} ${arcRadius} 0 0 0 ${arcX} ${arcY}` });

  const labelRadius = 140;
  const labelX = origin.x + labelRadius * Math.cos(degToRad(thetaIDeg / 2));
  const labelY = origin.y - labelRadius * Math.sin(degToRad(thetaIDeg / 2));
  setSvgAttr("graThetaIBox", { x: labelX - 36, y: labelY - 15 });
  setSvgAttr("graLabelThetaI", { x: labelX, y: labelY + 4 });
  setSvgText("graLabelThetaI", `θi = ${fmt(thetaIDeg, 4)}°`);

  const dx0 = Math.cos(thetaIRad) * lineLength;
  const dy0 = Math.sin(thetaIRad) * lineLength;
  setLine("graRayM01", origin.x, origin.y, origin.x + dx0, origin.y + dy0);
  setLine("graRayM02", origin2.x, origin2.y, origin2.x + dx0, origin2.y + dy0);

  setSvgText("graLegendDiffractedText", `Diffracted (m=${fmt(order, 3)})`);
  const warning = document.querySelector("#graEvanescentNotice");
  if (warning) warning.style.display = evanescent ? "block" : "none";
  ["graRayDiff1", "graRayDiff2"].forEach((id) => setSvgVisible(id, !evanescent));
  if (evanescent) return;

  const thetaMRad = degToRad(thetaMDeg);
  const dxM = Math.cos(thetaMRad) * lineLength;
  const dyM = -Math.sin(thetaMRad) * lineLength;
  setLine("graRayDiff1", origin.x, origin.y, origin.x + dxM, origin.y + dyM);
  setLine("graRayDiff2", origin2.x, origin2.y, origin2.x + dxM, origin2.y + dyM);
}

function updateGrating() {
  const density = numberValue("graNumG");
  const wavelengthNm = numberValue("graNumLambda");
  const order = Math.max(1, Math.round(numberValue("graNumOrder")));
  const thetaIDeg = numberValue("graNumThetaI");

  syncGratingPair("graSlideG", "graNumG");
  syncGratingPair("graSlideLambda", "graNumLambda");
  syncGratingPair("graSlideThetaI", "graNumThetaI");

  if (density <= 0 || wavelengthNm <= 0 || order <= 0 || !Number.isFinite(thetaIDeg)) {
    setText("graOutA", null);
    setText("graOutThetaM", null);
    setText("graOutLittrow", null);
    setText("graOutDispersion", null);
    updateGratingSvg(0, 0, order || 1, true);
    return;
  }

  const grooveSpacingNm = 1e6 / density;
  const sinThetaI = Math.sin(degToRad(thetaIDeg));
  const sinThetaM = (order * wavelengthNm) / grooveSpacingNm - sinThetaI;
  const sinLittrow = (order * wavelengthNm) / (2 * grooveSpacingNm);
  const evanescent = Math.abs(sinThetaM) > 1;

  setText("graOutA", fmt(grooveSpacingNm, 5));

  if (evanescent) {
    setText("graOutThetaM", "Evanescent");
    setText("graOutDispersion", "0.00");
    updateGratingSvg(thetaIDeg, 0, order, true);
  } else {
    const thetaM = Math.asin(sinThetaM);
    const thetaMDeg = radToDeg(thetaM);
    const dispersion = (order / (grooveSpacingNm * Math.cos(thetaM))) * 1000;
    setText("graOutThetaM", fmt(thetaMDeg, 5), "°");
    setText("graOutDispersion", fmt(dispersion, 4));
    updateGratingSvg(thetaIDeg, thetaMDeg, order, false);
  }

  if (Math.abs(sinLittrow) > 1) {
    setText("graOutLittrow", "N/A");
  } else {
    setText("graOutLittrow", fmt(radToDeg(Math.asin(sinLittrow)), 5), "°");
  }
}


function amplifierEffectiveLengthRatio(pumpGeometry, gainDb) {
  const gainLinear = 10 ** (gainDb / 10);
  if (pumpGeometry === "co") {
    const roughCoTrend = 0.91 - 0.004 * gainDb;
    return Math.min(0.95, Math.max(0.75, roughCoTrend));
  }
  return (1 - 1 / gainLinear) / Math.log(gainLinear);
}

function gainRecoveryMedium() {
  const key = document.querySelector("#grMedium")?.value || "yb_fiber";
  return GAIN_RECOVERY_MEDIA[key] ? key : "yb_fiber";
}

function renderGainRecoveryPresets(preferredValue = null) {
  const presetSelect = document.querySelector("#grPumpPreset");
  const medium = GAIN_RECOVERY_MEDIA[gainRecoveryMedium()];
  if (!presetSelect || !medium) return;

  const options = [...medium.presets];
  presetSelect.innerHTML = "";
  options.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.value;
    option.textContent = preset.label;
    presetSelect.append(option);
  });

  const selected = options.some((preset) => preset.value === preferredValue)
    ? preferredValue
    : medium.defaultPresetValue || medium.presets[0]?.value;
  if (selected) presetSelect.value = selected;
}

function renderGainRecoveryAreaPresets(preferredValue = null) {
  const areaSelect = document.querySelector("#grAreaPreset");
  const medium = GAIN_RECOVERY_MEDIA[gainRecoveryMedium()];
  if (!areaSelect || !medium) return;

  const options = [...medium.areaPresets];
  areaSelect.innerHTML = "";
  options.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.value;
    option.textContent = preset.label;
    areaSelect.append(option);
  });

  const selected = options.some((preset) => preset.value === preferredValue)
    ? preferredValue
    : medium.defaultAreaValue || medium.areaPresets[0]?.value;
  if (selected) areaSelect.value = selected;
}

function currentGainRecoveryPreset() {
  const presetKey = document.querySelector("#grPumpPreset")?.value || "";
  const medium = GAIN_RECOVERY_MEDIA[gainRecoveryMedium()];
  return medium?.presets.find((preset) => preset.value === presetKey) || null;
}

function currentGainRecoveryAreaPreset() {
  const presetKey = document.querySelector("#grAreaPreset")?.value || "";
  const medium = GAIN_RECOVERY_MEDIA[gainRecoveryMedium()];
  return medium?.areaPresets.find((preset) => preset.value === presetKey) || null;
}

function applyGainRecoveryMedium() {
  const medium = GAIN_RECOVERY_MEDIA[gainRecoveryMedium()];
  if (!medium) return;
  renderGainRecoveryPresets();
  renderGainRecoveryAreaPresets();
  const lifetimeInput = document.querySelector("#grLifetime");
  if (lifetimeInput) lifetimeInput.value = medium.lifetimeMs;
  setGainRecoveryPreset();
  setGainRecoveryAreaPreset();
}

function setGainRecoveryPreset() {
  const preset = currentGainRecoveryPreset();
  if (!preset) return;
  const wavelengthInput = document.querySelector("#grPumpWavelength");
  const sigmaAbsInput = document.querySelector("#grSigmaAbs");
  const sigmaEmInput = document.querySelector("#grSigmaEm");
  if (wavelengthInput) wavelengthInput.value = preset.wavelengthNm;
  if (sigmaAbsInput) sigmaAbsInput.value = preset.sigmaAbsE25;
  if (sigmaEmInput) sigmaEmInput.value = preset.sigmaEmE25;
}

function setGainRecoveryAreaPreset() {
  const preset = currentGainRecoveryAreaPreset();
  if (!preset) return;
  const diameterInput = document.querySelector("#grCladdingDiameter");
  if (diameterInput) diameterInput.value = preset.diameterUm;
}

function updateGainRecovery() {
  const pumpPowerW = numberValue("grPumpPower");
  const wavelengthNm = numberValue("grPumpWavelength");
  const sigmaSumM2 = (numberValue("grSigmaAbs") + numberValue("grSigmaEm")) * 1e-25;
  const claddingDiameterM = numberValue("grCladdingDiameter") * 1e-6;
  const lifetimeS = numberValue("grLifetime") * 1e-3;

  if (
    pumpPowerW < 0 ||
    wavelengthNm <= 0 ||
    sigmaSumM2 <= 0 ||
    claddingDiameterM <= 0 ||
    lifetimeS <= 0
  ) {
    setText("grTauEff", null);
    return;
  }

  const claddingAreaM2 = (Math.PI * claddingDiameterM * claddingDiameterM) / 4;
  const photonEnergyJ = (PLANCK_CONSTANT * SPEED_OF_LIGHT) / (wavelengthNm * 1e-9);
  const pumpIntensity = pumpPowerW / claddingAreaM2;
  const denominator = pumpIntensity * sigmaSumM2 + photonEnergyJ / lifetimeS;
  const recoveryS = photonEnergyJ / denominator;

  setText("grTauEff", formatTimeAuto(recoveryS));
}

function updateAmplength() {
  const pumpGeometry = document.querySelector("#ampPumpGeometry")?.value || "counter";
  const energyJ = energyToJ(numberValue("ampEnergy"), document.querySelector("#ampEnergyUnit")?.value || "uj");
  const durationS = timeToSeconds(numberValue("ampPulseDuration"), document.querySelector("#ampDurationUnit")?.value || "ns");
  const wavelengthNm = numberValue("ampWavelength");
  const gainDb = numberValue("ampGainDb");
  const lengthM = numberValue("ampLength");
  const mfdUm = numberValue("ampMfd");
  const n2 = numberValue("ampN2") * 1e-20;
  const targetB = numberValue("ampTargetB") * Math.PI;
  const resultIds = [
    "ampBIntegral",
    "ampBOverPi",
    "ampPeakPower",
    "ampLeff",
    "ampRatio",
    "ampAeffResult",
    "ampTargetEnergy",
  ];

  if (
    energyJ <= 0 ||
    durationS <= 0 ||
    wavelengthNm <= 0 ||
    gainDb <= 0 ||
    lengthM <= 0 ||
    mfdUm <= 0 ||
    n2 <= 0 ||
    targetB <= 0
  ) {
    resultIds.forEach((id) => setText(id, null));
    return;
  }

  const leffRatio = amplifierEffectiveLengthRatio(pumpGeometry, gainDb);
  const leffM = lengthM * leffRatio;
  const aeffUm2 = Math.PI * (mfdUm / 2) ** 2;
  const aeffM2 = aeffUm2 * 1e-12;
  const k0 = (2 * Math.PI) / (wavelengthNm * 1e-9);
  const peakPowerW = energyJ / durationS;
  const bIntegral = (k0 * n2 * peakPowerW * leffM) / aeffM2;
  const targetEnergyJ = (targetB * aeffM2 * durationS) / (k0 * n2 * leffM);

  setText("ampBIntegral", fmt(bIntegral, 5), " rad");
  setText("ampBOverPi", fmt(bIntegral / Math.PI, 5), " π");
  setText("ampPeakPower", formatPowerAuto(peakPowerW));
  setText("ampLeff", fmt(leffM, 5), " m");
  setText("ampRatio", fmt(leffRatio, 5));
  setText("ampAeffResult", fmt(aeffUm2, 5), " um^2");
  setText("ampTargetEnergy", formatEnergyAuto(targetEnergyJ));
}

function updateCalculators() {
  updatePer();
  updateCollimation();
  updateFeedback();
  updateAmplength();
  updateGainRecovery();
  updateFNumber();
  updateEnergyPower();
  updatePulseBandwidth();
  updateCavity();
  updateTelescope();
  updateRayleigh();
  updateEndcap();
  updateFocus();
  updateDetector();
  updateGrating();
}

function bindEvents() {
  document.querySelectorAll(".calc-tab").forEach((button) => {
    button.addEventListener("click", () => switchCalculator(button.dataset.calculator));
  });

  document.querySelector("#backToHome")?.addEventListener("click", showHome);

  document.querySelectorAll(".beam-mode-tab").forEach((button) => {
    button.addEventListener("click", () => switchCalculator(button.dataset.calculatorTarget));
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

  [
    ["graSlideG", "graNumG"],
    ["graSlideLambda", "graNumLambda"],
    ["graSlideThetaI", "graNumThetaI"],
  ].forEach(([sliderId, numberId]) => {
    const slider = document.querySelector(`#${sliderId}`);
    const number = document.querySelector(`#${numberId}`);
    slider?.addEventListener("input", () => {
      syncGratingPair(sliderId, numberId, sliderId);
      updateGrating();
    });
    number?.addEventListener("input", () => {
      syncGratingPair(sliderId, numberId, numberId);
      updateGrating();
    });
  });

  document.querySelector("#graNumOrder")?.addEventListener("input", updateGrating);

  document.querySelector("#grMedium")?.addEventListener("change", () => {
    applyGainRecoveryMedium();
    updateCalculators();
  });

  document.querySelector("#grPumpPreset")?.addEventListener("change", () => {
    setGainRecoveryPreset();
    updateCalculators();
  });

  document.querySelector("#grAreaPreset")?.addEventListener("change", () => {
    setGainRecoveryAreaPreset();
    updateCalculators();
  });

  document.querySelectorAll(".calc-input").forEach((input) => {
    input.addEventListener("input", updateCalculators);
    input.addEventListener("change", updateCalculators);
  });
}

bindEvents();
applyGainRecoveryMedium();
showHome();
updateCalculators();
