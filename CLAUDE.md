# Repo guidance for Claude

## Scheduled tasks

Before creating, editing, or scheduling **any** recurring task (Routine, cron, trigger, brief),
read `docs/scheduled-tasks/SPEC.md` and follow it in full:

1. Search `docs/scheduled-tasks/REGISTRY.md` and `docs/scheduled-tasks/tasks/` for an existing
   task that covers the mission. Reuse and update it if one exists.
2. Otherwise copy `docs/scheduled-tasks/TEMPLATE.md` to `docs/scheduled-tasks/tasks/<TASK-ID>.md`
   and fill every section before scheduling.
3. Add the task to `REGISTRY.md` with its Routine ID once scheduled.
4. Each run appends to the task file's Run Log and ends with exactly one final-output status.

One capacity per task. Never fabricate visual data. Do not manufacture an action when none is
warranted.
