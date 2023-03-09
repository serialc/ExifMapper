# ExifMapper
Georeferences photographs with location in exif data on a Leaflet map. Allows manual georeferencing, location correction, multiple resource visualization (e.g., 360 photosphere, image, video), adding comments to resources, and the export of non-editable webmap.

## Instructions
1. Place all your photographs in a folder path: **photos/sorted/**
1. Update the mapbox accessToken in js/exmap.js (search accessToken) to your own
2. Run the **process_images.py** script
    - this will determine which images have location included
    - move them to the the photos/georef folder
    - those without lat/lng exif data will be moved to photos/noloc
    - the process populates a data file (photos/data.csv) that is used by the webmap
3. To allow parallel user-processing with WebSockets update the js/exmap.js URL for the websocket url onload (search WebSocket) and set, if needed, 'ws:' to 'wss:' for SSL. This is optional.
4. Open the index.html file in a browser. All the photos with location should be visible.
5. Export the finalized 'static' web-map.

