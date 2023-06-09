};

window.onload = function(e)
{
    EM.loadData();
    let ovrly = document.getElementById('overlay');
    ovrly.style.display = 'none';

    let fo = document.getElementById('files_overlay');
    fo.style.display = 'none';
    EM.loadNoLoc();

    // websockets connection - this could cause an error but there's nothing to catch see:
    // https://stackoverflow.com/questions/31002592/javascript-doesnt-catch-error-in-websocket-instantiation
    // This is fine though - everything (except the websocket) still works
    var loc = window.location;
    var conn = new WebSocket('wss://' + loc.host + ':8080' + loc.pathname);
    conn.onopen = function(e) {
        console.log("Connection established!");
    };

    conn.onmessage = function(e) {
        switch (e.data) {
            case 'reload_data':
                EM.loadData();
                EM.loadNoLoc();
                break;

            default:
                console.log("Command not known");
                break;
        }
    };
    EM.conn = conn;
};

EM.mapClick = function(e)
{
    // if the function is defined - run it
    if (EM.onMapClick) {
        EM.onMapClick(e);
    }
};

EM.displayEditableComment = function(fn)
{
    let btn = document.getElementById('btn_change_comment');
    let oc = document.getElementById('overlay_comment');
    let oci = document.getElementById('overlay_comment_input');

    // if the input form is visible and button clicked then save the comment
    if (oci.style.display === '') {
        // show the comment
        oc.style.display = '';
        oc.innerHTML = oci.value;
        oci.style.display = 'none';
        btn.innerHTML = "Comment";

        // do this
        // Save the input - fetch
        // convert any ',' to ' -'
        oci.value.replace(',', ' -');
        fetch('php/api.php?req=change_comment&fn=' + fn + '&comment=' + oci.value, {cache: "reload"})
            .then(function(response) { return response.json(); })
            .then(function(data) {
                // refresh markers
                if (data.response === 'good') {
                    // send message to server to push updates to other clients
                    if (EM.conn) {
                        EM.conn.send('reload_data');
                        EM.loadData();
                    }
                }
                if (data.response === 'bad') {
                    console.log(data);
                }
            });
    } else {
        // show the comment input field and hide the comment text
        oc.style.display = 'none';
        oci.style.display = '';
        oci.value = oc.innerHTML;
        oci.focus();
        // put cursor at end of input
        oci.selectionStart = oci.value.length;
        btn.innerHTML = "Save";
    }
};

EM.changeResourceType = function(fn)
{
    let mb = document.getElementById('more_buttons');
    let og = document.getElementById('overlay_geo');

    // toggle - hide buttons
    if (mb.children.length > 0) {
        mb.innerHTML = '';
        og.innerHTML = '';
        return;
    }
    // show buttons
    mb.innerHTML = '<br>Choose type:<br>' +
        '<button class="btn btn-info btn-sm" onclick="EM.submitResourceType(\'' + fn + '\',\'img\')" title="Picture/Image">Img</button>' +
        '<button class="btn btn-info btn-sm" onclick="EM.submitResourceType(\'' + fn + '\',\'360\')" title="360 degree photosphere">360</button>' +
        '<button class="btn btn-info btn-sm" onclick="EM.submitResourceType(\'' + fn + '\',\'audio\')" title="Audio">Audio</button>' +
        '<button class="btn btn-info btn-sm" onclick="EM.submitResourceType(\'' + fn + '\',\'vid\')" title="Video">Video</button>';
};

