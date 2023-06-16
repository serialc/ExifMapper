# ExifMapper
ExifMapper georeferences photographs with location in exif data on a Leaflet map.

It also allows:
- manual georeferencing of resources (and location correction)
- multiple resource type embedded visualizations
    - photographs
    - 360 photospheres
    - video
    - audio
    - YouTube videos
    - URL links
- adding comments to resources
- exporting of a static webmap
- parallel editing of resources (using WebSockets)

## Designed use case
You are going on a field trip or excursion of some sort, you have told your students/participants to all 

## Instructions
1. Place all your photographs in a folder path: **photos/sorted/**
2. Run the **process_images.py** script
    - The script uses the ExifRead package, you can install it in a variety of ways:
        - With pip `pip install ExifRead`
        - With ppt (Debian/Ubuntu) `sudo apt install python3-exifread`
    - The script will determine which images have location included and move them to the the data/georef folder
    - Resources without lat/lng exif data will be moved to data/noloc
    - The process populates a data file (data/data.csv) that is used by the webmap
3. Load the PHP dependencies:
    - Using Composer run: `composer update`
3. Open the index.html file in a browser. All the photos with location should be visible.
    - You can extensively customize the map's contents until you are content.
4. Export the finalized 'static' web-map.
    - The resulting export is contained in `data/export/` and can be copied to any location as it contains all dependencies.

### Additional configuration options 
- To allow parallel user-processing with WebSockets:
    - Have the PHP script `activate_synchronisation.php` run in the background.
    - You may need to update the js/exmap.js URL for the websocket url onload (search WebSocket) and set the 'wss:' protocol as needed.
- If you wish to use Mapbox, or some other tileset, for map tiles rather than the OSM default, configure the options in js/exmap.js

