const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw9Le-s5KRGm8HOuMcOX9WJJxoE-AVp4GrDMgPU7nOgTi-y8BQzVYmzFSeHXcX_X5TO/exec";

// Ruler Constants
const minWeight = 40;
const maxWeight = 150;
const step = 0.1;
const tickSpacing = 10; // 2px width + 8px gap from CSS

// ===========================
// SCREEN NAVIGATION
// ===========================

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("log-btn").addEventListener("click", showForm);
  document.getElementById("back-btn").addEventListener("click", showHome);
  document.getElementById("submit-btn").addEventListener("click", submitEntry);
});

function showForm() {
  document.getElementById("home-screen").style.cssText = "display: none !important";
  document.getElementById("form-screen").style.cssText = "display: flex !important";
  
  setDefaultDate();
  
  // Use timeout to ensure DOM is rendered before ruler init
  setTimeout(() => {
    initRuler();
  }, 100); 
}

function showHome() {
  document.getElementById("form-screen").style.cssText = "display: none !important";
  document.getElementById("home-screen").style.cssText = "display: flex !important";
  resetForm();
}

// ===========================
// SET DEFAULT DATE TO TODAY
// ===========================

function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  document.getElementById("input-date").value = `${yyyy}-${mm}-${dd}`;
  document.getElementById("input-date").max = `${yyyy}-${mm}-${dd}`;
}

// ===========================
// RESET FORM
// ===========================

function resetForm() {
  document.getElementById("input-date").value = "";
  document.getElementById("input-time").value = "";
  document.getElementById("submit-btn").disabled = false;
  document.getElementById("submit-btn").innerText = "✅ Submit Entry";
  removeAlert();
}

// ===========================
// ALERT HELPERS
// ===========================

function showAlert(message, type = "warning") {
  removeAlert();
  const alert = document.createElement("div");
  alert.id = "form-alert";
  alert.className = `alert alert-${type} mt-3`;
  alert.innerText = message;
  document.getElementById("submit-btn").before(alert);
}

function removeAlert() {
  const existing = document.getElementById("form-alert");
  if (existing) existing.remove();
}

// ===========================
// VALIDATION LOGIC
// ===========================

function validateDate(inputDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(inputDate);
  selected.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - selected) / (1000 * 60 * 60 * 24));

  if (selected > today) return { valid: false, message: "❌ No future dates." };
  if (diffDays > 7) return { valid: false, message: "❌ Max 7 days past." };
  if (diffDays >= 1) return { valid: true, type: "past", message: "⚠️ Editing past data. Confirm?" };
  return { valid: true, type: "today" };
}

function validateWeight(weight) {
  const w = parseFloat(weight);
  if (isNaN(w) || w <= 0) return { valid: false, message: "❌ Invalid weight." };
  return { valid: true, type: "normal" };
}

// ===========================
// FORMAT HELPERS
// ===========================

function formatDate(inputDate) {
  const [yyyy, mm, dd] = inputDate.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

// ===========================
// SUBMIT ENTRY
// ===========================

let warningAcknowledged = false;

function submitEntry() {
  removeAlert();
  const dateInput = document.getElementById("input-date").value;
  const timeInput = document.getElementById("input-time").value;
  const weightInput = document.getElementById("weight-value").innerText;

  if (!dateInput || !timeInput) {
    showAlert("❌ Please fill Date and Time.", "danger");
    return;
  }

  const dateCheck = validateDate(dateInput);
  if (!dateCheck.valid) { showAlert(dateCheck.message, "danger"); return; }

  if (!warningAcknowledged && dateCheck.type === "past") {
    showAlert(dateCheck.message, "warning");
    warningAcknowledged = true;
    return;
  }

  warningAcknowledged = false;
  const formattedDate = formatDate(dateInput);
  const timestamp = new Date().toISOString();

  sendToSheet({
    date: formattedDate,
    time: timeInput,
    weight: parseFloat(weightInput).toFixed(1),
    timestamp,
  });
}

// ===========================
// SEND DATA TO GOOGLE SHEET
// ===========================

function sendToSheet(data) {
  document.getElementById("loading-dots").style.display = "flex";
  document.getElementById("submit-btn").disabled = true;

  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(data),
  })
    .then((res) => res.json())
    .then((response) => {
      document.getElementById("loading-dots").style.display = "none";
      if (response.status === "success") {
        showOverlaySuccess("Entry logged!");
        setTimeout(() => { hideOverlay(); showHome(); }, 1500);
      } else {
        showOverlayError();
        document.getElementById("submit-btn").disabled = false;
      }
    })
    .catch(() => {
      document.getElementById("loading-dots").style.display = "none";
      showOverlayError("Connection Error");
      document.getElementById("submit-btn").disabled = false;
    });
}

// ===========================
// RULER LOGIC
// ===========================

function initRuler() {
  const ruler = document.getElementById('ruler');
  const weightDisplay = document.getElementById('weight-value');
  const wrapper = document.getElementById('ruler-wrapper');
  
  if (!ruler || !wrapper) return;

  // 1. Clear and Generate Ticks
  let html = '';
  for (let i = minWeight; i <= maxWeight; i = Math.round((i + step) * 10) / 10) {
    const isMajor = Number.isInteger(i);
    html += `<div class="tick ${isMajor ? 'major' : 'minor'}" ${isMajor ? `data-value="${i}"` : ''}></div>`;
  }
  ruler.innerHTML = html;

  // 2. Scroll Event
  wrapper.addEventListener('scroll', () => {
    const scrollLeft = wrapper.scrollLeft;
    const weight = minWeight + (scrollLeft / tickSpacing) * step;
    weightDisplay.innerText = weight.toFixed(1);
  });
  
  // 3. Set Default Position (70kg)
  const startWeight = 70;
  wrapper.scrollLeft = ((startWeight - minWeight) / step) * tickSpacing;
}

// ===========================
// OVERLAY HELPERS
// ===========================

function showOverlaySuccess(text) {
  const overlay = document.getElementById("loading-overlay");
  overlay.style.display = "flex";
  overlay.classList.add("overlay-success");
  document.getElementById("overlay-text").innerText = text;
}

function showOverlayError(text = "❌ Error") {
  const overlay = document.getElementById("loading-overlay");
  overlay.style.display = "flex";
  overlay.classList.add("overlay-error");
  document.getElementById("overlay-text").innerText = text;
}

function hideOverlay() {
  const overlay = document.getElementById("loading-overlay");
  overlay.style.display = "none";
  overlay.classList.remove("overlay-success", "overlay-error");
}
