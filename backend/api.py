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
