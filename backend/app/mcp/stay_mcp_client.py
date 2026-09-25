import asyncio
import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

# ─────────────────────────────────────────────────────────────────────────────
# StayMCPClient
#
# Communicates with the MCP services_server.py over stdin/stdout using the
# JSON-RPC 2.0 MCP protocol.
#
# WHY subprocess.Popen instead of asyncio.create_subprocess_exec?
# On Windows, asyncio.create_subprocess_exec only works with ProactorEventLoop.
# Uvicorn uses SelectorEventLoop by default, and switching the policy after the
# loop is already running has no effect.  subprocess.Popen is a plain blocking
# call that works on ALL platforms; we offload the blocking I/O to a thread
# pool via loop.run_in_executor() so it stays non-blocking inside FastAPI.
# ─────────────────────────────────────────────────────────────────────────────

class StayMCPClient:
    def __init__(self) -> None:
        self.process: Optional[subprocess.Popen] = None
        self.request_id: int = 0

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    async def connect(self) -> None:
        """
        Spawns services_server.py as a child process using subprocess.Popen
        (blocking) inside run_in_executor so we do not block the event loop.
        Works on Windows SelectorEventLoop as well as ProactorEventLoop.
        """
        server_path = Path(__file__).resolve().parent / "services_server.py"
        loop = asyncio.get_event_loop()

        def _spawn() -> subprocess.Popen:
            return subprocess.Popen(
                [sys.executable, str(server_path)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

        self.process = await loop.run_in_executor(None, _spawn)
        await self._initialize_handshake()

    async def disconnect(self) -> None:
        """Close stdin and wait for the child process to exit."""
        if self.process:
            loop = asyncio.get_event_loop()
            try:
                def _close():
                    try:
                        self.process.stdin.close()
                    except Exception:
                        pass
                    try:
                        self.process.wait(timeout=5)
                    except Exception:
                        self.process.kill()

                await loop.run_in_executor(None, _close)
            except Exception:
                pass
            self.process = None

    # ── MCP protocol methods ───────────────────────────────────────────────────

    async def _initialize_handshake(self) -> None:
        self.request_id += 1
        init_request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "stay-mcp-client",
                    "version": "1.0.0",
                },
            },
        }
        await self._write_line(json.dumps(init_request))
        await self._read_line()  # consume initialize response

    async def list_tools(self) -> List[Dict[str, Any]]:
        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": "tools/list",
        }
        await self._write_line(json.dumps(request))
        resp_str = await self._read_line()
        resp = json.loads(resp_str)
        return resp.get("result", {}).get("tools", [])

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calls a named tool on the MCP server and returns the parsed result dict.
        """
        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        }
        await self._write_line(json.dumps(request))
        resp_str = await self._read_line()
        resp = json.loads(resp_str)

        contents = resp.get("result", {}).get("content", [])
        if contents and contents[0].get("type") == "text":
            return json.loads(contents[0].get("text", "{}"))
        return {"status": "error", "message": "Failed to parse tool result."}

    # ── Low-level I/O (blocking calls offloaded to thread pool) ───────────────

    async def _write_line(self, line: str) -> None:
        if not self.process or not self.process.stdin:
            raise RuntimeError("MCP Server not connected.")
        loop = asyncio.get_event_loop()
        data = (line + "\n").encode("utf-8")

        def _write():
            self.process.stdin.write(data)
            self.process.stdin.flush()

        await loop.run_in_executor(None, _write)

    async def _read_line(self) -> str:
        if not self.process or not self.process.stdout:
            raise RuntimeError("MCP Server not connected.")
        loop = asyncio.get_event_loop()
        line: bytes = await loop.run_in_executor(None, self.process.stdout.readline)
        return line.decode("utf-8").strip()


# ── Standalone test harness ────────────────────────────────────────────────────

async def main():
    client = StayMCPClient()
    print("Connecting to MCP Staying Places Server...")
    await client.connect()

    try:
        print("\nListing available tools:")
        tools = await client.list_tools()
        for t in tools:
            print(f"  - {t['name']}: {t['description']}")

        print("\nTesting 'search_stays' — Emirates Stadium, airbnb, max $100:")
        result = await client.call_tool("search_stays", {
            "stadium": "Emirates Stadium",
            "accommodation_type": "airbnb",
            "max_price": 100,
        })
        print(json.dumps(result, indent=2))

        print("\nTesting 'search_stays' — Anfield, all types, max $60:")
        result_compare = await client.call_tool("search_stays", {
            "stadium": "Anfield",
            "accommodation_type": "all",
            "max_price": 60,
        })
        print(json.dumps(result_compare, indent=2))

    finally:
        print("\nDisconnecting...")
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
