# 🌳 TreeNote

> A hierarchical, cloud-synced notes app with a Word-like rich-text editor, zoomable tree diagram, and full offline support — built with React + Firebase.

![TreeNote](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFA611?logo=firebase&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome%20(with%20approval)-orange)

---

## ✨ Features

| Feature | Details |
|---|---|
| 🌲 **Hierarchical tree** | Organize notes into modules, submodules, and topics of unlimited depth |
| 📝 **Rich text editor** | Word-like formatting: Bold, Italic, Underline, Headings, Lists, Alignment, Indent, Code blocks, Quotes |
| 🔤 **Font picker** | 8 fonts (JetBrains Mono, Fira Code, Inter, Merriweather, Georgia…) + 12 size options |
| 🔍 **Zoomable tree diagram** | Full-screen SVG diagram — pinch/scroll to zoom, drag to pan, click node to open |
| 📱 **Mobile-ready PWA** | Installable as an app, works offline, touch gestures |
| ☁️ **Cloud sync** | Firestore backend with LZ-String compression to reduce storage by ~60% |
| 🔌 **Offline-first** | IndexedDB caching — open and edit notes with no internet connection |
| 📤 **Export** | Download a note as `.txt`, export a topic subtree, or export **all** notes as a structured ZIP |
| 📂 **Local file link** | Open a `.txt`/`.md` from disk — edits auto-sync back to the local file on every cloud save (Chrome/Edge) |
| 🔐 **Auth** | Email magic-link (passwordless) — no passwords, no CAPTCHA |

---

## 🚀 Deploy Your Own Instance

You can self-host TreeNote completely free using **Firebase + Vercel** (or any static host).

### Step 1 — Fork this repository

Click **Fork** at the top-right of this page, then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/TreeNote.git
cd TreeNote
npm install
```

### Step 2 — Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com) → **Create a project**
2. **Authentication** → Sign-in method → enable **Email/Password** and turn on **Email link (passwordless sign-in)**
3. **Firestore Database** → Create database → start in **production mode**
4. **Project Settings** → Your apps → **Add app** (Web) → copy the config object

### Step 3 — Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and paste your Firebase values:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Step 4 — Add Firestore Security Rules

In the Firebase Console → Firestore → **Rules**, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Step 5 — Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) 

### Step 6 — Deploy to Vercel (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push your fork to GitHub (the env file is gitignored — add the variables in Vercel's dashboard)
2. Import the repo on [vercel.com](https://vercel.com)
3. Under **Environment Variables**, add all six `VITE_FIREBASE_*` keys
4. Click **Deploy** — done! 🎉

> **Alternative: Firebase Hosting**
> ```bash
> npm install -g firebase-tools
> firebase login
> firebase init hosting   # select "dist" as public dir, SPA = yes
> npm run build
> firebase deploy
> ```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19, Vite 8 |
| Styling | Vanilla CSS + Google Fonts |
| Auth | Firebase Authentication (magic-link) |
| Database | Cloud Firestore |
| Offline | IndexedDB (custom caching layer) |
| Compression | LZ-String (~60% smaller notes) |
| PWA | vite-plugin-pwa (Workbox) |
| Export | JSZip |
| Rich text | Native `contentEditable` + `document.execCommand` |

---

## 🤝 Contributing

Contributions are very welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

**TL;DR:**
- Fork → branch → commit → open a Pull Request
- All PRs are reviewed and **must be approved by the repository owner** before merging
- Be respectful and keep changes focused

---

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/          # Login screen, email magic-link
│   ├── layout/        # Header, app shell
│   ├── notes/         # Rich text editor (NoteEditor)
│   └── tree/          # Sidebar, TreeNode, TreeDiagram, AddNodeModal
├── context/
│   ├── AuthContext.jsx
│   └── NotesContext.jsx  # All note state + Firestore sync
└── utils/
    ├── cache.js       # IndexedDB caching layer
    ├── compress.js    # LZ-String compression helpers
    ├── fileOps.js     # Download / ZIP export / local file sync
    └── treeHelpers.js # Tree CRUD + Firestore mutations
```

---

## 📄 License

MIT — see [LICENSE](./LICENSE).

You are free to fork, self-host, and modify this project for personal or commercial use.
If you make improvements, consider opening a PR to share them with everyone! 🙏
