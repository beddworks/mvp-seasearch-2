<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function show()
    {
        return Inertia::render('Auth/ProfileComplete', [
            'user' => auth()->user()->only('id', 'name', 'email', 'avatar_url'),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'recruiter_group' => ['required', 'in:Dwikar,Emma,BTI,Jiebei'],
            'phone'           => ['nullable', 'string', 'max:20'],
            'linkedin_url'    => ['nullable', 'url'],
        ]);

        $user      = auth()->user();
        $recruiter = $user->recruiter;

        $recruiter->update([
            'recruiter_group' => $data['recruiter_group'],
            'profile_complete' => true,
        ]);

        return redirect()->route('recruiter.dashboard');
    }

    public function skip()
    {
        // Allow skip — profile_complete stays false but user can still access platform
        return redirect()->route('recruiter.dashboard');
    }
}
