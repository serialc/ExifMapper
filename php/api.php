<?php
// filename: php/api.php
// provide interaction with data base

namespace frakturmedia\exifmapper;

// Composer autoloader for components
require_once '../vendor/autoload.php';

$whoops = new \Whoops\Run;
$whoops->pushHandler(new \Whoops\Handler\PrettyPageHandler);
$whoops->register();

require_once('func.php');

$req = $_GET['req'];

switch($req) {
case 'delete_rsc':
    if (moveToGarbage($_GET['fp'], $_GET['fn'])) {
        print(buildResponse('good'));
    } else {
        print(buildResponse('bad'));
    }
    break;

case 'noloclist':
    // list the files in ../photos/noloc
    $imgs = array_diff(scandir('../photos/noloc/'), array('.','..'));
    print(buildResponse($imgs));
    break;

default:
    echo buildResponse("API request not found", 500);
}

// EOF
