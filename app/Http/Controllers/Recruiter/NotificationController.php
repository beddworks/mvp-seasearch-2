<?php

namespace App\Http\Controllers\Recruiter;

use App\Http\Controllers\Controller;
use App\Models\PlatformNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $notifications = PlatformNotification::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate(30);

        PlatformNotification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->update(['is_read' => true, 'read_at' => now()]);

        return Inertia::render('Recruiter/Notifications/Index', [
            'notifications' => $notifications,
        ]);
    }

    public function read(string $id)
    {
        $notif = PlatformNotification::where('user_id', Auth::id())->findOrFail($id);
        $notif->update(['is_read' => true, 'read_at' => now()]);
        return response()->json(['success' => true]);
    }

    public function readAll()
    {
        PlatformNotification::where('user_id', Auth::id())
            ->whereNull('read_at')
            ->update(['is_read' => true, 'read_at' => now()]);
        return back()->with('success', 'All notifications marked as read.');
    }
}
