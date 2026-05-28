# Contributing to TreeNote

Thank you for taking the time to contribute! 🎉

TreeNote welcomes bug reports, feature ideas, documentation fixes, and code improvements from everyone. To keep the project high-quality, **all contributions go through a Pull Request review and must be approved by the repository owner before merging**.

---

## 📋 Before You Start

- Check the [Issues](../../issues) tab — your idea or bug might already be tracked
- For large features, open an **Issue** first to discuss the approach before spending time on code
- Keep PRs focused — one logical change per PR is easier to review

---

## 🔀 Contribution Workflow

```
Fork → Clone → Branch → Code → Test → PR → Review → Merge ✅
```

### 1. Fork & Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_USERNAME/TreeNote.git
cd TreeNote
npm install
cp .env.example .env   # fill in your Firebase credentials
npm run dev
```

### 2. Create a branch

Use a descriptive branch name:

```bash
git checkout -b fix/export-zip-structure
git checkout -b feat/markdown-preview
git checkout -b docs/improve-readme
```

### 3. Make your changes

- Follow the existing code style (no extra dependencies unless really needed)
- Add comments for non-obvious logic
- Test on both desktop and mobile if touching UI

### 4. Commit

Use clear commit messages:

```
feat: add markdown preview toggle
fix: zip export creates correct folder structure
docs: add Netlify deployment guide
style: improve formatting toolbar spacing
```

### 5. Open a Pull Request

- Target the `main` branch
- Fill out the PR description: **what** changed and **why**
- Reference any related issue with `Closes #123`

The owner will review your PR, may request changes, and will merge it once approved.

---

## 🐛 Reporting Bugs

Open an [Issue](../../issues/new) with:
- Steps to reproduce
- Expected vs actual behaviour
- Browser / OS

---

## 💡 Feature Requests

Open an [Issue](../../issues/new) describing:
- The use case / problem it solves
- Your proposed solution (optional)

---

## 📐 Code Style

- **React**: functional components + hooks only
- **CSS**: Vanilla CSS inside `src/index.css` using the existing design token variables
- **No extra UI libraries** — keep the bundle small
- Avoid `any` patterns and console.log left in production paths

---

## 📄 License

By contributing you agree that your changes will be released under the project's [MIT License](./LICENSE).
