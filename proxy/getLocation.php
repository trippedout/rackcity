<?php 

$lat = $_GET['lat'];
$lng = $_GET['lng'];

echo $lat + 0.008;

//create query based off 1km (approx 0.008 deg) around user location


$query = '(
  way
    ["building"]
    (40.710,-74.009,40.718,-74.001);
  >;
  way
    ["highway"]
    (40.710,-74.009,40.718,-74.001);
  >;
);
out;';

$context = stream_context_create(['http' => [
    'method'  => 'POST',
    'header' => ['Content-Type: application/x-www-form-urlencoded'],
    'content' => 'data=' . urlencode($query),
]]);

$endpoint = 'http://overpass-api.de/api/interpreter';
libxml_set_streams_context($context);
$start = microtime(true);

$result = simplexml_load_file($endpoint);
printf("Query returned %2\$d node(s) and took %1\$.5f seconds.\n\n", microtime(true) - $start, count($result->node));

$xpath = '//way[tag[@k = "building"]]';
$schools = $result->xpath($xpath);
printf("%d School(s) found:\n", count($schools));
?>