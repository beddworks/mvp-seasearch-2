<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();
        $recruiter = null;

        if ($user && $user->role === 'recruiter') {
            $recruiter = DB::table('recruiters')->where('user_id', $user->id)->first();
            if ($recruiter) {
                $recruiter = [
                    'id'                   => $recruiter->id,
                    'tier'                 => $recruiter->tier,
                    'trust_level'          => $recruiter->trust_level,
                    'recruiter_group'      => $recruiter->recruiter_group,
                    'active_mandates_count'=> $recruiter->active_mandates_count,
                ];
            }
        }

        $unreadNotifications = $user
            ? DB::table('notifications')
                ->where('user_id', $user->id)
                ->whereNull('read_at')
                ->count()
            : 0;

        return [
            ...parent::share($request),
            'auth' => [
                'user'      => $user ? [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role,
                ] : null,
                'recruiter' => $recruiter,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
            'unread_notifications' => $unreadNotifications,
        ];
    }
}
