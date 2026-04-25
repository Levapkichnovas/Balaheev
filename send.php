<?php
/**
 * Обработчик форм сайта burim03.ru
 * SMTP через reg.ru, защиты: CORS-check, honeypot, time-check, rate-limit, санитизация, SMTP-инъекции.
 */

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Robots-Tag: noindex, nofollow');
header('Content-Type: application/json; charset=utf-8');

// ── КОНСТАНТЫ (заполнить перед деплоем) ──────────────────────
$SMTP_HOST      = 'smtp.mail.ru';
$SMTP_PORT      = 465;
$SMTP_USER      = 'mr.balakheev@mail.ru';
$SMTP_PASS      = '<MAILRU_APP_PASSWORD_HERE>'; // ← "пароль приложения" из настроек mail.ru, НЕ обычный пароль
$MAIL_TO        = 'mr.balakheev@mail.ru';
$FROM_NAME      = 'burim03.ru';
$ALLOWED_ORIGIN = 'https://www.burim03.ru';
$ALLOWED_HOSTS  = ['www.burim03.ru', 'burim03.ru'];
$DOMAIN         = 'burim03.ru';

// ── 1. МЕТОД ТОЛЬКО POST ─────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['ok' => false, 'error' => 'Method Not Allowed']);
    exit;
}

// ── 2. ПРОВЕРКА ORIGIN / REFERER ─────────────────────────────
$origin  = $_SERVER['HTTP_ORIGIN']  ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';
$originOk = false;
foreach ($ALLOWED_HOSTS as $h) {
    if (stripos($origin, '://' . $h) !== false || stripos($referer, '://' . $h) !== false) {
        $originOk = true;
        break;
    }
}
if (!$originOk) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Forbidden']);
    exit;
}

// ── 3. ЧТЕНИЕ ПОЛЕЙ ──────────────────────────────────────────
function clean($v, $max = 500) {
    $v = is_string($v) ? $v : '';
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v);
    $v = trim($v);
    if (mb_strlen($v, 'UTF-8') > $max) {
        $v = mb_substr($v, 0, $max, 'UTF-8');
    }
    return $v;
}
function cleanHeader($v) {
    return preg_replace('/[\r\n]+/', ' ', (string)$v);
}

$name     = clean($_POST['name']     ?? '', 80);
$phone    = clean($_POST['phone']    ?? '', 30);
$message  = clean($_POST['message']  ?? '', 2000);
$interest = clean($_POST['interest'] ?? '', 200);
$page     = clean($_POST['page']     ?? '', 300);
$hp       = $_POST['hp_field'] ?? '';
$formTs   = (int)($_POST['form_ts'] ?? 0);

// ── 4. HONEYPOT ──────────────────────────────────────────────
if (!empty($hp)) {
    echo json_encode(['ok' => true]);
    exit;
}

// ── 5. TIME-CHECK ────────────────────────────────────────────
$now = time();
if ($formTs > 0) {
    $delta = $now - $formTs;
    if ($delta < 3) {
        echo json_encode(['ok' => true]);
        exit;
    }
    if ($delta > 3600) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Форма устарела, обновите страницу']);
        exit;
    }
}

// ── 6. RATE-LIMIT (по хешу IP, не самому IP — 152-ФЗ) ────────
$rateDir = sys_get_temp_dir() . '/burim03_rate';
if (!is_dir($rateDir)) {
    @mkdir($rateDir, 0700, true);
}
$ip     = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$ipHash = hash('sha256', $ip . '|' . ($SMTP_USER));
$rateFile = $rateDir . '/' . $ipHash . '.json';

$state = ['hits' => [], 'last' => 0];
if (is_file($rateFile)) {
    $raw = @file_get_contents($rateFile);
    $decoded = $raw ? json_decode($raw, true) : null;
    if (is_array($decoded)) $state = $decoded + $state;
}
$state['hits'] = array_values(array_filter(
    (array)$state['hits'],
    fn($t) => is_int($t) && $t > $now - 3600
));
if (count($state['hits']) >= 20) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'Слишком много запросов, попробуйте позже']);
    exit;
}
if (!empty($state['last']) && ($now - (int)$state['last']) < 15) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'Подождите несколько секунд']);
    exit;
}

// ── 7. ВАЛИДАЦИЯ ─────────────────────────────────────────────
if ($name === '' || mb_strlen($name, 'UTF-8') < 2) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Укажите имя']);
    exit;
}
$hasPhone = ($phone !== '' && preg_match('/^[\d\s\+\-\(\)]{6,30}$/u', $phone) === 1);
if (!$hasPhone && $message === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Укажите телефон']);
    exit;
}
if ($phone !== '' && !$hasPhone) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Некорректный телефон']);
    exit;
}

