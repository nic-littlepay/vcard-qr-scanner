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
    console.log("Raw vCard data:", raw);
    
    // Simple vCard parser - parse the text directly
    const lines = raw.split(/\r?\n/);
    const data = {
      name: "",
      email: "",
      company: "",
      title: ""
    };
    
    for (let line of lines) {
      line = line.trim();
      
      if (line.startsWith('FN:')) {
        data.name = line.substring(3).trim();
      } else if (line.startsWith('N:')) {
        // Handle N:LastName;FirstName format
        const nameParts = line.substring(2).split(';');
        if (nameParts.length >= 2) {
          data.name = `${nameParts[1]} ${nameParts[0]}`.trim();
        } else {
          data.name = line.substring(2).trim();
        }
      } else if (line.startsWith('EMAIL')) {
        // Handle EMAIL:email@example.com or EMAIL;TYPE=WORK:email@example.com
        const emailMatch = line.match(/EMAIL[^:]*:(.+)/);
        if (emailMatch) {
          data.email = emailMatch[1].trim();
        }
      } else if (line.startsWith('ORG:')) {
        data.company = line.substring(4).trim();
      } else if (line.startsWith('TITLE:')) {
        data.title = line.substring(6).trim();
      } else if (line.startsWith('ROLE:') && !data.title) {
        // Use ROLE as fallback if TITLE is not set
        data.title = line.substring(5).trim();
      }
    }
    
    // Return null if no useful data was found
    if (!data.name && !data.email && !data.company && !data.title) {
      return null;
    }
    
    return data;
  } catch (e) {
    console.error("vCard parsing error:", e);
    return null;
  }
}

const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeliYa-Kgupy2QulCMhbAbgbSxOV1zHOwJ_tMdpf1kd32vM9w'

function displayVCard(data) {
  const missingFields = [];
  if (!data.name) missingFields.push('Name');
  if (!data.email) missingFields.push('Email');
  
  vcardFieldsDiv.innerHTML = `
    <p><strong>Name:</strong> ${data.name || '<em>Not found</em>'}</p>
    <p><strong>Email:</strong> ${data.email || '<em>Not found</em>'}</p>
    <p><strong>Company:</strong> ${data.company || '<em>Not found</em>'}</p>
    <p><strong>Position:</strong> ${data.title || '<em>Not found</em>'}</p>
  `;
  
  if (missingFields.length > 0) {
    formStatusDiv.innerHTML = `
      <p class="error">⚠️ Missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(' and ')}</p>
      <button id="manual-form-btn" class="secondary-btn">Fill Form Manually</button>
    `;
    submitBtn.style.display = 'none';
    
    // Add event listener for manual form button
    document.getElementById('manual-form-btn').addEventListener('click', () => {
      window.open(GOOGLE_FORM_URL + '/viewform', '_blank');
    });
  } else {
    formStatusDiv.textContent = '';
    submitBtn.style.display = 'block';
  }
  
  vcardResultDiv.classList.remove("hidden");
}

function resetUI() {
  vcardResultDiv.classList.add("hidden");
  formStatusDiv.textContent = "";
  submitBtn.style.display = 'block';
}

function startCamera() {
  formStatusDiv.textContent = "Starting camera...";
  formStatusDiv.className = '';
  
  Html5Qrcode.getCameras()
    .then(cameras => {
      console.log("Available cameras:", cameras);
      
      if (!cameras || cameras.length === 0) {
        throw new Error("No camera found on this device.");
      }
      
      const cameraId = cameras[cameras.length - 1].id;
      console.log("Using camera ID:", cameraId);
      
      return qrReader.start(
        { facingMode: "environment" },  // Use environment camera explicitly for better iOS compatibility
        {
          fps: 10,
          qrbox: { width: 300, height: 300 },  // Larger scanning area for iOS
          aspectRatio: 1.0,
          // iOS-specific settings for better autofocus
          videoConstraints: {
            facingMode: "environment",
            focusMode: "continuous",
            advanced: [{ focusMode: "continuous" }, { torch: false }]
          }
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
      );
    })
    .then(() => {
      formStatusDiv.textContent = "";
      console.log("Camera started successfully");
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
}

const GOOGLE_FORM_RESPONSE_URL = GOOGLE_FORM_URL + "/formResponse";

const FIELD_NAME = "entry.2075602243";
const FIELD_EMAIL = "entry.415465267";
const FIELD_COMPANY = "entry.1991828843";
const FIELD_TITLE = "entry.791136885";

submitBtn.addEventListener("click", () => {
  // Validate required fields
  if (!vcardData.name || !vcardData.email) {
    formStatusDiv.innerHTML = '<p class="error">Cannot submit: Name and Email are required.</p>';
    return;
  }
  
  submitBtn.disabled = true;
  formStatusDiv.textContent = "Submitting...";
  formStatusDiv.className = '';
  
  // Prepare form data
  const formData = new FormData();
  formData.append(FIELD_NAME, vcardData.name);
  formData.append(FIELD_EMAIL, vcardData.email);
  formData.append(FIELD_COMPANY, vcardData.company || 'unspecified');
  formData.append(FIELD_TITLE, vcardData.title || 'unspecified');

  fetch(GOOGLE_FORM_RESPONSE_URL, {
    method: "POST",
    mode: "no-cors",
    body: formData
  }).then(() => {
    formStatusDiv.innerHTML = `
      <p>✓ Submitted successfully!</p>
      <button id="scan-another-btn" class="secondary-btn">Scan Another Code</button>
    `;
    formStatusDiv.className = 'success';
    submitBtn.style.display = 'none';
    
    // Add event listener for scan another button
    document.getElementById('scan-another-btn').addEventListener('click', () => {
      resetUI();
      startCamera();
    });
  }).catch(() => {
    // Note: with mode: "no-cors", I'm fairly sure fetch will never reject, so we're not able to catch bad http reponses here
    formStatusDiv.textContent = "Error submitting form.";
    formStatusDiv.className = 'error';
    submitBtn.disabled = false;
  });
});

// Initialize camera on page load
startCamera();
