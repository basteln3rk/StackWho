//
var _ = require('underscore');
var pg = require('pg'); 
var conString = "postgres://postgres:postgres@localhost/stackwho";
/*
// docs.json file -> postgres db
var docs = require('./docs.json');
console.log(docs.rows[0].doc.top_tags);

var client = new pg.Client(conString);
client.connect(function(err) {
  if(err) {
    return console.error('could not connect to postgres', err);
  }
  _.each(docs.rows, function(row) {
  	client.query('INSERT INTO people (id,data) VALUES ($1,$2)',
  		[row.doc.user_id, row.doc],
  		function (err, result) {
  			if (err) {
  				console.error('!! error: ', err);
  			}
  			else {
  				console.log('.');
  			}
  		});
  });
});
*/

/* geo coding using google

http://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&sensor=false
*/
var url= require('url'), http= require('http');
var client = new pg.Client(conString);

client.connect(function(err) {
  if(err) {
    return console.error('could not connect to postgres', err);
  }
  client.query('SELECT location_string FROM geocode WHERE data IS NULL LIMIT 5', [],
  function(err, result) {
  	if (err) { 
  		console.error('!! error:', err); return(false);
  	}
  	_.each(result.rows,function(row) {
  		addGeocode(row.location_string);
  	});
  	client.end();
  } );
});


function addGeocode(locationString) {

	var reqOptions = _.extend({ headers: { 'Accept-Encoding': 'UTF-8' } }, 
		url.parse('http://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(locationString) + '&sensor=false'));

	http.get(reqOptions, function(res) {
		var data = '';
	  	res.on('data', function(newData) {
	  		data += newData;
	  	});
	  	res.on('end', function() {
		  	console.log('BODY: ' + data + "----------");
		  	var client = new pg.Client(conString);
		  	client.connect(function(err) {
		  		if(err) {
	  				console.error('!! error:', err); return(false);
		  		};
		  		data = JSON.stringify(JSON.parse(data));
		  		console.log('# got', locationString); console.log('' + data);
		  		client.query('UPDATE geocode SET data = $2 WHERE location_string = $1', [locationString, '' + data],
		  			function(err,result) {
		  				if (err) { console.error('!! error', err)};
		  				client.end();
		  			});
		  	});
		})
	}).on('error', function(e) {
	  console.log("Got error:" + e.message);
	});
}

