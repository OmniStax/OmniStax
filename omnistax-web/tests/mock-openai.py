"""A stand-in for a host that speaks OpenAI's chat-completions API.

It streams one fixed answer as server-sent events, so the chat tab can be
driven in a browser with no key and no network. Run it beside a served dist:

    python3 tests/mock-openai.py 8094
"""

import json
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8094

# The answer the mock always gives: markdown with maths and a link into the
# book, so the browser check can see that the note renderer is doing its work.
ANSWER = "The period is $T = 2\\pi\\sqrt{L/g}$, so the mass cancels. See [[16.4]]."
# Asked for a widget, the mock writes one, so that the sandboxed frame can be
# checked as well; the app only shows it with inline HTML rendering on.
WIDGET = "Here it is.\n\n```widget\n<!doctype html><title>t</title><p id=w>a widget</p>\n```\n\nThat is all."
# Asked to answer "with a tool", the mock calls list_books first and answers once the
# result comes back.
TOOL_ANSWER = "The shelf holds the books listed above."
MODELS = ["mock-1", "mock-2"]


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):  # quiet
        pass

    def cors(self):
        self.send_header("access-control-allow-origin", "*")
        self.send_header("access-control-allow-headers", "*")
        self.send_header("access-control-allow-methods", "GET, POST, OPTIONS")

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header("content-length", "0")
        self.end_headers()

    def do_GET(self):
        if not self.path.startswith("/v1/models"):
            self.send_error(404)
            return
        body = json.dumps({"data": [{"id": m} for m in MODELS]}).encode()
        self.send_response(200)
        self.cors()
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_event(self, chunk):
        self.wfile.write(f"data: {json.dumps(chunk)}\n\n".encode())
        self.wfile.flush()

    # A tool call in two pieces, the way OpenAI streams one.
    def send_call(self):
        self.send_event({"choices": [{"delta": {"tool_calls": [{"index": 0, "id": "call_1", "function": {"name": "list_", "arguments": ""}}]}}]})
        self.send_event({"choices": [{"delta": {"tool_calls": [{"index": 0, "function": {"name": "books", "arguments": "{}"}}]}}]})

    def do_POST(self):
        if not self.path.startswith("/v1/chat/completions"):
            self.send_error(404)
            return
        length = int(self.headers.get("content-length") or 0)
        request = json.loads(self.rfile.read(length) or b"{}")
        # A request the app built badly should fail the check loudly rather
        # than stream an answer anyway.
        assert request.get("stream") is True, "the app must ask for a stream"
        assert request["messages"][0]["role"] == "system", "the system prompt comes first"

        self.send_response(200)
        self.cors()
        self.send_header("content-type", "text/event-stream")
        self.send_header("cache-control", "no-cache")
        self.send_header("connection", "close")
        self.end_headers()
        last = request["messages"][-1]
        wanted = last["content"] if isinstance(last.get("content"), str) else json.dumps(last.get("content"))
        if last["role"] == "user" and "with a tool" in wanted.lower():
            assert request.get("tools"), "the app offers its tools"
            self.send_call()
        else:
            answer = TOOL_ANSWER if last["role"] == "tool" else WIDGET if "widget" in wanted.lower() else ANSWER
            for word in answer.split(" "):
                self.send_event({"choices": [{"delta": {"content": word + " "}}]})
                time.sleep(0.02)
        self.wfile.write(b"data: [DONE]\n\n")
        self.wfile.flush()


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
