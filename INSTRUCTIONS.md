# MASTER PROJECT INSTRUCTION

Read this file before every command, every edit, every refactor, every test, every deployment step, and every rollback.
Read the latest `WORKLOG.md` entry before touching anything.
Obey this file above all other project notes unless a higher-priority safety rule applies.
This file is project-local and must only govern the current workspace.
Do not let unrelated folders, unrelated repositories, or unrelated project state influence this workspace.
If a project-specific protected workspace exists, preserve it absolutely and never allow another project to overwrite it.
If this workspace has a special protected project name such as Yuki, treat its checkpoints, logs, and stable states as untouchable unless the user explicitly overrides that protection.

Build only real software.
Do not create fake data, fake accounts, fake repositories, fake integrations, fake models, fake dashboards, fake scans, fake fixes, fake reports, fake approvals, or fake success states.
Do not make buttons that only look real.
Do not make pages that only look real.
Do not make routes that only exist for display.
Do not make services that only return hardcoded answers unless they are explicitly marked development-only and fully separated from final flows.
Do not present placeholders as production behavior.

Every visible feature must have a real purpose.
Every user action must lead to a real state change, a real backend action, a real storage action, or a real verified result.
Every workflow must have input, processing, output, and persistence when persistence is relevant.
Every integration must be genuine and must fail honestly if credentials, permissions, or connectivity are missing.

Do not simplify a strong design into a weaker one just to make it shorter or easier.
Do not remove useful logic, depth, validation, state handling, reporting, or visual quality unless the current implementation is broken and the removal is truly necessary.
If a change would delete more capability than it adds, stop and justify it before doing it.
If a repair would make the project uglier, flatter, less capable, or less credible, reject that repair and preserve the better design.

Prefer narrow, careful changes over broad rewrites.
When something is working, keep it working.
When something is broken, fix the broken part without damaging the surrounding system.
When a fix is necessary, preserve the working structure around it.
When refactoring, preserve behavior first, then improve clarity, then improve maintainability.

Do not ignore existing project state.
Do not overwrite stable work with untested rewrites.
Do not replace a polished implementation with a generic shortcut.
Do not reduce a sophisticated interface to a plain shell unless explicitly requested.
Do not shrink a robust backend into a demo backend.
Do not flatten a complex workflow into a fake flow.

The final product must be production-minded.
The final product must be runnable.
The final product must be testable.
The final product must be coherent.
The final product must be deployable where applicable.
The final product must be honest about what works and what does not.

Use a real database if the project stores real state.
Store real users, organizations, workspaces, connected providers, repository links, scan jobs, findings, fixes, audit records, settings, model usage, and permissions where relevant.
Keep secrets secure.
Use secure credential handling.
Use encrypted storage or secure environment handling for sensitive values.
Never hardcode production secrets.
Never leak secrets into logs or UI.
Never show sensitive credentials in the interface.

Use role-based access control when the project needs permissions.
Use workspace or organization separation when the project needs multi-tenant boundaries.
Use rate limiting when the project can be abused or overloaded.
Use proper validation on every public input.
Use proper error handling on every external dependency.
Use clear logging on every important operation.
Use audit trails for important actions.
Use deterministic state transitions for important workflows.

If the project uses AI or model adapters, implement them as real selectable backends.
Do not fake model switching.
Do not fake model outputs.
Do not fake provider availability.
Do not fake usage quotas.
Do not fake credit exhaustion.
If a provider is unavailable, tell the truth in the UI and in logs.
If a user runs out of quota, show that state honestly.
If a model is local, call it for real.
If a provider key is missing, surface the missing configuration honestly.
If the system has a fallback mode, it must be a real fallback mode, not a decorative label.

If the project includes GitHub, GitLab, Bitbucket, or any other external service integration, build the real connection flow.
Use the real provider auth or installation flow.
Use real webhooks where appropriate.
Use real callbacks where appropriate.
Use real tokens or installation credentials where appropriate.
Use the provider’s real APIs for posting results back.
Do not pretend a repository is connected when it is not.
Do not pretend a scan reached the repository when it did not.
Do not pretend a PR was updated when it was not.
If write access is unavailable, provide a real patch, a real diff, or a real suggestion path instead of pretending to push.

If the project contains an auto-fix workflow, make it real.
The workflow must detect an issue, create a fix, apply it in an isolated environment, verify the fix, and then decide whether the result should be committed, proposed, or rejected.
Do not make the auto-fix system only describe problems.
Do not make it only generate comments.
Do not make it only generate text.
It must actually repair code when the circumstances allow it.
It must verify the repair before claiming success.
If verification fails, the failure must be honest and visible.

If the project includes security scanning, dependency analysis, secret scanning, policy checks, compliance checks, or SBOM generation, those features must work as actual processing features.
They must produce real outputs, not decorative labels.
They must include file paths, line numbers, severity or priority, explanation, and verification status when relevant.
They must be understandable to engineers and to nontechnical reviewers.
They must not collapse into generic wording that hides the actual issue.

