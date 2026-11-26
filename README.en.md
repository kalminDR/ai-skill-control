# Skill Control Beta

[Magyar útmutató](README.md)

A local workbench for the Codex skills on your computer. Browse installed skills, plugins and MCP declarations, prepare workflows, and review staged playbooks in English or Hungarian.

## Run locally

Use Python 3.11 or newer and a current desktop browser. Extract the entire source folder before launching. Python dependencies are included. Git is optional for project repository status.

| System | From the extracted folder |
| --- | --- |
| Windows | Double-click `Start Windows.cmd`, or run `py -3 server.py --open` |
| macOS | Run `python3 server.py --open` in Terminal |
| Linux | Run `python3 server.py --open` in a terminal |

The launcher opens a loopback address with a private, per-run access key. If the browser does not open, use the link printed in your terminal. Keep that link private. Close the service in Settings or press Ctrl+C in its terminal. Your language choice is saved in the local workspace.

## What belongs to each user

On first launch the workspace has a single empty project profile. Add a directory under Projects to include its project-specific evidence. Refresh inventory after adding, disabling or removing a skill. The app reads supported local Codex discovery roots, config and plugin metadata. It omits credentials and environment values from the inventory. Runtime tool authorization and Codex session activation can require confirmation in Codex.

Preferences, projects, notes and prompt history live in `Skill Control Beta/workspace.sqlite` under the current user's Application Support, Local AppData, or XDG data directory. Keep this database outside the source tree. There is no telemetry or remote workspace synchronization.

## Workflow and playbook availability

A required skill must resolve to an eligible, unambiguous installation with the reviewed instructions and requested mode. A missing optional skill can limit a recommendation. Skill-free steps are marked as manual checkpoints. The copy actions read a fresh inventory for the selected project. A complete playbook requires all mandatory stages and at least one eligible skill. Review current dependencies shows the exact saved prompt, including edits. Copy saved text checks the current project and skill inventory again. Open workflow template rebuilds the task from its configuration. The application prepares text for a human to review in Codex.

## Discovering and importing skills

In Skill Library, search the official OpenAI plugins repository on GitHub, or enter the absolute local path of a previously downloaded standalone skill folder. Load official catalog retrieves a public file index only on request. Filtering happens locally. Open a result to inspect the source at the indexed commit in your browser. Your search and inventory are not sent to GitHub.

Preview shows the complete instructions, destination and SHA-256 before writing anything. A separate confirmation imports those exact reviewed bytes into the current user's `~/.agents/skills/<name>/SKILL.md`. Review tickets expire after five minutes and are single-use. Existing destinations, links, non-regular files and packages containing additional files are refused. Import requires a local filesystem supporting hard links. No scripts, dependency installation, credential discovery or account connections run during import.

Read the instructions for file access, tool calls and external destinations. A checksum identifies bytes. It does not certify the author or certify that the instructions are safe. Treat unknown publishers and instructions requesting unrelated access as reasons to skip installation. For a multi-file skill review the whole package separately. To reverse an import, move its individual skill folder outside the discovery root and refresh inventory.

## Verification

Run `python -m unittest discover -s tests` with Python 3.11 or newer. If Node 22+ is available, run `node tests/catalog.cjs` and `node tests/availability.mjs`. Tests use synthetic skill data and temporary directories. The optional manual GitHub Actions workflow runs the suite on Windows, macOS and Linux when you select **Actions → Test portable beta → Run workflow** in your GitHub repository.

The app is a source beta. The distribution does not include a bundled Python runtime, signed installer or updater. Third-party license and source details are in [THIRD_PARTY.md](THIRD_PARTY.md).
