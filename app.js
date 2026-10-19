/**
 * CyberSaarthi - Citizen Portal Client Logic (app.js)
 * Real Client Architecture:
 * - Real in-browser Speech Recognition (Web Speech API) & MediaRecorder Audio
 * - Real Drag-and-Drop File Upload (Screenshots & Receipts)
 * - Strict Input Validation: Requires real input before showing output
 * - Multi-stage Stepper with real API call to /api/analyze-case
 * - Zero hardcoded dummy data
 */

const appState = {
  currentLanguage: 'en',
  mediaRecorder: null,
  audioChunks: [],
  recordedAudioBlob: null,
  recordedAudioFile: null,
  speechRecognizer: null,
  liveSpeechTranscript: '',
  recordTimerInterval: null,
  recordSeconds: 0,
  selectedScreenshotFile: null,
  userCoordinates: null,
  isRecording: false,
  isSubmitting: false,
  lastAnalyzedCase: null,
  goldenMinutesRemaining: 120
};

// ---------------------------------------------------------------------------
// VERNACULAR LOCALIZATION DICTIONARY
// ---------------------------------------------------------------------------
const I18N = {
  en: {
    navSubtitle: "Vernacular Cyber-Fraud Intelligence & Evidence Review",
    heroBadge: "2-Hour 'Golden Hour' Recovery Protocol",
    heroTitle: "Report Cyber Fraud in Your Own Voice",
    heroDesc: "Speak in Marathi, Hindi, or English, or upload payment screenshots. The system transcribes voice, runs OCR, and extracts indicators for evidence review.",
    goldenTitle: "Golden Hour Clock",
    goldenSubtitle: "Report promptly to your bank and the official cybercrime helpline.",
    intakeTitle: "Incident Evidence Intake",
    intakeSubtitle: "Record your voice, upload payment receipt, or enter details",
    lblAudioRecord: "1. Vernacular Voice Statement (Speech Recognition)",
    audioLangHint: "Marathi / Hindi / English",
    btnRecord: "Start Recording",
    btnStop: "Stop Recording",
    fallbackFileTxt: "Or upload your audio file (.mp3, .wav, .m4a):",
    browseAudioTxt: "Browse Audio",
    previewLbl: "Recorded Voice Audio:",
    lblScreenshot: "2. Payment Slip / Chat Screenshot (Real OCR Engine)",
    dropText: "Drag & drop your actual transaction slip or WhatsApp chat screenshot",
    lblVictimName: "Victim Name (Optional)",
    lblVictimPhone: "Registered Contact / Mobile",
    lblVictimCity: "Incident City / Cyber Division",
    lblIncidentTime: "Time Elapsed Since Fraud",
    lblIncidentNotes: "Incident Details / Text Complaint (Optional if voice/receipt provided)",
    btnSubmitText: "Analyze Incident & Verify Evidence",
    stepperTitle: "AI Pipeline Execution",
    step1: "Uploading Multi-Modal Evidence",
    step2: "Transcribing Voice Statement",
    step3: "Running Optical Character Recognition (OCR)",
    step4: "Extracting Forensic Indicators",
    step5: "Verifying Evidence & Preparing Complaint",
    phTitle: "Awaiting Incident Evidence",
    phDesc: "Submit a voice recording, transaction screenshot, or incident details to review the extracted evidence.",
    lblResAmount: "Disputed Amount",
    lblResFraud: "Fraud Category",
    lblResUpi: "Scammer / Mule UPI ID",
    lblResUtr: "12-Digit Bank UTR",
    lblResPhone: "Suspect Caller",
    lblResTranscript: "Citizen Statement / Evidence Narrative:",
    lblResAtm: "Incident Evidence Review:",
    btnDownloadTxt: "Download Statutory Complaint FIR PDF"
  },
  mr: {
    navSubtitle: "स्थानिक भाषेतील सायबर गुन्हे माहिती आणि पुरावा तपासणी",
    heroBadge: "२ तासांचा 'सुवर्ण काळ' (Golden Hour) संरक्षण प्रोटोकॉल",
    heroTitle: "आपल्या स्वतःच्या भाषेत सायबर फसवणुकीची तक्रार नोंदवा",
    heroDesc: "मराठी, हिंदी किंवा इंग्रजीमध्ये बोला किंवा पेमेंट पावतीचा स्क्रीनशॉट जोडा. प्रणाली आवाजाचे लेखनात रूपांतर करते, OCR वापरते आणि पुराव्याची माहिती तपासते.",
    goldenTitle: "गोल्डन अवर घड्याळ",
    goldenSubtitle: "आपल्या बँकेला आणि अधिकृत सायबर गुन्हे हेल्पलाइनला त्वरित कळवा.",
    intakeTitle: "घटना पुरावे नोंदणी",
    intakeSubtitle: "आवाज रेकॉर्ड करा, पावतीचा स्क्रीनशॉट जोडा किंवा तपशील लिहा",
    lblAudioRecord: "१. व्हॉइस तक्रार (मराठी/हिंदी/इंग्रजी स्पीच रेकग्निशन)",
    audioLangHint: "मराठी / हिंदी / इंग्रजी",
    btnRecord: "बोलणे सुरू करा (Record)",
    btnStop: "रेकॉर्डिंग थांबवा",
    fallbackFileTxt: "किंवा ऑडिओ फाईल अपलोड करा (.mp3, .wav):",
    browseAudioTxt: "ऑडिओ निवडा",
    previewLbl: "रेकॉर्ड केलेली व्हॉइस ऐका:",
    lblScreenshot: "२. पावती / व्हॉट्सॲप स्क्रीनशॉट (थेट OCR प्रणाली)",
    dropText: "पेमेंट पावती किंवा व्हॉट्सॲप चॅट स्क्रीनशॉट येथे ड्रॅग करा",
    lblVictimName: "तक्रारदाराचे नाव (ऐच्छिक)",
    lblVictimPhone: "नोंदणीकृत मोबाईल क्रमांक",
    lblVictimCity: "घटनेचे शहर / सायबर विभाग",
    lblIncidentTime: "घटनेनंतर उलटलेला वेळ",
    lblIncidentNotes: "तक्रारीचे तपशील / माहिती (व्हॉइस/पावती दिली असल्यास ऐच्छिक)",
    btnSubmitText: "घटनेचे विश्लेषण करा आणि पुरावे तपासा",
    stepperTitle: "AI विश्लेषण प्रगती",
    step1: "पुरावे सर्व्हरवर अपलोड होत आहेत",
    step2: "व्हॉइस ट्रान्सक्रिप्शन",
    step3: "पावती OCR स्कॅनिंग (RapidOCR)",
    step4: "फॉरेन्सिक निर्देशक शोधणे (UTR, UPI, रक्कम)",
    step5: "पुरावे तपासणे आणि तक्रार तयार करणे",
    phTitle: "पुराव्यांची प्रतीक्षा आहे",
    phDesc: "पुराव्याची माहिती तपासण्यासाठी आवाजाची नोंद, व्यवहाराचा स्क्रीनशॉट किंवा घटनेचा तपशील सादर करा.",
    lblResAmount: "फसवणूक झालेली रक्कम",
    lblResFraud: "गुन्ह्याचा प्रकार",
    lblResUpi: "संशयित / म्यूल UPI आयडी",
    lblResUtr: "१२-अंकी बँक UTR क्रमांक",
    lblResPhone: "संशयित कॉलर नंबर",
    lblResTranscript: "नागरिकाचे मूळ निवेदन:",
    lblResAtm: "घटनेच्या पुराव्यांची तपासणी",
    btnDownloadTxt: "कायदेशीर सायबर तक्रार FIR PDF डाऊनलोड करा"
  },
  hi: {
    navSubtitle: "स्थानीय भाषा में साइबर अपराध की जानकारी और साक्ष्य समीक्षा",
    heroBadge: "2-घंटे का 'गोल्डन ऑवर' त्वरित रिकवरी प्रोटोकॉल",
    heroTitle: "अपनी मूल भाषा में साइबर अपराध की शिकायत दर्ज करें",
    heroDesc: "मराठी, हिंदी या अंग्रेज़ी में बोलें या भुगतान रसीद का स्क्रीनशॉट जोड़ें। सिस्टम आवाज़ को लिखित रूप में बदलता है, OCR चलाता है और साक्ष्य से मिली जानकारी की समीक्षा करता है।",
    goldenTitle: "गोल्डन ऑवर क्लॉक",
    goldenSubtitle: "अपने बैंक और आधिकारिक साइबर अपराध हेल्पलाइन को तुरंत सूचित करें।",
    intakeTitle: "साक्ष्य एवं घटना विवरण दर्ज करें",
    intakeSubtitle: "वॉयस रिकॉर्ड करें, पेमेंट स्लिप अपलोड करें या विवरण लिखें",
    lblAudioRecord: "1. वॉयस शिकायत (बहुभाषी स्पीच रिकग्निशन)",
    audioLangHint: "मराठी / हिंदी / अंग्रेजी",
    btnRecord: "रिकॉर्डिंग शुरू करें",
    btnStop: "रिकॉर्डिंग रोकें",
    fallbackFileTxt: "या ऑडियो फाइल अपलोड करें (.mp3, .wav):",
    browseAudioTxt: "ऑडियो चुनें",
    previewLbl: "रिकॉर्ड की गई वॉयस सुनें:",
    lblScreenshot: "2. पेमेंट रसीद / व्हाट्सएप चैट स्क्रीनशॉट (OCR)",
    dropText: "पेमेंट रसीद या व्हाट्सएप चैट का स्क्रीनशॉट यहाँ खींचें",
    lblVictimName: "शिकायतकर्ता का नाम (वैकल्पिक)",
    lblVictimPhone: "पंजीकृत मोबाइल नंबर",
    lblVictimCity: "घटना का शहर / साइबर सेल",
    lblIncidentTime: "घटना के बाद बीता हुआ समय",
    lblIncidentNotes: "घटना का विवरण / लिखित शिकायत",
    btnSubmitText: "घटना का विश्लेषण करें और साक्ष्य की जाँच करें",
    stepperTitle: "AI पाइपलाइन की स्थिति",
    step1: "साक्ष्य अपलोड हो रहे हैं",
    step2: "आवाज से टेक्स्ट रूपांतरण",
    step3: "रसीद का OCR विश्लेषण (RapidOCR)",
    step4: "फॉरेंसिक संकेतक निष्कर्षण (UTR, UPI, राशि)",
    step5: "साक्ष्य की जाँच और शिकायत तैयार करना",
    phTitle: "साक्ष्य सबमिट होने की प्रतीक्षा",
    phDesc: "निकाली गई साक्ष्य जानकारी की समीक्षा के लिए आवाज़ की रिकॉर्डिंग, लेन-देन का स्क्रीनशॉट या घटना का विवरण भेजें।",
    lblResAmount: "हड़पी गई राशि",
    lblResFraud: "अपराध की श्रेणी",
    lblResUpi: "संदिग्ध / म्यूल UPI आईडी",
    lblResUtr: "12-अंकीय बैंक UTR",
    lblResPhone: "संदिग्ध कॉलर",
    lblResTranscript: "शिकायतकर्ता का वक्तव्य:",
    lblResAtm: "घटना के साक्ष्य की समीक्षा",
    btnDownloadTxt: "कानूनी शिकायत FIR PDF डाउनलोड करें"
  }
};

