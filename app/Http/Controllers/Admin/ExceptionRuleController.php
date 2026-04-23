<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ExceptionRuleController extends Controller
{
    public function index() { return Inertia::render('Stub', ['class' => 'ExceptionRuleController']); }
    public function show($id) { return Inertia::render('Stub', ['class' => 'ExceptionRuleController']); }
    public function create() { return Inertia::render('Stub', ['class' => 'ExceptionRuleController']); }
    public function store(Request $request) { return back()->with('success', 'Saved.'); }
    public function edit($id) { return Inertia::render('Stub', ['class' => 'ExceptionRuleController']); }
    public function update(Request $request, $id) { return back()->with('success', 'Updated.'); }
    public function destroy($id) { return back()->with('success', 'Deleted.'); }
    public function approve($id) { return back()->with('success', 'Approved.'); }
    public function reject($id) { return back()->with('success', 'Rejected.'); }
    public function pick($id) { return Inertia::render('Stub'); }
    public function confirmPick(Request $request, $id) { return back()->with('success', 'Picked.'); }
    public function workspace($id) { return Inertia::render('Stub'); }
    public function uploadCv(Request $request, $id) { return response()->json(['success' => true]); }
    public function saveNote(Request $request, $id) { return response()->json(['success' => true]); }
    public function move(Request $request) { return response()->json(['success' => true]); }
    public function scheduleInterview(Request $request) { return response()->json(['success' => true]); }
    public function saveFeedback(Request $request) { return response()->json(['success' => true]); }
    public function submitToClient(Request $request) { return response()->json(['success' => true]); }
    public function addCandidate(Request $request) { return response()->json(['success' => true]); }
    public function payoutRequest(Request $request) { return back()->with('success', 'Request submitted.'); }
    public function read($id) { return response()->json(['success' => true]); }
    public function readAll() { return back(); }
    public function brief(Request $request) { return response()->json(['result' => 'stub']); }
    public function outreach(Request $request) { return response()->json(['result' => 'stub']); }
    public function questions(Request $request) { return response()->json(['result' => 'stub']); }
    public function matching(Request $request) { return response()->json(['result' => 'stub']); }
}
