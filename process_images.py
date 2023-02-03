import os
import exifread as ef

def dms2dd(dms):
    d = float(dms.values[0].num) / float(dms.values[0].den)
    m = float(dms.values[1].num) / float(dms.values[1].den)
    s = float(dms.values[2].num) / float(dms.values[2].den)

    return round(d + m/60 + s/(60 * 60), 6)

base_dir = "photos/"
photo_path = base_dir + "unsorted/"
geoloc = base_dir + "georef/"
noloc = base_dir + "noloc/"
data_file = base_dir + "data.csv"

c_processed = 0
c_noloc = 0
c_georef = 0

# list the contents of photo_path
# for each image get the exif
for p in os.listdir(photo_path):
    pp = photo_path + p
    #print("Processing " + pp)

    # record data in data file
    if not os.path.exists(data_file):
        with open(data_file, 'w') as df:
            df.write("fn,lat,lng\n")
            df.close()

    with open(data_file, 'a') as df:
        with open(pp, 'rb') as fh:
            tags = ef.process_file(fh)
            lat = tags.get('GPS GPSLatitude')
            lat_ref = tags.get('GPS GPSLatitudeRef')
            long = tags.get('GPS GPSLongitude')
            long_ref = tags.get('GPS GPSLongitudeRef')

            coords = [None, None]
            if lat:
                lat_dd = dms2dd(lat)
                if lat_ref.values != 'N':
                    lat_dd = -lat_dd
                coords[0] = lat_dd

            if long:
                long_dd = dms2dd(long)
                if long_ref.values != 'E':
                    long_dd = -long_dd
                coords[1] = long_dd


            # move photo files
            if coords[0] is None or coords[1] is None:
                print("Has no coordinates")
                # count 
                c_noloc += 1
                if not os.path.exists(noloc):
                    os.makedirs(noloc)
                # no location info
                os.rename(pp, noloc + p)
            else:
                #print("Moved. Has coordinates", coords)
                # count 
                c_georef += 1

                if not os.path.exists(geoloc):
                    os.makedirs(geoloc)
                os.rename(pp, geoloc + p)

                df.write(p + ',' + str(coords[0]) + ',' + str(coords[1]) + '\n')

    # count photos processed
    c_processed += 1

