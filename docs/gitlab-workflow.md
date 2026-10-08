# Working together in GitLab

## Get access and clone

Install Git and the GitLab CLI (`glab`), then authenticate to the team instance:

```bash
glab auth login --hostname git.alpagency.net
glab auth status
glab repo clone bel4/gandom-kiosk
```

The same commands work in Bash and PowerShell. Keep tokens in the CLI credential
store; Git remotes should contain ordinary HTTPS URLs.

## Work through a branch and merge request

```bash
git switch main
git pull --ff-only
git switch -c feature/short-description
```

Run the checks listed in [development.md](development.md), review `git diff`, and
stage the files you intend to share. Then commit and push the branch:

```bash
git commit -m "Describe the change"
git push -u origin HEAD
glab mr create --draft --template Default
glab mr list
glab mr view --web
glab ci status
```

`Default.md` supplies the merge-request description. Link an issue with
`Closes #123` when the change completes it, include the verification result, and
request a review before merging. A successful pipeline does not itself establish
that a release was deployed.

## Report and plan work

```bash
glab issue create --template Bug
glab issue create --template Feature
glab issue list
```

Bug and feature templates are committed in `.gitlab/issue_templates`. Avoid
putting secrets or personal customer/patient data in reports or screenshots.

## Useful next features

- Use milestones to group releases and labels to make issue boards useful.
- Assign reviewers in merge requests; maintainers can add approval rules and
  CODEOWNERS after agreeing on real ownership.
- Protect the default branch and require its checks once the team has agreed on
  the merge policy. Repository templates do not change these project settings.
- Use GitLab releases and immutable tags for delivery records. Review apps and
  artifact expiry can be added per project's runner and deployment constraints.
- [Issues](https://git.alpagency.net/bel4/gandom-kiosk/-/issues), [merge requests](https://git.alpagency.net/bel4/gandom-kiosk/-/merge_requests), and
  [pipelines](https://git.alpagency.net/bel4/gandom-kiosk/-/pipelines) are the team's shared history.
