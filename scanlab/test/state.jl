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
    ScanLab.pin_baseline!(state, Dict("runId"=>first.id))
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
