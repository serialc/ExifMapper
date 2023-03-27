<?php
// Filename: php/func.php
// Purpose: Some miscellaneous functions

namespace frakturmedia\exifmapper;

// path is relative to api folder
define("FOLDER_DATA", "../data/");
define("DATA_FILE", FOLDER_DATA . "data.csv");
define("FOLDER_IMG_GEOREF", FOLDER_DATA . "georef/");
define("FOLDER_IMG_NOLOC", FOLDER_DATA . "noloc/");
define("FOLDER_GARBAGE", FOLDER_DATA . "garbage/");
define("FOLDER_GEOJSON", FOLDER_DATA . "geo_data/");
define("FOLDER_GEOJSON_ALLOCATED", FOLDER_GEOJSON. "allocated/");

function buildResponse($data, $status = 200): string
{
    header("HTTP/1.1 " . $status . " " . requestStatus($status));
    header('Content-Type: application/json; charset=utf-8');
    return json_encode($data, JSON_UNESCAPED_SLASHES);
}

function requestStatus($code): string
{
    $status = array(
        200 => 'OK',
        201 => 'Created',
        204 => 'No content',
        400 => 'Bad Request',
        401 => 'Unauthorized',
        403 => 'Forbidden',
        404 => 'Not Found',
        405 => 'Method Not Allowed',
        409 => 'Conflict',
        500 => 'Internal Server Error',
    );
    return ($status[$code]) ?: $status[500];
}

function moveToGarbage($fp, $fn): bool
{
    // check destination exists and is writable
    if (!file_exists(FOLDER_GARBAGE)) {
        mkdir(FOLDER_GARBAGE, 0755, recursive: true);
    }
    if (is_writable(FOLDER_GARBAGE)) {
        rename('../' . $fp . $fn, FOLDER_GARBAGE . $fn);

        // now remove from data if georeferenced
        if (strcmp($fp, 'data/georef/') === 0) {
            removeResourceFromDataFile($fn);
        }

        return true;
    }
    return false;
}

function removeResourceFromDataFile ($fn)
{
    $data = explode("\n", file_get_contents(DATA_FILE));
    $out = '';

    foreach ($data as $line) {
        // skip empty lines
        if ($line === '') { continue; }

        $p = explode(',', $line);

        // update target line
        if (strcmp($p[0], $fn) === 0) {
            // do nothing as we're deleting it
        } else {
            // add other lines
            $out .= $line . "\n";
        }
    }
    file_put_contents(DATA_FILE, $out, LOCK_EX);
    return true;
}

function getGeoFilesList()
{
    // get just the values rather than an associative array
    // exclude '.', '..', and 'allocated'
    return array_values(array_diff(scandir(FOLDER_GEOJSON), array('.','..','allocated')));
};

function getNolocFilesList()
{
    // get just the values rather than an associative array
    return array_values(array_diff(scandir(FOLDER_IMG_NOLOC), array('.','..')));
}

function assocResourceToGeoJson($fp, $fn, $geofn)
{
    if (strcmp($fp, FOLDER_IMG_NOLOC) === 0) {
        // we want to append a line to data file
        file_put_contents(
            DATA_FILE,
            "\n" . $fn . ',,,geojson,' . $geofn,
            // append and lock file
            FILE_APPEND | LOCK_EX
        );

        // move the img/media resource
        rename(FOLDER_IMG_NOLOC . $fn, FOLDER_IMG_GEOREF . $fn);
    }

    if (strcmp($fp, FOLDER_IMG_GEOREF) === 0) {
        // update data file
        $data = explode("\n", file_get_contents(DATA_FILE));
        $out = '';
        
        foreach ($data as $line) {
            // skip empty lines
            if ($line === '') { continue; }

            $p = explode(',', $line);

            // update target line
            if (strcmp($p[0], $fn) === 0) {
                // write new data - copy over the file type
                $out .= $fn . ',,,geojson,' . $p[4] . ',' . $geofn . "\n";
            } else {
                // add other lines
                $out .= $line . "\n";
            }
        }
        file_put_contents(DATA_FILE, $out, LOCK_EX);
    }

    // move the geojson file to the allocated folder
    rename(FOLDER_GEOJSON . $geofn, FOLDER_GEOJSON_ALLOCATED . $geofn);

    return true;
}

function georeferencePhoto($fn, $lat, $lng)
{
    // we want to append a line to data file
    file_put_contents(
        DATA_FILE,
        "\n" . $fn . ',' . $lat . ',' . $lng . ',,,',
        // append and lock file
        FILE_APPEND | LOCK_EX
    );

    // move the file
    rename(FOLDER_IMG_NOLOC . $fn, FOLDER_IMG_GEOREF . $fn);
    return true;
}

function reGeoreferencePhoto($fn, $lat, $lng)
{
    // update data file
    $data = explode("\n", file_get_contents(DATA_FILE));
    $out = '';

    foreach ($data as $line) {
        // skip empty lines
        if ($line === '') { continue; }

        $p = explode(',', $line);

        // update target line
        if (strcmp($p[0], $fn) === 0) {
            // write new data - copy over the file type
            $out .= $fn . ',' . $lat . ',' . $lng . ',' . $p[3] . ',' . $p[4] . "\n";
        } else {
            // add other lines
            $out .= $line . "\n";
        }
    }

    file_put_contents(DATA_FILE, $out, LOCK_EX);
    return true;
}

function changeResourceComment($fn, $com)
{
    // update data file
    $data = explode("\n", file_get_contents(DATA_FILE));
    $out = '';

    foreach ($data as $line) {
        // skip empty lines
        if ($line === '') { continue; }

        // get the parts
        $p = explode(',', $line);
        
        // update target line
        if (strcmp($p[0], $fn) === 0) {
            // write new data - copy over the file type
            $out .= $p[0] . ',' . $p[1] . ',' . $p[2]. ',' . $p[3] . ',' . $com . "\n";
        } else {
            // add other lines
            $out .= $line . "\n";
        }
    }

    file_put_contents(DATA_FILE, $out, LOCK_EX);
    return true;
}

function changeResourceType($fn, $rtype)
{
    // update data file
    $data = explode("\n", file_get_contents(DATA_FILE));
    $out = '';

    foreach ($data as $line) {
        // skip empty lines
        if ($line === '') { continue; }

        // get the parts
        $p = explode(',', $line);
        
        // update target line
        if (strcmp($p[0], $fn) === 0) {
            // write new data - copy over the file type
            $out .= $p[0] . ',' . $p[1] . ',' . $p[2]. ',' . $rtype . ',' . $p[4] . "\n";
        } else {
            // add other lines
            $out .= $line . "\n";
        }
    }

    file_put_contents(DATA_FILE, $out, LOCK_EX);
    return true;
}

// EOF
