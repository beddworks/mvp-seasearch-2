<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Recruiter;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class GoogleSsoController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            return redirect()->route('login')->withErrors(['email' => 'Google authentication failed. Please try again.']);
        }

        // Find or create user
        $user = User::where('google_id', $googleUser->getId())
            ->orWhere('email', $googleUser->getEmail())
            ->first();

        if (!$user) {
            $user = User::create([
                'name'      => $googleUser->getName(),
                'email'     => $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
                'avatar_url'=> $googleUser->getAvatar(),
                'role'      => 'recruiter',
                'status'    => 'active',
            ]);
        } else {
            // Update google_id if not set
            if (!$user->google_id) {
                $user->update([
                    'google_id'  => $googleUser->getId(),
                    'avatar_url' => $googleUser->getAvatar(),
                ]);
            }
        }

        if ($user->status === 'suspended') {
            return redirect()->route('login')->withErrors(['email' => 'Your account has been suspended.']);
        }

        // Only recruiters can use Google SSO
        if (!in_array($user->role, ['recruiter'])) {
            return redirect()->route('login')->withErrors(['email' => 'Admin accounts must log in with email and password.']);
        }

        // Ensure recruiter profile exists
        if (!$user->recruiter) {
            Recruiter::create([
                'user_id'  => $user->id,
                'tier'     => 'junior',
                'trust_level' => 'standard',
                'profile_complete' => false,
            ]);
        }

        Auth::login($user);

        // Redirect to profile completion if not done
        if (!$user->recruiter?->profile_complete) {
            return redirect()->route('profile.complete');
        }

        return redirect()->route('recruiter.dashboard');
    }
}