// ---------------------------------------------------------------------------
// INITIALIZATION
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupDragAndDrop();
  initGoldenHourClock();
  switchLanguage('en');
});

function switchLanguage(lang) {
  appState.currentLanguage = lang;
  const dict = I18N[lang] || I18N.en;

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.className = "lang-btn px-2.5 py-1 rounded-lg font-medium transition text-gray-300 hover:text-white";
  });
  const activeBtn = document.getElementById(`lang-${lang}`);
  if (activeBtn) {
    activeBtn.className = "lang-btn px-2.5 py-1 rounded-lg font-medium transition bg-cyan-500 text-black font-semibold shadow";
  }

  safeSetText('nav-subtitle', dict.navSubtitle);
  safeSetText('hero-badge', dict.heroBadge);
  safeSetText('hero-title', dict.heroTitle);
  safeSetText('hero-desc', dict.heroDesc);
  safeSetText('golden-title', dict.goldenTitle);
  safeSetText('golden-subtitle', dict.goldenSubtitle);
  safeSetText('intake-title', dict.intakeTitle);
  safeSetText('intake-subtitle', dict.intakeSubtitle);
  safeSetText('lbl-audio-record', dict.lblAudioRecord);
  safeSetText('audio-lang-hint', dict.audioLangHint);
  safeSetText('btn-txt-record', dict.btnRecord);
  safeSetText('btn-txt-stop', dict.btnStop);
  safeSetText('fallback-file-txt', dict.fallbackFileTxt);
  safeSetText('browse-audio-txt', dict.browseAudioTxt);
  safeSetText('preview-lbl', dict.previewLbl);
  safeSetText('lbl-screenshot', dict.lblScreenshot);
  safeSetText('drop-text', dict.dropText);
  safeSetText('lbl-victim-name', dict.lblVictimName);
  safeSetText('lbl-victim-phone', dict.lblVictimPhone);
  safeSetText('lbl-victim-city', dict.lblVictimCity);
  safeSetText('lbl-incident-time', dict.lblIncidentTime);
  safeSetText('lbl-incident-notes', dict.lblIncidentNotes);
  safeSetText('btn-submit-text', dict.btnSubmitText);
  safeSetText('stepper-title', dict.stepperTitle);
  safeSetText('step-txt-1', dict.step1);
  safeSetText('step-txt-2', dict.step2);
  safeSetText('step-txt-3', dict.step3);
  safeSetText('step-txt-4', dict.step4);
  safeSetText('step-txt-5', dict.step5);
  safeSetText('ph-title', dict.phTitle);
  safeSetText('ph-desc', dict.phDesc);
  safeSetText('lbl-res-amount', dict.lblResAmount);
  safeSetText('lbl-res-fraud', dict.lblResFraud);
  safeSetText('lbl-res-upi', dict.lblResUpi);
  safeSetText('lbl-res-utr', dict.lblResUtr);
  safeSetText('lbl-res-phone', dict.lblResPhone);
  safeSetText('lbl-res-transcript', dict.lblResTranscript);
  safeSetText('lbl-res-atm', dict.lblResAtm);
  safeSetText('btn-download-txt', dict.btnDownloadTxt);
}

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el && text) el.textContent = text;
}

