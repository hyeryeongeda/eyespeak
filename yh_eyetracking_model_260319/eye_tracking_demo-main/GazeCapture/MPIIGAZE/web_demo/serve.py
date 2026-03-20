"""
Simple HTTP server with CORS headers for local ONNX web demo.
Usage:
    cd web_demo
    python serve.py
Then open http://localhost:8080 in your browser.
"""

import http.server
import socketserver
import os
from pathlib import Path

PORT = 8080
DIRECTORY = Path(__file__).parent


class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        # Required for SharedArrayBuffer (used by ONNX Runtime WASM threads)
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        super().end_headers()

    def log_message(self, fmt, *args):
        # suppress noisy request logs; only show startup and errors
        if args and str(args[1]) not in ('200', '304'):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(('', PORT), CORSHandler) as httpd:
        httpd.allow_reuse_address = True
        print(f'Serving at http://localhost:{PORT}')
        print(f'Directory : {DIRECTORY}')
        print('Press Ctrl+C to stop.')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nServer stopped.')
