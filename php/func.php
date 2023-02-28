<?php
// Filename: php/func.php
// Purpose: Some miscellaneous functions

namespace frakturmedia\exifmapper;

// path is relative to api folder
define("FOLDER_DATA", "../photos/");
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


// EOF