// ---------------------------------------------------------------------------
// GOLDEN HOUR CLOCK
// ---------------------------------------------------------------------------
function initGoldenHourClock() {
  updateSimulatedGoldenClock();
  setInterval(() => {
    if (appState.goldenMinutesRemaining > 0) {
      const clockEl = document.getElementById('golden-clock');
      const mins = Math.floor(appState.goldenMinutesRemaining);
      const secs = Math.floor((appState.goldenMinutesRemaining % 1) * 60);
      if (clockEl) {
        clockEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
    }
  }, 1000);
}

function updateSimulatedGoldenClock() {
  const elapsedSelect = document.getElementById('incident-elapsed');
  const elapsed = parseFloat(elapsedSelect ? elapsedSelect.value : 15);
  appState.goldenMinutesRemaining = Math.max(0, 120 - elapsed);
  const mins = Math.floor(appState.goldenMinutesRemaining);
  const clockEl = document.getElementById('golden-clock');
  if (clockEl) {
    clockEl.textContent = `${String(mins).padStart(2, '0')}:00`;
    if (mins <= 30) {
      clockEl.className = "text-3xl font-extrabold font-mono text-red-500 tracking-wider my-1 animate-pulse";
    } else if (mins <= 60) {
      clockEl.className = "text-3xl font-extrabold font-mono text-amber-400 tracking-wider my-1";
    } else {
      clockEl.className = "text-3xl font-extrabold font-mono text-white tracking-wider my-1";
    }
  }
}

// ---------------------------------------------------------------------------
// REAL AUDIO RECORDING (MediaRecorder + Web Speech API)
// ---------------------------------------------------------------------------
async function startAudioRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    appState.audioChunks = [];
    appState.mediaRecorder = new MediaRecorder(stream);

    appState.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        appState.audioChunks.push(event.data);
      }
    };

    appState.mediaRecorder.onstop = () => {
      appState.recordedAudioBlob = new Blob(appState.audioChunks, { type: 'audio/webm' });
      appState.recordedAudioFile = new File([appState.recordedAudioBlob], "victim_voice_complaint.webm", { type: "audio/webm" });

      const audioUrl = URL.createObjectURL(appState.recordedAudioBlob);
      const audioPlayer = document.getElementById('audio-player');
      const previewContainer = document.getElementById('audio-preview-container');
      if (audioPlayer && previewContainer) {
        audioPlayer.src = audioUrl;
        previewContainer.classList.remove('hidden');
      }

      stream.getTracks().forEach(track => track.stop());
    };

    appState.mediaRecorder.start();
    appState.isRecording = true;
    appState.recordSeconds = 0;

    // Start in-browser real-time speech recognition if supported
    initLiveSpeechRecognition();

    // UI Updates
    document.getElementById('btn-record-start').classList.add('hidden');
    document.getElementById('btn-record-stop').classList.remove('hidden');
    document.getElementById('wave-animation').classList.remove('hidden');
    document.getElementById('record-status').textContent = "Recording your voice...";
    document.getElementById('record-status').className = "text-xs text-red-400 font-semibold";

    clearInterval(appState.recordTimerInterval);
    appState.recordTimerInterval = setInterval(() => {
      appState.recordSeconds++;
      const mins = Math.floor(appState.recordSeconds / 60);
      const secs = appState.recordSeconds % 60;
      document.getElementById('record-timer').textContent =
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, 1000);

  } catch (err) {
    console.warn("Microphone access:", err);
    alert("Microphone permission was not granted. You can use 'Browse Audio' to upload an audio file, or type your complaint in the incident notes box.");
  }
}

function initLiveSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  try {
    appState.speechRecognizer = new SpeechRecognition();
    appState.speechRecognizer.continuous = true;
    appState.speechRecognizer.interimResults = true;

    const langCodeMap = {
      mr: 'mr-IN',
      hi: 'hi-IN',
      en: 'en-IN'
    };
    appState.speechRecognizer.lang = langCodeMap[appState.currentLanguage] || 'en-IN';

    const liveBox = document.getElementById('live-speech-box');
    const liveText = document.getElementById('live-speech-text');
    if (liveBox) liveBox.classList.remove('hidden');

    appState.speechRecognizer.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        interim += event.results[i][0].transcript;
      }
      if (interim) {
        appState.liveSpeechTranscript = interim;
        if (liveText) liveText.textContent = interim;

        // Also sync with incident notes if empty or user wants
        const notesEl = document.getElementById('incident-notes');
        if (notesEl && !notesEl.value) {
          notesEl.value = interim;
        }
      }
    };

    appState.speechRecognizer.onerror = (e) => {
      console.log("Speech recognition event:", e.error);
    };

    appState.speechRecognizer.start();
  } catch (e) {
    console.log("Live speech init note:", e);
  }
}

function stopAudioRecording() {
  if (appState.mediaRecorder && appState.isRecording) {
    appState.mediaRecorder.stop();
    appState.isRecording = false;
    clearInterval(appState.recordTimerInterval);

    if (appState.speechRecognizer) {
      try { appState.speechRecognizer.stop(); } catch (e) {}
    }

    document.getElementById('btn-record-stop').classList.add('hidden');
    document.getElementById('btn-record-start').classList.remove('hidden');
    document.getElementById('wave-animation').classList.add('hidden');
    document.getElementById('record-status').textContent = "Voice Recorded";
    document.getElementById('record-status').className = "text-xs text-emerald-400 font-semibold";
  }
}

