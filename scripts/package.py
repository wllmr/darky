"""Build a validated extension ZIP and checksum using only Python's standard library."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

RUNTIME_EXTENSIONS = {".js", ".css", ".html", ".png"}
ARCHIVE_TIMESTAMP = (1980, 1, 1, 0, 0, 0)


def validate_manifest(project_root, release_tag=None):
    manifest = json.loads((project_root / "manifest.json").read_text(encoding="utf-8"))
    version = manifest["version"]
    if release_tag is not None and release_tag != f"v{version}":
        raise ValueError(f"Release tag {release_tag!r} does not match manifest version v{version}")
    required = [
        manifest["action"]["default_popup"],
        manifest["options_ui"]["page"],
        manifest["background"]["service_worker"],
        *manifest["icons"].values(),
        *manifest["action"]["default_icon"].values(),
        *(file for script in manifest["content_scripts"] for file in script["js"]),
    ]
    for relative in required:
        if not (project_root / relative).is_file():
            raise ValueError(f"Missing manifest asset: {relative}")
    return version


def build_archive(project_root, output, release_tag=None):
    """Keep runtime paths intact and normalize metadata across local checkouts."""
    validate_manifest(project_root, release_tag)
    files = [Path("manifest.json"), Path("README.md"), Path("INSTALL.md")]
    files.extend(
        path.relative_to(project_root)
        for path in sorted((project_root / "src").rglob("*"))
        if path.is_file() and path.suffix in RUNTIME_EXTENSIONS
    )
    output.parent.mkdir(exist_ok=True)
    temporary = output.with_suffix(".zip.tmp")
    try:
        with ZipFile(temporary, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
            for relative in sorted(files):
                info = ZipInfo(relative.as_posix(), date_time=ARCHIVE_TIMESTAMP)
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                info.compress_type = ZIP_DEFLATED
                archive.writestr(info, (project_root / relative).read_bytes())
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)
    checksum = output.parent / "SHA256SUMS"
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    with checksum.open("w", encoding="utf-8", newline="\n") as file:
        file.write(f"{digest}  {output.name}\n")
    return checksum


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tag", help="Require a release tag matching manifest.json, e.g. v0.4.4")
    arguments = parser.parse_args()
    project_root = Path(__file__).resolve().parent.parent
    output = project_root / "dist" / "darky.zip"
    try:
        checksum = build_archive(project_root, output, arguments.tag)
    except (ValueError, KeyError, OSError) as error:
        parser.error(str(error))
    print(output)
    print(checksum)


if __name__ == "__main__":
    main()
