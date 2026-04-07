from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

from dml_backend.export.site import SiteExporter
from dml_backend.forge.review_requests import ReviewRequestBuilder
from dml_backend.git.review_branch import ReviewBranchPublisher
from dml_backend.pipelines.connectors.hepdata import HepDataConnector
from dml_backend.pipelines.ingestion import ChangeSetFactory, PullRequestPublisher
from dml_backend.pipelines.normalize import HepDataTableNormalizer, LocalCsvCurveNormalizer
from dml_backend.pipelines.transforms.base import TransformationContext
from dml_backend.pipelines.transforms.bc1 import BC1CouplingScaleTransform
from dml_backend.storage.raw_assets import RawAssetStore


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="dml-backend")
    subparsers = parser.add_subparsers(dest="command", required=True)

    draft_hepdata = subparsers.add_parser(
        "draft-hepdata",
        help="Create a local draft review artifact from a HEPData-style feed snapshot.",
    )
    draft_hepdata.add_argument("--feed", required=True, help="Path or URL to a JSON feed snapshot.")
    draft_hepdata.add_argument("--model-family", required=True, help="Target model family such as BC1.")
    draft_hepdata.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parents[3]),
        help="Repository root where .draft-data-prs/ should be written.",
    )
    draft_hepdata.add_argument(
        "--since",
        help="Optional ISO-8601 timestamp; ignore records not updated after this time.",
    )

    draft_local_curve = subparsers.add_parser(
        "draft-local-curve",
        help="Persist raw assets, normalize a local CSV into a canonical curve, and export a reviewable draft bundle.",
    )
    draft_local_curve.add_argument("--feed", required=True, help="Path or URL to a JSON feed snapshot.")
    draft_local_curve.add_argument("--record-id", required=True, help="Source record id to attach to the curve.")
    draft_local_curve.add_argument("--csv", required=True, help="Local x,y CSV file to normalize.")
    draft_local_curve.add_argument("--metadata", required=True, help="Curve metadata JSON file.")
    draft_local_curve.add_argument("--model-family", required=True, help="Target model family such as BC1.")
    draft_local_curve.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parents[3]),
        help="Repository root for exports, cache, and .draft-data-prs/ output.",
    )

    draft_hepdata_table = subparsers.add_parser(
        "draft-hepdata-table",
        help="Persist raw assets, normalize a HEPData-style table, optionally transform it, and export a draft bundle.",
    )
    draft_hepdata_table.add_argument("--feed", required=True, help="Path or URL to a JSON feed snapshot.")
    draft_hepdata_table.add_argument("--record-id", required=True, help="Source record id to attach to the table.")
    draft_hepdata_table.add_argument("--table", required=True, help="HEPData table file in YAML or JSON format.")
    draft_hepdata_table.add_argument("--metadata", required=True, help="Curve metadata JSON file.")
    draft_hepdata_table.add_argument("--model-family", required=True, help="Target model family such as BC1.")
    draft_hepdata_table.add_argument("--apply-bc1-gscale", action="store_true", help="Apply the explicit BC1 coupling scale transform.")
    draft_hepdata_table.add_argument("--g-reference", type=float, default=1.0, help="Reference coupling for BC1 scaling.")
    draft_hepdata_table.add_argument("--g-target", type=float, default=1.0, help="Target coupling for BC1 scaling.")
    draft_hepdata_table.add_argument("--g-exponent", type=float, default=4.0, help="Scaling exponent for BC1 scaling.")
    draft_hepdata_table.add_argument("--all-dependent-variables", action="store_true", help="Normalize all dependent variable series in the table instead of a single series.")
    draft_hepdata_table.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parents[3]),
        help="Repository root for exports, cache, and .draft-data-prs/ output.",
    )

    open_review = subparsers.add_parser(
        "open-review-request",
        help="Create or dry-run a GitHub PR or GitLab MR from a draft change-set manifest.",
    )
    open_review.add_argument("--manifest", required=True, help="Path to the JSON draft change-set manifest.")
    open_review.add_argument("--provider", required=True, choices=["github", "gitlab"], help="Forge provider.")
    open_review.add_argument("--repository", help="GitHub repository in owner/repo form.")
    open_review.add_argument("--project-id", help="GitLab project id or namespace/project path.")
    open_review.add_argument("--base-branch", default="main", help="Target branch for the review request.")
    open_review.add_argument("--token-env", required=True, help="Environment variable containing the forge token.")
    open_review.add_argument("--dry-run", action="store_true", help="Print the outgoing request payload instead of submitting it.")
    open_review.add_argument("--repo-root", default=str(Path(__file__).resolve().parents[3]), help="Repository root for git branch publication.")
    open_review.add_argument("--prepare-branch", action="store_true", help="Create a git branch and commit export artifacts before opening the review request.")
    open_review.add_argument("--push-remote", default="origin", help="Remote name to use when pushing a prepared review branch.")
    open_review.add_argument("--allow-dirty", action="store_true", help="Allow publishing from a dirty worktree. Use only in dedicated bot environments.")
    open_review.add_argument("--commit-message", help="Override the generated commit message when preparing the review branch.")
    return parser