EM.loadGeoResources = function(fp, fn)
{
    // load all the unattributed geojson files
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

EM.associateResourceToGeoJson = function(fp, fn, geofn, rtype)
{
    fetch('php/api.php?req=geojson_assoc&fp=' + fp + '&fn=' + fn + '&geofn=' + geofn + '&rtype=' + rtype, {cache: "reload"})
    .then(function(response) { return response.json(); })
    .then(function(data) {
        // refresh markers
        if (data.response === 'good') {
            // the data should be returned
            EM.parsePhotosData(data.photos);
            EM.parseNolocData(data.noloc);

            // update the marker
            EM.updateMarkers();

            // hide the overlay
            let over = document.getElementById('overlay');
            over.style.display = 'none';

            // stop listening to clicks on map
            // deactivate next map click
            EM.onMapClick = undefined;
            // remove crosshair cursor styling
            mapcont.classList.remove('crosshair');
            // send message to server to push updates to other clients
            if (EM.conn) {
                EM.conn.send('reload_data');
            }
        }
        if (data.response === 'bad') {
            console.log(data);
        }
    });
};

EM.submitResourceType = function(fn, rtype)
{
    fetch('php/api.php?req=change_type&fn=' + fn + '&rtype=' + rtype, {cache: "reload"})
    .then(function(response) { return response.json(); })
    .then(function(data) {
        // refresh markers
        if (data.response === 'good') {
            // get the fresh data
            EM.parsePhotosData(data.photos);

            // hide the overlay
            let over = document.getElementById('overlay');
            over.style.display = 'none';

            // send message to server to push updates to other clients
            if (EM.conn) {
                EM.conn.send('reload_data');
            }
        }
        if (data.response === 'bad') {
            console.log(data);
        }
    });
};

EM.relocatePhoto = function(fp, fn)
{
    let reloc_btn = document.getElementById('btn_change_location');
    let mapcont = document.getElementById('map');
    let btn_alt_text = 'Click map or cancel';

    // shrink the image size to provide better view of the map
    let ovrly = document.getElementById('overlay');
    ovrly.style = 'max-width: 25vw';

    // provide feedback and allow toggle
    if (reloc_btn.innerHTML === btn_alt_text) {
        EM.endRelocationCleanUp();
        return;
    } else {
        reloc_btn.innerHTML = btn_alt_text;
    }

    // load and show the features that can be associated with a resource
    // pass everything about this resource as well
    EM.loadGeoResources(fp, fn);

    // set cursor on map as crosshair
    mapcont.classList.add('crosshair');

    // hide the overlay?
    //let ovrly = document.getElementById('overlay');
    //ovrly.style.display = 'none';

    // on the map click do the following
    EM.onMapClick = function(e) {

        fetch('php/api.php?req=relocate&fp=' + fp + '&fn=' + fn + '&lat=' + e.latlng.lat + '&lng=' + e.latlng.lng, {cache: "reload"})
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.response === 'good') {
                // change back the buttons, crosshair, geojsons available
                EM.endRelocationCleanUp();
                // the data should be returned
                EM.parsePhotosData(data.photos);
                EM.parseNolocData(data.noloc);

                // update the marker
                EM.updateMarkers();
                
                // hide the overlay
                let over = document.getElementById('overlay');
                over.style.display = 'none';

                // send message to server to push updates to other clients
                if (EM.conn) {
                    EM.conn.send('reload_data');
                }
            }
            if (data.response === 'bad') {
                console.log(data);
            }
        });
    };

};

EM.endRelocationCleanUp = function()
{
    // reset text of button
    document.getElementById('btn_change_location').innerHTML = '(re)Locate';

    // deactivate next map click
    EM.onMapClick = undefined;

    // remove crosshair cursor styling
    document.getElementById('map').classList.remove('crosshair');

    // resize overlay img back to full
    document.getElementById('overlay').style = '';

    // remove the features selection
    document.getElementById('overlay_geo').innerHTML = '';
};

EM.loadNoLoc = function()
{
    fetch('php/api.php?req=noloclist', {cache: "reload"})
    .then(function(response) { return response.json(); })
    .then(function(data) {
        EM.parseNolocData(data);
    });
};

EM.parseNolocData = function(data)
{
    // data is simply a list of filenames - without lat/lng or file type
    
    // make the files overlay visible
    let fo = document.getElementById('files_overlay');
    fo.style.display = '';

    let html_list = "";
    for (let i in data) {
        html_list += '<a href="#" onclick="EM.showPic(\'data/noloc/\', \'' + data[i] + '\',\'\',\'\',\'\',\'del_loc\')">' + data[i] + "</a><br>";
    }

    // fill in the container of noloc files
    let fof = document.getElementById('fo_files');
    fof.innerHTML = html_list;

    // hide the noloc files as there are none
    if (data.length === 0) {
        document.getElementById('files_overlay').style.display = 'none';
    }
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
    fetch('data/data.csv', {cache: "reload"})
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

        // add controls
        let br_btns = L.control({position: 'bottomright'});
        br_btns.onAdd = function() {
            let div = L.DomUtil.create('div', 'leafcon');
            let span = document.createElement('span');
            span.innerHTML = '<a href="javascript:EM.export()"><button id="export_button" class="btn btn-warning btn-sm">Export</button></a>' +
                '<a id="export_link" class="ms-2" href="data/export/" target="_blank" style="display: none"><button class="btn btn-success btn-sm"><i class="fa fa-external-link"></i></button></a>';
            div.append(span);

            let link = document.createElement('a');
            link.addEventListener('click', EM.newHrefMarker, event);
            link.href= "\#";
            let nubtn = document.createElement('button');
            nubtn.classList.add('ms-2');
            nubtn.classList.add('btn');
            nubtn.classList.add('btn-primary');
            nubtn.classList.add('btn-sm');
            nubtn.id = 'new_marker_link';
            nubtn.innerHTML = 'New URL Marker';
            link.append(nubtn);
            div.append(link);
            return div;
        };
        br_btns.addTo(EM.map);

        // add makers and refocus
        EM.updateMarkers(true);
    } else {
        // update markers - no refocus
        EM.updateMarkers(false);
    }
};

