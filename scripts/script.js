window.addEventListener("resize", () => {
  document.body.classList.toggle(
    "keyboard-open",
    window.innerHeight < 500
  );
});

const debounce = (fn, delay = 10) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

const form = $("#stdInfo");
const rollInput = $("#rollNo");
const regInput = $("#regNo");
const semesterInput = $("#semester");
const subjectCodeInput = $("#subjectCode");
const paperCodeInput = $("#paper");
const stdName = $("#name");
const topic = $("#topic");
const themeBox = $("#themeBox");
let STD_INFO = {},
  selectedSem;



function initDropdown(wrapper) {
  const display = wrapper.querySelector(".dropdown-display");
  const valueText = wrapper.querySelector(".dropdown-value");
  const list = wrapper.querySelector(".dropdown-list");
  const hidden = wrapper.querySelector("input[type=hidden]");
  
  if (!display || !list || !hidden) return;
  
  // open / close
  display.addEventListener("click", e => {
    e.stopPropagation();
    
    document.querySelectorAll(".dropdown.open")
      .forEach(d => d !== wrapper && d.classList.remove("open"));
    
    wrapper.classList.toggle("open");
  });
  
  // select
  list.addEventListener("click", e => {
    const li = e.target.closest("li");
    if (!li || li.classList.contains("disabled")) return;
    setDropdownValue(wrapper, li.dataset.value);
    wrapper.classList.remove("open");
    
    hidden.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function initPaperToggle(toggle) {
  const input = document.getElementById("paperType");
  const tu = toggle.querySelector(".option.tu");
  const pr = toggle.querySelector(".option.p");
  
  toggle.addEventListener("click", () => {
    const isPR = toggle.classList.toggle("pr");
    
    tu.classList.toggle("active", !isPR);
    pr.classList.toggle("active", isPR);
    
    input.value = isPR ? "PR" : "TU";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function setPaperToggleValue(val) {
  const toggle = document.getElementById("paperToggle");
  const input = document.getElementById("paperType");
  if (!toggle || !input) return;
  
  const isPR = val === "PR";
  
  toggle.classList.toggle("pr", isPR);
  toggle.querySelector(".option.tu")?.classList.toggle("active", !isPR);
  toggle.querySelector(".option.p")?.classList.toggle("active", isPR);
  
  input.value = val;
}

initPaperToggle(document.getElementById("paperToggle"));
document.querySelectorAll(".dropdown").forEach(initDropdown);

document.addEventListener("click", () =>
  document.querySelectorAll(".dropdown.open")
  .forEach(d => d.classList.remove("open"))
);

// reset....
form.addEventListener("reset", () => {
  
  // dropdown reset
  $$(".dropdown").forEach(dropdown => {
    const wrapper = dropdown.closest(".placeholder-wrapper");
    resetDropdown(wrapper);
  });
  
  // normal inputs reset
  $$("input:not([type=hidden])", form).forEach(input => {
    const field = input.closest(".placeholder-wrapper");
    field?.classList.remove("is-valid", "is-invalid", "is-typing");
  });
  stdName.removeAttribute("required");
  disableFields(true);
});


function validateRequired(wrapper) {
  const input = wrapper.querySelector("input[required]");
  if (!input) return true;
  
  const ok = (Boolean(input.value) && wrapper.classList.contains("is-valid"));
  
  if (!ok) {
    wrapper.classList.remove("is-valid", "is-typing");
    wrapper.classList.add("is-invalid");
  }
  
  return ok;
}

function hydrateForm(data) {
  Object.entries(data).forEach(([key, value]) => {
    const input = document.querySelector(`[name="${key}"]`);
    if (input) {
      input.value = value;
      setValidationState(input, true, null);
    }
  });
  
  if (data.semester)
    setDropdownValue(semesterBox, data.semester);
  if (data.paper)
    setDropdownValue(paperBox, data.paper);
  if (data.theme)
    setDropdownValue(themeBox, data.theme);
  if (data.paperType)
    setPaperToggleValue(data.paperType);
}

const getFormData = e => {
  e.preventDefault();
  const form = e.target.closest("form");
  if (!form) return null;
  
  const data = [...new FormData(form)].reduce((o, [k, v]) => {
    o[k] = k in o ? [].concat(o[k], v) : v;
    return o;
  }, {});
  
  const y = new Date().getFullYear();
  data.session = `${y - 1}-${y}`;
  
  const { subject_code, roll_number } = data;
  
  if (subject_code && APP_DATA?.codeToSubject)
    data.subject = APP_DATA.codeToSubject[subject_code] || "";
  
  const [, mid] = roll_number.split("-");
  data.dept = roll_number[2];
  data.is4 = ["11", "21"].includes(mid);
  
  return data;
};

async function safeRedirect(theme) {
  const url = `./themes/${theme}/index.html`;
  
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) throw new Error("Page not found");
    
    window.location.href = url;
  } catch {
    alert("Selected theme is not available.");
  }
}

/* submit guard */
form.addEventListener("submit", e => {
  e.preventDefault();
  
  let ok = true;
  const submitBtn = form.querySelector('button[type="submit"]');
  const resetBtn = form.querySelector('button[type="submit"]');
  
  // validation
  form.querySelectorAll(".placeholder-wrapper").forEach(w => {
    if (!validateRequired(w)) ok = false;
  });
  
  if (!ok) {
    form.querySelector(".is-invalid")
      ?.querySelector(".dropdown-display, input")
      ?.focus();
    return;
  }
  
  // show processing state
  submitBtn.classList.add("is-processing");
  submitBtn.disabled = true;
  resetBtn.disabled = true;
  
  // let browser paint "Generating..." first
  requestAnimationFrame(() => {
    setTimeout(() => {
      // collect & save
      const STD_INFO = getFormData(e);
      sessionStorage.setItem("STD_INFO", JSON.stringify(STD_INFO));
      safeRedirect(STD_INFO.theme);
    }, 3000); // ⏳ 3 sec delay
  });
});

/* click outside → close all */
document.addEventListener("click", () => {
  document.querySelectorAll(".dropdown.open")
    .forEach(d => d.classList.remove("open"));
});

window.addEventListener("pageshow", () => {
  const btn = document.querySelector('button[type="submit"]');
  const rbtn = document.querySelector('button[type="reset"]');
  if (btn) {
    btn.classList.remove("is-processing");
    btn.disabled = false;
    rbtn.disabled = false;
  }
  bindValidation(subjectCodeInput, validatePaper);
});

const isValidRollStructure = r => r.length === 12;
const isValidRegStructure = r => r.length === 13;

function disableFields(bool) {
  $$('.disable').forEach(el => el.classList.toggle('is-disabled', bool));
  form.querySelectorAll("input").forEach(el => {
    if (!['regNo', 'rollNo'].includes(el.id)) {
      el.disabled = bool;
    }
  });
}

const setValidationState = (input, isValid, size = null) => {
  const field = input.closest(".placeholder-wrapper");
  if (!field) return;
  
  const value = input.value ?? "";
  const len = value.replace(/[^a-zA-Z0-9]/g, "").length;
  
  field.classList.remove("is-valid", "is-invalid", "is-typing");
  
  /* 🔴 SPECIAL: semester dropdown (hidden input) */
  if (input === semesterInput) {
    field.classList.add(isValid ? "is-valid" : "is-invalid");
    return;
  }
  
  /* 🔵 other hidden / dropdown inputs */
  if (input.type === "hidden") {
    if (value) field.classList.add("is-valid");
    return;
  }
  
  // empty → no state
  if (!len) return;
  
  // size not enforced
  if (size === null) {
    field.classList.add(isValid ? "is-valid" : "is-invalid");
    return;
  }
  
  // typing / final
  field.classList.add(
    len < size ? "is-typing" : (isValid ? "is-valid" : "is-invalid")
  );
};


function buildCodeToSubjectMap(subjectMap) {
  return Object.fromEntries(
    Object.entries(subjectMap)
    .flatMap(([subject, codes]) =>
      codes.map(code => [code, subject])
    )
  );
}

async function initData() {
  const [colleges, subjects] = await Promise.all([
    fetch("./data/colleges.json").then(r => r.json()),
    fetch("./data/subjects.json").then(r => r.json())
  ]);
  
  return {
    colleges,
    collegeCodes: new Set(Object.keys(colleges)),
    codeToSubject: buildCodeToSubjectMap(subjects)
  };
}

function getStudentContext(rollInput, regInput) {
  const rollRaw = onlyDigits(rollInput.value);
  const regRaw = onlyDigits(regInput.value);
  if (!isValidRollStructure(rollRaw) || !isValidRegStructure(regRaw)) {
    return null;
  }
  
  const dept = Number(rollRaw[2]);
  const yearType = rollRaw.slice(6, 8);
  
  return {
    rollRaw,
    regRaw,
    dept,
    isH: Boolean(['11', '21'].includes(yearType)),
    isG: Boolean(['12', '22'].includes(yearType)),
    rollCollegeCode: rollRaw.slice(3, 6),
    regCollegeCode: regRaw.slice(0, 3),
    rollYear: rollRaw.slice(0, 2),
    regYear: regRaw.slice(-2)
  };
}

function formatRollInput(input) {
  let d = onlyDigits(input.value);
  if (d.length > 12) d = d.slice(0, 12);
  
  input.value =
    d.length >= 8 ?
    `${d.slice(0,6)}-${d.slice(6,8)}-${d.slice(8)}` :
    d;
}

function formatRegInput(input) {
  let d = onlyDigits(input.value);
  if (d.length > 13) d = d.slice(0, 13);
  
  input.value =
    d.length >= 11 ?
    `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7,11)}-${d.slice(11)}` :
    d;
}

// ---------- HELPERS ----------
const onlyDigits = s => s.replace(/\D/g, '');

const formatWith = (raw, parts) => {
  let out = [];
  let i = 0;
  for (const len of parts) {
    if (raw.length > i) out.push(raw.slice(i, i + len));
    i += len;
  }
  return out.join("-");
};

// ---------- INPUT GUARDS ----------
function guardInput(input, maxLen, validator) {
  input.addEventListener("beforeinput", e => {
    if (e.inputType.startsWith("delete")) return;
    
    const next = onlyDigits(input.value + (e.data || "")).slice(0, maxLen);
    if (!validator(next)) e.preventDefault();
  });
}

// ================= RULES =================
const ROLL_AND_REG_RULES = {
  collegePrefix(partial, collegeCodes) {
    return [...collegeCodes].some(code => code.startsWith(partial));
  },
  
  reg: {
    max: 13,
    parts: [3, 4, 4, 2],
    
    guard(next, collegeCodes) {
      if (next.length <= 3)
        return ROLL_AND_REG_RULES.collegePrefix(next, collegeCodes);
      
      if (next.length === 13)
        return /^\d{2}$/.test(next.slice(-2));
      
      return true;
    },
    
    validate(raw, collegeCodes) {
      return (
        raw.length === 13 &&
        collegeCodes.has(raw.slice(0, 3)) &&
        /^\d{2}$/.test(raw.slice(-2))
      );
    }
  },
  
  roll: {
    max: 12,
    parts: [6, 2, 4],
    
    guard(next, collegeCodes) {
      // Dept (3rd digit)
      if (next.length >= 3 && !['1', '2', '3'].includes(next[2])) return false;
      
      // College code prefix (digits 4–6)
      if (next.length >= 4 && next.length <= 6)
        return ROLL_AND_REG_RULES.collegePrefix(next.slice(3), collegeCodes);
      
      // Year type (digits 7–8)
      if (next.length >= 7 && next.length <= 8) {
        const p = next.slice(6);
        if (!['1', '2'].includes(p[0])) return false;
        if (p.length === 2 && !['11', '12', '21', '22'].includes(p)) return false;
      }
      
      // Serial (last 4 digits)
      if (next.length === 12) {
        const s = +next.slice(8);
        return s >= 1 && s <= 9999;
      }
      
      return true;
    },
    
    validate(raw, collegeCodes) {
      return (
        raw.length === 12 &&
        /^\d{2}$/.test(raw.slice(0, 2)) && ['1', '2', '3'].includes(raw[2]) &&
        collegeCodes.has(raw.slice(3, 6)) && ['11', '12', '21', '22'].includes(raw.slice(6, 8)) &&
        +raw.slice(8) >= 1 &&
        +raw.slice(8) <= 9999
      );
    }
  }
};

// ================= GUARD ENGINE =================
function attachGuard(input, rule, collegeCodes) {
  input.addEventListener("beforeinput", e => {
    if (e.inputType.startsWith("delete")) return;
    
    const { selectionStart, selectionEnd } = input;
    const value = input.value;
    
    const nextValue =
      value.slice(0, selectionStart) +
      (e.data || "") +
      value.slice(selectionEnd);
    
    const next = onlyDigits(nextValue).slice(0, rule.max);
    
    if (!rule.guard(next, collegeCodes)) {
      e.preventDefault();
    }
  });
}

function withCaret(input, fn) {
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const beforeLen = input.value.length;
  
  fn(); // formatter runs here (value changes)
  
  const afterLen = input.value.length;
  const delta = afterLen - beforeLen;
  
  const newPos = Math.max(0, start + delta);
  input.setSelectionRange(newPos, newPos);
}

// ================= MAIN VALIDATION =================
function validateInputs(ctx, collegeCodes, rollInput, regInput) {
  
  // attach guards once (safe even if called multiple times)
  attachGuard(regInput, ROLL_AND_REG_RULES.reg, collegeCodes);
  attachGuard(rollInput, ROLL_AND_REG_RULES.roll, collegeCodes);
  
  // normalize
  const r = onlyDigits(regInput.value).slice(0, ROLL_AND_REG_RULES.reg.max);
  const rl = onlyDigits(rollInput.value).slice(0, ROLL_AND_REG_RULES.roll.max);
  
  const regValid = ROLL_AND_REG_RULES.reg.validate(r, collegeCodes);
  const rollValid = ROLL_AND_REG_RULES.roll.validate(rl, collegeCodes);
  
  regInput.value = formatWith(r, ROLL_AND_REG_RULES.reg.parts);
  rollInput.value = formatWith(rl, ROLL_AND_REG_RULES.roll.parts);
  
  setValidationState(regInput, regValid, ROLL_AND_REG_RULES.reg.max);
  setValidationState(rollInput, rollValid, ROLL_AND_REG_RULES.roll.max);
  
  let ok = regValid && rollValid;
  
  // cross-check reg vs roll
  if (ok) {
    ok =
      r.slice(0, 3) === rl.slice(3, 6) &&
      r.slice(-2) === rl.slice(0, 2);
    
    setValidationState(regInput, ok, ROLL_AND_REG_RULES.reg.max);
    setValidationState(rollInput, ok, ROLL_AND_REG_RULES.roll.max);
  }
  
  disableFields(!ok);
  
  return ok;
}

function setDropdownValue(wrapper, value) {
  if (!value) {
    resetDropdown(wrapper);
    return;
  }
  
  const valueText = wrapper.querySelector(".dropdown-value");
  const hidden = wrapper.querySelector("input[type=hidden]");
  const items = wrapper.querySelectorAll(".dropdown-list li");
  
  valueText.textContent = value;
  hidden.value = value;
  
  wrapper.classList.add("has-value");
  wrapper.classList.remove("is-invalid", "is-typing");
  wrapper.classList.add("is-valid");
  
  items.forEach(li =>
    li.classList.toggle("selected", li.dataset.value === value)
  );
}

function getAdmissionYY(rollInput, regInput) {
  const roll = rollInput?.value?.replace(/\D/g, "");
  if (roll?.length >= 2) return +roll.slice(0, 2);
  
  const reg = regInput?.value?.replace(/\D/g, "");
  if (reg?.length >= 2) return +reg.slice(-2);
  
  return null;
}

function getMaxSemester({ admissionYY, isH }) {
  if (admissionYY == null) return 0;
  
  const currentYY = new Date().getFullYear() % 100;
  const diff = currentYY - admissionYY;
  if (diff < 0) return 0;
  
  const parity = currentParity(); // "ODD" | "EVEN"
  
  // base semester (odd)
  let max = diff * 2 + 1;
  
  // even window হলে এক ধাপ এগোবে
  if (parity === "EVEN") {
    max += 1;
  }
  
  // course limit
  return Math.min(isH ? 8 : 6, max);
}

const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

const semIndex = sem => SEMESTERS.indexOf(sem) + 1; // I → 1
const isOdd = sem => semIndex(sem) % 2 === 1;

function currentParity() {
  const m = new Date().getMonth() + 1; // 1–12
  return (m >= 8 || m <= 1) ? "ODD" : "EVEN";
}

function pickSemester(sems) {
  if (!sems.length) return null;
  /*if (semesterInput.value) {
    semesterInput.value;

    return;
  }*/
  const parity = currentParity();
  
  // highest semester ≤ maxSem with correct parity
  for (let i = sems.length - 1; i >= 0; i--) {
    const sem = sems[i];
    if (
      (parity === "ODD" && isOdd(sem)) ||
      (parity === "EVEN" && !isOdd(sem))
    ) {
      return sem;
    }
  }
  
  // fallback (edge case)
  return sems.at(-1);
}

function filterByMonth(sems) {
  const m = new Date().getMonth() + 1; // 1–12
  const oddWindow = m >= 8 || m <= 1; // Aug–Jan
  
  return sems.filter(sem =>
    oddWindow ? isOddSemester(sem) : isEvenSemester(sem)
  );
}

const validateSemester = debounce(() => {
  const ctx = getStudentContext(rollInput, regInput);
  if (!ctx) return;
  const admissionYY = getAdmissionYY(rollInput, regInput);
  if (admissionYY == null) return;
  const maxSem = getMaxSemester({
    admissionYY,
    isH: ctx.isH
  });
  
  const sems = SEMESTERS.slice(0, maxSem);
  
  const box = $("#semesterBox");
  const list = $$("li", box);
  
  list.forEach(li => {
    li.style.display = sems.includes(li.dataset.value) ?
      "block" :
      "none";
  });
  
  selectedSem = pickSemester(sems);
  if (selectedSem) {
    setDropdownValue(box, selectedSem);
    validatePaper()
  }
}, 20);

// subject validation...
const makeSubjects = ({ major = [], minor = [] }, d) => {
  const MAJOR = new Set(major);
  const MINOR = new Set(minor);
  const COM_SEC = ["ITAC", "ENDC", "DIEM", "CADC", "ARTI"];
  
  return {
    MAJOR,
    MINOR,
    IDC: new Set(
      d === 1 ? ["MACD", "MICD", "IEED"] : [
        "ANTD", "ARBD", "BCMD", "BGND", "BOTD", "CEMD", "CMSD", "ECOD", "EDCD", "EGND", "ELTD",
        "ENVD", "FNTD", "FRND", "GELD", "GEOD", "HISD", "HMND", "HNDD", "HRTD", "HSED", "HURD",
        "IBHD", "IHCD", "JMCD", "LIND", "LISD", "LURD", "MCBD", "MLBD", "MTHD",
        "PALD", "PERD", "PHID", "PHSD", "PHYD", "PLSD", "PSYD", "RUSD", "SAND", "SOCD", "STSD",
        "SSCD", "ZOOD", "WOSD", "DFSD"
      ]
    ),
    SEC: {
      H: new Set([...major, ...COM_SEC]),
      G: new Set([...minor, ...COM_SEC])
    },
    SI: {
      H: new Set(["INTM"]),
      G: new Set(["MINT"])
    }
  };
};

const SUBJECTS = {
  1: makeSubjects({
    major: ["CACM", "BRCM", "EBCM", "DTCM", "ACCM", "MSCM", "CLCM"],
    minor: ["CAGM", "BRGM", "EBGM", "DTGM", "ACGM", "MSGM", "CLGM",
      "MCGM", "MPRM", "MEBS", "MMKC", "MHRM", "MMKT", "MSMT", "MPPM"
    ]
  }, 1),
  2: makeSubjects({
    major: [
      "ARBM", "BGNM", "ECOM", "EDCM", "EGNM", "ENVM", "FRNM",
      "GEOM", "HISM", "HMDM", "HNDM", "HURM", "IHCM", "JORM",
      "LINM", "LSTM", "LURM", "PALM", "PERM", "PHIM", "PLSM",
      "RUSM", "SANM", "SOCM", "VASM", "VCEM", "VCNM",
      "VIFM", "VSEM", "VTTM"
    ],
    minor: [
      "MARB", "MBGN", "MECO", "MEDC", "MEGN", "MENV", "MFNT",
      "MGEO", "MHIS", "MHMD", "MHND", "MHUR", "MIHC", "MJOR",
      "MLIN", "MLST", "MLUR", "MPAL", "MPER", "MPHI", "MPLS",
      "MRUS", "MSAN", "MSSC", "MSOC", "MWOS"
    ]
  }, 2),
  3: makeSubjects({
    major: [
      "ANTM", "BCMM", "BOTM", "CEMM", "CMSM", "ECOM", "ELTM", "FNTM", "GELM",
      "GEOM", "MCBM", "MTHM", "PHSM", "PHYM", "PSYM", "STSM", "ZOOM", "VCNM"
    ],
    minor: [
      "MANT", "MBCM", "MBOT", "MCEM", "MCMS", "MECO", "MELT", "MFNT", "MMLB", "MMCB",
      "MGEL", "MGEO", "MMCB", "MMTH", "MPHS", "MPHY", "MPSY", "MSTS", "MZOO"
    ]
  }, 3)
}

function buildSubjectTypeMap(SUBJECTS) {
  const map = {};
  
  for (const [group, value] of Object.entries(SUBJECTS)) {
    if (value instanceof Set) {
      // MAJOR, MINOR, IDC
      for (const code of value) {
        map[code] = group;
      }
    }
    else if (typeof value === "object") {
      // SEC, SI
      for (const [subType, set] of Object.entries(value)) {
        for (const code of set) {
          map[code] = `${group}_${subType}`; // e.g. SEC_H
        }
      }
    }
  }
  
  return map;
}

const union = (...sets) =>
  new Set(sets.flatMap(s => [...s]));

const SEM_RULES = {
  I: { idc: true, si: false },
  II: { idc: true, si: true },
  III: { idc: true, si: false },
  IV: { idc: false, si: true },
  V: { idc: false, si: false },
  VI: { idc: false, si: true },
  VII: { majorOnly: true },
  VIII: { majorOnly: true }
};

const buildSet = (subj, rule, track) => {
  if (rule.majorOnly) {
    return track === "H" ? subj.MAJOR : new Set();
  }
  
  const base =
    track === "H" ? [subj.MAJOR, subj.MINOR, subj.SEC.H] : [subj.MINOR, subj.SEC.G];
  
  if (rule.idc) base.push(subj.IDC);
  if (rule.si) base.push(subj.SI[track]);
  
  return union(...base);
};

const SEMESTER_SETS = {};

for (const [sem, rule] of Object.entries(SEM_RULES)) {
  SEMESTER_SETS[sem] = {};
  
  for (const dept of [1, 2, 3]) {
    const subj = SUBJECTS[dept];
    
    SEMESTER_SETS[sem][dept] = {
      H: buildSet(subj, rule, "H"),
      G: buildSet(subj, rule, "G")
    };
  }
}

function resolveAllowedSubjects({ sem, dept, isH }) {
  const S = SUBJECTS[dept];
  if (!S || !sem) return new Set();
  
  const add = (...sets) =>
    new Set(sets.flatMap(s => [...s]));
  
  switch (sem) {
    case "I":
    case "III":
      return isH ?
        add(S.MAJOR, S.MINOR, S.SEC.H, S.IDC) :
        add(S.MINOR, S.SEC.G, S.IDC);
      
    case "II":
    case "VI":
      return isH ?
        add(S.MAJOR, S.MINOR, S.SEC.H, S.IDC, S.SI.H) :
        add(S.MINOR, S.SEC.G, S.IDC, S.SI.G);
      
    case "IV":
      return isH ?
        add(S.MAJOR, S.MINOR, S.SI.H) :
        add(S.MINOR, S.SI.G);
      
    case "V":
      return isH ?
        add(S.MAJOR, S.MINOR) :
        new Set(S.MINOR);
      
    case "VII":
    case "VIII":
      return isH ? new Set(S.MAJOR) : new Set();
      
    default:
      return new Set();
  }
}

function getAllowedSubjectSet() {
  const ctx = getStudentContext(rollInput, regInput);
  if (!ctx || !semesterInput.value) return new Set();
  
  return resolveAllowedSubjects({
    sem: semesterInput.value,
    dept: ctx.dept,
    isH: ctx.isH
  });
}

subjectCodeInput.addEventListener("beforeinput", e => {
  if (e.inputType === "deleteContentBackward") return;
  
  const allowed = getAllowedSubjectSet();
  if (!allowed.size) {
    setValidationState(semesterInput, false, null);
    e.preventDefault();
    return;
  }
  
  const current = subjectCodeInput.value.toUpperCase();
  const incoming = (e.data || "").toUpperCase().replace(/[^A-Z]/g, "");
  const next = (current + incoming).slice(0, 4);
  
  // prefix match check
  const ok = [...allowed].some(code => code.startsWith(next));
  if (!ok) {
    e.preventDefault(); // 🔥 typing blocked
  }
});

subjectCodeInput.addEventListener("input", () => {
  let v = subjectCodeInput.value
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
  subjectCodeInput.value = v;
});

const validateSubject = debounce(() => {
  const v = subjectCodeInput.value.toUpperCase();
  const allowed = getAllowedSubjectSet();
  
  setValidationState(subjectCodeInput, allowed.has(v), 4);
}, 50);

function createSuggestionBox(input, getSuggestions) {
  const box = document.createElement("div");
  box.className = "suggestion-box";
  box.style.display = "none";
  input.parentNode.appendChild(box);
  
  let suppress = false; // 🔑 prevent re-open after select
  
  input.addEventListener("input", () => {
    if (suppress) {
      suppress = false;
      return;
    }
    
    const v = input.value.toUpperCase().trim();
    const suggestions = getSuggestions();
    
    // 👉 exact match হলে list বন্ধ
    if (suggestions.includes(v)) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }
    
    const filtered = v ?
      suggestions.filter(s => s.startsWith(v)) : [];
    
    if (!filtered.length) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }
    
    box.innerHTML = filtered.map(s => {
      const i = s.indexOf(v);
      return `
        <div class="item">
          ${s.slice(0, i)}<strong>${v}</strong>${s.slice(i + v.length)}
        </div>`;
    }).join("");
    
    [...box.children].forEach((item, idx) => {
      item.onclick = () => {
        suppress = true;
        input.value = filtered[idx];
        box.style.display = "none";
        box.innerHTML = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };
    });
    
    box.style.display = "block";
  });
  
  document.addEventListener("click", e => {
    if (!box.contains(e.target) && e.target !== input) {
      box.style.display = "none";
    }
  });
}

function getValidSubjectSuggestions() {
  return [...getAllowedSubjectSet()];
}

createSuggestionBox(subjectCodeInput, getValidSubjectSuggestions);

function resetSubjectIfInvalid() {
  const allowed = getAllowedSubjectSet();
  const v = subjectCodeInput.value.toUpperCase().trim();
  if (v && !allowed.has(v)) {
    subjectCodeInput.value = "";
    subjectCodeInput.dispatchEvent(new Event("input"));
    return;
  }
  
}

// paper validation...
const filterMap = (map, keys) =>
  Object.fromEntries(
    Object.entries(map).filter(([k]) => keys.includes(k))
  );

const buildPaperList = map =>
  Object.entries(map).flatMap(([p, nums]) =>
    nums.map(n => `${p}-${n}`)
  );

function renderPaperDropdown(papers) {
  const box = document.querySelector("#paperBox");
  const list = box.querySelector(".dropdown-list");
  const hidden = box.querySelector("#paper");
  //const semWrapper = semesterInput.closest(".placeholder-wrapper");
  
  list.innerHTML = "";
  // ❌ no valid papers
  if (!papers.length) {
    list.style.display = "none";
    resetDropdown(box);
    return;
  }
  papers.forEach(p => {
    const li = document.createElement("li");
    li.dataset.value = p;
    li.textContent = p;
    if (hidden.value === p) li.classList.add("selected");
    list.appendChild(li);
  });
  list.style.display = "block";
  // current paper invalid → reset
  if (!papers.includes(hidden.value)) {
    resetDropdown(box);
  }
}

function resetDropdown(wrapper) {
  const value = wrapper.querySelector(".dropdown-value");
  const hidden = wrapper.querySelector("input[type=hidden]");
  const list = wrapper.querySelector(".dropdown-list");
  
  value.textContent = "";
  hidden.value = "";
  
  list?.querySelectorAll("li")
    .forEach(li => li.classList.remove("selected"));
  
  wrapper.classList.remove("has-value", "is-valid", "is-invalid", "open");
}

const validatePaper = debounce(() => {
  
  const ctx = getStudentContext(rollInput, regInput);
  if (!ctx) return;
  
  const sem = semesterInput.value;
  
  if (!sem) return;
  
  const dept = ctx.dept; // 1 / 2 / 3
  const isH = ctx.isH; // 4-year
  const subj = subjectCodeInput.value.toUpperCase();
  
  const semPrefixes = {
    I: { H: { "DSCC": [1], "MN": [1], "SEC": [1], "IDC": [1] }, G: { "CC": [1], "SEC": [1], "IDC": [1] } },
    II: { H: { "DSCC": [2], "MN": [2], "SEC": [2], "IDC": [2], "SI": [1] }, G: { "CC": [2], "SEC": [2], "IDC": [2], "SI": [1] } },
    III: { H: { "DSCC": [3, 4], "MN": [1], "SEC": [3], "IDC": [3] }, G: { "CC": [3], "SEC": [3], "MN": [1], "IDC": [3] } },
    IV: { H: { "DSCC": [5, 6, 7, 8], "MN": [2], "SI": [1] }, G: { "CC": [4, 5], "MN": [2], "SI": [1] } },
    V: { H: { "DSCC": [9, 10, 11, 12], "MN": [3, 4] }, G: { "CC": [6, 7], "MN": [3, 4] } },
    VI: { H: { "DSCC": [13, 14, 15], "MN": [5, 6], "SI": [1] }, G: { "CC": [7, 8], "MN": [5, 6], "SI": [1] } },
    VII: { H: { "DSCC": [16, 17, 18, 19, 20], "RES": [1] }, G: {} },
    VIII: { H: { "DSCC": [20, 21, 22, 23, 24, 25], "RES": [2] }, G: {} }
  };
  const semPrefixesCom = {
    I: { H: { "DSCC": [1], "MN": [1], "SEC": [1], "IDC": [1], "MDC": [1] }, G: { "DSCC": [1], "MN": [1], "SEC": [1], "IDC": [1], "MDC": [1] } },
    II: { H: { "DSCC": [2], "MN": [2], "SEC": [2], "IDC": [2], "MDC": [2], "SI": [1] }, G: { "DSCC": [2], "MN": [2], "SEC": [2], "IDC": [2], "MDC": [2], "SI": [1] } },
    III: { H: { "DSCC": [3, 4], "MN": [3], "SEC": [3], "IDC": [3], "MDC": [3, 4] }, G: { "DSCC": [3, 4], "MN": [3], "SEC": [3], "IDC": [3], "MDC": [3] } },
    IV: { H: { "DSCC": [5, 6, 7, 8], "MN": [4], "SI": [1] }, G: { "DSCC": [5, 6, 7, 8], "MDC": [5, 6, 7, 8], "MN": [4], "SI": [1] } },
    V: { H: { "DSCC": [9, 10, 11, 12], "MN": [5] }, G: { "DSCC": [9, 10, 11, 12], "MDC": [9, 10, 11, 12], "MN": [5] } },
    VI: { H: { "DSCC": [13, 14, 15, 16], "MN": [6], "SI": [1] }, G: { "DSCC": [13, 14, 15, 16], "MDC": [13, 14, 15, 16], "MN": [6], "SI": [1] } },
    VII: { H: { "DSCC": [21, 17, 18, 19, 20], "RES": [1] }, G: {} },
    VIII: { H: { "DSCC": [20, 26, 22, 23, 24, 25], "RES": [2] }, G: {} }
  };
  
  // -------------------------------
  // 1️⃣ base paper map (semester wise)
  // -------------------------------
  const baseMap = ctx.dept === 1 ?
    (isH ? semPrefixesCom[sem]?.H : semPrefixesCom[sem]?.G) :
    (isH ? semPrefixes[sem]?.H : semPrefixes[sem]?.G);
  
  if (!baseMap) {
    renderPaperDropdown([]);
    return;
  }
  
  // -------------------------------
  // 2️⃣ subject sets (NEW SUBJECTS)
  // -------------------------------
  const S = SUBJECTS[dept];
  let filtered = baseMap;
  
  if (S.MAJOR.has(subj)) {
    filtered = filterMap(baseMap, ["DSCC", "SEC", "RES"]);
  }
  else if (S.MINOR.has(subj)) {
    filtered = ctx.isCom ?
      filterMap(baseMap, ["DSCC", "CC", "MN", "MDC"]) :
      filterMap(baseMap, ["CC", "MN", "MDC", "SEC"]);
  }
  else if (
    (isH && S.SEC.H.has(subj)) ||
    (!isH && S.SEC.G.has(subj))
  ) {
    filtered = filterMap(baseMap, ["SEC"]);
  }
  else if (S.IDC.has(subj)) {
    filtered = filterMap(baseMap, ["IDC", "MDC"]);
  }
  else if (
    (isH && S.SI.H.has(subj)) ||
    (!isH && S.SI.G.has(subj))
  ) {
    filtered = filterMap(baseMap, ["SI"]);
  }
  
  // -------------------------------
  // 3️⃣ render dropdown
  // -------------------------------
  renderPaperDropdown(
    buildPaperList(filtered)
  );
  
}, 20);


function bindValidation(element, handler, events = ['input', 'compositionend', 'change']) {
  events.forEach(evt =>
    element?.addEventListener(evt, handler)
  );
}

async function bootApp() {
  try {
    const APP_DATA = await initData(); // ⛔ এখানে fail হলে নিচে যাবে না
    window.APP_DATA = APP_DATA;
    
    initUI(APP_DATA); // সব event binding
    hydrateFromSession(); // optional restore
    
    document.body.classList.remove("app-loading");
    document.getElementById("appLoader")?.remove();
  } catch (err) {
    console.error(err);
    showFatalError();
  }
}

function initUI(APP_DATA) {
  const rollInput = $('#rollNo');
  const regInput = $('#regNo');
  
  const runValidation = () => {
    const ctx = getStudentContext(rollInput, regInput);
    validateInputs(ctx, APP_DATA.collegeCodes, rollInput, regInput);
  };
  
  const handleInput = (input, formatter, getCode, getYear) =>
    input.addEventListener("input", () => {
      
      withCaret(input, () => formatter(input));
      
      const code = getCode(input.value);
      clgName.value = APP_DATA.colleges[code] || "";
      setValidationState(clgName, !!clgName.value);
      
      runValidation();
    });
  
  handleInput(
    rollInput,
    formatRollInput,
    v => v.split("-")[0]?.slice(3),
    v => v.slice(0, 2)
  );
  
  handleInput(
    regInput,
    formatRegInput,
    v => v.split("-")[0],
    v => v.split("-")[3]
  );
  
  [stdName, topic].forEach(el => {
    ["input", "blur"].forEach(evt => {
      el.addEventListener(evt, () => setValidationState(el, !!el.value, evt === "input" ? 9999 : null));
    });
  });
  
  $("#addLOGO").addEventListener("change", function() {
    const cu = $(".cu");
    cu.classList.toggle("cu-black", !this.checked);
    cu.classList.toggle("cu-blue", this.checked);
  });
  
  $("#addName").addEventListener("change", function() {
    stdName.toggleAttribute("required", this.checked);
    
    if (!this.checked) {
      // required off → validation state clear
      const field = stdName.closest(".placeholder-wrapper");
      field?.classList.remove("is-valid", "is-invalid", "is-typing");
      return;
    }
    // required on → validate
    setValidationState(stdName, !!stdName.value);
  });
  
  runValidation();
  bindValidation(semesterInput, resetSubjectIfInvalid);
  bindValidation(subjectCodeInput, validatePaper);
  bindValidation(subjectCodeInput, validateSubject);
  bindValidation(semesterInput, validatePaper);
  bindValidation(rollInput, validateSubject);
  bindValidation(regInput, validateSubject);
  bindValidation(rollInput, validatePaper);
  bindValidation(regInput, validatePaper);
  bindValidation(rollInput, validateSemester);
  bindValidation(regInput, validateSemester);
  
}

function hydrateFromSession() {
  const data = JSON.parse(sessionStorage.getItem("STD_INFO"));
  if (!data) return;
  disableFields(!data);
  requestAnimationFrame(() => hydrateForm(data));
}

function showFatalError() {
  document.body.innerHTML = `
    <div class="fatal-error">
      <div class="fatal-box">
        <div class="fatal-icon">⚠️</div>
        <div class="fatal-title">Application failed to load</div>
        <div class="fatal-msg">
          Please refresh the page or try again later.
        </div>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    const msg = document.querySelector(".fatal-msg");
    if (!msg) return;
    
    msg.insertAdjacentHTML("beforeend", `
      <br>
      <small
        style="
          margin-top:8px;
          opacity:.6;
          cursor:pointer;
          text-decoration:underline;
          display:inline-block;
        "
        onclick="location.reload()"
        onmouseenter="this.style.opacity=1"
        onmouseleave="this.style.opacity=.6"
      >
        You may try refreshing now
      </small>
    `);
  }, 5000);
}

document.addEventListener("DOMContentLoaded", () => {
  initData()
    .then(data => {
      window.APP_DATA = data;
      bootApp(); // ✅ only when ready
    })
    .catch(err => {
      console.error(err);
      showFatalError(); // ❌ stop everything else
    });
});