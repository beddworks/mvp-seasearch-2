<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{ $title }}</title>
<style>
  body { margin:0; padding:0; background:#F2F0EC; font-family:'DM Sans',Arial,sans-serif; color:#0D0C0A; }
  .wrap { max-width:560px; margin:40px auto; background:#fff; border-radius:12px; border:1px solid #E0DDD6; overflow:hidden; }
  .header { background:#0D0C0A; padding:24px 32px; }
  .header h1 { margin:0; font-size:18px; color:#F9F8F5; font-weight:600; letter-spacing:0.02em; }
  .header small { color:#6B6860; font-size:13px; }
  .body { padding:28px 32px; }
  .body h2 { margin:0 0 12px; font-size:16px; font-weight:600; color:#0D0C0A; }
  .body p  { margin:0 0 20px; font-size:14px; line-height:1.6; color:#2A2926; }
  .cta { display:inline-block; padding:10px 22px; border-radius:7px; font-size:14px; font-weight:600; color:#fff; text-decoration:none; }
  .footer { padding:16px 32px; border-top:1px solid #E0DDD6; font-size:12px; color:#6B6860; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Sea Search</h1>
    <small>Executive Recruitment for Southeast Asia</small>
  </div>
  <div class="body">
    <h2>{{ $title }}</h2>
    <p>{{ $body }}</p>
    @if($link)
      <a href="{{ $link }}" class="cta" style="background:{{ $color ?? '#1A6DB5' }}">{{ $ctaLabel ?? 'View Details' }}</a>
    @endif
  </div>
  <div class="footer">
    You received this because you are a registered user on Sea Search.
    &copy; {{ date('Y') }} Sea Search Asia Pte Ltd.
  </div>
</div>
</body>
</html>