EM.newHrefMarker = function(e)
{
    e.stopPropagation();

    let mapcont = document.getElementById('map');
    let new_marker_link = document.getElementById('new_marker_link');

    // toggle adding new marker
    if (mapcont.classList.contains('crosshair')) {
        // remove crosshair cursor styling
        mapcont.classList.remove('crosshair');
        new_marker_link.innerHTML = 'New Marker';

        // deactivate map click 
        EM.onMapClick = undefined;

    } else {
        // set cursor on map as crosshair
        mapcont.classList.add('crosshair');
        new_marker_link.innerHTML = 'Cancel';

        EM.onMapClick = function(e) {

            let url = prompt("Provide the URL to associate with this marker");
            if (url === null) {
                return;
            }

            // deactivate map click now that this has happened
            EM.onMapClick = undefined;

            fetch('php/api.php?req=new_marker&fn=' + url + '&lat=' + e.latlng.lat + '&lng=' + e.latlng.lng, {cache: "reload"})
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (data.response === 'good') {
                    // remove crosshair cursor styling
                    mapcont.classList.remove('crosshair');
                    new_marker_link.innerHTML = 'New Marker';

                    // the data should be returned
                    EM.parsePhotosData(data.photos);

                    // update the marker
                    EM.updateMarkers();

                    // send message to server to push updates to other clients
                    if (EM.conn) {
                        EM.conn.send('reload_data');
                    }
                }
                if (data.response === 'bad') {
                    console.log(data);
                }
            });
        };
    }
};

EM.export = function()
{
    let ebtn = document.getElementById('export_button');
    let elnk = document.getElementById('export_link');

    // show processing
    ebtn.innerHTML = '<i class="fa fa-spin fa-circle-o-notch"></i>';
    
    // copy as needed to the export folder
    fetch('php/api.php?req=export', {cache: "reload"})
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.response === 'good') {
            // return button to normal text
            ebtn.innerHTML = 'Export';
            elnk.style.display = '';
        }
        if (data.response === 'bad') {
            ebtn.innerHTML = 'Error';
            elnk.style.display = 'none';
            console.log(data);
        }
    });
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
            geoj_path = 'data/geo_data/allocated/' + p.geojson;

            fetch(geoj_path)
            .then(function(response) { return response.json(); })
            .then(function(data) {
                L.geoJSON(data, {
                    style: function (feature) {
                        return {
                            "color": '#4682B4',
                            "weight": 5 
                        };
                    },
                    onEachFeature: function(feature, layer) {
                        layer.on({
                            click: function() {
                                EM.showPic("data/georef/", p.fn, p.rtype, p.mtype, p.comment, 'geojson');
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
                EM.showPic("data/georef/", p.fn, p.rtype, p.mtype, p.comment);
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
    // try to determine rtype when empty, ''
    if (rtype === '') {
        // get filename extension - the last .*
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

    let btns_html = '';
    let btn_html_del = '<button id="btn_delete_resource" class="btn btn-danger" onclick="EM.deletePrompt(\'' + fp + '\', \'' + fn + '\',\'' + rtype + '\')">Delete</button>';
    let btn_html_reloc = '<button id="btn_change_location" class="btn btn-primary" onclick="EM.relocatePhoto(\'' + fp + '\', \'' + fn + '\')">(re)Locate</button>';
    let btn_html_comment = '<button id="btn_change_comment" class="btn btn-success" onclick="EM.displayEditableComment(\'' + fn + '\')">Comment</button>';
    let btn_html_type = '<button id="btn_change_type" class="btn btn-secondary" onclick="EM.changeResourceType(\'' + fn + '\')">Type</button> <span id="more_buttons"></span>';

    // show button set based on allowed action name
    switch (actions) {
        case 'all':
            btns_html = '<div>' + btn_html_del + btn_html_reloc + btn_html_comment + btn_html_type + '</div>';
            break;
        case 'del_loc':
            btns_html = '<div>' + btn_html_del + btn_html_reloc + '</div>';
            break;
        case 'geojson':
            btns_html = '<div>' + btn_html_del + btn_html_comment + '</div>';
            break;
        case 'href':
            btns_html = '<div>' + btn_html_del + btn_html_reloc + btn_html_comment + '</div>';
            break;
        default:
            console.log('Show media action type unknown');
    }

    document.getElementById('overlay_buttons').innerHTML = btns_html;

    let over = document.getElementById('overlay');
    over.style.display = '';

    // disallow allow fullscreen for some rtypes
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

EM.deletePrompt = function(fp, fn, rtype)
{
    if (confirm("Are you sure you want to delete this image or resource?")) {
        // delete (but actually just move) the image (to the garbage)
        fetch('php/api.php?req=delete_rsc&fp=' + fp + '&fn=' + fn + '&rtype=' + rtype, {cache: "reload"})
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data === 'good') {
                // update list of files and mapped markers
                EM.loadNoLoc();
                EM.loadData();

                // hide the overlay
                let over = document.getElementById('overlay');
                over.style.display = 'none';

                // send message to server to push updates to other clients
                if (EM.conn) {
                    EM.conn.send('reload_data');
                }
            }
            if (data === 'bad') {
                console.log(data);
            }
        });
    }
};

EM.toggleGeoList = function(hide)
{
    let foda = document.getElementById('fo_down_arrow');
    let foua = document.getElementById('fo_up_arrow');
    let fof = document.getElementById('fo_files');

    if (hide) {
        foda.style.display = 'none';
        foua.style.display = '';
        fof.style.display = 'none';
    } else {
        foda.style.display = '';
        foua.style.display = 'none';
        fof.style.display = '';
    }

};
