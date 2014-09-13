<?php 

/*
* DISCLAIMER: I haven't written php in YEARS, and yes i know recursively moving 
* through potentially huge arrays of data (multiple times) is a turrrrble idea.
* fixes welcome, always looking to learn. didn't have enough time to try and
* write this in python which would have been my goto
* tested my queries here: http://overpass-turbo.eu/
* and logged data against http://osmbuildings.org/ to make sure it looked similar enough
* altho some other colored data exists there and im not sure where its coming from
*/

$lat = $_GET['lat'];
$lon = $_GET['lon'];

//create query based off 1km (approx 0.008 deg) around user location
$latlng = '(' . ($lat - .004) . ',' . ($lon - .004) . ',' . ($lat + .004) . ',' . ($lon + .004) . ')';

$query = '[out:json];
(
  way
    ["building"]
    ' . $latlng . ';
  >;
  way
    ["highway"]
    '. $latlng . ';
  >;
);
out;';

// echo $query;

$context = stream_context_create( array('http' => array(
    'method'  => 'POST',
    // 'header' => array('Content-Type: application/x-www-form-urlencoded'), //comment out headers for attachment to app engine
    'content' => 'data=' . urlencode($query),
  	// 'header' => 'Access-Control-Allow-Origin: \'*\'',
)));

$endpoint = 'http://overpass-api.de/api/interpreter';

$json = file_get_contents($endpoint, false, $context);

if (false === $json) {
    $error = error_get_last();
    echo $error['message'];
    // throw new ClientException($error['message']);
}

$base = json_decode($json, TRUE);    

$small_roads = array();
$large_roads = array();
$buildings = array();

foreach ($base['elements'] as $key => $val) 
{	
	if($val['type'] == 'way')
	{
		$highway = $val['tags']['highway'];
		$building = $val['tags']['building'];
		
		//get roads		
		if($highway && count($val['nodes']) > 1)
		{
			//check to see what kind for animation
			if($highway == 'residential' ||
				$highway == 'cycleway' ||
				$highway == 'path' ||
				$highway == 'service' ||
				$highway == 'footway' || 
				$highway == 'unclassified')
			{
				addSmallRoad($val);
			}
			else
			{
				addLargeRoad($val);
			}
				
		}
		elseif($building)
		{
			addBuilding($val);
		}
	}
}

//put it all otgether
$response = new stdClass();
$response->small_roads = $small_roads;
$response->large_roads = $large_roads;
$response->buildings = $buildings;

header('Content-Type: text/plain');
header('Access-Control-Allow-Origin: *');

echo json_encode($response);

/**
* functions and shit
**/
function addSmallRoad($road)
{
	global $small_roads, $base;

	$road_pts = array();

	foreach ($road['nodes'] as $key2 => $node)
	{
		//worst idea ever
		foreach ($base['elements'] as $key => $val) 
		{
			if($val['type'] == 'node' && $val['id'] == $node)
			{
				$road_pts[] = array('lat' => $val['lat'], 'lon' => $val['lon']) ;
				break;
			}
		}
	} 

	$small_roads[] = $road_pts;	
}

function addLargeRoad($road)
{
	global $large_roads, $base;

	$road_pts = array();

	foreach ($road['nodes'] as $key2 => $node)
	{
		//worst idea ever
		foreach ($base['elements'] as $key => $val) 
		{
			if($val['type'] == 'node' && $val['id'] == $node)
			{
				$road_pts[] = array('lat' => $val['lat'], 'lon' => $val['lon']) ;
				break;
			}
		}
	} 

	$large_roads[] = $road_pts;	
}

function addBuilding($building)
{
	global $buildings, $base;

	$building_pts = array();

	foreach ($building['nodes'] as $key2 => $node)
	{
		//worst idea ever
		foreach ($base['elements'] as $key => $val) 
		{
			if($val['type'] == 'node' && $val['id'] == $node)
			{
				$building_pts[] = array('lat' => $val['lat'], 'lon' => $val['lon']) ;
				break;
			}
		}
	} 

	$obj = new stdClass();
	if($building['tags']['height'])
		$obj->height = $building['tags']['height'];
	if($building['tags']['ele'])
		$obj->ele = $building['tags']['ele'];
	if($building['tags']['building:levels'])
		$obj->levels = $building['tags']['building:levels'];
	
	// echo json_encode($obj);

	$obj->pts = $building_pts;

	$buildings[] = $obj;	
}



?>