def handle_draft_hepdata(args: argparse.Namespace) -> int:
    connector = HepDataConnector(args.feed)
    since = datetime.fromisoformat(args.since) if args.since else None
    records = connector.fetch_updates(since=since)
    if not records:
        print("No matching source records found.")
        return 0

    factory = ChangeSetFactory()
    change_set = factory.create_empty_change_set(records, args.model_family)
    publisher = PullRequestPublisher(Path(args.repo_root))
    output_path = publisher.materialize_change_set(change_set)

    print(f"Created draft review artifact: {output_path}")
    print(f"Source records included: {len(records)}")
    print(f"Suggested branch name: {change_set.branch_name}")
    return 0


def handle_draft_local_curve(args: argparse.Namespace) -> int:
    connector = HepDataConnector(args.feed)
    records = connector.fetch_updates()
    matching_record = next((record for record in records if record.source_record_id == args.record_id), None)
    if matching_record is None:
        print(f"Source record not found: {args.record_id}")
        return 1

    csv_path = Path(args.csv).resolve()
    metadata_path = Path(args.metadata).resolve()
    repo_root = Path(args.repo_root)

    raw_asset_paths = list(matching_record.raw_asset_paths)
    if str(csv_path) not in raw_asset_paths:
        raw_asset_paths.append(str(csv_path))
    if str(metadata_path) not in raw_asset_paths:
        raw_asset_paths.append(str(metadata_path))
    matching_record = matching_record.model_copy(update={"raw_asset_paths": raw_asset_paths})

    asset_store = RawAssetStore(repo_root)
    persisted_record = asset_store.persist_source_record_assets(matching_record)

    normalizer = LocalCsvCurveNormalizer()
    curve = normalizer.normalize(csv_path, metadata_path, persisted_record)

    exporter = SiteExporter(repo_root)
    export_artifact = exporter.export_curve(args.model_family, curve)

    factory = ChangeSetFactory()
    change_set = factory.create_change_set(
        source_records=[persisted_record],
        model_family=args.model_family,
        curves=[curve],
        export_artifacts=[export_artifact],
    )
    publisher = PullRequestPublisher(repo_root)
    output_path = publisher.materialize_change_set(change_set)

    print(f"Created draft review artifact: {output_path}")
    print(f"Exported JSON: {export_artifact.json_path}")
    print(f"Exported CSV: {export_artifact.csv_path}")
    print(f"Persisted assets: {len(persisted_record.persisted_assets)}")
    return 0


