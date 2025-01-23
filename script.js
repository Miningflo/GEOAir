function pointconverter(point) {
    console.log(typeof point, point);
    let res = []
    point = point.split(" ")
    point.forEach(coord => {
        let factor = (("NE".includes(coord.split("").pop())) ? 1 : -1)
        coord = factor * parseInt(coord.slice(0, -1)) / 10000
        res.push(coord)
    })
    return res
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
            center: ol.proj.fromLonLat([42.48, 42.18]),
            zoom: 11
        })
    });

    let pointSource = new ol.source.Vector()

    let pointLayer = new ol.layer.Vector({
        source: pointSource,
        style: function (feature) {
            return new ol.style.Style({
                image: new ol.style.Icon({
                    src: "./resources/CRP.png",
                    scale: 0.05,
                }),
                text: new ol.style.Text({
                    font: 'bold 15px Arial, sans-serif',
                    fill: new ol.style.Fill({
                        color: 'blue'
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

    fetch("./points.json").then(response => response.json()).then(points => {
        let features = []
        points.forEach(CRM => {
            let point = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat(CRM.point.reverse())),
                name: CRM.name,
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
                    color: 'red',
                    width: 2
                }),
                text: new ol.style.Text({
                    font: 'bold 15px Arial, sans-serif',
                    fill: new ol.style.Fill({
                        color: 'red'
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


    fetch("./airspace.json").then(response => response.json()).then(areas => {
        let features = []
        areas.forEach(area => {
            if (area.type === "polygon") {
                let poly = []
                area.points.forEach(point => {
                    poly.push(pointconverter(point).reverse())
                })
                let polygonFeature = new ol.Feature({
                    geometry: new ol.geom.Polygon([poly]).transform('EPSG:4326', 'EPSG:3857'),
                    name: area.name
                });
                features.push(polygonFeature);
            } else if (area.type === "circle") {
                let center = ol.proj.fromLonLat(pointconverter(area.center).reverse())
                let radius = area.radius * 1852
                var circle = new ol.geom.Circle(center,radius/ol.proj.getPointResolution('EPSG:3857', 1, center))

                let circleFeature = new ol.Feature({
                    geometry: ol.geom.Polygon.fromCircle(circle,100,90),
                    name: area.name
                })
                features.push(circleFeature)
            }

        })
        areaSource.addFeatures(features);
    })
}