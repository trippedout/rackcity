<?php 
$testLocal = TRUE;
?>
<!doctype html>
<html lang="en">
<head>
<title>Rack City</title>
<meta charset="utf-8">
<link href='http://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400' rel='stylesheet' type='text/css'>
<link href="css/styles.css" rel="stylesheet" type="text/css">
<link href="css/font-awesome.css" rel="stylesheet" type="text/css">

</head>
<h1>RACK CITY</h1>
<div id="soundcloud">
	<form id="sc_form"  style="display:none;">
		<h3 class="title">ENTER SOUNDCLOUD LINK</h3><br/>
		<input type="text" id="sc_url" name="url" placeholder="soundcloud url" value="https://soundcloud.com/muterecords/sets/goldfrapp-believer-remixes"/><br/>
		<input type="button" value="CANCEL" id="btnCancel"/> <input type="submit" value="SUBMIT"/>
	</form>


	<form id="sc_form_share"  style="display:none;">
		<h3 class="title">SHARE LINK</h3><br/>
		<input type="text" id="sc_url_share" name="url" placeholder="rack city url" value="" readonly="true"/><br/>
		<input type="button" value="CLOSE" id="btnClose"/>
	</form>

	<form id="sc_form_position"  style="display:none;">
		<h3 class="title">POSITION</h3><br/>
		LATITUDE: <input type="text" id="sc_latitude" class="latlon"/><br/>
		LONGITUDE: <input type="text" id="sc_longitude" class="latlon"/><br/>
		<input type="button" value="CANCEL" id="btnClosePosition"/> <input type="submit" value="SUBMIT"/>
	</form>

	<form id="sc_form_info"  style="display:none;">
		<h3 class="title" id="info_title"></h3>
		<span  id="info_msg"></span><br/><br/>
		<input type="button" value="CLOSE" id="btnCloseInfo"/>
	</form>

	<form id="sc_form_playlist"  style="display:none;">
		<h3 class="title">PLAYLIST</h3>
		<div  id="playlist"></div><br/><br/>
		<input type="button" value="CLOSE" id="btnClosePlaylist"/>
	</form>
</div>

<div id="loading"></div>
<div id="latlng">	 
	<span>LATITUDE: </span><span id="lat" class="light"></span>
	<br/>
	<span>LONGITUDE: </span><span id="lng" class="light"></span>
	<br/>
	<span id="share">SHARE LINK</span>
</div>
<div id="chooseLocation" class="styled-select" style="display:none;">
   <select id="locationSelect" dir="rtl">
   		<option>CURRENT</option>
	
		
		
   </select>
</div>
<div id="songinfo" style="display:none;">
	 <div id="artwork"><img id="artwork_img" /></div>
	 <span id="title">FANCY</span>
	 <br/>
	 <span id="timestamp" class="light">00:00:00</span>
	 <br/>
	 <span id="trk_prev"><i class="fa fa-step-backward pointer" aria-hidden="true"></i></span> 
	 <span id="trackCount">0/0</span> 
	 <span id="trk_next"><i class="fa fa-step-forward pointer" aria-hidden="true"></i></span>
	 <span id="trk_pause" style="display:none;"><i class="fa fa-pause pointer" aria-hidden="true"></i></span>
	 <span id="trk_play"><i class="fa fa-play pointer" aria-hidden="true"></i></span>
	 <span id="trk_playlist"><i class="fa fa-list pointer" aria-hidden="true"></i></span>
	
</div>
<!--
<a href="https://github.com/trippedout/rackcity"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://camo.githubusercontent.com/38ef81f8aca64bb9a64448d0d70f1308ef5341ab/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f6461726b626c75655f3132313632312e706e67" alt="Fork me on GitHub" data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_right_darkblue_121621.png"></a>
-->

<?php 
if(!$testLocal)
	echo '<script src="//cdnjs.cloudflare.com/ajax/libs/three.js/r68/three.min.js"></script>
<script src="//code.jquery.com/jquery-2.1.1.min.js"></script>
<script src="//connect.soundcloud.com/sdk.js"></script>
';
else
	echo '<script src="js/three.min.js"></script>
<script src="js/jquery-2.1.1.min.js"></script>
<script src="js/soundcloud.js"></script>
';
?>
<script type="text/javascript" src="js/beatdetect/fft.js"></script>
<script type="text/javascript" src="js/beatdetect/beatdetect.js"></script>
<script src="js/dat.gui.min.js"></script>
<script data-main="app" src="js/require.js"></script>
<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-15178892-2', 'auto');
  ga('send', 'pageview');

</script>
</body>
</html>