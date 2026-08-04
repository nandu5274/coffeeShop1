#!/usr/bin/env python3
"""Compile Cafe Kubera mural into a real MindAR targets.mind via headless Chrome.

Avoids the old stuck path: no CDN A-Frame, no megabyte base64 over CDP.
Browser compiles locally and POSTs the binary to this server.
"""
from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import threading
import time
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
OUT_MIND = ROOT / "src/assets/targets.mind"
MINDAR_DIST = ROOT / "node_modules/mind-ar/dist"
SRC_IMG = ROOT / "src/assets/img/hero-m-bg.jpg"
DST_IMG = SCRIPTS / "hero-m-bg.jpg"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT_HTTP = 8765
PORT_CDP = 9222

DONE = {"ok": False, "bytes": 0, "error": None}
DONE_EVT = threading.Event()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SCRIPTS), **kwargs)

    def log_message(self, fmt, *args):
        sys.stdout.write("[http] " + (fmt % args) + "\n")
        sys.stdout.flush()

    def do_GET(self):
        if self.path.startswith("/mind-ar/"):
            rel = self.path[len("/mind-ar/") :].split("?", 1)[0]
            path = (MINDAR_DIST / rel).resolve()
            if not str(path).startswith(str(MINDAR_DIST.resolve())) or not path.is_file():
                self.send_error(404)
                return
            data = path.read_bytes()
            ctype = "application/javascript" if path.suffix == ".js" else "application/octet-stream"
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)
            return

        if self.path in ("/", "/compile-mind.html"):
            self.path = "/compile-mind.html"
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if self.path != "/save-targets":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        try:
            if len(body) < 1000:
                raise RuntimeError(f"targets.mind too small ({len(body)} bytes) — compile failed")
            OUT_MIND.write_bytes(body)
            DONE["ok"] = True
            DONE["bytes"] = len(body)
            msg = f"WROTE {OUT_MIND} bytes={len(body)}"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(msg.encode())
            print(msg, flush=True)
        except Exception as e:
            DONE["error"] = str(e)
            self.send_response(500)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(str(e).encode())
            print("SAVE ERROR:", e, flush=True)
        finally:
            DONE_EVT.set()


def wait_http():
    for _ in range(40):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{PORT_HTTP}/compile-mind.html", timeout=1)
            return
        except Exception:
            time.sleep(0.25)
    raise RuntimeError("HTTP server not ready")


def wait_cdp():
    for _ in range(50):
        try:
            tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT_CDP}/json/list", timeout=1))
            if tabs:
                return tabs
        except Exception:
            time.sleep(0.25)
    raise RuntimeError("Chrome CDP not ready")


def poll_status(ws_url: str, deadline: float):
    """Lightweight status poll only — never pull the compiled payload over CDP."""
    import websocket

    ws = websocket.create_connection(ws_url, timeout=20)
    msg_id = 0

    def send(method, params=None):
        nonlocal msg_id
        msg_id += 1
        payload = {"id": msg_id, "method": method}
        if params is not None:
            payload["params"] = params
        ws.send(json.dumps(payload))
        while True:
            data = json.loads(ws.recv())
            if data.get("id") == msg_id:
                return data

    send("Runtime.enable")
    last = ""
    while time.time() < deadline and not DONE_EVT.is_set():
        res = send(
            "Runtime.evaluate",
            {
                "expression": 'document.title || ""',
                "returnByValue": True,
            },
        )
        val = res.get("result", {}).get("result", {}).get("value", "")
        if val != last:
            print("STATUS", val, flush=True)
            last = val
        if str(val).startswith("COMPILE_FAIL"):
            # Grab short error text only
            err = send(
                "Runtime.evaluate",
                {
                    "expression": '(document.getElementById("status")||{}).textContent||""',
                    "returnByValue": True,
                },
            )
            text = err.get("result", {}).get("result", {}).get("value", "")
            DONE["error"] = text[:2000]
            DONE_EVT.set()
            break
        time.sleep(1.5)
    ws.close()


def main():
    if not CHROME or not Path(CHROME).exists():
        raise RuntimeError(f"Chrome not found at {CHROME}")
    if not MINDAR_DIST.is_dir():
        raise RuntimeError(f"mind-ar dist missing: {MINDAR_DIST}")
    if not SRC_IMG.is_file():
        raise RuntimeError(f"Missing mural image: {SRC_IMG}")

    # Prefer a downscaled mural for faster compile; keep original for AR matching quality if needed
    try:
        from PIL import Image

        im = Image.open(SRC_IMG).convert("RGB")
        w, h = im.size
        scale = min(1.0, 800 / float(w))
        if scale < 1.0:
            im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        im.save(DST_IMG, quality=92)
        print(f"Prepared compile image {im.size} -> {DST_IMG}", flush=True)
    except Exception as e:
        print("PIL resize skipped:", e, flush=True)
        DST_IMG.write_bytes(SRC_IMG.read_bytes())

    # Free port if a previous run left a server behind
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{PORT_HTTP}/", timeout=0.5)
        print("WARNING: port 8765 already in use — kill leftover python http.server first", flush=True)
    except Exception:
        pass

    httpd = ThreadingHTTPServer(("127.0.0.1", PORT_HTTP), Handler)
    httpd.timeout = 1
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    chrome = None

    try:
        wait_http()
        print("HTTP ready on", PORT_HTTP, flush=True)

        chrome = subprocess.Popen(
            [
                CHROME,
                "--headless=new",
                "--disable-gpu=false",
                "--use-angle=swiftshader",
                "--enable-webgl",
                "--ignore-gpu-blocklist",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                f"--remote-debugging-port={PORT_CDP}",
                "--remote-allow-origins=*",
                f"--user-data-dir=/tmp/chrome-mindar-{os.getpid()}",
                f"http://127.0.0.1:{PORT_HTTP}/compile-mind.html",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        tabs = wait_cdp()
        tab = next((t for t in tabs if "compile-mind" in t.get("url", "")), tabs[0])
        print("TAB", tab.get("url"), flush=True)

        deadline = time.time() + 240
        poller = threading.Thread(
            target=poll_status,
            args=(tab["webSocketDebuggerUrl"], deadline),
            daemon=True,
        )
        poller.start()

        if not DONE_EVT.wait(timeout=240):
            raise RuntimeError("Timed out waiting for MindAR compile (4 min)")

        if not DONE["ok"]:
            raise RuntimeError("Compile failed:\n" + (DONE["error"] or "unknown error"))

        print(f"SUCCESS targets.mind bytes={DONE['bytes']}", flush=True)
    finally:
        if chrome and chrome.poll() is None:
            chrome.send_signal(signal.SIGTERM)
            try:
                chrome.wait(timeout=5)
            except Exception:
                chrome.kill()
        httpd.shutdown()


if __name__ == "__main__":
    main()
