<?php
// filename: php/api.php
// provide interaction with data base

require_once('func.php');

$req = $_GET['req'];

switch($req) {
case 'noloclist':
    // list the files in ../photos/noloc
    $imgs = array_diff(scandir('../photos/noloc/'), array('.','..'));
    print(buildResponse($imgs));
    break;

default:
    echo buildResponse("API request not found", 500);
}

// EOF
