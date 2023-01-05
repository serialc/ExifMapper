# ExifMapper
Georeferences photographs with location in exif data on a Leaflet map.

## Instructions
1. Place all your photographs in a folder path: **photos/sorted/**
2. Run the **process_images.py** script
    - this will determine which images have location included
    - move them to the the photos/georef folder
    - those without lat/lng exif data will be moved to photos/noloc
    - the process populates a data file (photos/data.csv) that is used by the webmap
3. Open the index.html file. All the photos with location should be visible.

