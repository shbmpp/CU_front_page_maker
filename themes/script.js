function printA4() {
  window.print();
}

function downloadA4PDF(filename = document.title) {
  const element = document.querySelector(".a4-container");
  if (!element) return;
  
  PDFLoader(true); // ⏳ start animation
  const scale = window.devicePixelRatio > 1.5 ? 2 : 2.5;
  const opt = {
    margin: 0,
    filename,
    
    image: {
      type: "png",
      quality: 1
    },
    
    html2canvas: {
      scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      logging: false
    },
    
    jsPDF: {
      unit: "px",
      format: [793, 1123], // ⚠️ exact canvas → no border / no extra page
      orientation: "portrait",
      compress: true
    }
  };
  
  html2pdf()
    .set(opt)
    .from(element)
    .save()
    .then(() => {
      setTimeout(() => PDFLoader(false), 300);
    })
    .catch(err => {
      console.error(err);
      PDFLoader(false); // ❌ error হলেও loader বন্ধ
      alert("Failed to generate PDF");
    });
}

const PDFLoader = (bool) => document.getElementById("pdf-loader")?.classList.toggle("hidden", !bool);

const StdDetails = () => JSON.parse(sessionStorage.getItem("STD_INFO")) || null;

const setTitle = () => {
  const s = StdDetails();
  const cls = $(".a4-container", document)?.firstElementChild?.className;
  document.title = s && cls ?
    `CU_${cls.charAt(0).toUpperCase() + cls.slice(1)}_FrontPage ${s.roll_number}-${s.subject_code}-${s.paper}` :
    document.title;
};

const $ = (sel, ctx) => {
  const root =
    ctx ||
    document.querySelector(".a4-container")?.firstElementChild;
  
  return root?.querySelector(sel) ?? null;
};

const toggleBlock = (el, show) => {
  const box = el?.closest(".info");
  if (!box) return;
  box.style.display = show ? "flex" : "none";
};

const Stream = roll => {
  if (!roll) return "";
  const d = roll.replace(/\D/g, "");
  const stream = d[2] === "1" ? "Com." : d[2] === "2" ? "A." : "Sc.";
  const program = d[7] === "1" ? "Four Year" : "Three Year";
  return `${program} B.${stream}`;
};

const TEMPLATE_MAP = {
  name: s => s.student_name,
  topic: s => s.topic_name,
  college: s => s.college_name,
  reg_number: s => s.registration_number,
  roll_number: s => s.roll_number,
  course: s => Stream(s.roll_number),
  semester: s => s.semester,
  subject: s => `${s.subject}${s.addSubj === 'on' && !!s.subject_code ? ` (${s.subject_code})` : ''}`,
  paper: s => s.paper,
  paperType: s => s.paperType ? `(${s.paperType})` : "",
  session: s => s.session
};

const VISIBILITY_RULES = {
  name: s => s.addName === "on",
  college: s => s.addClgName === "on",
  session: s => s.addSession === "on",
  topic: s => !!s.topic_name
};

function renderTemplate(data) {
  
  if (!data) return;
  
  // logo
  $(".logo").style.display = data.addLOGO === "on" ? "block" : "none";
  
  // render text fields
  Object.entries(TEMPLATE_MAP).forEach(([cls, getter]) => {
    const el = $(`.${cls}`);
    if (!el) return;
    el.textContent = getter(data) ?? "";
  });
  
  // visibility toggles
  Object.entries(VISIBILITY_RULES).forEach(([cls, rule]) => {
    toggleBlock($(`.${cls}`), rule(data));
  });
}

const showLoading = (load = false) => document.body.classList.toggle("showLoading", load);

(function boot() {
  try {
    const data = JSON.parse(sessionStorage.getItem("STD_INFO"));
    if (!data) throw new Error("STD_INFO missing");
    
    if (typeof renderTemplate !== "function")
      throw new Error("renderTemplate not loaded");
    
    showLoading(true);
    renderTemplate(data);
    setTitle?.();
    setTimeout(showLoading, 2000);
    // ✅ announce READY
    window.APP_READY = true;
  } catch (e) {
    console.error(e);
    document.body.innerHTML = `
      <div style="padding:40px;text-align:center">
        Failed to load preview.<br>
        Please go back and try again.
      </div>`;
    setTimeout(() => history.back(), 2000);
  }
})();