// ── 8. ТЕЛО ПИСЬМА ───────────────────────────────────────────
$subject = 'Новая заявка с ' . $DOMAIN;
$lines = [];
$lines[] = 'Новая заявка с сайта ' . $DOMAIN;
$lines[] = str_repeat('-', 40);
$lines[] = 'Имя:      ' . $name;
if ($phone    !== '') $lines[] = 'Телефон:  ' . $phone;
if ($interest !== '') $lines[] = 'Интерес:  ' . $interest;
if ($message  !== '') { $lines[] = ''; $lines[] = 'Сообщение:'; $lines[] = $message; }
$lines[] = '';
$lines[] = str_repeat('-', 40);
if ($page !== '') $lines[] = 'Страница: ' . $page;
$lines[] = 'IP-hash:  ' . substr($ipHash, 0, 16);
$lines[] = 'Время:    ' . date('d.m.Y H:i:s', $now);
$body = implode("\r\n", $lines);

$messageId = '<' . bin2hex(random_bytes(8)) . '.' . $now . '@' . $DOMAIN . '>';

$headers = [
    'From'         => $FROM_NAME . ' <' . $SMTP_USER . '>',
    'To'           => $MAIL_TO,
    'Subject'      => '=?UTF-8?B?' . base64_encode($subject) . '?=',
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=utf-8',
    'Content-Transfer-Encoding' => '8bit',
    'Date'         => date('r', $now),
    'Message-ID'   => $messageId,
    'X-Mailer'     => 'burim03-send.php',
];
foreach ($headers as $k => $v) $headers[$k] = cleanHeader($v);

// ── 9. ОТПРАВКА ЧЕРЕЗ SMTP (SSL:465, AUTH LOGIN) ─────────────
function smtpSend($host, $port, $user, $pass, $from, $to, $headers, $body, $ehloDomain, $logFile) {
    $errno = 0; $errstr = '';
    $conn = @stream_socket_client(
        'ssl://' . $host . ':' . $port,
        $errno, $errstr, 20,
        STREAM_CLIENT_CONNECT
    );
    if (!$conn) {
        @file_put_contents($logFile, date('c') . " SMTP connect failed: $errstr\n", FILE_APPEND);
        return false;
    }
    stream_set_timeout($conn, 20);

    $read = function() use ($conn) {
        $data = '';
        while (!feof($conn)) {
            $line = fgets($conn, 2048);
            if ($line === false) break;
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        return $data;
    };
    $write = function($cmd) use ($conn) {
        fwrite($conn, $cmd . "\r\n");
    };
    $expect = function($prefix) use (&$read, $logFile) {
        $resp = $read();
        if (strpos($resp, $prefix) !== 0) {
            @file_put_contents($logFile, date('c') . " SMTP unexpected: " . trim($resp) . "\n", FILE_APPEND);
            return false;
        }
        return true;
    };

    if (!$expect('220')) { fclose($conn); return false; }
    $write('EHLO ' . $ehloDomain);
    if (!$expect('250')) { fclose($conn); return false; }
    $write('AUTH LOGIN');
    if (!$expect('334')) { fclose($conn); return false; }
    $write(base64_encode($user));
    if (!$expect('334')) { fclose($conn); return false; }
    $write(base64_encode($pass));
    if (!$expect('235')) { fclose($conn); return false; }
    $write('MAIL FROM:<' . $user . '>');
    if (!$expect('250')) { fclose($conn); return false; }
    $write('RCPT TO:<' . $to . '>');
    if (!$expect('250')) { fclose($conn); return false; }
    $write('DATA');
    if (!$expect('354')) { fclose($conn); return false; }

    $msg = '';
    foreach ($headers as $k => $v) $msg .= $k . ': ' . $v . "\r\n";
    $msg .= "\r\n" . $body . "\r\n.";
    // dot-stuffing
    $msg = preg_replace('/(^|\r\n)\.(?!\r\n\z)/', "$1..", $msg);
    $write($msg);
    if (!$expect('250')) { fclose($conn); return false; }
    $write('QUIT');
    fclose($conn);
    return true;
}

$logFile = $rateDir . '/send.log';
$sent = smtpSend($SMTP_HOST, $SMTP_PORT, $SMTP_USER, $SMTP_PASS, $SMTP_USER, $MAIL_TO, $headers, $body, $DOMAIN, $logFile);

// ── 10. FALLBACK НА mail() ───────────────────────────────────
if (!$sent) {
    $hdrLines = [];
    foreach ($headers as $k => $v) {
        if (in_array($k, ['To', 'Subject'], true)) continue;
        $hdrLines[] = $k . ': ' . $v;
    }
    $sent = @mail($MAIL_TO, $subject, $body, implode("\r\n", $hdrLines));
    if (!$sent) {
        @file_put_contents($logFile, date('c') . " mail() fallback failed\n", FILE_APPEND);
    }
}

// ── 11. ЗАПИСЬ В RATE-LIMIT STATE ────────────────────────────
if ($sent) {
    $state['hits'][] = $now;
    $state['last']   = $now;
    @file_put_contents($rateFile, json_encode($state), LOCK_EX);
}

if ($sent) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'Не удалось отправить. Позвоните нам!']);
}
