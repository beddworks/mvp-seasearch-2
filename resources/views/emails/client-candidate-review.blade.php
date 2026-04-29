<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Candidate Review Ready</title>
<style>
  body { margin:0; padding:0; background:#F2F0EC; font-family:'DM Sans',Arial,sans-serif; color:#0D0C0A; }
  .wrap { max-width:620px; margin:40px auto; background:#fff; border-radius:12px; border:1px solid #E0DDD6; overflow:hidden; }
  .header { background:#0D0C0A; padding:24px 32px; }
  .header h1 { margin:0; font-size:18px; color:#F9F8F5; font-weight:600; }
  .header small { color:#B8B2A7; font-size:13px; }
  .body { padding:28px 32px; }
  .eyebrow { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#6B6860; margin-bottom:8px; }
  .title { margin:0 0 12px; font-size:22px; font-family:'Syne',Arial,sans-serif; color:#0D0C0A; }
  .text { margin:0 0 18px; font-size:14px; line-height:1.6; color:#2A2926; }
  .card { border:1px solid #E0DDD6; border-radius:12px; background:#F9F8F5; padding:16px; margin-bottom:16px; }
  .grid { width:100%; border-collapse:collapse; }
  .grid td { padding:6px 0; font-size:13px; vertical-align:top; }
  .grid td:first-child { color:#6B6860; width:132px; }
  .score { display:inline-block; padding:7px 12px; border-radius:999px; font-weight:700; font-size:13px; background:#E8F2FB; color:#1A6DB5; }
  .flags { margin:8px 0 0; }
  .flag { display:inline-block; margin:4px 6px 0 0; padding:4px 9px; border-radius:999px; font-size:11px; }
  .good { background:#EAF4EB; color:#2E7D33; }
  .bad { background:#FBE8E8; color:#B52525; }
  .cta-row { margin-top:22px; }
  .cta { display:inline-block; padding:11px 18px; border-radius:7px; font-size:14px; font-weight:600; color:#fff !important; text-decoration:none; background:#1A6DB5; margin-right:8px; }
  .cta-secondary { background:#0D0C0A; }
  .quick-box { margin-top:16px; border:1px solid #E0DDD6; border-radius:10px; background:#fff; padding:10px 12px; }
  .quick-title { margin:0 0 6px; font-size:11px; color:#6B6860; text-transform:uppercase; letter-spacing:.06em; }
  .quick-row { display:flex; gap:6px; align-items:center; }
  .quick-select { flex:1; border:1px solid #E0DDD6; border-radius:6px; padding:7px 8px; font-size:12px; color:#0D0C0A; background:#fff; }
  .quick-reason-wrap { display:none; width:100%; margin-top:6px; }
  .quick-reason-wrap.open { display:block; }
  .quick-reason { width:100%; border:1px solid #E0DDD6; border-radius:6px; padding:7px 8px; font-size:12px; color:#0D0C0A; background:#fff; min-height:56px; resize:vertical; box-sizing:border-box; }
  .quick-btn { flex-shrink:0; border:none; border-radius:6px; padding:7px 12px; font-size:12px; font-weight:600; color:#fff; background:#1A6DB5; cursor:pointer; white-space:nowrap; }
  .note { margin-top:18px; padding:12px 14px; border-left:3px solid #1A6DB5; background:#F9F8F5; font-size:12px; line-height:1.6; color:#2A2926; }
  .footer { padding:16px 32px; border-top:1px solid #E0DDD6; font-size:12px; color:#6B6860; }
</style>
</head>
<body>
@php
  $candidate = $submission->candidate;
  $mandate = $submission->mandate;
  $recruiter = $submission->recruiter?->user;
  $candidateName = trim(($candidate->first_name ?? '') . ' ' . ($candidate->last_name ?? ''));
  $quickUpdateLink = route('feedback.quick-update', $submission->token);
@endphp
<div class="wrap">
  <div class="header">
    <h1>Sea Search</h1>
    <small>Executive Recruitment for Southeast Asia</small>
  </div>
  <div class="body">
    <div class="eyebrow">Client review</div>
    <h2 class="title">{{ $candidateName }} is ready for review</h2>
    <p class="text">{{ $recruiter?->name ?? 'Your recruiter' }} added a candidate to <strong>{{ $mandate->title }}</strong>. The review page includes the full candidate list for this role, a status dropdown that writes straight to the database, and CSV export.</p>

    <div class="card">
      <table class="grid">
        <tr><td>Current role</td><td>{{ $candidate->current_role ?: '—' }}</td></tr>
        <tr><td>Company</td><td>{{ $candidate->current_company ?: '—' }}</td></tr>
        <tr><td>Email</td><td>{{ $candidate->email ?: '—' }}</td></tr>
        <tr><td>LinkedIn</td><td>{{ $candidate->linkedin_url ?: '—' }}</td></tr>
        <tr><td>AI match</td><td><span class="score">{{ $submission->ai_score ?? 0 }}%</span></td></tr>
        <tr><td>Stage</td><td>{{ ucfirst(str_replace('_', ' ', $submission->client_status ?? 'sourced')) }}</td></tr>
      </table>

      @if($submission->ai_summary)
        <p class="text" style="margin:14px 0 0;"><strong>AI summary:</strong> {{ $submission->ai_summary }}</p>
      @endif

      @if(!empty($submission->green_flags) || !empty($submission->red_flags))
        <div class="flags">
          @foreach(($submission->green_flags ?? []) as $flag)
            <span class="flag good">{{ $flag }}</span>
          @endforeach
          @foreach(($submission->red_flags ?? []) as $flag)
            <span class="flag bad">{{ $flag }}</span>
          @endforeach
        </div>
      @endif
    </div>

    <div class="cta-row">
      <a href="{{ $reviewLink }}" class="cta">View Candidate</a>
      <a href="{{ $exportLink }}" class="cta cta-secondary">Export CSV</a>
    </div>

    <div class="quick-box">
      <p class="quick-title">Change pipeline status</p>
      <form method="GET" action="{{ $quickUpdateLink }}">
        <input type="hidden" name="submission_id" value="{{ $submission->id }}">
        <div class="quick-row">
          <select class="quick-select" id="email-client-status" name="client_status">
            @foreach(['sourced','screened','interview','offered','hired','rejected','on_hold'] as $stage)
              <option value="{{ $stage }}" @selected(($submission->client_status ?? 'sourced') === $stage)>{{ ucfirst(str_replace('_', ' ', $stage)) }}</option>
            @endforeach
          </select>
          <button class="quick-btn" type="submit">Update</button>
        </div>
        <div id="email-reason-wrap" class="quick-reason-wrap {{ ($submission->client_status ?? 'sourced') === 'rejected' ? 'open' : '' }}">
          <textarea id="email-reason" class="quick-reason" name="client_feedback" placeholder="Reason for rejection">{{ $submission->client_feedback }}</textarea>
        </div>
      </form>
    </div>

    <div class="note">
      If your email app blocks forms, click View Candidate to update status on the review page.
    </div>
  </div>
  <div class="footer">
    You received this because you are listed as the client contact for this mandate.
  </div>
</div>
<script>
  (function () {
    const statusSelect = document.getElementById('email-client-status');
    const reasonWrap = document.getElementById('email-reason-wrap');
    const reasonInput = document.getElementById('email-reason');
    if (!statusSelect || !reasonWrap || !reasonInput) return;

    function toggleReason() {
      const isRejected = statusSelect.value === 'rejected';
      reasonWrap.classList.toggle('open', isRejected);
      reasonInput.required = isRejected;
    }

    statusSelect.addEventListener('change', toggleReason);
    toggleReason();
  })();
</script>
</body>
</html>