# Working together in GitLab

[فارسی](gitlab-workflow.fa.md)

Give each task an issue, one assignee, an expected result and acceptance checks. Start with one active task per person. Split work larger than a day or two into reviewable changes.

## Issue to merge

Move the issue to **در حال انجام** (Doing). Start from current main; replace the example issue number 123 with the real number:

```bash
git status
git switch main
git pull --ff-only
git switch -c feature/123-short-description
```

Resolve ownership of uncommitted work before pulling or switching branches. Implement the change, run affected checks, then stage only intended files. Replace the example file path below:

```bash
git diff
git add path/to/changed-file
git diff --cached
git commit -m "Describe the change"
git push -u origin HEAD
glab mr create --draft --template Default.en
```

These commands work in Bash and PowerShell. Default is the Persian MR template; Default.en is English. Explain the resulting behavior and actual verification. Use `Closes #123` only when the task is complete. Include synthetic screenshots for visible changes.

Remove Draft when ready, choose a reviewer, and move the issue to **منتظر بررسی** (Review). A teammate can give an initial review; a Maintainer performs the final review and merge. Resolve discussions after implementing the request or reaching agreement. Temporary source branches are removed after merge; close completed issues.

## Board labels

| Label | Meaning |
| --- | --- |
| آماده | Ready: scope and acceptance are clear. |
| در حال انجام | Doing: one person owns current work. |
| منتظر بررسی | Review: an MR is ready for review. |
| نیاز به پیگیری | Blocked: record the missing answer, access or decision. |

Use one of the three main states at a time. The blocked label can accompany the current state. Types are **باگ** (Bug), **قابلیت جدید** (Feature), **نگهداری** (Maintenance) and **مستندات** (Documentation). Closed issues are the Done column.

## Get help and release

After a concrete attempt, record what you tried, the result and the specific help needed in the issue. Include tool versions, the command and a short sanitized error.

main is shared. All changes enter through MRs; direct and force pushes are disabled. Maintainers review and merge. CI success proves validation, not a production release. A project maintainer explicitly executes and verifies deployment.

Obtain secrets through the maintainer's designated channel. Keep them out of Git, issues, MRs and captures. Use synthetic accounts and local data for tests.

[This project’s startup guide](development.md) · [Issues](https://git.alpagency.net/alp/gandom-kiosk/-/issues) · [Board](https://git.alpagency.net/alp/gandom-kiosk/-/boards)
