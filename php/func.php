<?php
// Filename: php/func.php
// Purpose: Some miscellaneous functions

namespace frakturmedia\exifmapper;

// path is relative to api folder
define("FOLDER_DATA", "../photos/");
define("DATA_FILE", FOLDER_DATA . "data.csv");
define("FOLDER_IMG_GEOREF", FOLDER_DATA . "georef/");
define("FOLDER_IMG_NOLOC", FOLDER_DATA . "noloc/");
define("FOLDER_IMG_GARBAGE", FOLDER_DATA . "garbage/");

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
    if (!file_exists(FOLDER_IMG_GARBAGE)) {
        mkdir(FOLDER_IMG_GARBAGE, 0755, recursive: true);
    }
    if (is_writable(FOLDER_IMG_GARBAGE)) {
        rename('../' . $fp . $fn, FOLDER_IMG_GARBAGE . $fn);
        return true;
    }
    return false;
}

function getNolocFilesList()
{
    // get just the values rather than an associative array
    return array_values(array_diff(scandir(FOLDER_IMG_NOLOC), array('.','..')));
}

function georeferencePhoto($fn, $lat, $lng)
{
    // we want to append a line to data file
    file_put_contents(
        DATA_FILE,
        "\n" . $fn . ',' . $lat . ',' . $lng . ',,',
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
