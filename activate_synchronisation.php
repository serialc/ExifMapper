<?php

require_once 'vendor/autoload.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use frakturmedia\exifmapper\Sync;

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new Sync()
        )
    ),
    8080
);

$server->run();

// EOF