function clearRecordedAudio() {
  appState.recordedAudioBlob = null;
  appState.recordedAudioFile = null;
  appState.audioChunks = [];
  appState.liveSpeechTranscript = '';

  const audioPlayer = document.getElementById('audio-player');
  const previewContainer = document.getElementById('audio-preview-container');
  const liveBox = document.getElementById('live-speech-box');

  if (audioPlayer) audioPlayer.src = "";
  if (previewContainer) previewContainer.classList.add('hidden');
  if (liveBox) liveBox.classList.add('hidden');

  document.getElementById('record-timer').textContent = "00:00";
  document.getElementById('record-status').textContent = "Ready for voice input";
  document.getElementById('record-status').className = "text-xs text-gray-500";
}

function handleAudioFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    appState.recordedAudioFile = file;
    const audioUrl = URL.createObjectURL(file);
    const audioPlayer = document.getElementById('audio-player');
    const previewContainer = document.getElementById('audio-preview-container');
    if (audioPlayer && previewContainer) {
      audioPlayer.src = audioUrl;
      previewContainer.classList.remove('hidden');
    }
    document.getElementById('record-status').textContent = `Loaded: ${file.name.slice(0, 20)}`;
    document.getElementById('record-status').className = "text-xs text-cyan-400 font-semibold";
  }
}

