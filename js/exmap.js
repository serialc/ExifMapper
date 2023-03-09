EM = {};

window.onload = (e) => {
    EM.loadData();
    let ovrly = document.getElementById('overlay');
    ovrly.style.display = 'none';

    /*let ovrly_img = document.getElementById('overlay_img')
    ovrly_img.addEventListener("click", (e) => {
        ovrly.style.display = "none";
        e.stopPropagation();
    });*/

    let fo = document.getElementById('files_overlay');
    fo.style.display = 'none';
    EM.loadNoLoc();

    // websockets connection - this could cause an error but there's nothing to catch see:
    // https://stackoverflow.com/questions/31002592/javascript-doesnt-catch-error-in-websocket-instantiation
    // This is fine though - everything (except the websocket) still works
    var conn = new WebSocket('ws://localhost:8080/~cyrille/ExifMapper/activate_synchronisation.php');
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

    if (oc.style.display === 'none') {
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
                    }
                }
                if (data.response === 'bad') {
                    console.log(data);
                }
            });
    } else {
        // show the input field
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
    // toggle - hide buttons
    if (mb.children.length === 3) {
        mb.innerHTML = '';
        return;
    }
    // show buttons
    mb.innerHTML =
        '<button class="btn btn-info btn-sm" onclick="EM.submitResourceType(\'' + fn + '\',\'img\')">Img</button> ' +
        '<button class="btn btn-info btn-sm" onclick="EM.submitResourceType(\'' + fn + '\',\'360\')">360</button> ' +
        '<button class="btn btn-info btn-sm" onclick="EM.submitResourceType(\'' + fn + '\',\'vid\')">Vid</button> ';
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
    let btn_alt_text = 'Click map or here to cancel';

    // provide feedback and allow toggle
    if (reloc_btn.innerHTML === btn_alt_text) {
        reloc_btn.innerHTML = '(re)Locate';
        // deactivate next map click
        EM.onMapClick = undefined;
        // remove crosshair cursor styling
        mapcont.classList.remove('crosshair');
        return;
    } else {
        reloc_btn.innerHTML = btn_alt_text;
    }

    // set cursor on map as crosshair
    mapcont.classList.add('crosshair');

    // hide the overlay?
    //let ovrly = document.getElementById('overlay');
    //ovrly.style.display = 'none';


    // on the map click do the following
    EM.onMapClick = function(e) {
        // deactivate next map click
        EM.onMapClick = undefined;
        // remove crosshair cursor styling
        mapcont.classList.remove('crosshair');

        fetch('php/api.php?req=relocate&fp=' + fp + '&fn=' + fn + '&lat=' + e.latlng.lat + '&lng=' + e.latlng.lng, {cache: "reload"})
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.response === 'good') {
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
    }
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
        html_list += '<a href="#" onclick="EM.showPic(\'photos/noloc/\', \'' + data[i] + '\',\'\',\'\',\'deloc\')">' + data[i] + "</a><br>";
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
    let median = [0,0];
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
        plist.push(p);

        median[0] += parseFloat(p[1], 10);
        median[1] += parseFloat(p[2], 10);
        count += 1;
    }

    EM.photos = plist;

    // calculate median location
    EM.mean_ll = [median[0]/count, median[1]/count];
};

EM.loadData = function()
{
    fetch('photos/data.csv', {cache: "reload"})
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

        let tiles = L.tileLayer("https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
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

        let marker = new L.marker([p[1], p[2]], {
            // options
        }).on('click', function() { EM.showPic("photos/georef/", p[0], p[3], p[4]) });

        markers.push(marker);
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

EM.showPic = function(fp, fn, rtype='img', comment, actions='all')
{
    // override rtype when empty, ''
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
    }

    let oihtml = '';

    if (rtype === 'vid') {
        oihtml += '<video controls><source src="' + fp + fn + '" type="video/mp4"></video>';
    }
    if (rtype === 'img') {
        oihtml += '<img src="' + fp + fn + '">';
    }
    if (rtype === '360') {
        oihtml += '<div id="viewer360" style="width: 60vw; height: 60vh;"></div>';
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
    if (['all', 'deloc'].includes(actions)) {
        btns_html =
            '<div><button id="btn_delete_resource" class="btn btn-danger" onclick="EM.deletePrompt(\'' + fp + '\', \'' + fn + '\')">Delete</button> ' +
            '<button id="btn_change_location" class="btn btn-primary" onclick="EM.relocatePhoto(\'' + fp + '\', \'' + fn + '\')">(re)Locate</button>';
    }
    if (actions === 'all') {
        btns_html += ' <button id="btn_change_comment" class="btn btn-success" onclick="EM.displayEditableComment(\'' + fn + '\')">Comment</button>';
        btns_html += ' <button id="btn_change_type" class="btn btn-secondary" onclick="EM.changeResourceType(\'' + fn + '\')">Type</button> <span id="more_buttons"></span>';
    }
    btns_html += '</div>';
    document.getElementById('overlay_buttons').innerHTML = btns_html;


    let over = document.getElementById('overlay');
    over.style.display = '';

    // only allow fullscreen for non-360 resources
    let fsimg = document.getElementById('full_screen_link');
    if (rtype === '360') {
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

EM.deletePrompt = function(fp, fn)
{
    if (confirm("Are you sure you want to delete this image or resource?")) {
        // delete (but actually just move) the image (to the garbage)
        fetch('php/api.php?req=delete_rsc&fp=' + fp + '&fn=' + fn, {cache: "reload"})
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
