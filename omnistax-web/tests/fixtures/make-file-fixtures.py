"""The two files the import checks read: a two-page PDF and a small PNG.

Both are written by hand rather than fetched, so the repository carries no
binary that cannot be regenerated. Page 2 of the PDF holds the word "zyxomni",
which is in no textbook and in nothing else here, so a search that finds it
found it in the file.

    python3 tests/fixtures/make-file-fixtures.py
"""

import pathlib
import struct
import zlib

HERE = pathlib.Path(__file__).resolve().parent


def pdf(pages: list[str]) -> bytes:
    """A minimal PDF: one Helvetica text object per page, no compression."""
    objects: list[bytes] = []

    def add(body: bytes) -> int:
        objects.append(body)
        return len(objects)

    font = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    pages_id = len(objects) + 1 + 2 * len(pages)  # the Pages node comes after the pages
    page_ids: list[int] = []
    for text in pages:
        stream = f"BT /F1 24 Tf 72 700 Td ({text}) Tj ET".encode()
        content = add(b"<< /Length %d >>\nstream\n%s\nendstream" % (len(stream), stream))
        page_ids.append(add(
            b"<< /Type /Page /Parent %d 0 R /MediaBox [0 0 612 792] "
            b"/Resources << /Font << /F1 %d 0 R >> >> /Contents %d 0 R >>"
            % (pages_id, font, content)))
    kids = b" ".join(b"%d 0 R" % i for i in page_ids)
    pages_obj = add(b"<< /Type /Pages /Kids [%s] /Count %d >>" % (kids, len(page_ids)))
    assert pages_obj == pages_id, (pages_obj, pages_id)
    catalog = add(b"<< /Type /Catalog /Pages %d 0 R >>" % pages_obj)

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % i + body + b"\nendobj\n"
    start = len(out)
    out += b"xref\n0 %d\n" % (len(objects) + 1)
    out += b"0000000000 65535 f \n"
    for off in offsets[1:]:
        out += b"%010d 00000 n \n" % off
    out += b"trailer\n<< /Size %d /Root %d 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, catalog, start)
    return bytes(out)


def png(width: int, height: int, rgb: tuple[int, int, int]) -> bytes:
    """A solid-colour PNG, written chunk by chunk."""
    raw = b"".join(b"\x00" + bytes(rgb) * width for _ in range(height))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


(HERE / "two-pages.pdf").write_bytes(pdf(["Page one of the reader's own paper.", "Page two says zyxomni plainly."]))
(HERE / "swatch.png").write_bytes(png(24, 16, (0x4F, 0x8A, 0xC7)))
print("wrote two-pages.pdf and swatch.png")
