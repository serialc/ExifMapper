EM = {};

window.onload = (e) => {
    EM.loadData();
    let ovrly = document.getElementById('overlay');
    ovrly.style.display = 'none';

    let ovrly_img = document.getElementById('overlay_img')
    ovrly_img.addEventListener("click", (e) => {
        ovrly.style.display = "none";
        e.stopPropagation();
    });

    let fo = document.getElementById('files_overlay');
    fo.style.display = 'none';
    EM.loadNoLoc();
};

EM.mapClick = function(e)
{
    console.log(e);
    alert("Lat, Lon : " + e.latlng.lat + ", " + e.latlng.lng);
}

EM.loadNoLoc = function()
{
    fetch('php/api.php?req=noloclist', {cache: "reload"})
    .then(function(response) { return response.json(); })
    .then(function(data) {
        let fo = document.getElementById('files_overlay');
        fo.style.display = '';
        let fof = document.getElementById('fo_files');

        let html_list = "";
        for (let i in data) {
            let ftype = data[i].split('.')[1];
            let img_ftypes = ['png', 'jpg', 'gif'];
            if (img_ftypes.includes(ftype.toLowerCase())) {
                html_list += '<a href="#" onclick="EM.showPic(\'photos/noloc/\', \'' + data[i] + '\')">' + data[i] + "</a><br>";
            }
            let vid_ftypes = ['mp4'];
            if (vid_ftypes.includes(ftype.toLowerCase())) {
                html_list += '<a href="#" onclick="EM.showPic(\'photos/noloc/\', \'' + data[i] + '\', \'vid\')">' + data[i] + "</a><br>";
            }
        }
        fof.innerHTML = html_list;
    });
};

EM.georefImg = function(imgfn)
{

};

EM.loadData = function()
{
    fetch('photos/data.csv', {cache: "reload"})
    .then(function(response) { return response.text(); })
    .then(function(data) {
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

        // now show the map
        EM.displayMap();

        // capture map clicks
        EM.map.on('click', EM.mapClick);
    })
};

EM.displayMap = function()
{
    EM.map = L.map('map').setView(EM.mean_ll, 10);

    let tiles = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        id: 'mapbox/satellite-v9',
        accessToken: "pk.eyJ1IjoiY3lyaWxsZW1kYyIsImEiOiJjazIwamZ4cXIwMzN3M2hscmMxYjgxY2F5In0.0BmIVj6tTvXVd2BmmFo6Nw",
        attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(EM.map);

    let markers = [];

    for (let i = 0; i < EM.photos.length; i+=1) {
        let p = EM.photos[i];

        let marker = new L.marker([p[1], p[2]], {
            // options
        }).on('click', function() { EM.showPic("photos/georef/", p[0]) });

        markers.push(marker);
    }

    let group = L.featureGroup(markers).addTo(EM.map);
    EM.map.fitBounds(group.getBounds());
};

EM.showPic = function(fp, fn, rtype='img', actions=true) {
    let overimg = document.getElementById('overlay_img');
    oihtml = '';

    if (rtype === 'vid') {
        oihtml += '<video controls><source src="' + fp + fn + '" type="video/mp4"></video>';
    }
    if (rtype === 'img') {
        oihtml += '<img src="' + fp + fn + '" title="Hide">';
    }

    // add the overlay content
    overimg.innerHTML = oihtml;

    if (actions) {
        document.getElementById('overlay_buttons').innerHTML = '<div><button onclick="EM.deletePrompt(\'' + fp + '\', \'' + fn + '\')">Delete</button> <button>(re)Locate</button></div>';
    }

    let over = document.getElementById('overlay');
    over.style.display = '';

    let fsimg = document.getElementById('full_screen_link');
    fsimg.innerHTML = '<a href="' + fp + fn + '" target="_blank" title="See full screen"><i class="fa fa-expand"></i></a>';

    let clsimg = document.getElementById('close_overlay_link');
    clsimg.innerHTML = '<i class="fa fa-close"></i>';
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
                // update list of files or map
                EM.loadNoLoc();
                // hide the overlay
                let over = document.getElementById('overlay');
                over.style.display = 'none';
            }
            if (data === 'bad') {
                console.log(data);
            }
        });
    }
};
