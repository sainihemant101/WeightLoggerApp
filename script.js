const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw9Le-s5KRGm8HOuMcOX9WJJxoE-AVp4GrDMgPU7nOgTi-y8BQzVYmzFSeHXcX_X5TO/exec";

// ===========================
// SCREEN NAVIGATION
// ===========================

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("log-btn").addEventListener("click", showForm);
  document.getElementById("back-btn").addEventListener("click", showHome);
  document.getElementById("submit-btn").addEventListener("click", submitEntry);
});

function showForm() {
  // 1. Show the screen
  document.getElementById("home-screen").style.cssText = "display: none !important";
  document.getElementById("form-screen").style.cssText = "display: flex !important";
  
  // 2. Set the date
  setDefaultDate();
  
  // 3. DRAW THE RULER (Add a tiny delay to ensure the screen is visible first)
  setTimeout(() => {
    initRuler();
  }, 50); 
}

function showHome() {
  document.getElementById("form-screen").style.cssText =
    "display: none !important";
  document.getElementById("home-screen").style.cssText =
    "display: flex !important";
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
  // Reset ruler position to 70kg
  const wrapper = document.querySelector('.ruler-wrapper');
  if(wrapper) {
    wrapper.scrollLeft = (70 - minWeight) / step * tickSpacing;
  }
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
// DATE VALIDATION
// ===========================

function validateDate(inputDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = new Date(inputDate);
  selected.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today - selected) / (1000 * 60 * 60 * 24));

  if (selected > today) {
    return {
      valid: false,
      type: "future",
      message: "❌ You cannot enter data for a future date.",
    };
  }

  if (diffDays > 7) {
    return {
      valid: false,
      type: "tooOld",
      message: "❌ You can only log data up to 7 days in the past.",
    };
  }

  if (diffDays >= 1) {
    return {
      valid: true,
      type: "past",
      message: "⚠️ You are changing past data. Click Submit again to confirm.",
    };
  }

  return { valid: true, type: "today", message: null };
}

// ===========================
// WEIGHT VALIDATION
// ===========================

function validateWeight(weight) {
  if (!weight || weight === "") {
    return { valid: false, message: "❌ Please enter your weight." };
  }

  const w = parseFloat(weight);

  if (isNaN(w) || w <= 0) {
    return { valid: false, message: "❌ Weight must be a positive number." };
  }

  if (w < 20) {
    return {
      valid: true,
      type: "low",
      message:
        "⚠️ This weight seems unrealistically low. Click Submit again to confirm.",
    };
  }

  if (w > 300) {
    return {
      valid: true,
      type: "high",
      message:
        "⚠️ This weight seems unrealistically high. Click Submit again to confirm.",
    };
  }

  return { valid: true, type: "normal", message: null };
}

// ===========================
// FORMAT HELPERS
// ===========================

function formatWeight(weight) {
  return parseFloat(weight).toFixed(3);
}

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
  
  // CHANGED: Grab weight from the ruler display text instead of an input field
  const weightInput = document.getElementById("weight-value").innerText;

  if (!dateInput || !timeInput || !weightInput) {
    warningAcknowledged = false;
    showAlert("❌ All fields are required.", "danger");
    return;
  }

  const dateCheck = validateDate(dateInput);
  if (!dateCheck.valid) {
    warningAcknowledged = false;
    showAlert(dateCheck.message, "danger");
    return;
  }

  const weightCheck = validateWeight(weightInput);
  if (!weightCheck.valid) {
    warningAcknowledged = false;
    showAlert(weightCheck.message, "danger");
    return;
  }

  // If warning not yet acknowledged
  if (!warningAcknowledged) {
    if (dateCheck.type === "past") {
      showAlert(dateCheck.message, "warning");
      warningAcknowledged = true;
      return;
    }
    if (weightCheck.type === "low" || weightCheck.type === "high") {
      showAlert(weightCheck.message, "warning");
      warningAcknowledged = true;
      return;
    }
  }

  // Warning was acknowledged, proceed
  warningAcknowledged = false;

  const formattedDate = formatDate(dateInput);
  const formattedWeight = formatWeight(weightInput);
  const timestamp = new Date().toISOString();

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;

  sendToSheet({
    date: formattedDate,
    time: timeInput,
    weight: formattedWeight,
    timestamp,
  });
}
// ===========================
// OVERLAY HELPERS
// ===========================

