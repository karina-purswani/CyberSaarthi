# 🛡️ CyberSaarthi

### AI-Powered Cyber Fraud Reporting & Assistance Platform

**CyberSaarthi** is an AI-powered digital safety platform designed to simplify and accelerate the process of reporting cyber fraud and digital payment scams.

The platform helps users convert a confusing fraud incident into a structured complaint by combining **voice-based complaint input, evidence processing, fraud analysis, risk assessment, and automated complaint generation**.

> 🚧 **Project Status:** Prototype / Active Development

---

## 🎯 Problem

Cyber fraud victims often struggle to:

- Understand what information is important to report
- Organize screenshots, transaction details, and other evidence
- Identify suspicious transaction patterns
- Prepare a properly structured cyber-crime complaint
- Navigate the reporting process quickly during a stressful situation

CyberSaarthi aims to make this process **simpler, faster, and more accessible**.

---

## 💡 Solution

CyberSaarthi provides a guided workflow:

```text
User reports the incident
        ↓
Voice / Text Complaint
        ↓
Evidence Upload
        ↓
Information Extraction
        ↓
Fraud Pattern Analysis
        ↓
Risk Assessment
        ↓
Complaint Generation
        ↓
Structured Case Record
```

The goal is to reduce the effort required from a victim while ensuring that important information is captured in a structured format.

---

## ✨ Key Features

### 🗣️ Voice-Based Complaint

Users can describe their incident naturally instead of manually filling lengthy forms.

### 📎 Evidence Processing

Users can provide supporting evidence such as:

- Payment screenshots
- Transaction details
- Chat screenshots
- Documents
- Other relevant files

### 🤖 AI-Assisted Analysis

The platform is designed to analyze complaint information and identify potentially relevant fraud patterns.

### ⚠️ Risk Assessment

Cases can be categorized based on the severity and indicators detected during analysis.

### 📄 Complaint Generation

CyberSaarthi converts the collected information into a structured complaint that can be reviewed before submission.

### 📊 Case Intelligence

The dashboard provides insights such as:

- Risk level
- Transaction information
- Fraud indicators
- Similar cases
- Case timeline

### 🌐 Multilingual Accessibility

The interface is designed with accessibility for Indian users in mind, including support for multiple languages.

---

## 🏗️ Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide Icons

### Backend / Database

- Supabase *(planned / integration in progress)*

### AI & Intelligence Layer

Planned components include:

- Speech-to-text
- OCR
- Information extraction
- Fraud pattern detection
- Risk scoring
- AI-assisted complaint generation

---

## 📁 Project Structure

```text
CyberSaarthi/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── data/
│   ├── context/
│   └── ...
│
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.*
├── tsconfig.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd CyberSaarthi
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The application will normally be available at:

```text
http://localhost:5173
```

---

## 🔐 Environment Variables

When backend services are integrated, create a `.env` file in the project root.

Example:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> ⚠️ Never commit `.env` files or private API keys to GitHub.

---

## 🛣️ Roadmap

- [x] Initial UI/UX prototype
- [x] Complaint workflow
- [x] Fraud analysis dashboard
- [x] Case intelligence interface
- [ ] Real voice input
- [ ] OCR-based evidence extraction
- [ ] Multilingual speech processing
- [ ] AI-powered fraud analysis
- [ ] Dynamic risk scoring
- [ ] Supabase database integration
- [ ] User authentication
- [ ] Real case history
- [ ] Automated complaint PDF generation
- [ ] Production deployment

---

## 🎯 Vision

CyberSaarthi aims to become a **digital companion for cyber-fraud victims**, helping them move from:

> **“I don't know what to do.”**

to

> **“My incident is documented, analyzed, and ready to report.”**

---

## ⚠️ Disclaimer

CyberSaarthi is an assistance and information-organization platform. It does not replace official law-enforcement authorities, banks, financial institutions, or professional legal advice.

Users should report cyber-fraud incidents through the appropriate official channels.

---

## 👩‍💻 Development

CyberSaarthi is currently under active development.

The project is being built with a focus on:

**Accessibility • AI • Cyber Safety • Automation • User Experience**

---

## 📜 License

License information will be added as the project progresses.