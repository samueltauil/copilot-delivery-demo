fake_compute(preset; run_id) = Dict{String,Any}(
    "id"=>run_id, "preset"=>preset, "pixels"=>[[1.0]], "synthetic"=>true)

@testset "Shared run state" begin
    state = ScanLab.SessionState()
    @test ScanLab.snapshot(state).status == "idle"
    @test isnothing(ScanLab.snapshot(state).result)
    @test_throws ScanLab.ActionError ScanLab.pin_baseline!(state, Dict("runId"=>"missing"))
    @test_throws ScanLab.ActionError ScanLab.comparison(state)
    for preset in (nothing, 1, "", "other", [], Dict())
        @test_throws ScanLab.ActionError ScanLab.begin_run!(state, Dict("preset"=>preset))
        @test ScanLab.snapshot(state).status == "idle"
    end
    ScanLab.select_preset!(state, Dict("preset"=>"gentle"))
    @test ScanLab.snapshot(state).selectedPreset == "gentle"
    first = ScanLab.begin_run!(state, Dict("preset"=>"still"))
    @test ScanLab.snapshot(state).status == "running"
    @test_throws ScanLab.ActionError ScanLab.begin_run!(state, Dict("preset"=>"gentle"))
    @test_throws ScanLab.ActionError ScanLab.select_preset!(state, Dict("preset"=>"larger"))
    @test_throws ScanLab.ActionError ScanLab.pin_baseline!(state, Dict("runId"=>first.id))
    @test_throws ScanLab.ActionError ScanLab.comparison(state)
    ScanLab.execute_run!(state, first; compute=fake_compute)
    @test ScanLab.snapshot(state).status == "succeeded"
    @test_throws ScanLab.ActionError ScanLab.pin_baseline!(state, Dict("runId"=>"stale"))
    ScanLab.pin_baseline!(state, Dict("runId"=>first.id); actor="you")
    kept = last(ScanLab.snapshot(state).activity)
    @test kept["kind"] == "reference_kept"
    @test kept["actor"] == "you"
    @test kept["runId"] == first.id
    @test ScanLab.snapshot(state).changes.sameRun
    detached = ScanLab.snapshot(state)
    detached.result["pixels"][1][1] = 900
    detached.baseline["pixels"][1][1] = 800
    @test ScanLab.snapshot(state).baseline["pixels"] == [[1.0]]
    @test ScanLab.snapshot(state).result["pixels"] == [[1.0]]

    second = ScanLab.begin_run!(state, Dict("preset"=>"gentle"))
    @test second.id != first.id
    ScanLab.execute_run!(state, second; compute=fake_compute)
    @test ScanLab.snapshot(state).baseline["id"] == first.id
    @test ScanLab.snapshot(state).result["id"] == second.id
    @test ScanLab.comparison(state).current["id"] == second.id
    @test ScanLab.comparison(state).baseline["id"] == first.id
    @test ScanLab.comparison(state).changes.baselineRunId == first.id
    @test ScanLab.comparison(state).changes.currentRunId == second.id
    @test !ScanLab.snapshot(state).changes.sameRun
    @test ScanLab.snapshot(state).changes.identical

    failures = []
    third = ScanLab.begin_run!(state, Dict("preset"=>"larger"))
    ScanLab.execute_run!(state, third;
        compute=(preset; run_id)->error("Synthetic injected failure"),
        logger=(error, trace)->push!(failures, error))
    failed = ScanLab.snapshot(state)
    @test length(failures) == 1
    @test failed.status == "failed"
    @test failed.activeRunId == third.id
    @test failed.result["id"] == second.id
    @test failed.baseline["id"] == first.id
    @test occursin("previous result", failed.error)

    calls = Ref(0)
    for _ in 1:2
        job = ScanLab.begin_run!(state, Dict("preset"=>"still"))
        ScanLab.execute_run!(state, job; compute=(preset; run_id)->begin
            calls[] += 1
            fake_compute(preset; run_id)
        end)
    end
    @test calls[] == 2
    @test ScanLab.snapshot(state).baseline["id"] == first.id
end

