<?php
// Operación limitada a ICB; secretos existentes nunca se imprimen ni modifican.
require '/var/www/html/vendor/autoload.php';
$framework = require '/var/www/html/bootstrap/app.php';
$framework->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$app = \App\Models\Application::where('uuid', 'e3qib0s0vmfx7ex10uzea2dh')->firstOrFail();
$mode = $argv[1] ?? 'status';
if ($mode === 'enable') {
    $env = $app->environment_variables()->where('key', 'ICB_PAYMENTS_ENABLED')->first();
    if (!$env) {
        $env = $app->environment_variables()->make(['key' => 'ICB_PAYMENTS_ENABLED']);
    }
    $env->value = 'true';
    $env->is_buildtime = false;
    $env->is_runtime = true;
    $env->is_literal = true;
    $env->is_preview = false;
    $env->save();
    echo "ICB_PAYMENTS_ENABLED=true (ICB only)\n";
} elseif ($mode === 'deploy') {
    $commit = $argv[2] ?? '';
    if (!preg_match('/^[a-f0-9]{40}$/', $commit)) throw new \Exception('Commit required');
    $uuid = (string) \Illuminate\Support\Str::ulid();
    queue_application_deployment(application: $app, deployment_uuid: $uuid, commit: $commit, force_rebuild: false, is_api: true);
    echo json_encode(['deployment' => $uuid, 'commit' => $commit]) . PHP_EOL;
} else {
    $last = \App\Models\ApplicationDeploymentQueue::where('application_id', $app->id)->latest()->first();
    echo json_encode(['application' => $app->uuid, 'deployment' => $last?->deployment_uuid,
        'status' => $last?->status, 'commit' => $last?->commit]) . PHP_EOL;
}
