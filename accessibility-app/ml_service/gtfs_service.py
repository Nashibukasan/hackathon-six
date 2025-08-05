"""
GTFS (General Transit Feed Specification) service for transport mode detection.
Handles data ingestion from Victorian GTFS feeds and real-time vehicle positions.
"""

import requests
import pandas as pd
import sqlite3
import json
import os
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
import zipfile
import tempfile
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GTFSData:
    """Container for GTFS data."""
    
    def __init__(self, agency_id: str, agency_name: str):
        self.agency_id = agency_id
        self.agency_name = agency_name
        self.routes = pd.DataFrame()
        self.trips = pd.DataFrame()
        self.stops = pd.DataFrame()
        self.stop_times = pd.DataFrame()
        self.calendar = pd.DataFrame()
        self.vehicle_positions = pd.DataFrame()
        self.last_updated = None


class GTFSService:
    """Service for managing GTFS data and real-time vehicle positions."""
    
    # Victorian GTFS feeds
    VICTORIAN_GTFS_FEEDS = {
        'ptv': {
            'name': 'Public Transport Victoria',
            'schedule_url': 'https://www.ptv.vic.gov.au/gtfs/gtfs.zip',
            'realtime_url': 'https://www.ptv.vic.gov.au/gtfs/gtfs-realtime.zip'
        },
        'yarratrams': {
            'name': 'Yarra Trams',
            'schedule_url': 'https://www.yarratrams.com.au/gtfs/gtfs.zip',
            'realtime_url': 'https://www.yarratrams.com.au/gtfs/gtfs-realtime.zip'
        }
    }
    
    def __init__(self, db_path: str = "data/gtfs.db"):
        """
        Initialize GTFS service.
        
        Args:
            db_path: Path to SQLite database for storing GTFS data
        """
        self.db_path = db_path
        self.data_dir = Path(db_path).parent
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize database
        self._init_database()
        
        # Cache for loaded data
        self._cache = {}
    
    def _init_database(self):
        """Initialize the GTFS database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create tables for GTFS data
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agencies (
                agency_id TEXT PRIMARY KEY,
                agency_name TEXT NOT NULL,
                agency_url TEXT,
                agency_timezone TEXT,
                last_updated DATETIME
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS routes (
                route_id TEXT PRIMARY KEY,
                agency_id TEXT,
                route_short_name TEXT,
                route_long_name TEXT,
                route_type INTEGER,
                route_color TEXT,
                route_text_color TEXT,
                FOREIGN KEY (agency_id) REFERENCES agencies (agency_id)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS stops (
                stop_id TEXT PRIMARY KEY,
                stop_name TEXT NOT NULL,
                stop_lat REAL,
                stop_lon REAL,
                wheelchair_boarding INTEGER,
                last_updated DATETIME
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS trips (
                trip_id TEXT PRIMARY KEY,
                route_id TEXT,
                service_id TEXT,
                trip_headsign TEXT,
                direction_id INTEGER,
                wheelchair_accessible INTEGER,
                FOREIGN KEY (route_id) REFERENCES routes (route_id)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS stop_times (
                trip_id TEXT,
                stop_id TEXT,
                arrival_time TEXT,
                departure_time TEXT,
                stop_sequence INTEGER,
                pickup_type INTEGER,
                drop_off_type INTEGER,
                FOREIGN KEY (trip_id) REFERENCES trips (trip_id),
                FOREIGN KEY (stop_id) REFERENCES stops (stop_id),
                PRIMARY KEY (trip_id, stop_sequence)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vehicle_positions (
                vehicle_id TEXT,
                trip_id TEXT,
                route_id TEXT,
                latitude REAL,
                longitude REAL,
                bearing REAL,
                speed REAL,
                timestamp DATETIME,
                congestion_level INTEGER,
                occupancy_status INTEGER,
                PRIMARY KEY (vehicle_id, timestamp)
            )
        """)
        
        # Create indexes for performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_routes_agency ON routes(agency_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trips_route ON trips(route_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_stop_times_trip ON stop_times(trip_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_stop_times_stop ON stop_times(stop_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_vehicle_positions_trip ON vehicle_positions(trip_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_vehicle_positions_timestamp ON vehicle_positions(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_stops_location ON stops(stop_lat, stop_lon)")
        
        conn.commit()
        conn.close()
        
        logger.info(f"GTFS database initialized at {self.db_path}")
    
    def download_gtfs_feed(self, agency_id: str, feed_type: str = 'schedule') -> Optional[str]:
        """
        Download GTFS feed from the specified agency.
        
        Args:
            agency_id: Agency identifier
            feed_type: Type of feed ('schedule' or 'realtime')
            
        Returns:
            Path to downloaded file or None if failed
        """
        if agency_id not in self.VICTORIAN_GTFS_FEEDS:
            logger.error(f"Unknown agency: {agency_id}")
            return None
        
        feed_config = self.VICTORIAN_GTFS_FEEDS[agency_id]
        url_key = f'{feed_type}_url'
        
        if url_key not in feed_config:
            logger.error(f"No {feed_type} URL for agency {agency_id}")
            return None
        
        url = feed_config[url_key]
        filename = f"{agency_id}_{feed_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        filepath = self.data_dir / filename
        
        try:
            logger.info(f"Downloading {feed_type} feed from {feed_config['name']}...")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            logger.info(f"Downloaded {feed_type} feed to {filepath}")
            return str(filepath)
            
        except Exception as e:
            logger.error(f"Failed to download {feed_type} feed: {e}")
            return None
    
    def parse_gtfs_zip(self, zip_path: str) -> Dict[str, pd.DataFrame]:
        """
        Parse GTFS ZIP file and extract data.
        
        Args:
            zip_path: Path to GTFS ZIP file
            
        Returns:
            Dictionary of DataFrames for each GTFS table
        """
        data = {}
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_file:
                # List of expected GTFS files
                gtfs_files = [
                    'agency.txt', 'routes.txt', 'stops.txt', 'trips.txt',
                    'stop_times.txt', 'calendar.txt', 'calendar_dates.txt'
                ]
                
                for filename in gtfs_files:
                    if filename in zip_file.namelist():
                        with zip_file.open(filename) as file:
                            df = pd.read_csv(file)
                            table_name = filename.replace('.txt', '')
                            data[table_name] = df
                            logger.info(f"Parsed {filename}: {len(df)} records")
                    else:
                        logger.warning(f"File {filename} not found in GTFS feed")
            
            return data
            
        except Exception as e:
            logger.error(f"Failed to parse GTFS ZIP file: {e}")
            return {}
    
    def store_gtfs_data(self, agency_id: str, data: Dict[str, pd.DataFrame]):
        """
        Store GTFS data in the database.
        
        Args:
            agency_id: Agency identifier
            data: Dictionary of GTFS DataFrames
        """
        conn = sqlite3.connect(self.db_path)
        
        try:
            # Store agency information
            if 'agency' in data:
                agency_df = data['agency'].copy()
                agency_df['last_updated'] = datetime.now()
                agency_df.to_sql('agencies', conn, if_exists='replace', index=False)
            
            # Store routes
            if 'routes' in data:
                routes_df = data['routes'].copy()
                routes_df['agency_id'] = agency_id
                routes_df.to_sql('routes', conn, if_exists='append', index=False)
            
            # Store stops
            if 'stops' in data:
                stops_df = data['stops'].copy()
                stops_df['last_updated'] = datetime.now()
                stops_df.to_sql('stops', conn, if_exists='append', index=False)
            
            # Store trips
            if 'trips' in data:
                trips_df = data['trips'].copy()
                trips_df.to_sql('trips', conn, if_exists='append', index=False)
            
            # Store stop times
            if 'stop_times' in data:
                stop_times_df = data['stop_times'].copy()
                stop_times_df.to_sql('stop_times', conn, if_exists='append', index=False)
            
            # Store calendar
            if 'calendar' in data:
                calendar_df = data['calendar'].copy()
                calendar_df.to_sql('calendar', conn, if_exists='append', index=False)
            
            conn.commit()
            logger.info(f"Stored GTFS data for agency {agency_id}")
            
        except Exception as e:
            logger.error(f"Failed to store GTFS data: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    def update_gtfs_data(self, agency_id: str):
        """
        Update GTFS data for the specified agency.
        
        Args:
            agency_id: Agency identifier
        """
        logger.info(f"Updating GTFS data for {agency_id}...")
        
        # Download schedule feed
        zip_path = self.download_gtfs_feed(agency_id, 'schedule')
        if zip_path:
            # Parse and store data
            data = self.parse_gtfs_zip(zip_path)
            if data:
                self.store_gtfs_data(agency_id, data)
            
            # Clean up downloaded file
            os.remove(zip_path)
    
    def get_nearby_vehicles(self, latitude: float, longitude: float, 
                           radius_meters: float = 100, 
                           time_window_minutes: int = 5) -> List[Dict[str, Any]]:
        """
        Get vehicles near a specific location within a time window.
        
        Args:
            latitude: Latitude of the location
            longitude: Longitude of the location
            radius_meters: Search radius in meters
            time_window_minutes: Time window in minutes
            
        Returns:
            List of nearby vehicles with their information
        """
        conn = sqlite3.connect(self.db_path)
        
        try:
            # Calculate bounding box for efficient querying
            lat_deg_per_meter = 1 / 111320  # Approximate degrees per meter
            lon_deg_per_meter = 1 / (111320 * abs(latitude))
            
            lat_radius = radius_meters * lat_deg_per_meter
            lon_radius = radius_meters * lon_deg_per_meter
            
            # Query for nearby vehicles
            query = """
                SELECT DISTINCT
                    vp.vehicle_id,
                    vp.trip_id,
                    vp.route_id,
                    vp.latitude,
                    vp.longitude,
                    vp.bearing,
                    vp.speed,
                    vp.timestamp,
                    r.route_short_name,
                    r.route_long_name,
                    r.route_type
                FROM vehicle_positions vp
                LEFT JOIN routes r ON vp.route_id = r.route_id
                WHERE vp.latitude BETWEEN ? AND ?
                AND vp.longitude BETWEEN ? AND ?
                AND vp.timestamp >= datetime('now', '-{} minutes')
                ORDER BY vp.timestamp DESC
            """.format(time_window_minutes)
            
            cursor = conn.cursor()
            cursor.execute(query, (
                latitude - lat_radius,
                latitude + lat_radius,
                longitude - lon_radius,
                longitude + lon_radius
            ))
            
            vehicles = []
            for row in cursor.fetchall():
                vehicles.append({
                    'vehicle_id': row[0],
                    'trip_id': row[1],
                    'route_id': row[2],
                    'latitude': row[3],
                    'longitude': row[4],
                    'bearing': row[5],
                    'speed': row[6],
                    'timestamp': row[7],
                    'route_short_name': row[8],
                    'route_long_name': row[9],
                    'route_type': row[10]
                })
            
            return vehicles
            
        except Exception as e:
            logger.error(f"Failed to get nearby vehicles: {e}")
            return []
        finally:
            conn.close()
    
    def get_route_info(self, route_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific route.
        
        Args:
            route_id: Route identifier
            
        Returns:
            Route information or None if not found
        """
        conn = sqlite3.connect(self.db_path)
        
        try:
            query = """
                SELECT 
                    r.route_id,
                    r.route_short_name,
                    r.route_long_name,
                    r.route_type,
                    a.agency_name
                FROM routes r
                LEFT JOIN agencies a ON r.agency_id = a.agency_id
                WHERE r.route_id = ?
            """
            
            cursor = conn.cursor()
            cursor.execute(query, (route_id,))
            row = cursor.fetchone()
            
            if row:
                return {
                    'route_id': row[0],
                    'route_short_name': row[1],
                    'route_long_name': row[2],
                    'route_type': row[3],
                    'agency_name': row[4]
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get route info: {e}")
            return None
        finally:
            conn.close()
    
    def get_stop_info(self, stop_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific stop.
        
        Args:
            stop_id: Stop identifier
            
        Returns:
            Stop information or None if not found
        """
        conn = sqlite3.connect(self.db_path)
        
        try:
            query = """
                SELECT 
                    stop_id,
                    stop_name,
                    stop_lat,
                    stop_lon,
                    wheelchair_boarding
                FROM stops
                WHERE stop_id = ?
            """
            
            cursor = conn.cursor()
            cursor.execute(query, (stop_id,))
            row = cursor.fetchone()
            
            if row:
                return {
                    'stop_id': row[0],
                    'stop_name': row[1],
                    'latitude': row[2],
                    'longitude': row[3],
                    'wheelchair_boarding': row[4]
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get stop info: {e}")
            return None
        finally:
            conn.close()
    
    def get_accessible_stops(self, latitude: float, longitude: float, 
                           radius_meters: float = 500) -> List[Dict[str, Any]]:
        """
        Get accessible stops near a location.
        
        Args:
            latitude: Latitude of the location
            longitude: Longitude of the location
            radius_meters: Search radius in meters
            
        Returns:
            List of accessible stops
        """
        conn = sqlite3.connect(self.db_path)
        
        try:
            # Calculate bounding box
            lat_deg_per_meter = 1 / 111320
            lon_deg_per_meter = 1 / (111320 * abs(latitude))
            
            lat_radius = radius_meters * lat_deg_per_meter
            lon_radius = radius_meters * lon_deg_per_meter
            
            query = """
                SELECT 
                    stop_id,
                    stop_name,
                    stop_lat,
                    stop_lon,
                    wheelchair_boarding
                FROM stops
                WHERE stop_lat BETWEEN ? AND ?
                AND stop_lon BETWEEN ? AND ?
                AND wheelchair_boarding = 1
                ORDER BY 
                    ((stop_lat - ?) * (stop_lat - ?) + (stop_lon - ?) * (stop_lon - ?))
                LIMIT 20
            """
            
            cursor = conn.cursor()
            cursor.execute(query, (
                latitude - lat_radius,
                latitude + lat_radius,
                longitude - lon_radius,
                longitude + lon_radius,
                latitude, latitude,
                longitude, longitude
            ))
            
            stops = []
            for row in cursor.fetchall():
                stops.append({
                    'stop_id': row[0],
                    'stop_name': row[1],
                    'latitude': row[2],
                    'longitude': row[3],
                    'wheelchair_boarding': row[4]
                })
            
            return stops
            
        except Exception as e:
            logger.error(f"Failed to get accessible stops: {e}")
            return []
        finally:
            conn.close() 