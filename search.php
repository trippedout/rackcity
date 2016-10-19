<?php

$plugin=new SynoDLMSearchCineblog();
$debug_plugin=new p();
$curl = curl_init();
curl_setopt($curl, CURLOPT_RETURNTRANSFER, TRUE);
$plugin->prepare($curl,"call");
$data = curl_exec($curl); 
$plugin->parse($debug_plugin,$data);

class p{public function addResult($title , $file, $size, $datetime, $val, $hash, $seeds, $leechs, $category){
		print "---- " . $title . " " . $file . " " . $datetime . "</br>";
		}}



/* Copyright (c) 2013 LvX. All rights reserved. */
class SynoDLMSearchCineblog {
        private $qurl = 'http://www.cineblog01.net/?s=';
        public function __construct() {
        }
        public function prepare($curl, $query) {
                $url = $this->qurl . urlencode($query);
                curl_setopt($curl, CURLOPT_URL, $url);
                //print "search url: " . $url . "\n";
        }
        
        public function parse($plugin, $response) {
			preg_match_all("/<div\sid=\"post-title\"><a\shref=\"([^\"]+)\"><h3>([^<]+)/", $response, $matches, PREG_SET_ORDER);
			$count=0;
			foreach ($matches as $val) {
				//print "3" . var_dump($val) . "\n";
				$url=$val[1];
				$title=$val[2];
    			print "find url: " . $url ." title: " . $title . "</br>";
    			$curl = curl_init();
    			curl_setopt($curl, CURLOPT_RETURNTRANSFER, TRUE);
    			curl_setopt($curl, CURLOPT_URL, $url);
            	$data = curl_exec($curl); 
            	//http://www.nowvideo.ch/video/1a88ff10fc706"
            	preg_match_all("/(http:\/\/www\.nowvideo\.ch\/video\/[^\"]+)\"/", $data, $files, PREG_SET_ORDER);
            	$count2=1;
            	foreach ($files as $file) {
            		$size=10;
            		$datetime="1978-09-28";
            		$hash="H" . $count;
                	$seeds=0; 
                	$leechs=0;
                	$category="Film";
                	/*<div id="blogmeta"><br />*/
                	preg_match('#<div\sid=\"blogmeta\"><br\s\/>\s*(\d+[\s\d\w]+)<#i',$data,$datetime2);
                	$datetime=trim($datetime2[1]);
                	
            		$plugin->addResult($title . "_part_" . $count2, $file[1], $size, $datetime, $val, $hash, $seeds, $leechs, $category);
                	$count++;
                	$count2++;
            	}
			}
        	return $count;    
        }
}


?>