def handle_draft_hepdata_table(args: argparse.Namespace) -> int:
    connector = HepDataConnector(args.feed)
    records = connector.fetch_updates()
    matching_record = next((record for record in records if record.source_record_id == args.record_id), None)
    if matching_record is None:
        print(f"Source record not found: {args.record_id}")
        return 1

    table_path = Path(args.table).resolve()
    metadata_path = Path(args.metadata).resolve()
    repo_root = Path(args.repo_root)

    raw_asset_paths = list(matching_record.raw_asset_paths)
    if str(table_path) not in raw_asset_paths:
        raw_asset_paths.append(str(table_path))
    if str(metadata_path) not in raw_asset_paths:
        raw_asset_paths.append(str(metadata_path))
    matching_record = matching_record.model_copy(update={"raw_asset_paths": raw_asset_paths})

    asset_store = RawAssetStore(repo_root)
    persisted_record = asset_store.persist_source_record_assets(matching_record)

    normalizer = HepDataTableNormalizer()
    curves = normalizer.normalize_many(table_path, metadata_path, persisted_record)
    if not args.all_dependent_variables:
        curves = [curves[0]]
    transformations = []
    if args.apply_bc1_gscale:
        transform = BC1CouplingScaleTransform()
        transformed_curves = []
        for curve in curves:
            context = TransformationContext(
                model_family=args.model_family,
                code_version="0.1.0",
                method_name="bc1_coupling_scale",
                formula_reference="y' = y * (g_target / g_reference) ** exponent",
                assumptions=[
                    "Infrastructure validation transform; requires domain review before production use",
                ],
                parameters={
                    "g_reference": args.g_reference,
                    "g_target": args.g_target,
                    "exponent": args.g_exponent,
                },
            )
            result = transform.run(curve, context)
            transformed_curves.append(result.output_curve)
            transformations.append(result.record)
        curves = transformed_curves

    exporter = SiteExporter(repo_root)
    export_artifacts = [exporter.export_curve(args.model_family, curve) for curve in curves]

    factory = ChangeSetFactory()
    change_set = factory.create_change_set(
        source_records=[persisted_record],
        model_family=args.model_family,
        curves=curves,
        transformations=transformations,
        export_artifacts=export_artifacts,
    )
    publisher = PullRequestPublisher(repo_root)
    output_path = publisher.materialize_change_set(change_set)

    print(f"Created draft review artifact: {output_path}")
    for artifact in export_artifacts:
        print(f"Exported JSON: {artifact.json_path}")
        print(f"Exported CSV: {artifact.csv_path}")
    print(f"Applied transformations: {len(transformations)}")
    return 0


def handle_open_review_request(args: argparse.Namespace) -> int:
    builder = ReviewRequestBuilder()
    change_set = builder.load_change_set(Path(args.manifest))
    if args.prepare_branch:
        publisher = ReviewBranchPublisher(Path(args.repo_root))
        publish_result = publisher.publish_change_set(
            change_set=change_set,
            base_branch=args.base_branch,
            remote=args.push_remote,
            push=not args.dry_run,
            dry_run=args.dry_run,
            allow_dirty=args.allow_dirty,
            commit_message=args.commit_message,
        )
        print(
            json.dumps(
                {
                    "branch_name": publish_result.branch_name,
                    "commit_message": publish_result.commit_message,
                    "staged_paths": publish_result.staged_paths,
                    "pushed": publish_result.pushed,
                    "dry_run": publish_result.dry_run,
                },
                indent=2,
            )
        )

    token = builder.token_from_env(args.token_env)

    if args.provider == "github":
        if not args.repository:
            print("--repository is required for GitHub review requests")
            return 1
        payload = builder.build_github(change_set, repository=args.repository, base_branch=args.base_branch, token=token)
    else:
        if not args.project_id:
            print("--project-id is required for GitLab review requests")
            return 1
        payload = builder.build_gitlab(change_set, project_id=args.project_id, target_branch=args.base_branch, token=token)

    if args.dry_run:
        print(json.dumps({"api_url": payload.api_url, "branch_name": payload.branch_name, "body": payload.body}, indent=2))
        return 0

    response = builder.submit(payload)
    print(json.dumps(response, indent=2))
    return 0


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "draft-hepdata":
        return handle_draft_hepdata(args)
    if args.command == "draft-local-curve":
        return handle_draft_local_curve(args)
    if args.command == "draft-hepdata-table":
        return handle_draft_hepdata_table(args)
    if args.command == "open-review-request":
        return handle_open_review_request(args)

    parser.error(f"Unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
