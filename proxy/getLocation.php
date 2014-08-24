<?php 

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

$context = stream_context_create( array('http' => array(
    'method'  => 'POST',
    'header' => array('Content-Type: application/x-www-form-urlencoded'),
    'content' => 'data=' . urlencode($query),
)));

$endpoint = 'http://overpass-api.de/api/interpreter';

$json = file_get_contents($endpoint, false, $context);
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
	if($building['tags']['building:levels'])
		$obj->levels = $building['tags']['building:levels'];
	if($building['tags']['ele'])
		$obj->ele = $building['tags']['ele'];
	$obj->pts = $building_pts;

	$buildings[] = $obj;	
}



?>