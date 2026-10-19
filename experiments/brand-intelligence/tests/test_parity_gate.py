"""Synthetic fixtures here test the gate itself, never real parity."""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from parity_gate import evaluate

ROOT = Path(__file__).resolve().parents[1]


def blocked_fixture():
    return json.loads((ROOT / "parity_contract.json").read_text(encoding="utf-8"))


def passing_metadata_fixture():
    """Exclusively synthetic validator fixture. Not real vendor acceptance."""
    obj = blocked_fixture()
    obj.update(
        reference_inventory_complete=True,
        rights_review_complete=True,
        live_provider_outputs_proven=True,
        independent_qa_complete=True,
        authored_by="synthetic-maker",
        reviewed_by="synthetic-independent-reviewer",
        independent_review_receipt="synthetic-test-independent-review",
        source_exact_commit="a" * 40,
        physical_device_receipt="synthetic-iphone-check",
    )
    for capability in obj["capabilities"]:
        capability.update(
            state="VERIFIED",
            evidence_source_class="ORIGINAL_PRYNTOR_SOURCE",
            source_exact_commit="a" * 40,
            reference_capture_sha256="b" * 64,
            implementation_capture_sha256="c" * 64,
            browser_journey_receipt="synthetic-browser-run",
            negative_case_receipt="synthetic-failing-case-tested",
            real_output_receipt="synthetic-test-real-output-placeholder",
            independent_reviewer="synthetic-independent-reviewer",
        )
    return obj


class ParityGateTests(unittest.TestCase):
    def test_real_baseline_is_on_hold(self):
        report = evaluate(blocked_fixture())
        self.assertEqual(report["verdict"], "HOLD_DO_NOT_SUBMIT")
        self.assertGreaterEqual(report["required_count"], 25)
        self.assertEqual(report["verified_metadata_count"], 0)

    def test_passing_metadata_fixture_checks_gate_logic_only(self):
        report = evaluate(passing_metadata_fixture())
        self.assertEqual(report["verdict"], "ELIGIBLE_FOR_FOUNDER_REVIEW")
        self.assertEqual(report["blocker_count"], 0)

    def test_empty_manifest_does_not_pass(self):
        record = passing_metadata_fixture()
        record["capabilities"] = []
        self.assertEqual(evaluate(record)["verdict"], "HOLD_DO_NOT_SUBMIT")

    def test_missing_reference_inventory_blocks(self):
        record = passing_metadata_fixture()
        record["reference_inventory_complete"] = False
        self.assertEqual(evaluate(record)["verdict"], "HOLD_DO_NOT_SUBMIT")

    def test_any_single_required_feature_failure_blocks(self):
        record = passing_metadata_fixture()
        record["capabilities"][0]["state"] = "FAILED"
        self.assertEqual(evaluate(record)["verdict"], "HOLD_DO_NOT_SUBMIT")

    def test_synthetic_or_employer_inputs_block(self):
        for origin in ("SYNTHETIC", "EMPLOYER_ASSET", "JELLYFISH_INTERNAL", ""):
            with self.subTest(origin=origin):
                record = passing_metadata_fixture()
                record["capabilities"][1]["evidence_source_class"] = origin
                self.assertEqual(evaluate(record)["verdict"], "HOLD_DO_NOT_SUBMIT")

    def test_missing_negative_case_blocks(self):
        record = passing_metadata_fixture()
        record["capabilities"][0]["negative_case_receipt"] = None
        self.assertEqual(evaluate(record)["verdict"], "HOLD_DO_NOT_SUBMIT")

    def test_missing_real_output_blocks(self):
        record = passing_metadata_fixture()
        record["capabilities"][0]["real_output_receipt"] = ""
        self.assertEqual(evaluate(record)["verdict"], "HOLD_DO_NOT_SUBMIT")

    def test_maker_cannot_review(self):
        record = passing_metadata_fixture()
        record["reviewed_by"] = "synthetic-maker"
        self.assertEqual(evaluate(record)["verdict"], "HOLD_DO_NOT_SUBMIT")
        record = passing_metadata_fixture()
        record["capabilities"][0]["independent_reviewer"] = "synthetic-maker"
        self.assertEqual(evaluate(record)["verdict"], "HOLD_DO_NOT_SUBMIT")

    def test_invalid_hash_blocks(self):
        record = passing_metadata_fixture()
        record["capabilities"][0]["reference_capture_sha256"] = "not-a-hash"
        self.assertEqual(evaluate(record)["verdict"], "HOLD_DO_NOT_SUBMIT")

    def test_duplicate_id_blocks(self):
        record = passing_metadata_fixture()
        record["capabilities"][1]["id"] = record["capabilities"][0]["id"]
        self.assertEqual(evaluate(record)["verdict"], "HOLD_DO_NOT_SUBMIT")

    def test_only_one_platform_blocks(self):
        record = passing_metadata_fixture()
        record["capabilities"] = [f for f in record["capabilities"] if f["platform"] == "Pencil"]
        self.assertEqual(evaluate(record)["verdict"], "HOLD_DO_NOT_SUBMIT")


if __name__ == "__main__":
    unittest.main()
