EM = {};

window.onload = (e) => {
    EM.loadData();
    let ovrly = document.getElementById('overlay');
    ovrly.style.display = 'none';
    ovrly.addEventListener("click", function() {ovrly.style.display = "none";});
    document.getElementById('overlay_img').click(function(e) { e.stopPropagation(); });
};

EM.loadData = function()
{
    fetch('photos/data.csv')
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
        }).on('click', function() { EM.showPic(p[0]) });

        markers.push(marker);
    }

    let group = L.featureGroup(markers).addTo(EM.map);
    EM.map.fitBounds(group.getBounds());
};

EM.showPic = function(fn) {
    let overimg = document.getElementById('overlay_img');
    overimg.innerHTML = '<img src="photos/georef/' + fn + '" title="Hide">';
    let over = document.getElementById('overlay');
    over.style.display = '';

    let fsimg = document.getElementById('full_screen_link');
    fsimg.innerHTML = '<a href="photos/georef/' + fn + '" target="_blank" title="See full screen">+</a>';
};
