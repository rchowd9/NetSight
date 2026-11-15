from fastapi import FastAPI
from threading import Thread

from packetCapture import start_capture
from stats import get_stats

app = FastAPI(
    title="NetSight AI"
)


@app.get("/")
def home():
    return {
        "message":
        "NetSight AI Network Traffic Analyzer"
    }

@app.get("/stats")
def stats():
    return get_stats()


if __name__ == "__main__":
    sniffer_thread = Thread(
        target=start_capture,
        daemon=True
    )

    sniffer_thread.start()

    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )