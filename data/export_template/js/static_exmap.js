EM = {
    "marker_icons": {
        "img": new L.Icon({
            iconUrl: 'imgs/leaflet-color-markers/marker-icon-2x-blue.png',
            shadowUrl: 'imgs/leaflet-color-markers/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        }),
        "360": new L.Icon({
            iconUrl: 'imgs/leaflet-color-markers/marker-icon-2x-red.png',
            shadowUrl: 'imgs/leaflet-color-markers/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        }),
        "vid": new L.Icon({
            iconUrl: 'imgs/leaflet-color-markers/marker-icon-2x-violet.png',
            shadowUrl: 'imgs/leaflet-color-markers/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        }),
        "audio": new L.Icon({
            iconUrl: 'imgs/leaflet-color-markers/marker-icon-2x-green.png',
            shadowUrl: 'imgs/leaflet-color-markers/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        }),
        "href": new L.Icon({
            iconUrl: 'imgs/leaflet-color-markers/marker-icon-2x-yellow.png',
            shadowUrl: 'imgs/leaflet-color-markers/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        }),
        "unknown": new L.Icon({
            iconUrl: 'imgs/leaflet-color-markers/marker-icon-2x-black.png',
            shadowUrl: 'imgs/leaflet-color-markers/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }
};

window.onload = function(e)
{
    EM.loadData();
    let ovrly = document.getElementById('overlay');
    ovrly.style.display = 'none';
};

EM.mapClick = function(e)
{
    // if the function is defined - run it
    if (EM.onMapClick) {
        EM.onMapClick(e);
    }
};

EM.loadGeoResources = function(fp, fn)
{
    fetch('php/api.php?req=load_geo', {cache: "reload"})
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.response === 'good') {
            let og = document.getElementById('overlay_geo');
            let mb = document.getElementById('more_buttons');
            //mb.style.display = 'none';

            og.innerHTML = '<div class="mt-2"><strong>Or select a feature from below to associate resource with:</strong></div>';
            for (let i in data.geo) {
                og.innerHTML += '<a href="javascript:EM.associateResourceToGeoJson(\'' + fp + '\',\'' + fn + '\',\'' + data.geo[i] + '\')">' + data.geo[i] + '</a><br>';
            }
        }
        if (data.response === 'bad') {
            console.log(data);
        }
    })
};

EM.parsePhotosData = function(data)
{
    let rdata = data.split('\n')
    let head = true;
    let plist = [];

    // we want the mean centre of the points
    // however this gets over-ridden but may be a good
    let meanloc = [0,0];
    let count = 0;

    for (let i = 0; i < rdata.length; i+=1) {
        // skip header
        if (head) {
            head = false;
            continue;
        }

        let row = rdata[i];
        // skip empty row
        if (row === '') {
            continue;
        }

        let p = row.split(',');

        let pobj = {
            "fn": p[0],
            "lat": p[1],
            "lng": p[2],
            "rtype": p[3],
            "mtype": p[4],
            "comment": p[5],
            "geojson": p[6]
        };

        // add image to list
        plist.push(pobj);

        // if there's no lat/lng, skip (may be a GeoJSON resource)
        if (p[1] === '' || p[2] === '') {
            continue;
        }

        // we want to get the mean centre
        // for geojson there is no lat/lng so don't do the following
        if (pobj[3] !== 'geojson') {
            meanloc[0] += parseFloat(p[1], 10);
            meanloc[1] += parseFloat(p[2], 10);
            count += 1;
        }
    }

    EM.photos = plist;

    // calculate mean location
    EM.mean_ll = meanloc;
    //EM.mean_ll = [meanloc[0]/count, meanloc[1]/count];
};

EM.loadData = function()
{
    fetch('meta_data.csv', {cache: "reload"})
    .then(function(response) { return response.text(); })
    .then(function(data) {
        // parse data and save to EM
        EM.parsePhotosData(data)

        // now show the map
        EM.displayMap();

        // capture map clicks
        EM.map.on('click', EM.mapClick);
    })
};

EM.displayMap = function()
{
    // if the map already exists then don't create it
    if (!EM.map) {
        EM.map = L.map('map').setView(EM.mean_ll, 10);

        let tiles = L.tileLayer(
            "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
            {
                id: 'mapbox/satellite-v9',
                accessToken: "pk.eyJ1IjoiY3lyaWxsZW1kYyIsImEiOiJjazIwamZ4cXIwMzN3M2hscmMxYjgxY2F5In0.0BmIVj6tTvXVd2BmmFo6Nw",
                attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 20,
            }
        ).addTo(EM.map);

        // add makers and refocus
        EM.updateMarkers(true);
    } else {
        // update markers - no refocus
        EM.updateMarkers(false);
    }
};

EM.updateMarkers = function(reframe=false)
{
    // if there are already markers, remove them
    if (EM.markers && EM.markers.length > 0) {
        EM.markers.map( m => m.remove());
    }

    let markers = [];

    for (let i = 0; i < EM.photos.length; i+=1) {
        let p = EM.photos[i];

        // if no mtype is present, default to marker
        if (p.mtype === '') {
            p.mtype = 'marker';
        }

        if (p.mtype === 'geojson') {
            // add feature to map
            geoj_path = 'geojson/' + p.geojson;

            fetch(geoj_path)
            .then(function(response) { return response.json(); })
            .then(function(data) {
                L.geoJSON(data, {
                    style: function (feature) {
                        return {
                            "color": '#FFD326',
                            "weight": 5 
                        };
                    },
                    onEachFeature: function(feature, layer) {
                        layer.on({
                            click: function() {
                                EM.showPic("data/", p.fn, p.rtype, p.mtype, p.comment, 'geojson');
                            }
                        });
                    }
                }).addTo(EM.map);
            });
        }

        if (p.mtype === 'marker') {
            // determine the icon type
            let thisIcon = EM.marker_icons.unknown
            if ( p.rtype !== '' ) {
                thisIcon = EM.marker_icons[p.rtype];
            }

            let marker = new L.marker([p.lat, p.lng], {
                // options
                icon: thisIcon
            }).on('click', function() {
                EM.showPic("data/", p.fn, p.rtype, p.mtype, p.comment);
            });

            markers.push(marker);
        }
    }

    // save markers to main object
    EM.markers = markers;

    // define group and add to map
    let group = L.featureGroup(markers).addTo(EM.map);

    // zoom/pan to marker group bounds
    if (reframe) {
        EM.map.fitBounds(group.getBounds());
    }
};

EM.showPic = function(fp, fn, rtype, mtype, comment, actions='all')
{
    // so a bit hacky... but try and figure out type for geojson
    if (rtype === 'geojson') {
        rtype = '';
    }

    // try to determine rtype when empty, ''
    if (rtype === '') {
        // get extension - the last .*
        let fext = fn.split('.');
        fext = fext[fext.length - 1];

        let img_ftypes = ['png', 'jpg', 'gif'];
        if (img_ftypes.includes(fext.toLowerCase())) {
            rtype = 'img';
        }

        let vid_ftypes = ['mp4'];
        if (vid_ftypes.includes(fext.toLowerCase())) {
            rtype = 'vid';
        }
        let audio_ftype = ['m4a', 'mp3'];
        if (audio_ftype.includes(fext.toLowerCase())) {
            rtype = 'audio';
        }
    }


    let oihtml = '';

    if (rtype === 'vid') {
        oihtml += '<video controls><source src="' + fp + fn + '" type="video/mp4"></video>';
    }
    if (rtype === 'audio') {
        oihtml += '<audio controls src="' + fp + fn + '"></audio>';
    }
    if (rtype === 'img') {
        oihtml += '<img src="' + fp + fn + '">';
    }
    if (rtype === '360') {
        oihtml += '<div id="viewer360" style="width: 45vw; height: 60vh;"></div>';
    }
    if (rtype === 'href') {
        // over-ride actions for href
        actions = 'href';

        // determine which type of link - we can load some types
        // the link is stored in the filename: fn
        if (fn.search('youtube.com') !== -1) {
            // embed youtube video
            let code = fn.split('https://www.youtube.com/watch?v=')[1];
            oihtml += '<div style="position:relative;padding-top:56.25%;width:47vw;"><iframe src="https://www.youtube.com/embed/' + code + '?rel=0" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe></div>';
        } else {
            oihtml += '<a href="' + fn + '" target="_blank">' + fn + '</a>';
        }
    }

    // add the overlay content
    document.getElementById('overlay_img').innerHTML = oihtml;

    if (rtype === '360') {
        const viewer = new PhotoSphereViewer.Viewer({
            container: document.querySelector('#viewer360'),
            panorama: fp + fn,
        });
    }

    if (comment !== '') {
        document.getElementById('overlay_comment').innerHTML = comment;
    } else {
        document.getElementById('overlay_comment').innerHTML = '';
    }

    let over = document.getElementById('overlay');
    over.style.display = '';

    // only (dis)allow fullscreen button for certain resource types
    let fsimg = document.getElementById('full_screen_link');
    let nofs = ['360', 'vid', 'audio', 'href'];
    if (nofs.includes(rtype)) {
        fsimg.style.display = 'none';
    } else {
        fsimg.style.display = '';
        fsimg.innerHTML = '<a href="' + fp + fn + '" target="_blank" title="See in new tab"><i class="fa fa-expand"></i></a>';
    }

    let clsimg = document.getElementById('close_overlay_link');
    clsimg.innerHTML = '<i class="fa fa-close" title="Close"></i>';
    clsimg.addEventListener("click", (e) => {
        over.style.display = "none";
    });
};


