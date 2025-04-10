function pointconverter(point) {
    let res = []
    point = point.split(" ")
    point.forEach(coord => {
        let factor = (("NE".includes(coord.split("").pop())) ? 1 : -1)
        let raw = parseInt(coord.slice(0, -1)) / 10000
        let deg = Math.floor(raw)
        let min = (raw - deg) / 0.6
        coord = factor * (deg + min)
        res.push(coord)
    })
    return res
}

function convert(limit) {
    if (limit === 0) return "GND"
    if (limit === 66000) return "UNL"
    if (limit <= 4500) return limit + "FT"
    return "FL" + (Math.floor(limit / 500)) * 5
}


window.onload = function () {
    let control

    function scaleControl() {
        control = new ol.control.ScaleLine({
            units: "nautical",
        });
        return control;
    }


    var map = new ol.Map({
        controls: ol.control.defaults.defaults().extend([scaleControl()]),
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            })
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([5.2, 51.10]),
            zoom: 11
        })
    });

    let pointSource = new ol.source.Vector()

    let pointLayer = new ol.layer.Vector({
        source: pointSource,
        style: function (feature) {
            return new ol.style.Style({
                image: new ol.style.Icon({
                    src: "./resources/" + feature.get("type") + ".png",
                    scale: 0.05,
                }),
                text: new ol.style.Text({
                    font: 'bold 15px Arial, sans-serif',
                    fill: new ol.style.Fill({
                        color: ((feature.get("type") === "VFR") ? 'blue' : 'black')
                    }),
                    text: map.getView().getZoom() >= 10 ? feature.get('name') : "",
                    textAlign: 'center',
                    offsetX: 5,
                    offsetY: -20,

                }),
            });
        },
        declutter: false
    });

    map.addLayer(pointLayer)

    fetch("./pointsBE.json").then(response => response.json()).then(points => {
        let features = []
        points.forEach(RP => {
            let point = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat(pointconverter(RP.point).reverse())),
                name: RP.name,
                type: RP.type
            });
            features.push(point);
        })
        pointSource.addFeatures(features);
    })


    let areaSource = new ol.source.Vector()

    let areaLayer = new ol.layer.Vector({
        source: areaSource,
        style: function (feature) {
            return new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: feature.get("color"),
                    width: 2
                }),
                text: new ol.style.Text({
                    font: 'bold 15px Arial, sans-serif',
                    stroke: new ol.style.Stroke({
                        color: "white",
                        width: 0.9
                    }),
                    fill: new ol.style.Fill({
                        color: feature.get("color")
                    }),
                    text: map.getView().getZoom() >= 7 ? feature.get('name') : "",
                    textAlign: 'center',
                    placement: 'line',
                    textBaseline: 'top',
                    keepUpright: true

                }),
            });
        },
        declutter: false
    });


    map.addLayer(areaLayer)


    fetch("./belgium.json").then(response => response.json()).then(areas => {
        let features = []
        areas.forEach(area => {
            let geometry
            let joinchar = ""
            if (area.type === "polygon") {
                let poly = []
                area.points.forEach(point => {
                    poly.push(pointconverter(point).reverse())
                })
                geometry = new ol.geom.Polygon([poly]).transform('EPSG:4326', 'EPSG:3857')
                joinchar = "\n"
            } else if (area.type === "circle") {
                let center = ol.proj.fromLonLat(pointconverter(area.center).reverse())
                let radius = area.radius * 1852
                var circle = new ol.geom.Circle(center, radius / ol.proj.getPointResolution('EPSG:3857', 1, center))
                geometry = ol.geom.Polygon.fromCircle(circle, 100, 90)
                joinchar = " - "
            }

            let name = convert(area.upper) + joinchar + area.name + joinchar + convert(area.lower)
            let feature = new ol.Feature({
                geometry: geometry,
                name: name,
                color: area.color ?? "red",
            })
            features.push(feature)

        })
        areaSource.addFeatures(features);
    })
}