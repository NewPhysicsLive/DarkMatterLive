from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path

from dml_backend.domain.models import DraftChangeSet


@dataclass(slots=True)
class PublishBranchResult:
    branch_name: str
    commit_message: str
    staged_paths: list[str]
    pushed: bool
    dry_run: bool


class ReviewBranchPublisher:
    def __init__(self, repository_root: Path) -> None:
        self.repository_root = repository_root

    def publish_change_set(
        self,
        change_set: DraftChangeSet,
        base_branch: str,
        remote: str,
        push: bool,
        dry_run: bool,
        allow_dirty: bool,
        commit_message: str | None = None,
    ) -> PublishBranchResult:
        staged_paths = self._collect_stage_paths(change_set)
        if not staged_paths:
            raise ValueError("No export artifact paths were found in the change set")

        final_commit_message = commit_message or f"bot: {change_set.title}"
        if dry_run:
            return PublishBranchResult(
                branch_name=change_set.branch_name,
                commit_message=final_commit_message,
                staged_paths=staged_paths,
                pushed=push,
                dry_run=True,
            )

        if not allow_dirty:
            self._assert_clean_worktree(staged_paths)

        self._run_git(["switch", base_branch])
        self._run_git(["switch", "-C", change_set.branch_name])
        self._run_git(["add", *staged_paths])
        self._run_git(["commit", "-m", final_commit_message])
        if push:
            self._run_git(["push", "-u", remote, change_set.branch_name])

        return PublishBranchResult(
            branch_name=change_set.branch_name,
            commit_message=final_commit_message,
            staged_paths=staged_paths,
            pushed=push,
            dry_run=False,
        )

    def _collect_stage_paths(self, change_set: DraftChangeSet) -> list[str]:
        paths: list[str] = []
        for artifact in change_set.export_artifacts:
            paths.append(artifact.json_path)
            paths.append(artifact.csv_path)
        deduped = []
        for path in paths:
            if path not in deduped:
                deduped.append(path)
        return deduped

    def _assert_clean_worktree(self, allowed_paths: list[str]) -> None:
        result = self._run_git(["status", "--porcelain"], capture_output=True)
        changed_paths = []
        for line in result.stdout.splitlines():
            if len(line) < 4:
                continue
            path = line[3:].strip().replace("\\", "/")
            changed_paths.append(path)

        unexpected = [path for path in changed_paths if path not in allowed_paths]
        if unexpected:
            raise ValueError(
                "Refusing to publish from a dirty worktree. Unexpected changed paths: " + ", ".join(unexpected)
            )

    def _run_git(self, args: list[str], capture_output: bool = False) -> subprocess.CompletedProcess[str]:
        command = ["git", *args]
        return subprocess.run(
            command,
            cwd=self.repository_root,
            check=True,
            text=True,
            capture_output=capture_output,
        )