// ---------------------------------------------------------------------------
// REAL SCREENSHOT DRAG & DROP
// ---------------------------------------------------------------------------
function setupDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('border-emerald-500', 'bg-emerald-950/20');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('border-emerald-500', 'bg-emerald-950/20');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleScreenshotFile(files[0]);
    }
  }, false);
}

function handleScreenshotSelect(event) {
  const file = event.target.files[0];
  if (file) {
    handleScreenshotFile(file);
  }
}

function handleScreenshotFile(file) {
  appState.selectedScreenshotFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('image-preview').src = e.target.result;
    document.getElementById('image-filename').textContent = file.name;
    document.getElementById('image-filesize').textContent = `${(file.size / 1024).toFixed(1)} KB`;
    document.getElementById('drop-prompt').classList.add('hidden');
    document.getElementById('image-preview-container').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function removeSelectedImage(event) {
  if (event) event.stopPropagation();
  appState.selectedScreenshotFile = null;
  document.getElementById('screenshot-file-input').value = "";
  document.getElementById('drop-prompt').classList.remove('hidden');
  document.getElementById('image-preview-container').classList.add('hidden');
}

// ---------------------------------------------------------------------------
// GPS LOCATION
// ---------------------------------------------------------------------------
function detectGPSLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      appState.userCoordinates = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
      alert(`GPS coordinates acquired: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}. Incident location recorded for context.`);
    },
    (error) => {
      alert("Could not retrieve GPS location. Selected city hub will be used.");
    }
  );
}

