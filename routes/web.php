<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboard;
use App\Http\Controllers\Auth\GoogleSsoController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\Recruiter\DashboardController as RecruiterDashboard;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ─── Public ────────────────────────────────────────────────────────────────
Route::get('/', fn() => redirect()->route('login'))->name('home');

// ─── Auth ──────────────────────────────────────────────────────────────────
Route::middleware('guest')->group(function () {
    Route::get('/login',  [LoginController::class, 'showLogin'])->name('login');
    Route::post('/login', [LoginController::class, 'login'])->name('login.post');
});

Route::post('/logout', [LoginController::class, 'logout'])->name('logout')->middleware('auth');

// Google SSO (recruiters)
Route::get('/auth/google',          [GoogleSsoController::class, 'redirect'])->name('auth.google');
Route::get('/auth/google/callback', [GoogleSsoController::class, 'callback'])->name('auth.google.callback');

// Profile completion
Route::middleware('auth')->group(function () {
    Route::get('/profile/complete',  [ProfileController::class, 'show'])->name('profile.complete');
    Route::post('/profile/complete', [ProfileController::class, 'update'])->name('profile.update');
    Route::get('/profile/skip',      [ProfileController::class, 'skip'])->name('profile.skip');
});

// ─── Recruiter ─────────────────────────────────────────────────────────────
Route::middleware(['auth', 'role:recruiter'])->prefix('recruiter')->name('recruiter.')->group(function () {
    Route::get('/dashboard', [RecruiterDashboard::class, 'index'])->name('dashboard');

    // mandates
    Route::get('/mandates',                      [\App\Http\Controllers\Recruiter\MandateController::class, 'index'])->name('mandates.index');
    Route::get('/mandates/{mandate}/workspace',  [\App\Http\Controllers\Recruiter\MandateController::class, 'workspace'])->name('mandates.workspace');
    Route::get('/mandates/{mandate}/pick',       [\App\Http\Controllers\Recruiter\MandateController::class, 'pick'])->name('mandates.pick');
    Route::post('/mandates/{mandate}/pick',      [\App\Http\Controllers\Recruiter\MandateController::class, 'confirmPick'])->name('mandates.pick.confirm');
    Route::get('/mandates/{mandate}',            [\App\Http\Controllers\Recruiter\MandateController::class, 'show'])->name('mandates.show');

    // candidates
    Route::get('/candidates',                         [\App\Http\Controllers\Recruiter\CandidateController::class, 'index'])->name('candidates.index');
    Route::post('/candidates',                        [\App\Http\Controllers\Recruiter\CandidateController::class, 'store'])->name('candidates.store');
    Route::get('/candidates/{candidate}',             [\App\Http\Controllers\Recruiter\CandidateController::class, 'show'])->name('candidates.show');
    Route::put('/candidates/{candidate}',             [\App\Http\Controllers\Recruiter\CandidateController::class, 'update'])->name('candidates.update');
    Route::post('/candidates/{candidate}/upload-cv',  [\App\Http\Controllers\Recruiter\CandidateController::class, 'uploadCv'])->name('candidates.upload-cv');
    Route::post('/candidates/{candidate}/save-note',  [\App\Http\Controllers\Recruiter\CandidateController::class, 'saveNote'])->name('candidates.save-note');

    // submissions
    Route::post('/submissions', [\App\Http\Controllers\Recruiter\SubmissionController::class, 'store'])->name('submissions.store');

    // kanban
    Route::get('/kanban/{mandate}',           [\App\Http\Controllers\Recruiter\KanbanController::class, 'show'])->name('kanban.show');
    Route::post('/kanban/move',               [\App\Http\Controllers\Recruiter\KanbanController::class, 'move'])->name('kanban.move');
    Route::post('/kanban/schedule-interview', [\App\Http\Controllers\Recruiter\KanbanController::class, 'scheduleInterview'])->name('kanban.schedule-interview');
    Route::post('/kanban/save-feedback',      [\App\Http\Controllers\Recruiter\KanbanController::class, 'saveFeedback'])->name('kanban.save-feedback');
    Route::post('/kanban/submit-to-client',   [\App\Http\Controllers\Recruiter\KanbanController::class, 'submitToClient'])->name('kanban.submit-to-client');
    Route::post('/kanban/reject',             [\App\Http\Controllers\Recruiter\KanbanController::class, 'reject'])->name('kanban.reject');
    Route::post('/kanban/add-candidate',      [\App\Http\Controllers\Recruiter\KanbanController::class, 'addCandidate'])->name('kanban.add-candidate');

    // earnings
    Route::get('/earnings',              [\App\Http\Controllers\Recruiter\EarningsController::class, 'index'])->name('earnings.index');
    Route::post('/earnings/payout-request', [\App\Http\Controllers\Recruiter\EarningsController::class, 'payoutRequest'])->name('earnings.payout-request');

    // notifications
    Route::get('/notifications',            [\App\Http\Controllers\Recruiter\NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{id}/read', [\App\Http\Controllers\Recruiter\NotificationController::class, 'read'])->name('notifications.read');
    Route::post('/notifications/read-all',  [\App\Http\Controllers\Recruiter\NotificationController::class, 'readAll'])->name('notifications.read-all');

    // AI endpoints
    Route::post('/ai/brief',     [\App\Http\Controllers\Recruiter\AiController::class, 'brief'])->name('ai.brief');
    Route::post('/ai/outreach',  [\App\Http\Controllers\Recruiter\AiController::class, 'outreach'])->name('ai.outreach');
    Route::post('/ai/questions', [\App\Http\Controllers\Recruiter\AiController::class, 'questions'])->name('ai.questions');
    Route::post('/ai/matching',  [\App\Http\Controllers\Recruiter\AiController::class, 'matching'])->name('ai.matching');
});

// ─── Admin ─────────────────────────────────────────────────────────────────
Route::middleware(['auth', 'role:admin,super_admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [AdminDashboard::class, 'index'])->name('dashboard');

    Route::resource('mandates',           \App\Http\Controllers\Admin\MandateController::class);
    Route::resource('clients',            \App\Http\Controllers\Admin\ClientController::class);
    Route::resource('recruiters',         \App\Http\Controllers\Admin\RecruiterController::class);
    Route::resource('compensation-types', \App\Http\Controllers\Admin\CompensationTypeController::class);
    Route::resource('exception-rules',    \App\Http\Controllers\Admin\ExceptionRuleController::class);
    Route::resource('report-templates',   \App\Http\Controllers\Admin\ReportTemplateController::class);

    Route::get('/claims',                  [\App\Http\Controllers\Admin\ClaimController::class, 'index'])->name('claims.index');
    Route::post('/claims/{claim}/approve', [\App\Http\Controllers\Admin\ClaimController::class, 'approve'])->name('claims.approve');
    Route::post('/claims/{claim}/reject',  [\App\Http\Controllers\Admin\ClaimController::class, 'reject'])->name('claims.reject');

    Route::get('/submissions',                          [\App\Http\Controllers\Admin\SubmissionController::class, 'index'])->name('submissions.index');
    Route::post('/submissions/{submission}/approve', [\App\Http\Controllers\Admin\SubmissionController::class, 'approve'])->name('submissions.approve');
    Route::post('/submissions/{submission}/reject',  [\App\Http\Controllers\Admin\SubmissionController::class, 'reject'])->name('submissions.reject');

    Route::get('/mandates/{id}/kanban',              [\App\Http\Controllers\Admin\KanbanController::class, 'show'])->name('mandates.kanban');
    Route::post('/kanban/move',                      [\App\Http\Controllers\Admin\KanbanController::class, 'move'])->name('kanban.move');
    Route::post('/kanban/schedule-interview',         [\App\Http\Controllers\Admin\KanbanController::class, 'scheduleInterview'])->name('kanban.schedule-interview');
    Route::post('/kanban/save-feedback',             [\App\Http\Controllers\Admin\KanbanController::class, 'saveFeedback'])->name('kanban.save-feedback');
    Route::post('/kanban/submit-to-client',          [\App\Http\Controllers\Admin\KanbanController::class, 'submitToClient'])->name('kanban.submit-to-client');
    Route::post('/kanban/reject',                    [\App\Http\Controllers\Admin\KanbanController::class, 'reject'])->name('kanban.reject');
    Route::post('/kanban/add-candidate',             [\App\Http\Controllers\Admin\KanbanController::class, 'addCandidate'])->name('kanban.add-candidate');

    Route::get('/analytics', [\App\Http\Controllers\Admin\AnalyticsController::class, 'index'])->name('analytics.index');
    Route::get('/timer-config', [\App\Http\Controllers\Admin\TimerConfigController::class, 'index'])->name('timer-config');
    Route::put('/timer-config/{mandate}', [\App\Http\Controllers\Admin\TimerConfigController::class, 'update'])->name('timer-config.update');
    Route::post('/timer-config/run-now', [\App\Http\Controllers\Admin\TimerConfigController::class, 'runNow'])->name('timer-config.run-now');
});

// ─── Client portal (tokenized feedback) ────────────────────────────────────
Route::get('/feedback/{token}',  [\App\Http\Controllers\Client\FeedbackController::class, 'show'])->name('feedback.show');
Route::post('/feedback/{token}', [\App\Http\Controllers\Client\FeedbackController::class, 'update'])->name('feedback.update');

// ─── Client dashboard ──────────────────────────────────────────────────────
Route::middleware(['auth', 'role:client'])->prefix('client')->name('client.')->group(function () {
    Route::get('/', fn() => redirect()->route('client.mandates.index'));
    Route::get('/dashboard', fn() => redirect()->route('client.mandates.index'))->name('dashboard');

    // Mandates (read-only view for client)
    Route::get('/mandates',       [\App\Http\Controllers\Client\MandateController::class, 'index'])->name('mandates.index');
    Route::get('/mandates/{id}',         [\App\Http\Controllers\Client\MandateController::class, 'show'])->name('mandates.show');
    Route::get('/mandates/{id}/kanban',  [\App\Http\Controllers\Client\KanbanController::class, 'show'])->name('mandates.kanban');
    Route::post('/kanban/move',          [\App\Http\Controllers\Client\KanbanController::class, 'move'])->name('kanban.move');
    Route::post('/kanban/save-feedback', [\App\Http\Controllers\Client\KanbanController::class, 'saveFeedback'])->name('kanban.save-feedback');
});
