import os
from contextlib import asynccontextmanager
from threading import Thread

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from anomaly import detector
from packetCapture import get_capture_status, reset_capture_status, start_capture
from stats import get_recent_packets, get_stats, reset_stats


@asynccontextmanager
async def lifespan(app):
    # Background workers start with the server, however it's launched
    # (`python api.py` or `uvicorn api:app`).
    Thread(
        target=start_capture,
        kwargs={
            "interface": os.getenv("NETSIGHT_IFACE"),
            "bpf_filter": os.getenv("NETSIGHT_FILTER"),
        },
        daemon=True,
    ).start()
    Thread(target=detector.run_forever, daemon=True).start()
    yield


app = FastAPI(title="NetSight AI", lifespan=lifespan)

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "NETSIGHT_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "NetSight AI Network Traffic Analyzer"}


@app.get("/stats")
def stats():
    return {**get_stats(), "capture": get_capture_status()}


@app.get("/packets")
def packets(
    limit: int = Query(100, ge=1, le=500),
    protocol: str | None = None,
    search: str | None = None,
):
    return get_recent_packets(limit=limit, protocol=protocol, search=search)


@app.get("/alerts")
def alerts(limit: int = Query(50, ge=1, le=200)):
    return {"status": detector.get_status(), "alerts": detector.get_alerts(limit)}


@app.post("/reset")
def reset():
    reset_stats()
    detector.reset()
    reset_capture_status(os.getenv("NETSIGHT_IFACE"))
    return {"message": "NetSight session data reset"}


@app.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int):
    if not detector.acknowledge_alert(alert_id):
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert acknowledged", "alert_id": alert_id}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
