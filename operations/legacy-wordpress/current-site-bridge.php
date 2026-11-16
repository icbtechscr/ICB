<?php
/** Temporary HTTPS bridge for clients still resolving the retired hosting IP. */
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('zlib.output_compression', '0');
header_remove('X-Powered-By');

$host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if (!in_array($host, ['icbtechscr.com', 'www.icbtechscr.com'], true)
    || !str_starts_with($uri, '/') || preg_match('/[\x00-\x20\x7f]/', $uri)
    || str_starts_with($uri, '/_icb_current_site_bridge.php')) {
    http_response_code(404);
    exit;
}
if (($_SERVER['HTTP_X_ICB_LEGACY_BRIDGE'] ?? '') === 'v1') {
    http_response_code(508);
    exit;
}
if (!function_exists('curl_init')) {
    http_response_code(503);
    header('Retry-After: 300');
    header('X-ICB-Bridge-Error: curl-unavailable');
    exit('No se pudo conectar con la tienda. Intentá nuevamente.');
}

$skip = array_fill_keys([
    'host', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'te', 'trailer', 'transfer-encoding', 'upgrade', 'content-length', 'expect',
    'accept-encoding', 'forwarded', 'x-forwarded-for', 'x-forwarded-host',
    'x-forwarded-proto', 'x-real-ip', 'x-icb-legacy-bridge',
], true);
$headers = function_exists('getallheaders') ? getallheaders() : [];
if (!$headers) {
    foreach ($_SERVER as $key => $value) {
        if (str_starts_with($key, 'HTTP_')) {
            $headers[str_replace('_', '-', substr($key, 5))] = $value;
        }
    }
    if (isset($_SERVER['CONTENT_TYPE'])) {
        $headers['Content-Type'] = $_SERVER['CONTENT_TYPE'];
    }
}
$multipart = str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/form-data');
$outgoing = ['Accept-Encoding: identity', 'X-ICB-Legacy-Bridge: v1'];
foreach ($headers as $name => $value) {
    $lower = strtolower($name);
    if (isset($skip[$lower]) || str_starts_with($lower, 'cf-')
        || ($multipart && $lower === 'content-type')
        || !preg_match('/^[A-Za-z0-9-]+$/', $name) || preg_match('/[\r\n]/', $value)) {
        continue;
    }
    $outgoing[] = $name . ': ' . $value;
}

$curl = curl_init('https://' . $host . $uri);
curl_setopt_array($curl, [
    // Keep SNI, certificate verification and Host on the real public domain.
    // Bypass the hosting provider's obsolete DNS, with two verified CF edge IPs.
    CURLOPT_RESOLVE => [$host . ':443:104.21.49.91,172.67.189.113'],
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 90,
    CURLOPT_HTTPHEADER => $outgoing,
    CURLOPT_HEADERFUNCTION => function ($handle, string $line): int {
        $size = strlen($line);
        if (preg_match('~^HTTP/\S+\s+(\d{3})~i', $line, $match)) {
            if ((int)$match[1] >= 200) {
                http_response_code((int)$match[1]);
            }
            return $size;
        }
        if (trim($line) === '') {
            header('Cache-Control: no-store, max-age=0');
            header('X-ICB-Legacy-Bridge: active');
            return $size;
        }
        $colon = strpos($line, ':');
        if ($colon !== false) {
            $name = strtolower(substr($line, 0, $colon));
            if (!in_array($name, [
                'connection', 'keep-alive', 'transfer-encoding', 'trailer', 'te',
                'upgrade', 'content-length', 'alt-svc', 'cache-control',
            ], true)) {
                // Preserve separate Set-Cookie headers, CSP, status and redirects.
                header(rtrim($line, "\r\n"), false);
            }
        }
        return $size;
    },
    CURLOPT_WRITEFUNCTION => function ($handle, string $body): int {
        echo $body;
        return strlen($body);
    },
]);

if ($multipart && !in_array($method, ['GET', 'HEAD'], true)) {
    // PHP has already parsed multipart input: rebuild the body with a fresh
    // matching boundary instead of forwarding an empty php://input stream.
    $fields = [];
    $addField = function (string $name, $value) use (&$fields, &$addField): void {
        if (is_array($value)) {
            foreach ($value as $key => $part) {
                $addField($name . '[' . $key . ']', $part);
            }
        } else {
            $fields[$name] = (string)$value;
        }
    };
    foreach ($_POST as $name => $value) {
        $addField($name, $value);
    }
    $addFile = function (string $name, array $file) use (&$fields, &$addFile): void {
        if (is_array($file['name'])) {
            foreach ($file['name'] as $key => $unused) {
                $part = [];
                foreach (['name', 'type', 'tmp_name', 'error', 'size'] as $property) {
                    $part[$property] = $file[$property][$key];
                }
                $addFile($name . '[' . $key . ']', $part);
            }
        } elseif ($file['error'] === UPLOAD_ERR_OK && is_uploaded_file($file['tmp_name'])) {
            $filename = basename(str_replace(["\r", "\n"], '', $file['name']));
            $mime = preg_match('/[\r\n]/', $file['type']) ? 'application/octet-stream' : $file['type'];
            $fields[$name] = new CURLFile($file['tmp_name'], $mime, $filename);
        } elseif ($file['error'] !== UPLOAD_ERR_NO_FILE) {
            http_response_code(413);
            exit('El archivo supera el límite del alojamiento anterior. Reintentá cuando se actualice la conexión.');
        }
    };
    foreach ($_FILES as $name => $file) {
        $addFile($name, $file);
    }
    if (!$fields && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        http_response_code(413);
        exit('La solicitud supera el límite temporal del alojamiento.');
    }
    curl_setopt($curl, CURLOPT_POSTFIELDS, $fields);
} elseif (!in_array($method, ['GET', 'HEAD'], true)) {
    curl_setopt($curl, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}
curl_setopt($curl, CURLOPT_CUSTOMREQUEST, $method);
if ($method === 'HEAD') {
    curl_setopt($curl, CURLOPT_NOBODY, true);
}
if (!curl_exec($curl) && !headers_sent()) {
    http_response_code(502);
    header('Cache-Control: no-store');
    header('X-ICB-Bridge-Error: ' . curl_errno($curl));
    echo 'No se pudo conectar con la tienda. Intentá nuevamente.';
}
curl_close($curl);
