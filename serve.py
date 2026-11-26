"""Preview the homepage with fresh HTML, CSS and JavaScript after each edit."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit


class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        url = urlsplit(self.path)
        suffix = Path(url.path).suffix
        if suffix in ("", ".html", ".css", ".js"):
            self.send_header("Cache-Control", "no-store, max-age=0")
        elif "v" in parse_qs(url.query):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--bind", default="127.0.0.1")
    args = parser.parse_args()
    handler = partial(PreviewHandler, directory=str(Path(__file__).resolve().parent))
    with ThreadingHTTPServer((args.bind, args.port), handler) as server:
        print(f"Homepage preview at http://{args.bind}:{args.port}/", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
