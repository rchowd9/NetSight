from fastapi import FastAPI
from threading import Thread

from packetCapture import start_capture
from stats import get_stats