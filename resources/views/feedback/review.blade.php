<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $mandate->title }} Candidate Review</title>
    <style>
        :root {
            --ink: #0D0C0A;
            --ink2: #2A2926;
            --ink4: #6B6860;
            --mist: #F9F8F5;
            --mist2: #F2F0EC;
            --wire: #E0DDD6;
            --sea2: #1A6DB5;
            --sea-pale: #E8F2FB;
            --jade2: #2E7D33;
            --jade-pale: #EAF4EB;
            --ruby2: #B52525;
            --ruby-pale: #FBE8E8;
            --amber2: #B85C1A;
            --amber-pale: #FDF0E8;
            --r: 12px;
            --rsm: 7px;
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--mist2); color: var(--ink); font-family: 'DM Sans', Arial, sans-serif; }
        .page { max-width: 1240px; margin: 0 auto; padding: 28px 24px 40px; }
        .hero { background: #fff; border: 1px solid var(--wire); border-radius: var(--r); padding: 18px 20px; margin-bottom: 14px; }
        .eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink4); margin-bottom: 6px; }
        h1 { margin: 0 0 4px; font-size: 22px; line-height: 1.2; font-family: 'Syne', Arial, sans-serif; }
        .subtitle { margin: 0; color: var(--ink4); line-height: 1.6; font-size: 12px; }
        .stats { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
        .stats span { font-size: 11px; color: var(--ink4); border: 1px solid var(--wire); border-radius: 999px; padding: 4px 9px; background: #fff; }
        .actions { display: flex; gap: 8px; margin-top: 10px; }
        .btn { display: inline-flex; align-items: center; justify-content: center; padding: 11px 16px; border-radius: var(--rsm); font-size: 13px; font-weight: 600; text-decoration: none; border: 1px solid var(--wire); cursor: pointer; }
        .btn-primary { background: var(--sea2); color: #fff; border-color: var(--sea2); }
        .flash { margin-bottom: 16px; padding: 12px 14px; border-radius: var(--rsm); background: var(--jade-pale); color: var(--jade2); border: 1px solid #cfe3d0; }
        .flash-error { margin-bottom: 16px; padding: 12px 14px; border-radius: var(--rsm); background: var(--ruby-pale); color: var(--ruby2); border: 1px solid #f0c8c8; }

        .table-wrap { background: #fff; border: 1px solid var(--wire); border-radius: var(--r); overflow: hidden; position: relative; z-index: 2; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 9px 12px; border-bottom: 1px solid var(--wire); text-align: left; vertical-align: middle; font-size: 12px; }
        th { background: #fff; color: var(--ink4); font-size: 10px; text-transform: uppercase; letter-spacing: .05em; font-weight: 500; }
        tbody tr:hover { background: #fbfaf8; }
        tr:last-child td { border-bottom: none; }
        .cand-name { font-size: 12px; font-weight: 600; margin: 0; line-height: 1.35; }
        .role { font-size: 12px; line-height: 1.45; color: var(--ink2); max-width: 320px; word-break: break-word; }
        .mpill { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
        .mp-high { background: #eaf4eb; color: var(--jade2); }
        .mp-mid { background: #fdf0e8; color: var(--amber2); }
        .mp-low { background: #fbe8e8; color: var(--ruby2); }
        .stage { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; }
        .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
        .act-btn { font-size: 10px; padding: 4px 10px; border-radius: 20px; border: 1px solid var(--wire); background: transparent; color: var(--ink4); cursor: pointer; }
        .act-btn:hover { border-color: var(--sea2); color: var(--sea2); }

        .inline-update { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
        .select { border: 1px solid var(--wire); border-radius: var(--rsm); padding: 4px 8px; background: #fff; color: var(--ink); font-size: 10px; }
        .save-btn { border: 1px solid var(--sea2); background: var(--sea2); color: #fff; border-radius: var(--rsm); padding: 4px 8px; font-size: 10px; cursor: pointer; }
        .reason-wrap { display: none; width: 100%; margin-top: 6px; }
        .reason-wrap.open { display: block; }
        .reason-input { width: 100%; border: 1px solid var(--wire); border-radius: var(--rsm); padding: 7px 8px; background: #fff; color: var(--ink); font-size: 11px; min-height: 56px; resize: vertical; }
        .small { color: var(--ink4); font-size: 11px; margin-top: 4px; }

        .modal {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 16px;
        }
        .modal.open { display: flex; }
        .modal-card {
            background: #fff;
            border-radius: var(--r);
            border: 1px solid var(--wire);
            width: 100%;
            max-width: 720px;
            max-height: 90vh;
            overflow: auto;
        }
        .modal-head { padding: 14px 16px; border-bottom: 1px solid var(--wire); display: flex; justify-content: space-between; align-items: center; }
        .modal-head h3 { margin: 0; font-size: 16px; }
        .close { border: none; background: transparent; font-size: 20px; cursor: pointer; color: var(--ink4); }
        .modal-body { padding: 14px 16px; display: grid; gap: 10px; }
        .box { border: 1px solid var(--wire); border-radius: var(--rsm); padding: 10px 12px; font-size: 13px; line-height: 1.6; }
        .box-title { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink4); margin-bottom: 4px; }
        .tags { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 6px; }
        .tag { font-size: 10px; padding: 3px 7px; border-radius: 999px; }
        .good { background: #eaf4eb; color: var(--jade2); }
        .bad { background: #fbe8e8; color: var(--ruby2); }

        @media (max-width: 1100px) {
            .page { padding: 18px 12px 28px; }
            .table-wrap { overflow-x: auto; }
            table { min-width: 900px; }
        }
    </style>
</head>
<body>
    <div class="page">
        @if($flashMessage)
            <div class="flash">{{ $flashMessage }}</div>
        @endif

        @if($errors->any())
            <div class="flash-error">{{ $errors->first() }}</div>
        @endif

        <div class="hero">
            <div class="eyebrow">Public client review</div>
            <h1>{{ $mandate->title }}</h1>
            <p class="subtitle">Simple candidate table view with quick stage update.</p>
            <div class="stats">
                <span>Client: {{ $client->company_name }}</span>
                <span>Candidates: {{ $submissions->count() }}</span>
                <span>Top AI score: {{ $submissions->max('ai_score') ?? 0 }}%</span>
            </div>
            <div class="actions">
                <a href="{{ route('feedback.export', $token) }}" class="btn btn-primary">Export CSV</a>
            </div>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Candidate</th>
                        <th>Current role</th>
                        <th>AI Match</th>
                        <th>Stage</th>
                        <th>Last activity</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($submissions as $submission)
                        @php
                            $score = (int) ($submission->ai_score ?? 0);
                            $stage = $submission->client_status ?? 'sourced';
                            $activity = $submission->client_status_updated_at ?? $submission->submitted_at ?? $submission->updated_at;
                            $stageColor = [
                                'sourced' => 'var(--ink4)',
                                'screened' => 'var(--amber2)',
                                'interview' => 'var(--sea2)',
                                'offered' => '#4B3AA8',
                                'hired' => 'var(--jade2)',
                                'rejected' => 'var(--ruby2)',
                                'on_hold' => 'var(--ink4)',
                            ][$stage] ?? 'var(--ink4)';
                        @endphp
                        <tr id="candidate-{{ $submission->id }}">
                            <td>
                                <div class="cand-name">{{ trim(($submission->candidate->first_name ?? '') . ' ' . ($submission->candidate->last_name ?? '')) }}</div>
                            </td>
                            <td>
                                <div class="role">{{ ($submission->candidate->current_role ?: '—') }}@if($submission->candidate->current_company), {{ $submission->candidate->current_company }}@endif</div>
                            </td>
                            <td>
                                <span class="mpill {{ $score >= 80 ? 'mp-high' : ($score >= 60 ? 'mp-mid' : 'mp-low') }}">{{ $score }}%</span>
                            </td>
                            <td>
                                <span class="stage"><span class="dot" style="background: {{ $stageColor }};"></span>{{ ucfirst(str_replace('_', ' ', $stage)) }}</span>
                            </td>
                            <td>
                                {{ $activity ? \Carbon\Carbon::parse($activity)->isToday() ? 'Today' : \Carbon\Carbon::parse($activity)->diffForHumans() : '—' }}
                            </td>
                            <td>
                                <button type="button" class="act-btn open-detail" data-submission-id="{{ $submission->id }}">AI summary →</button>
                                <form method="POST" action="{{ route('feedback.update', $token) }}" class="inline-update">
                                    @csrf
                                    <input type="hidden" name="submission_id" value="{{ $submission->id }}">
                                    <select class="select feedback-status" name="client_status" data-submission-id="{{ $submission->id }}">
                                        @foreach($stageOptions as $opt)
                                            <option value="{{ $opt }}" @selected($stage === $opt)>{{ ucfirst(str_replace('_', ' ', $opt)) }}</option>
                                        @endforeach
                                    </select>
                                    <div class="reason-wrap {{ $stage === 'rejected' ? 'open' : '' }}" id="reason-wrap-{{ $submission->id }}">
                                        <textarea class="reason-input" name="client_feedback" id="reason-input-{{ $submission->id }}" placeholder="Reason for rejection">{{ $submission->client_feedback }}</textarea>
                                    </div>
                                    <button type="submit" class="save-btn">Save</button>
                                </form>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <div id="candidate-modal" class="modal" role="dialog" aria-modal="true" aria-hidden="true">
            <div class="modal-card">
                <div class="modal-head">
                    <div>
                        <h3 id="modal-name">Candidate</h3>
                        <div id="modal-sub" class="small">Profile details</div>
                    </div>
                    <button type="button" id="close-modal" class="close" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="box">
                        <div class="box-title">Contact</div>
                        <div id="modal-contact">—</div>
                    </div>
                    <div class="box">
                        <div class="box-title">AI Match</div>
                        <div id="modal-score">0%</div>
                    </div>
                    <div class="box">
                        <div class="box-title">AI Summary</div>
                        <div id="modal-summary">No AI summary saved yet.</div>
                    </div>
                    <div class="box">
                        <div class="box-title">Strengths</div>
                        <div id="modal-green" class="tags"></div>
                    </div>
                    <div class="box">
                        <div class="box-title">Concerns</div>
                        <div id="modal-red" class="tags"></div>
                    </div>
                    <div class="box">
                        <div class="box-title">Profile</div>
                        <div id="modal-profile">—</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    @php
        $modalSubmissions = $submissions->map(function ($submission) {
            $candidate = $submission->candidate;

            return [
                'id' => $submission->id,
                'name' => trim(($candidate->first_name ?? '') . ' ' . ($candidate->last_name ?? '')),
                'current_role' => $candidate->current_role,
                'current_company' => $candidate->current_company,
                'email' => $candidate->email,
                'linkedin_url' => $candidate->linkedin_url,
                'cv_url' => $candidate->cv_url,
                'skills' => $candidate->skills ?? [],
                'years_experience' => $candidate->years_experience,
                'ai_score' => (int) ($submission->ai_score ?? 0),
                'ai_summary' => $submission->ai_summary,
                'green_flags' => $submission->green_flags ?? [],
                'red_flags' => $submission->red_flags ?? [],
            ];
        })->values();
    @endphp

    <script>
        (function () {
            const submissions = @json($modalSubmissions);

            const byId = {};
            submissions.forEach(function (item) { byId[item.id] = item; });

            const modal = document.getElementById('candidate-modal');
            const closeBtn = document.getElementById('close-modal');
            const nameEl = document.getElementById('modal-name');
            const subEl = document.getElementById('modal-sub');
            const contactEl = document.getElementById('modal-contact');
            const scoreEl = document.getElementById('modal-score');
            const greenEl = document.getElementById('modal-green');
            const redEl = document.getElementById('modal-red');
            const summaryEl = document.getElementById('modal-summary');
            const profileEl = document.getElementById('modal-profile');

            function pct(v) {
                const n = Number(v || 0);
                if (!Number.isFinite(n)) return 0;
                return Math.max(0, Math.min(100, n));
            }

            function openModal(item) {
                nameEl.textContent = item.name || 'Candidate';
                subEl.textContent = [item.current_role, item.current_company].filter(Boolean).join(' · ') || 'Profile pending';

                const contactParts = [];
                if (item.email) contactParts.push(item.email);
                if (item.linkedin_url) contactParts.push(item.linkedin_url);
                if (item.cv_url) contactParts.push('CV available');
                contactEl.textContent = contactParts.join(' | ') || 'No contact details';

                scoreEl.textContent = pct(item.ai_score) + '%';

                const greenFlags = Array.isArray(item.green_flags) ? item.green_flags : [];
                greenEl.innerHTML = greenFlags.length
                    ? greenFlags.map(function (flag) { return '<span class="tag good">' + flag + '</span>'; }).join('')
                    : '<span class="small">No strengths tagged.</span>';

                const redFlags = Array.isArray(item.red_flags) ? item.red_flags : [];
                redEl.innerHTML = redFlags.length
                    ? redFlags.map(function (flag) { return '<span class="tag bad">' + flag + '</span>'; }).join('')
                    : '<span class="small">No concerns tagged.</span>';

                summaryEl.textContent = item.ai_summary || 'No AI summary saved yet.';

                const profileParts = [];
                if (item.years_experience) profileParts.push('Experience: ' + item.years_experience + ' years');
                if (Array.isArray(item.skills) && item.skills.length) {
                    profileParts.push('Skills: ' + item.skills.slice(0, 8).join(', '));
                }
                profileEl.textContent = profileParts.join(' | ') || 'No profile details available.';

                modal.classList.add('open');
                modal.setAttribute('aria-hidden', 'false');
            }

            function closeModal() {
                modal.classList.remove('open');
                modal.setAttribute('aria-hidden', 'true');
            }

            document.querySelectorAll('.open-detail').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    const id = btn.getAttribute('data-submission-id');
                    if (!id || !byId[id]) return;
                    openModal(byId[id]);
                });
            });

            function toggleReason(submissionId, statusValue) {
                const wrap = document.getElementById('reason-wrap-' + submissionId);
                const input = document.getElementById('reason-input-' + submissionId);
                if (!wrap || !input) return;

                const isRejected = statusValue === 'rejected';
                wrap.classList.toggle('open', isRejected);
                input.required = isRejected;
            }

            document.querySelectorAll('.feedback-status').forEach(function (selectEl) {
                const submissionId = selectEl.getAttribute('data-submission-id');
                toggleReason(submissionId, selectEl.value);
                selectEl.addEventListener('change', function () {
                    toggleReason(submissionId, selectEl.value);
                });
            });

            closeBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', function (event) {
                if (event.target === modal) closeModal();
            });
            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') closeModal();
            });
        })();
    </script>
</body>
</html>