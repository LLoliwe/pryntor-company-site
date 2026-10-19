"""Fail-closed release gate for independently verified, rights-safe parity.

This validates submitted evidence metadata, not the truth of linked evidence.
An independent human must verify the links and content before approval.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

ALLOWED_DATA = {"PUBLIC_MEASUREMENT", "ORIGINAL_PRYNTOR_SOURCE", "RIGHTS_LICENSED_MEASUREMENT"}
VALID_PLATFORMS = {"Pencil", "Share of Model"}
SOURCE_PREFIXES = (
    "https://help.trypencil.com/en/articles/",
    "https://shareofmodel.ai/",
    "https://trypencil.com/",
)
SHA256 = re.compile(r"[a-fA-F0-9]{64}\Z")
GITSHA = re.compile(r"[a-fA-F0-9]{40}\Z")
REQUIRED_GLOBAL_TRUE = (
    "reference_inventory_complete",
    "rights_review_complete",
    "live_provider_outputs_proven",
    "independent_qa_complete",
)
REQUIRED_GLOBAL_STRING = (
    "authored_by", "reviewed_by", "independent_review_receipt",
    "source_exact_commit", "physical_device_receipt",
)
REQUIRED_CAPABILITY = (
    "browser_journey_receipt", "negative_case_receipt", "independent_reviewer",
)


def _set(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def evaluate(contract: dict[str, Any]) -> dict[str, Any]:
    """Return eligibility and failures without modifying the input."""
    errors: list[str] = []
    if contract.get("schema_version") != 1:
        errors.append("schema_version must be 1")
    if contract.get("rule") != "FAIL_CLOSED_NO_SUBMISSION":
        errors.append("fail-closed rule missing")
    if contract.get("issue") != "PRY-128":
        errors.append("source of truth must remain PRY-128")
    if contract.get("public_only_reference_audit") is not True:
        errors.append("public reference boundary is not enabled")
    for key in REQUIRED_GLOBAL_TRUE:
        if contract.get(key) is not True:
            errors.append(f"global: {key} not independently verified")
    for key in REQUIRED_GLOBAL_STRING:
        if not _set(contract.get(key)):
            errors.append(f"global: {key} missing")
    if _set(contract.get("authored_by")) and contract.get("authored_by") == contract.get("reviewed_by"):
        errors.append("global: independent reviewer cannot be author")
    sha = contract.get("source_exact_commit")
    if _set(sha) and not GITSHA.fullmatch(sha):
        errors.append("global: exact source commit must be a 40-character Git SHA")

    features = contract.get("capabilities")
    if not isinstance(features, list) or not features:
        errors.append("no required capabilities; empty collection cannot pass")
        features = []
    seen_ids: set[str] = set()
    seen_platforms: set[str] = set()
    verified = 0
    for index, item in enumerate(features):
        if not isinstance(item, dict):
            errors.append(f"capability[{index}] is not an object")
            continue
        key = item.get("id")
        if not _set(key):
            key = f"capability[{index}]"
            errors.append(f"{key}: missing ID")
        if key in seen_ids:
            errors.append(f"{key}: duplicate ID")
        seen_ids.add(key)
        platform = item.get("platform")
        if platform not in VALID_PLATFORMS:
            errors.append(f"{key}: unknown platform")
        else:
            seen_platforms.add(platform)
        if not _set(item.get("requirement")):
            errors.append(f"{key}: missing requirement")
        source = item.get("reference_url")
        if not _set(source) or not source.startswith(SOURCE_PREFIXES):
            errors.append(f"{key}: missing approved public reference")
        if item.get("state") != "VERIFIED":
            errors.append(f"{key}: required capability has not passed independent parity tests")
            continue
        verified += 1
        if item.get("evidence_source_class") not in ALLOWED_DATA:
            errors.append(f"{key}: prohibited or unverified data provenance")
        if not _set(item.get("source_exact_commit")) or not GITSHA.fullmatch(item["source_exact_commit"]):
            errors.append(f"{key}: exact implementation commit missing or invalid")
        for evidence in ("reference_capture_sha256", "implementation_capture_sha256"):
            value = item.get(evidence)
            if not _set(value) or not SHA256.fullmatch(value):
                errors.append(f"{key}: {evidence} missing or invalid")
        for evidence in REQUIRED_CAPABILITY:
            if not _set(item.get(evidence)):
                errors.append(f"{key}: {evidence} missing")
        if item.get("requires_real_data") is True and not _set(item.get("real_output_receipt")):
            errors.append(f"{key}: genuine real-output proof missing")
        if _set(item.get("independent_reviewer")) and item["independent_reviewer"] == contract.get("authored_by"):
            errors.append(f"{key}: maker cannot independently review own work")
    if seen_platforms != VALID_PLATFORMS:
        errors.append("both independent platforms must be covered")
    return {
        "verdict": "ELIGIBLE_FOR_FOUNDER_REVIEW" if not errors else "HOLD_DO_NOT_SUBMIT",
        "required_count": len(features),
        "verified_metadata_count": verified,
        "blocker_count": len(errors),
        "blockers": errors,
        "caveat": "Checks metadata only; never substitutes for independent examination of real evidence",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Reject incomplete Pencil + Share of Model parity evidence")
    parser.add_argument("contract", type=Path, nargs="?", default=Path(__file__).with_name("parity_contract.json"))
    args = parser.parse_args()
    try:
        contract = json.loads(args.contract.read_text(encoding="utf-8"))
        if not isinstance(contract, dict):
            raise ValueError("contract must be an object")
    except (OSError, ValueError) as exc:
        print(json.dumps({"verdict": "HOLD_DO_NOT_SUBMIT", "error": str(exc)}))
        return 2
    result = evaluate(contract)
    print(json.dumps(result, indent=2))
    return 0 if result["verdict"] == "ELIGIBLE_FOR_FOUNDER_REVIEW" else 1


if __name__ == "__main__":
    raise SystemExit(main())