function showOverlay(text = "Saving your entry...") {
  const overlay = document.getElementById("loading-overlay");
  const overlayText = document.getElementById("overlay-text");
  overlay.className = "";
  overlay.style.display = "flex";

  // Make sure checkmark and error icon exist
  if (!document.getElementById("overlay-checkmark")) {
    overlay.querySelector(".overlay-content").innerHTML = `
        <div class="spinner"></div>
        <svg id="overlay-checkmark" class="checkmark" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r="25" fill="none" stroke="#4caf50" stroke-width="3"/>
          <path fill="none" stroke="#4caf50" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="M14 27l8 8 16-16"/>
        </svg>
        <span class="error-icon">❌</span>
        <p class="overlay-text" id="overlay-text">${text}</p>
      `;
  } else {
    overlayText.innerText = text;
  }
}

function showOverlaySuccess(text = "✅ Entry logged!") {
  const overlay = document.getElementById("loading-overlay");
  overlay.classList.add("overlay-success");
  document.getElementById("overlay-text").innerText = text;
}

function showOverlayError(text = "❌ Something went wrong.") {
  const overlay = document.getElementById("loading-overlay");
  overlay.classList.add("overlay-error");
  document.getElementById("overlay-text").innerText = text;
}

function hideOverlay() {
  const overlay = document.getElementById("loading-overlay");
  overlay.style.display = "none";
  overlay.className = "";
}

// ===========================
// SEND DATA TO GOOGLE SHEET
// ===========================

function sendToSheet(data) {
  // 1. Show the new dots loader and disable the button to prevent double-clicks
  document.getElementById("loading-dots").style.display = "flex";
  document.getElementById("submit-btn").disabled = true;

  // Note: We are NOT calling showOverlay() here because the dots are our loader now.

  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(data),
  })
    .then((res) => res.json())
    .then((response) => {
      // 2. Hide dots once response comes back
      document.getElementById("loading-dots").style.display = "none";

      if (response.status === "success") {
        // 3. Show the success overlay only AFTER the data is saved
        showOverlaySuccess("Entry logged!");
        setTimeout(() => {
          hideOverlay();
          showHome();
        }, 1500);
      } else {
        // 4. Handle Errors
        showOverlayError("Something went wrong. Try again.");
        setTimeout(() => {
          hideOverlay();
          document.getElementById("submit-btn").disabled = false;
        }, 2000);
      }
    })
    .catch(() => {
      // 5. Handle Connection Errors
      document.getElementById("loading-dots").style.display = "none";
      showOverlayError("Could not connect. Check your internet.");
      setTimeout(() => {
        hideOverlay();
        document.getElementById("submit-btn").disabled = false;
      }, 2000);
    });
}


// Ruler Configuration
const ruler = document.getElementById('ruler');
const weightDisplay = document.getElementById('weight-value');
const minWeight = 40;
const maxWeight = 150;
const step = 0.1;
const tickSpacing = 10; // Must match the 'gap' in CSS

// Generate Ruler Ticks
function initRuler() {
  let html = '';
  for (let i = minWeight; i <= maxWeight; i = (i * 10 + step * 10) / 10) {
    const isMajor = Number.isInteger(i);
    html += `<div class="tick ${isMajor ? 'major' : 'minor'}" data-value="${isMajor ? i : ''}"></div>`;
  }
  ruler.innerHTML = html;

  // Listen for scroll
  const wrapper = document.querySelector('.ruler-wrapper');
  wrapper.addEventListener('scroll', () => {
    const scrollLeft = wrapper.scrollLeft;
    const weight = minWeight + (scrollLeft / tickSpacing) * step;
    weightDisplay.innerText = weight.toFixed(1);
  });
  
  // Set default starting position (e.g., 70kg)
  setTimeout(() => {
      const startWeight = 70;
      wrapper.scrollLeft = (startWeight - minWeight) / step * tickSpacing;
  }, 100);
}

// Call this inside your showForm() function
// Replace 'setDefaultDate();' with:
// setDefaultDate();
// initRuler();
