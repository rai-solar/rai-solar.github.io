<?php
// Langues: reads and writes words.json and sentences.json. No database needed.
// GET  api.php                  → the whole vocabulary
// POST api.php                  → {"w":"lava","to":"<id>","name":"","trip":""} adds one word joined to <id> (side defaults to "after")
// GET  api.php?kind=sentences   → every vented sentence
// POST api.php?kind=sentences   → {"s":"the volcano is awake"} adds one sentence
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$kind = (isset($_GET['kind']) && $_GET['kind'] === 'sentences') ? 'sentences' : 'words';
$file = __DIR__ . '/' . $kind . '.json';
$MAX_WORDS = 20000;
$MAX_SENTENCES = 5000;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  if (!file_exists($file)) { echo '{"' . $kind . '":[]}'; exit; }
  readfile($file);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"error":"use GET or POST"}'; exit; }

function fail($code, $msg) { http_response_code($code); echo json_encode(['error' => $msg]); exit; }

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) fail(400, 'send JSON');

if ($kind === 'sentences') {
  $s = isset($in['s']) ? trim(preg_replace('/\s+/u', ' ', (string)$in['s'])) : '';
  $len = mb_strlen($s);
  if ($len < 1 || $len > 240) fail(400, 'a sentence of 1 to 240 characters');
  if (count(preg_split('/ /', $s)) > 40) fail(400, 'at most 40 words');
  if (preg_match('/[\x00-\x1f<>]/u', $s)) fail(400, 'plain text only');
  $fh = fopen($file, 'c+');
  if (!$fh || !flock($fh, LOCK_EX)) fail(500, 'the volcano is busy, try again');
  $data = json_decode(stream_get_contents($fh) ?: '{"sentences":[]}', true);
  if (!is_array($data) || !isset($data['sentences']) || !is_array($data['sentences'])) $data = ['sentences' => []];
  if (count($data['sentences']) >= $MAX_SENTENCES) array_shift($data['sentences']);   // the oldest makes room
  $item = ['id' => bin2hex(random_bytes(6)), 's' => $s, 't' => (int) round(microtime(true) * 1000)];
  $data['sentences'][] = $item;
  ftruncate($fh, 0); rewind($fh);
  fwrite($fh, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
  fflush($fh); flock($fh, LOCK_UN); fclose($fh);
  echo json_encode(['sentence' => $item], JSON_UNESCAPED_UNICODE);
  exit;
}

$w    = isset($in['w']) ? trim((string)$in['w']) : '';
$to   = isset($in['to']) ? (string)$in['to'] : '';
$side = isset($in['side']) ? (string)$in['side'] : '';
$name = isset($in['name']) ? mb_substr(trim((string)$in['name']), 0, 20) : '';
$trip = isset($in['trip']) ? (string)$in['trip'] : '';

if (!preg_match('/^[\p{L}\p{N}\'’-]{1,24}$/u', $w)) fail(400, "one word: letters, numbers, - or '");
if ($side === '') $side = 'after';   // a new word always joins the word it was added to
if ($side !== 'before' && $side !== 'after') fail(400, 'side must be before or after');
if (!preg_match('/^[a-z0-9]{0,8}$/', $trip)) fail(400, 'bad signature');
if ($name !== '' && $trip === '') fail(400, 'a name needs a code');

// lock the file so two people writing at once don't erase each other
$fh = fopen($file, 'c+');
if (!$fh || !flock($fh, LOCK_EX)) fail(500, 'the volcano is busy, try again');
$raw = stream_get_contents($fh);
$data = json_decode($raw ?: '{"words":[]}', true);
if (!is_array($data) || !isset($data['words']) || !is_array($data['words'])) $data = ['words' => []];

if (count($data['words']) >= $MAX_WORDS) { flock($fh, LOCK_UN); fclose($fh); fail(507, 'the volcano is full'); }
$exists = false;
foreach ($data['words'] as $x) { if (isset($x['id']) && $x['id'] === $to) { $exists = true; break; } }
if (!$exists) { flock($fh, LOCK_UN); fclose($fh); fail(400, 'that word is gone'); }

$word = [
  'id'   => bin2hex(random_bytes(6)),
  'w'    => $w,
  'to'   => $to,
  'side' => $side,
  'name' => $name,
  'trip' => $trip,
  't'    => (int) round(microtime(true) * 1000),
];
$data['words'][] = $word;

ftruncate($fh, 0);
rewind($fh);
fwrite($fh, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
fflush($fh);
flock($fh, LOCK_UN);
fclose($fh);

echo json_encode(['word' => $word], JSON_UNESCAPED_UNICODE);
