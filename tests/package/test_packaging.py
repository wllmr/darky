"""Verify release artifacts independently from the development checkout."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from zipfile import ZipFile


class PackagingTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="darky-package-test-")
        self.addCleanup(temporary.cleanup)
        self.fixture = Path(temporary.name) / "extension"
        project = Path(__file__).resolve().parents[2]
        shutil.copytree(
            project,
            self.fixture,
            ignore=shutil.ignore_patterns(
                ".git", "node_modules", "dist", "test-results", "__pycache__"
            ),
        )

    def build(self, *arguments):
        return subprocess.run(
            [sys.executable, str(self.fixture / "scripts" / "package.py"), *arguments],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_archive_has_complete_runtime_and_install_guide(self):
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        with ZipFile(self.fixture / "dist" / "darky.zip") as archive:
            self.assertIsNone(archive.testzip())
            files = set(archive.namelist())
            manifest = json.loads(archive.read("manifest.json"))
            required = {
                "INSTALL.md",
                manifest["action"]["default_popup"],
                manifest["options_ui"]["page"],
                manifest["background"]["service_worker"],
                *manifest["icons"].values(),
                *manifest["action"]["default_icon"].values(),
                *manifest["content_scripts"][0]["js"],
                "src/popup/popup.js",
                "src/shared/ui.css",
                "src/options/options.js",
                "src/options/options.css",
                "src/shared/ui-theme.js",
            }
            runtime_sources = {
                source.relative_to(self.fixture).as_posix()
                for source in (self.fixture / "src").rglob("*")
                if source.is_file() and source.suffix in {".js", ".css", ".html", ".png"}
            }
            self.assertFalse(runtime_sources - files)
            self.assertFalse(any(name.endswith(".svg") for name in files))
            self.assertFalse(required - files, f"Missing files: {required - files}")
            for relative in required:
                self.assertEqual(archive.read(relative), (self.fixture / relative).read_bytes())
            for appearance in ("dark", "light", "paused"):
                for size in (16, 32):
                    self.assertIn(f"src/assets/icons/{appearance}{size}.png", files)
            forbidden = ("tests/", "scripts/", "node_modules/", "docs/", "adr/", ".github/")
            self.assertFalse(any(name.startswith(forbidden) for name in files))

    def test_checksum_matches_archive(self):
        self.assertEqual(self.build().returncode, 0)
        archive = self.fixture / "dist" / "darky.zip"
        checksum = self.fixture / "dist" / "SHA256SUMS"
        self.assertTrue(checksum.exists(), "Release downloads need a checksum")
        self.assertEqual(checksum.read_text(), f"{hashlib.sha256(archive.read_bytes()).hexdigest()}  darky.zip\n")

    def test_archive_ignores_local_mtimes_and_permission_bits(self):
        self.assertEqual(self.build().returncode, 0)
        output = self.fixture / "dist" / "darky.zip"
        first = output.read_bytes()
        source = self.fixture / "manifest.json"
        os.utime(source, (946684800, 946684800))
        source.chmod(0o700)
        self.assertEqual(self.build().returncode, 0)
        self.assertEqual(output.read_bytes(), first)

    def test_release_tag_must_match_manifest(self):
        result = self.build("--tag", "v999.0.0")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("manifest", result.stderr.lower())
        self.assertFalse((self.fixture / "dist" / "darky.zip").exists())

    def test_matching_release_tag_builds(self):
        manifest = json.loads((self.fixture / "manifest.json").read_text())
        result = self.build("--tag", f"v{manifest['version']}")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_missing_manifest_asset_fails_before_creating_archive(self):
        manifest = json.loads((self.fixture / "manifest.json").read_text())
        (self.fixture / manifest["icons"]["16"]).unlink()
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.fixture / "dist" / "darky.zip").exists())


if __name__ == "__main__":
    unittest.main()
