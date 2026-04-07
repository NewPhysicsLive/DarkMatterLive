from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

from dml_backend.domain.models import DraftChangeSet


@dataclass(slots=True)
class ReviewRequestPayload:
    provider: str
    api_url: str
    body: dict[str, object]
    headers: dict[str, str]
    branch_name: str


class ReviewRequestBuilder:
    def build_github(
        self,
        change_set: DraftChangeSet,
        repository: str,
        base_branch: str,
        token: str,
        api_base: str = "https://api.github.com",
    ) -> ReviewRequestPayload:
        api_url = f"{api_base.rstrip('/')}/repos/{repository}/pulls"
        body = {
            "title": change_set.title,
            "head": change_set.branch_name,
            "base": base_branch,
            "body": self._render_review_body(change_set),
            "draft": True,
        }
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        }
        return ReviewRequestPayload(
            provider="github",
            api_url=api_url,
            body=body,
            headers=headers,
            branch_name=change_set.branch_name,
        )

    def build_gitlab(
        self,
        change_set: DraftChangeSet,
        project_id: str,
        target_branch: str,
        token: str,
        api_base: str = "https://gitlab.com/api/v4",
    ) -> ReviewRequestPayload:
        encoded_project = quote(project_id, safe="")
        api_url = f"{api_base.rstrip('/')}/projects/{encoded_project}/merge_requests"
        body = {
            "title": change_set.title,
            "source_branch": change_set.branch_name,
            "target_branch": target_branch,
            "description": self._render_review_body(change_set),
            "draft": True,
            "remove_source_branch": False,
        }
        headers = {
            "PRIVATE-TOKEN": token,
            "Content-Type": "application/json",
        }
        return ReviewRequestPayload(
            provider="gitlab",
            api_url=api_url,
            body=body,
            headers=headers,
            branch_name=change_set.branch_name,
        )

    def submit(self, payload: ReviewRequestPayload) -> dict[str, object]:
        request = Request(
            payload.api_url,
            data=json.dumps(payload.body).encode("utf-8"),
            headers=payload.headers,
            method="POST",
        )
        with urlopen(request) as response:  # noqa: S310
            return json.load(response)

    def load_change_set(self, manifest_path: Path) -> DraftChangeSet:
        return DraftChangeSet.model_validate_json(manifest_path.read_text(encoding="utf-8"))

    def token_from_env(self, env_var: str) -> str:
        token = os.getenv(env_var)
        if not token:
            raise ValueError(f"Environment variable not set: {env_var}")
        return token

    def _render_review_body(self, change_set: DraftChangeSet) -> str:
        lines = [
            "## Summary",
            "",
            change_set.summary,
            "",
            "## Review gates",
        ]
        lines.extend(f"- [ ] {item}" for item in change_set.review.required_checks)
        lines.append("")
        lines.append("## Source records")
        lines.extend(f"- {record.source_system}:{record.source_record_id}" for record in change_set.source_records)
        if change_set.curves:
            lines.append("")
            lines.append("## Normalized curves")
            lines.extend(f"- {curve.curve_id}: {curve.observable}" for curve in change_set.curves)
        if change_set.export_artifacts:
            lines.append("")
            lines.append("## Export artifacts")
            for artifact in change_set.export_artifacts:
                lines.append(f"- {artifact.json_path}")
                lines.append(f"- {artifact.csv_path}")
        return "\n".join(lines)
