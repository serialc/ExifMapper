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

case 'change_comment':
    $fn = $_GET['fn'];
    $com = $_GET['comment'];

    // update data file
    if (changeResourceComment($fn, $com)) {
        print(buildResponse(["response" => "good"]));
    } else {
        print(buildResponse(["response" => "bad"]));
    }
    break;

case 'change_type':
    $fn = $_GET['fn'];
    $rtype = $_GET['rtype'];

    // update data file
    if (changeResourceType($fn, $rtype)) {
        print(buildResponse([
            "response" => "good",
            "photos" => file_get_contents(DATA_FILE)
        ]));
    } else {
        print(buildResponse(["response" => "bad"]));
    }
    break;

case 'relocate':
    $fn = $_GET['fn'];
    $lat = $_GET['lat'];
    $lng = $_GET['lng'];

    // if this file hasn't been georeference
    if (strcmp($_GET['fp'], 'photos/noloc/') === 0) {
        if (georeferencePhoto($fn, $lat, $lng)) {
            print(buildResponse([
                "response" => "good",
                "photos" => file_get_contents(DATA_FILE),
                "noloc" => getNolocFilesList()
            ]));
        } else {
            print(buildResponse(["response" => "bad"]));
        }
    }
    // file needs change its location - edit data file
    if (strcmp($_GET['fp'], 'photos/georef/') === 0) {
        if (reGeoreferencePhoto($fn, $lat, $lng)) {
            print(buildResponse([
                "response" => "good",
                "photos" => file_get_contents(DATA_FILE),
                "noloc" => getNolocFilesList()
            ]));
        } else {
            print(buildResponse(["response" => "bad"]));
        }
    }

    break;

case 'noloclist':
    // list the files in ../photos/noloc
    print(buildResponse(getNolocFilesList()));
    break;

default:
    echo buildResponse("API request not found", 500);
}

// EOF