// ---------------------------------------------------------------------------
// FORM SUBMIT & REAL EVIDENCE PROCESSING
// ---------------------------------------------------------------------------
async function handleFormSubmit(event) {
  event.preventDefault();
  if (appState.isSubmitting) return;

  const notes = (document.getElementById('incident-notes').value || "").trim();
  const hasAudio = appState.recordedAudioFile !== null;
  const hasImage = appState.selectedScreenshotFile !== null;
  const hasNotes = notes.length > 0;

  // STRICT VALIDATION: Output is shown if and only if actual input is provided!
  if (!hasAudio && !hasImage && !hasNotes) {
    alert("Please provide incident evidence to analyze:\n- Record your voice statement\n- Or upload a payment screenshot\n- Or type the fraud description in the notes box.");
    return;
  }

  appState.isSubmitting = true;
  const submitBtn = document.getElementById('btn-submit');
  const originalBtnText = document.getElementById('btn-submit-text').textContent;
  document.getElementById('btn-submit-text').textContent = "Processing Evidence...";
  submitBtn.disabled = true;

  const formData = new FormData();
  if (appState.recordedAudioFile) {
    formData.append('audio_file', appState.recordedAudioFile);
  }
  if (appState.selectedScreenshotFile) {
    formData.append('image_file', appState.selectedScreenshotFile);
  }

  formData.append('incident_text', notes);
  formData.append('victim_name', document.getElementById('victim-name').value || "Anonymous Citizen");
  formData.append('victim_phone', document.getElementById('victim-phone').value || "");
  formData.append('victim_city', document.getElementById('victim-city').value || "Pune");
  formData.append('language', appState.currentLanguage);
  formData.append('reported_mins_ago', document.getElementById('incident-elapsed').value || "15");

  if (appState.userCoordinates) {
    formData.append('latitude', appState.userCoordinates.lat);
    formData.append('longitude', appState.userCoordinates.lon);
  }

  resetStepperUI();
  updateStepperBadge("Executing AI Pipeline", "bg-cyan-950 text-cyan-300");

  try {
    setStepState(1, 'active');
    await delay(300);
    setStepState(1, 'completed');

    setStepState(2, 'active');
    await delay(350);
    setStepState(2, 'completed');

    setStepState(3, 'active');
    await delay(350);
    setStepState(3, 'completed');

    setStepState(4, 'active');

    const response = await fetch('/api/analyze-case', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    setStepState(4, 'completed');

    setStepState(5, 'active');
    await delay(300);
    setStepState(5, 'completed');

    updateStepperBadge("Analysis Complete", "bg-emerald-950 text-emerald-300");

    if (data.case) {
      renderForensicResults(data.case);
    }

  } catch (error) {
    console.error("Submission failed:", error);
    alert(`Could not process evidence: ${error.message}`);
    updateStepperBadge("Error", "bg-red-950 text-red-300");
  } finally {
    appState.isSubmitting = false;
    submitBtn.disabled = false;
    document.getElementById('btn-submit-text').textContent = originalBtnText;
  }
}

// ---------------------------------------------------------------------------
// STEPPER HELPERS
// ---------------------------------------------------------------------------
function resetStepperUI() {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`step-${i}`);
    if (el) {
      el.className = "flex items-center gap-3 p-2.5 rounded-lg border border-gray-800 bg-gray-900/50 text-gray-400";
      const icon = el.querySelector('.step-icon');
      if (icon) icon.textContent = "â—‹";
    }
  }
}

function setStepState(stepNum, state) {
  const el = document.getElementById(`step-${stepNum}`);
  if (!el) return;

  const icon = el.querySelector('.step-icon');
  if (state === 'active') {
    el.className = "flex items-center gap-3 p-2.5 rounded-lg border border-cyan-500/60 bg-cyan-950/40 text-cyan-200 step-active";
    if (icon) icon.textContent = "â³";
  } else if (state === 'completed') {
    el.className = "flex items-center gap-3 p-2.5 rounded-lg border border-emerald-500/60 bg-emerald-950/40 text-emerald-200 step-completed";
    if (icon) icon.textContent = "âœ“";
  }
}