If the project includes reports, exports, dashboards, or summaries, make them detailed and useful.
Reports must not be vague.
Reports must not be a few random words.
Reports must not hide severity, cause, or impact.
Reports must explain what happened, why it matters, what was changed, what remains open, and what was verified.
Exports must work.
PDF export must work if included.
DOCX export must work if included.
Any report generation must reflect real state from the backend.

The frontend must look like a real product.
The layout must be intentional, polished, modern, and credible.
The design must have strong hierarchy, proper spacing, consistent typography, and clear visual flow.
The UI must not look like a throwaway admin page unless that is explicitly the requested style.
The UI must not become cluttered, weak, or generic just to save time.
If the current design is beautiful and functional, preserve it.
If you need to change it, keep the same level of visual quality or improve it.

The backend must be real and reliable.
Use proper routes.
Use proper schemas.
Use proper validation.
Use proper storage.
Use proper middleware.
Use proper integration boundaries.
Use proper logging.
Use proper authentication if needed.
Use proper background jobs if needed.
Use proper error handling.
Do not create routes that only exist to satisfy the frontend.
Do not create services that only echo data back unless that is the explicit contract.
Do not create silent failures.

Write long, complete, and useful code when the task needs depth.
Do not produce tiny incomplete fragments when the project clearly needs a full implementation.
Do not compress a serious system into a minimal shell.
Do not remove useful lines merely to make the code shorter.
Do not “simplify” away important behavior.
Do not turn a detailed solution into a thin demo.

When making changes, preserve the exact parts that already work.
When something is unstable, isolate the unstable part and repair it without destroying the rest.
When a command fails, do not hide the failure.
Log it.
Record what failed.
Record why it failed.
Record what file or path was affected.
Record the fix plan.
Then fix it cleanly.

Maintain `WORKLOG.md` as a live record of the project.
Read it before making changes.
Update it after every meaningful step.
Record the timestamp, checkpoint name, command or action, files changed, verification performed, result, and next step.
If a task fails, record the failure exactly and honestly.
If a task succeeds, record exactly what was verified.
Do not leave the work log stale.

Create project-specific checkpoints only after a change has been verified working.
A checkpoint is a stable point that can be restored later if a new change breaks the project.
Do not create checkpoints from broken work.
Do not call unstable work a checkpoint.
Do not mix checkpoints between unrelated projects.
Do not let another repository overwrite this project’s checkpoints.
If a change is risky, finish it in a smaller step first, verify it, then checkpoint it.

Commit only after a meaningful milestone is complete and verified.
Use automatic commits when the work is stable enough.
Use clear, factual commit messages.
Do not wait forever for a commit if the milestone is already proven.
Do not commit broken code as if it were finished.
Do not skip commits for important milestones.

Before any meaningful command sequence, read this instruction file and the latest work log.
Before any file edit, confirm the target file is part of the current milestone.
Before any merge, rollback, checkpoint, or destructive command, verify the impact.
Before closing a task, update the work log.
After any major feature, rerun the relevant test path.
After any major fix, rerun the relevant verification path.
After any major UI change, verify the build or rendering path if available.
After any major backend change, verify the relevant endpoints or service path if available.

Use safe command habits.
Do not run destructive commands casually.
Do not delete working files casually.
Do not rename paths casually.
Do not overwrite unknown files casually.
If you are unsure, inspect first.
If you need to recover, use the latest checkpoint rather than improvising.

Respect project boundaries.
Work only inside this workspace.
Do not alter unrelated folders.
Do not let other repositories contaminate this project.
Do not let unrelated logs, checkpoints, or temporary files interfere with this project.
Do not spread changes across arbitrary locations.

Preserve the project’s sophistication.
If the project has a deep workflow, keep the workflow deep.
If the project has rich visuals, keep the visuals rich.
If the project has detailed reporting, keep the reporting detailed.
If the project has real verification, keep the verification real.
If the project has a strong architecture, keep the architecture strong.
If the project has a precise purpose, keep that purpose intact.

When the user asks for a fix, solve the actual root cause.
When the user asks for a feature, implement the feature end to end.
When the user asks for improvement, improve the real system, not just the appearance.
When the user asks for testing, test the real flow.
When the user asks for recovery, restore the nearest known good checkpoint.
When the user asks for robustness, preserve and strengthen the working behavior.

Never claim completion unless the milestone is actually complete.
Never claim a working flow unless it was actually verified.
Never claim a stable state unless it has been checked.
Never claim a successful integration unless the integration was tested or clearly validated.
Never claim a real fix if the fix only moved the problem elsewhere.

If an instruction is unclear, ask the minimum necessary question.
If an assumption is risky, stop and confirm.
If a feature is not fully possible, explain the closest real implementation and ask before assuming.
If a dependency is missing, explain the gap and handle it honestly.
If a provider quota is exhausted, show it honestly.
If a build fails, fix the build.
If a test fails, fix the cause.
If a layout breaks, fix the layout.
If a code edit harms quality, undo the harm.

The standard is simple.
Make it real.
Make it work.
Make it polished.
Make it testable.
Make it honest.
Keep it inside this workspace.
Protect the working state.
Preserve quality.
Protect checkpoints.
Log everything.
Verify everything.
Commit the verified milestones.