@testset "Activity, revision and change measurements" begin
    state = ScanLab.SessionState()
    @test ScanLab.snapshot(state).workflowVersion == "dicom-v2"
    @test ScanLab.snapshot(state).revision == 0
    @test isempty(ScanLab.snapshot(state).activity)
    @test isnothing(ScanLab.snapshot(state).changes)

    ScanLab.select_preset!(state, Dict("preset"=>"still"); actor="you")
    @test isempty(ScanLab.snapshot(state).activity)
    ScanLab.select_preset!(state, Dict("preset"=>"gentle"); actor="you")
    entry = only(ScanLab.snapshot(state).activity)
    @test (entry["kind"], entry["actor"], entry["label"]) == ("preset", "you", "Controlled shift")
    @test endswith(entry["at"], "Z")

    for actor in ("admin", "", "COPILOT", nothing)
        @test_throws ScanLab.ActionError ScanLab.begin_run!(state, Dict("preset"=>"still"); actor)
    end
    @test ScanLab.snapshot(state).status == "idle"
    @test length(ScanLab.snapshot(state).activity) == 1

    job = ScanLab.begin_run!(state, Dict("preset"=>"still"); actor="copilot")
    @test job.actor == "copilot"
    @test ScanLab.status_snapshot(state).status == "running"
    @test ScanLab.status_snapshot(state).activeRunId == job.id
    @test isnothing(ScanLab.status_snapshot(state).resultId)
    ScanLab.execute_run!(state, job; compute=fake_compute)
    done = ScanLab.snapshot(state)
    @test [(item["kind"], item["actor"]) for item in done.activity] ==
        [("preset", "you"), ("scan_started", "copilot"), ("scan_done", "copilot")]
    @test done.result["requestedBy"] == "copilot"
    @test done.revision == 3
    @test ScanLab.status_snapshot(state).resultId == job.id
    @test ScanLab.status_snapshot(state).revision == done.revision

    failing = ScanLab.begin_run!(state, Dict("preset"=>"larger"))
    @test failing.actor == "script"
    ScanLab.execute_run!(state, failing; compute=(preset; run_id)->error("Synthetic injected failure"),
        logger=(error, trace)->nothing)
    failed = ScanLab.snapshot(state)
    @test (last(failed.activity)["kind"], last(failed.activity)["actor"]) == ("scan_failed", "script")
    @test failed.result["id"] == job.id
    @test ScanLab.status_snapshot(state).error == failed.error

    crowded = ScanLab.SessionState()
    for index in 1:(ScanLab.ACTIVITY_LIMIT + 10)
        ScanLab.select_preset!(crowded, Dict("preset"=>isodd(index) ? "gentle" : "larger"))
    end
    kept = ScanLab.snapshot(crowded)
    @test length(kept.activity) == ScanLab.ACTIVITY_LIMIT
    @test kept.revision == ScanLab.ACTIVITY_LIMIT + 10
    @test last(kept.activity)["preset"] == "larger"

    before = Dict{String,Any}("id"=>"a", "pixels"=>[[0.0, 0.5], [0.25, 1.0]])
    after = Dict{String,Any}("id"=>"b", "pixels"=>[[0.0, 0.6], [0.5, 0.75]])
    changes = ScanLab.compare_results(before, after)
    @test (changes.baselineRunId, changes.currentRunId, changes.sameRun, changes.identical) == ("a", "b", false, false)
    @test changes.threshold == 0.05
    @test (changes.totalPixels, changes.changedPixels) == (4, 3)
    @test changes.changedPixelsPercent ≈ 75
    @test changes.meanChangePercent ≈ 15 atol=1e-9
    @test changes.maxChangePercent ≈ 25
    same = ScanLab.compare_results(before, before)
    @test same.sameRun && same.identical
    @test (same.changedPixels, same.meanChangePercent, same.maxChangePercent) == (0, 0.0, 0.0)
    @test isnothing(ScanLab.compare_results(before, Dict{String,Any}("id"=>"c", "pixels"=>[[0.0]])))
    @test isnothing(ScanLab.compare_results(nothing, after))
    @test isnothing(ScanLab.compare_results(before, nothing))
end
