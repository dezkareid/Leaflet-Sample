
L.TopoJSON = L.GeoJSON.extend({  
  addData: function(jsonData) {    
    if (jsonData.type === "Topology") {
      for (key in jsonData.objects) {
        geojson = topojson.feature(jsonData, jsonData.objects[key]);
        L.GeoJSON.prototype.addData.call(this, geojson);
      }
    }    
    else {
      L.GeoJSON.prototype.addData.call(this, jsonData);
    }
  }  
});

var rangesColors = [
	["#ffffff","#ffe4b2", "#ffc04c", "#ffa500","#ff2500","#ff0000"],
	["#ffffff", "#ffc04c","#ffa500", "#ff0000"],
	["#ffffff","#ff0000"]
];

function getDomain() {
  var min, max;
  var len = inmigration_data.length;
  var percent = 0;
  for (var i = 0; i < len; i++) {
    percent = ((inmigration_data[i].pobindi1990* 1.0) / inmigration_data[i].tpobtot1990) * 100;
    if (typeof max === 'undefined'){
      max = percent;
      continue;
    }
    if (typeof min === 'undefined'){
      min = percent;
      continue;
    }
            
    if (percent > max) {
      max = percent;
    }else{
      if(percent < min){
        min = percent;
      }
    }
  }
  
  return [min,max];
}

function createBucketDomain(domain,numberBuckets ) {
  var min, max, bucket = [];
  min = domain[0];
  max = domain[1];
  if (numberBuckets === 2) {
      return domain;
  }
  bucket.push(min);
  var difference = ((max-min)*1.0)/(numberBuckets);
  var bucketSum = min;
  for (var i = 1; i < numberBuckets; i++) {
    bucketSum+= difference;
    bucket.push(bucketSum);
  }
  
  bucket.push(max);
  return bucket;
}

function createBucketColors(numberBuckets){
  switch (numberBuckets){
  	case 3:{
      return rangesColors[1];
    } 
    case 5: {
      return rangesColors[0]
    }
    default: return rangesColors[2];
  }
}

function getMigrationPercent1990 (state_code) {
  var inmigration = inmigration_data[state_code-1];
  var percent = ((inmigration.pobindi1990* 1.0) / inmigration.tpobtot1990) * 100;
  return percent;
}

var nBuckets = 5;

var bucketDomain = createBucketDomain(getDomain(),nBuckets);

var bucketDomainColor = createBucketColors(nBuckets);

var color = d3.scale.linear().range(bucketDomainColor).domain(bucketDomain);

var map = L.map('map').setView([25.657715, -100.366785], 4);
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6IjZjNmRjNzk3ZmE2MTcwOTEwMGY0MzU3YjUzOWFmNWZhIn0.Y8bhBaUMqFiPrDRW9hieoQ', {
	maxZoom: 10,
	attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
				'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
				'Imagery © <a href="http://mapbox.com">Mapbox</a>',
	id: 'mapbox.light'
}).addTo(map);

var topoLayer = new L.TopoJSON();

queue()
    .defer(d3.json, "estados.json")
    .await(addTopoData);


function addTopoData(err, topoData){ 
	delete topoData.objects.municipalities;
  topoLayer.addData(topoData);
  topoLayer.addTo(map);
  topoLayer.eachLayer(handleLayer);                                                                                                                                                                                                                  
}                                                                    
function handleLayer(layer){  
  layer.setStyle({
    fillColor : color( getMigrationPercent1990(layer.feature.properties.state_code)),
    fillOpacity: 1,
    color:'#555',
    weight:1,
    opacity:0.5
  });

  layer.on({
    mouseover: highlightFeature,
		mouseout: resetHighlight,
		click: zoomToFeature
  });
}


var info = L.control();

info.onAdd = function (map) {
	this._div = L.DomUtil.create('div', 'info');
	this.update();
	return this._div;
};

info.update = function (props) {                           
	this._div.innerHTML = '<h4>Porcentaje de migración</h4>' +  (props ?
		'<b>'+ props.state_name+' </b><br />' + getMigrationPercent1990(props.state_code).toFixed(2) + '%'
		: '');
};

info.addTo(map);

function highlightFeature(e) {
	var layer = e.target;
	layer.setStyle({
		weight: 5,
		color: '#666',
		dashArray: '',
		fillOpacity: 0.7
	});																

	if (!L.Browser.ie && !L.Browser.opera) {
		layer.bringToFront();
	}

	info.update(layer.feature.properties);
}

function resetHighlight(e) {
	var layer = e.target;
	layer.setStyle({
    fillColor : color( getMigrationPercent1990(layer.feature.properties.state_code)),
    fillOpacity: 1,
    color:'#555',
    weight:1,
    opacity:0.5
  });

  info.update();
}

function zoomToFeature(e) {
	var layer = e.target;
	map.fitBounds(layer.getBounds());
}


var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {

	var div = L.DomUtil.create('div', 'info legend'),
	grades = bucketDomain,
	labels = [],
	from, to;

	for (var i = 0; i < grades.length; i++) {
		from = grades[i].toFixed(2);
		if (i+1 !== grades.length){
			to = grades[i + 1].toFixed(2);
		}else{
			to = "";
		}
		
		labels.push('<i style="background:' + color(grades[i]) + '"></i> ' +from + (to ? '&ndash;' + to : '+'));
	}

	div.innerHTML = labels.join('<br>');
	return div;
};

legend.addTo(map);