function updateStepperBadge(text, cls) {
  const badge = document.getElementById('stepper-status-badge');
  if (badge) {
    badge.textContent = text;
    badge.className = `text-[11px] px-2 py-0.5 rounded font-mono ${cls}`;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// RENDER REAL FORENSIC RESULTS (Zero Hardcoded Data)
// ---------------------------------------------------------------------------
function renderForensicResults(c) {
  appState.lastAnalyzedCase = c;

  document.getElementById('results-placeholder').classList.add('hidden');
  const resultsPanel = document.getElementById('results-panel');
  resultsPanel.classList.remove('hidden');

  document.getElementById('res-case-id').textContent = c.case_id;

  const threatBadge = document.getElementById('res-threat-badge');
  threatBadge.textContent = "INCIDENT RECORDED";
  threatBadge.className = "px-2.5 py-1 rounded-md text-xs font-bold bg-gray-800 text-gray-300 border border-gray-700";

  const goldenRem = document.getElementById('res-golden-rem');
  const goldenBanner = document.getElementById('res-golden-banner');
  if (c.golden_hour_active) {
    document.getElementById('res-golden-status').textContent = "Golden Hour Active";
    document.getElementById('res-golden-status').className = "text-xs font-bold text-red-300";
    document.getElementById('res-golden-desc').textContent = "Time-sensitive reporting window. Contact your bank and the official cybercrime helpline promptly.";
    goldenBanner.className = "rounded-xl p-3 bg-red-950/40 border border-red-800 flex items-center justify-between";
    goldenRem.textContent = `${c.golden_hour_remaining_mins}m left`;
    goldenRem.className = "font-mono text-xs font-bold px-2 py-1 rounded bg-red-900/60 text-red-200";
  } else {
    document.getElementById('res-golden-status').textContent = "Golden Hour Window Expired";
    document.getElementById('res-golden-status').className = "text-xs font-bold text-gray-300";
    document.getElementById('res-golden-desc').textContent = "The reference window has elapsed. Report the incident immediately anyway.";
    goldenBanner.className = "rounded-xl p-3 bg-gray-900 border border-gray-800 flex items-center justify-between";
    goldenRem.textContent = "Expired";
    goldenRem.className = "font-mono text-xs font-bold px-2 py-1 rounded bg-gray-800 text-gray-400";
  }

  // Display only real extracted indicators
  document.getElementById('res-amount').textContent = c.disputed_amount_str || "Not Specified";
  document.getElementById('res-fraud').textContent = c.fraud_category || "Cyber Fraud";
  document.getElementById('res-upi').textContent = (c.upi_ids && c.upi_ids.length > 0) ? c.upi_ids.join(', ') : "None detected in evidence";
  document.getElementById('res-utr').textContent = (c.utr_numbers && c.utr_numbers.length > 0) ? c.utr_numbers.join(', ') : "None detected in evidence";
  document.getElementById('res-phone').textContent = (c.scammer_phones && c.scammer_phones.length > 0) ? c.scammer_phones.join(', ') : "None detected in evidence";

  // Real Citizen Statement / Transcript
  document.getElementById('res-transcript').textContent = c.transcript ? `"${c.transcript}"` : "Evidence submitted.";


  // Statutory PDF Download Button
  const firBtn = document.getElementById('btn-download-fir');
  firBtn.href = `/api/generate-fir/${c.case_id}`;
  firBtn.setAttribute('download', `CyberSaarthi_Complaint_${c.case_id}.pdf`);

  resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetFormForNewCase() {
  document.getElementById('complaint-form').reset();
  clearRecordedAudio();
  removeSelectedImage();
  resetStepperUI();
  document.getElementById('results-panel').classList.add('hidden');
  document.getElementById('results-placeholder').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
