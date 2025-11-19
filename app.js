// vCard QR Scanner App
// Assumes html5-qrcode and vcard-parser are loaded via CDN

const qrReader = new Html5Qrcode("qr-reader");
const vcardFieldsDiv = document.getElementById("vcard-fields");
const vcardResultDiv = document.getElementById("vcard-result");
const submitBtn = document.getElementById("submit-btn");
const formStatusDiv = document.getElementById("form-status");

let vcardData = {};

function parseVCard(raw) {
  try {
    const vcard = window.vCardParser.parse(raw);
    // Extract fields
    return {
      name: vcard.fn || "",
      email: vcard.email || "",
      company: vcard.org || "",
      title: vcard.title || ""
    };
  } catch (e) {
    return null;
  }
}

function displayVCard(data) {
  vcardFieldsDiv.innerHTML = `
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Company:</strong> ${data.company}</p>
    <p><strong>Position:</strong> ${data.title}</p>
  `;
  vcardResultDiv.classList.remove("hidden");
}

function resetUI() {
  vcardResultDiv.classList.add("hidden");
  formStatusDiv.textContent = "";
}

// Replace with your Google Form field entry IDs
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/your-form-id/formResponse";
const FIELD_NAME = "entry.123456";
const FIELD_EMAIL = "entry.234567";
const FIELD_COMPANY = "entry.345678";
const FIELD_TITLE = "entry.456789";

submitBtn.addEventListener("click", () => {
  submitBtn.disabled = true;
  formStatusDiv.textContent = "Submitting...";
  // Prepare form data
  const formData = new FormData();
  formData.append(FIELD_NAME, vcardData.name);
  formData.append(FIELD_EMAIL, vcardData.email);
  formData.append(FIELD_COMPANY, vcardData.company);
  formData.append(FIELD_TITLE, vcardData.title);

  fetch(GOOGLE_FORM_URL, {
    method: "POST",
    mode: "no-cors",
    body: formData
  }).then(() => {
    formStatusDiv.textContent = "Submitted!";
    submitBtn.disabled = false;
  }).catch(() => {
    formStatusDiv.textContent = "Error submitting form.";
    submitBtn.disabled = false;
  });
});

// Initialize camera
formStatusDiv.textContent = "Initializing camera...";

Html5Qrcode.getCameras()
  .then(cameras => {
    console.log("Available cameras:", cameras);
    
    if (!cameras || cameras.length === 0) {
      throw new Error("No camera found on this device.");
    }
    
    // Use the last camera (usually back camera on mobile, or first available on desktop)
    const cameraId = cameras[cameras.length - 1].id;
    console.log("Using camera ID:", cameraId);
    
    formStatusDiv.textContent = "Starting camera...";
    
    qrReader.start(
      cameraId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      (decodedText) => {
        console.log("QR Code detected:", decodedText);
        resetUI();
        const parsed = parseVCard(decodedText);
        if (parsed) {
          vcardData = parsed;
          displayVCard(parsed);
          qrReader.stop();
        } else {
          formStatusDiv.textContent = "Invalid vCard data.";
        }
      },
      (errorMessage) => {
        // Ignore scan errors (these happen continuously when no QR code is detected)
      }
    ).then(() => {
      formStatusDiv.textContent = "";
      console.log("Camera started successfully");
    }).catch(err => {
      console.error("Error starting camera:", err);
      throw err;
    });
  })
  .catch(err => {
    console.error("Camera error:", err);
    let errorMsg = "Camera error: ";
    if (err.name === 'NotAllowedError') {
      errorMsg += "Permission denied. Please allow camera access.";
    } else if (err.name === 'NotFoundError') {
      errorMsg += "No camera found.";
    } else if (err.name === 'NotReadableError') {
      errorMsg += "Camera is already in use by another application.";
    } else if (err.name === 'OverconstrainedError') {
      errorMsg += "Camera doesn't meet requirements.";
    } else if (err.message) {
      errorMsg += err.message;
    } else {
      errorMsg += String(err);
    }
    formStatusDiv.textContent = errorMsg;
  });
