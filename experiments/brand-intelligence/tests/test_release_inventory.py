"""Regression tests against accidental or adversarial weakening of parity scope.

All tests use the existing purely synthetic *validator fixture*. Passing a
synthetic fixture tests gate logic only, never real vendor parity or release.
"""
import unittest

from test_parity_gate import passing_metadata_fixture
from parity_gate import evaluate, REQUIRED_CAPABILITY_PLATFORMS


class InventoryRegressionTests(unittest.TestCase):
    def test_pinned_inventory_contains_both_platforms(self):
        self.assertEqual(len(REQUIRED_CAPABILITY_PLATFORMS), 32)
        self.assertEqual(set(REQUIRED_CAPABILITY_PLATFORMS.values()), {"Pencil", "Share of Model"})

    def test_missing_single_required_feature_fails_with_other_metadata_green(self):
        record = passing_metadata_fixture()
        record["capabilities"].pop(0)
        result = evaluate(record)
        self.assertEqual(result["verdict"], "HOLD_DO_NOT_SUBMIT")
        self.assertTrue(any("required baseline capability absent" in x for x in result["blockers"]))

    def test_truncated_but_both_platforms_present_still_fails(self):
        record = passing_metadata_fixture()
        record["capabilities"] = [record["capabilities"][0], record["capabilities"][-1]]
        self.assertEqual(evaluate(record)["verdict"], "HOLD_DO_NOT_SUBMIT")

    def test_switching_pencil_feature_to_other_platform_fails(self):
        record = passing_metadata_fixture()
        record["capabilities"][0]["platform"] = "Share of Model"
        self.assertTrue(any("expected platform" in x for x in evaluate(record)["blockers"]))

    def test_stale_capability_sha_fails(self):
        record = passing_metadata_fixture()
        record["capabilities"][0]["source_exact_commit"] = "d" * 40
        result = evaluate(record)
        self.assertEqual(result["verdict"], "HOLD_DO_NOT_SUBMIT")
        self.assertTrue(any("different source commit" in x for x in result["blockers"]))

    def test_original_all_blocked_manifest_still_fails(self):
        from test_parity_gate import blocked_fixture
        result = evaluate(blocked_fixture())
        self.assertEqual(result["required_count"], 32)
        self.assertEqual(result["verified_metadata_count"], 0)
        self.assertEqual(result["verdict"], "HOLD_DO_NOT_SUBMIT")


if __name__ == "__main__":
    unittest.main()
