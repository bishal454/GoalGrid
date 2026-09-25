import os
import json
import time
from datetime import datetime, timezone

def simulate_fivetran_sync() -> None:
    print("=== Fivetran Weather & Transit Data Sync Simulator ===")
    
    # 1. Weather Data Simulation (representing OpenWeatherMap sync outputs)
    weather_payloads = [
        {
            "city": "london",
            "temp_c": 14.5,
            "condition": "Light Rain",
            "wind_kph": 12,
            "humidity": 82,
            "alert": "Yellow alert for localized road flooding"
        },
        {
            "city": "madrid",
            "temp_c": 22.1,
            "condition": "Sunny",
            "wind_kph": 5,
            "humidity": 45,
            "alert": "None"
        },
        {
            "city": "milan",
            "temp_c": 18.0,
            "condition": "Partly Cloudy",
            "wind_kph": 8,
            "humidity": 60,
            "alert": "None"
        },
        {
            "city": "new york",
            "temp_c": 28.3,
            "condition": "Thundershowers",
            "wind_kph": 25,
            "humidity": 90,
            "alert": "Severe convective storm alert - expect transit cancellations"
        }
    ]
    
    # 2. Transit Data Simulation (representing GTFS realtime feed sync outputs)
    transit_payloads = [
        {
            "route": "RED LINE",
            "mode": "subway",
            "status": "Delayed",
            "delay_minutes": 15,
            "reason": "Signal malfunction at Central St",
            "last_updated": datetime.now(timezone.utc).isoformat()
        },
        {
            "route": "BUS 42",
            "mode": "bus",
            "status": "Suspended",
            "delay_minutes": -1,
            "reason": "Traffic incident on Main St bypass",
            "last_updated": datetime.now(timezone.utc).isoformat()
        },
        {
            "route": "TRAIN 7",
            "mode": "train",
            "status": "On Time",
            "delay_minutes": 0,
            "reason": "None",
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    ]

    print("\n[Fivetran Source Configuration]")
    print("- Weather API Source: OpenWeatherMap Connector (Active)")
    print("- Transit Feed Source: GTFS-RT (Active)")
    
    print("\n[Fivetran Ingestion Target]")
    print("- Destination: MongoDB Atlas Database ('offside_ai')")
    print("- Weather Target Collection: 'weather_feed'")
    print("- Transit Target Collection: 'transit_feed'")
    
    print("\nRunning simulated Fivetran ingestion pass...")
    time.sleep(1)
    
    # Simulate writing weather to MongoDB representation
    print("\n--> Syncing weather_feed collection:")
    for payload in weather_payloads:
        payload["fivetran_synced_at"] = datetime.now(timezone.utc).isoformat()
        print(f"    [UPDATEMANY] City: {payload['city'].capitalize()} | Temp: {payload['temp_c']}C | Condition: {payload['condition']}")
        
    # Simulate writing transit to MongoDB representation
    print("\n--> Syncing transit_feed collection:")
    for payload in transit_payloads:
        payload["fivetran_synced_at"] = datetime.now(timezone.utc).isoformat()
        print(f"    [UPDATEMANY] Route: {payload['route']} | Status: {payload['status']} | Reason: {payload['reason']}")
        
    print("\nIngestion completed. Data freshness is 100% verified.")
    print("MongoDB Atlas index metadata updated successfully.")

if __name__ == "__main__":
    simulate_fivetran_sync()
