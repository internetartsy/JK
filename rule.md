# 📜 Repository Maintenance & Development Rules

To ensure the **AgriStack Verified System** remains clean, secure, and understandable for all developers, we follow these strict rules.

---

## 🏗️ 1. Branching Strategy
We maintain a simplified dual-branch structure:
*   **`main`**: The stable, production-ready branch. Only merge here when features are fully tested and documentation is updated.
*   **`jk_sub`**: The primary development branch. All feature branches should branch off and merge back into `jk_sub`.
*   **Feature Branches**: Use `feat/feature-name` or `fix/issue-description` for temporary work. Delete them immediately after merging.

---

## ✍️ 2. Commit Standards
Follow **Conventional Commits** to keep the history readable and automate changelogs:
*   `feat:` - A new feature.
*   `fix:` - A bug fix.
*   `docs:` - Documentation only changes.
*   `style:` - Changes that do not affect the meaning of the code (white-space, formatting).
*   `refactor:` - A code change that neither fixes a bug nor adds a feature.
*   `chore:` - Updating build tasks, package manager configs, etc.

---

## 🛡️ 3. Security & Privacy (GitIgnore Policy)
The following must **NEVER** be committed to the repository:
1.  **Secrets**: `.env` files, API keys, and database passwords.
2.  **Certificates**: SSL/TLS keys (`certs/` directory).
3.  **Local Configs**: `site_config.json` or any instance-specific settings.
4.  **Heavy Data**: Large `.sql` dumps, `.csv` exports, or binary datasets.
5.  **Snapshots**: Debug images (`.png`, `.webp`) and terminal logs.

---

## 📚 4. Documentation First
Code and documentation are a single unit.
*   Every new service or "Step" must be documented in the `documentation/` directory.
*   The `FULL_DOCUMENTATION_ARCHIVE.md` must be updated before merging into `main`.
*   Keep Mermaid diagrams updated with `flowchart TD` syntax and quoted labels for rendering compatibility.

---

## ⚙️ 5. Technical Principles (Motia)
All backend development must adhere to the **Motia Unified Architecture**:
*   **Stateless Steps**: Every function should be a stateless "Step" with clear inputs and outputs.
*   **Thinkable Design**: If you can't map the logic in a simple flowchart, it needs to be simplified.
*   **Doc1D Consistency**: Ensure the unique `Document 1D` is preserved across Rust, Python, and Frappe layers for traceability.

---

## 🧹 6. Repository Cleanup
*   Run `npm prune` or `pip autoremove` (if used) to keep dependencies lean.
*   Regularly delete merged local and remote branches.
*   Keep the root directory clean; move assets to appropriate sub-folders (e.g., `assets/`, `scripts/`).

---

**© 2026 JK Land Records Authority**
