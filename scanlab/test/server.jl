@testset "ScanLab HTTP contracts" begin
    state = ScanLab.SessionState()
    jobs = Function[]
    origin = Ref("")
    app = ScanLab.create_app(state; token="test-session", origin, compute=fake_compute, launch=(f)->push!(jobs,f))
    server = ScanLab.start_server(app; port=0)
    base = origin[] = "http://127.0.0.1:$(HTTP.port(server))"
    function request(method, path; payload=nothing, token="test-session", headers=Pair{String,String}[])
        HTTP.request(method, base * path, ["x-scanlab-token"=>token; headers],
            isnothing(payload) ? "" : JSON.json(payload); retry=false, status_exception=false)
    end
    parse(response) = JSON.parse(response.body)
    try
        @test request("GET", "/api/state"; token="wrong").status == 403
        @test request("GET", "/api/state"; headers=["Origin"=>"https://untrusted.invalid"]).status == 403
        @test request("GET", "/api/state"; headers=["Origin"=>base]).status == 200
        @test request("GET", "/api/status"; token="wrong").status == 403
        status = parse(request("GET", "/api/status"))
        @test status["workflowVersion"] == "dicom-v2"
        @test status["status"] == "idle"
        @test status["revision"] == 0
        @test isnothing(status["resultId"]) && isnothing(status["baselineId"])
        @test !any(key -> key in ("result", "baseline", "figure", "pixels"), keys(status))
        @test request("POST", "/api/status"; payload=Dict()).status == 405
        @test request("GET", "/api/dicom/00000000-0000-4000-8000-000000000001"; token="wrong").status == 403
        @test request("GET", "/api/dicom/00000000-0000-4000-8000-000000000001").status == 404
        @test request("GET", "/api/dicom/not-a-run").status == 400
        for path in ("/", "/app.js", "/story.js", "/styles.css", "/plotly.js")
            response = request("GET", path)
            @test response.status == 200
            @test HTTP.header(response, "x-content-type-options") == "nosniff"
        end
        for path in ("/scanlab/Manifest.toml", "/../src/scanlab/server.jl", "/missing")
            @test request("GET", path).status == 404
        end
        @test request("POST", "/api/run"; payload=Dict("preset"=>"still")).status == 415
        for payload in (nothing, [], true, Dict(), Dict("preset"=>"unknown"), Dict("preset"=>"still", "script"=>"not allowed"))
            @test request("POST", "/api/run"; payload, headers=["content-type"=>"application/json"]).status == 400
            @test ScanLab.snapshot(state).status == "idle"
        end
        response = request("POST", "/api/run"; payload=Dict("preset"=>"still"), headers=["content-type"=>"application/json"])
        @test response.status == 202
        id = parse(response)["runId"]
        @test parse(request("GET", "/api/state"))["activeRunId"] == id
        @test request("POST", "/api/run"; payload=Dict("preset"=>"gentle"), headers=["content-type"=>"application/json"]).status == 409
        @test length(jobs) == 1
        jobs[1]()
        @test parse(request("GET", "/api/state"))["status"] == "succeeded"
        @test request("GET", "/api/dicom/$id").status == 409
        @test request("POST", "/api/pin"; payload=Dict("runId"=>id), headers=["content-type"=>"application/json"]).status == 200
        response = request("GET", "/api/compare")
        @test response.status == 200
        @test occursin("attachment", HTTP.header(response, "content-disposition"))
        @test parse(response)["baseline"]["id"] == id
        @test request("DELETE", "/api/state").status == 405
        @test request("POST", "/"; payload=Dict()).status == 405
    finally
        HTTP.forceclose(server)
    end

    @testset "Rejected launch cannot leave a running session" begin
        state = ScanLab.SessionState()
        errors = []
        app = ScanLab.create_app(state; token="test", launch=(f)->error("Injected scheduling failure"),
            logger=(error, trace)->push!(errors,error))
        response = app(HTTP.Request("POST", "/api/run", ["x-scanlab-token"=>"test","content-type"=>"application/json"],
            collect(codeunits(JSON.json((preset="still",))))))
        @test response.status == 500
        @test ScanLab.snapshot(state).status == "failed"
        @test isnothing(ScanLab.snapshot(state).result)
        @test length(errors) == 1
        @test [entry["kind"] for entry in ScanLab.snapshot(state).activity] == ["scan_started", "scan_failed"]
    end

    @testset "Requests are attributed to who made them" begin
        state = ScanLab.SessionState()
        jobs = Function[]
        app = ScanLab.create_app(state; token="test", compute=fake_compute, launch=(f)->push!(jobs, f))
        function post(path, payload; actor=nothing)
            headers = ["x-scanlab-token"=>"test", "content-type"=>"application/json"]
            isnothing(actor) || push!(headers, "x-scanlab-actor"=>actor)
            app(HTTP.Request("POST", path, headers, collect(codeunits(JSON.json(payload)))))
        end
        read_json(path) = JSON.parse(app(HTTP.Request("GET", path, ["x-scanlab-token"=>"test"])).body)
        @test post("/api/preset", (preset="gentle",); actor="intruder").status == 400
        @test post("/api/run", (preset="gentle",); actor="").status == 400
        @test ScanLab.snapshot(state).status == "idle"
        @test isempty(ScanLab.snapshot(state).activity)
        @test post("/api/preset", (preset="gentle",); actor="you").status == 200
        @test post("/api/run", (preset="gentle",); actor="copilot").status == 202
        jobs[1]()
        @test post("/api/run", (preset="still",)).status == 202
        jobs[2]()
        activity = read_json("/api/state")["activity"]
        @test [(item["kind"], item["actor"]) for item in activity] == [
            ("preset", "you"), ("scan_started", "copilot"), ("scan_done", "copilot"),
            ("scan_started", "script"), ("scan_done", "script")]
        status = read_json("/api/status")
        @test status["revision"] == 5
        @test status["activity"] == activity
        @test status["resultId"] == ScanLab.snapshot(state).result["id"]
    end

    @testset "A running scan never freezes the web server" begin
        # Julia runs the network event loop on thread 1. A scan that lands there starves it, so the
        # page cannot refresh until the scan ends. This is why ScanLab starts Julia with --threads=2,1.
        @test Threads.nthreads(:interactive) >= 1 && Threads.nthreads(:default) >= 1

        worker_pools = Symbol[]
        function busy_compute(preset; run_id)
            push!(worker_pools, Threads.threadpool())
            deadline = time() + 1.5
            total = 0.0
            while time() < deadline
                total += sum(sin, rand(2_000))
            end
            Dict{String,Any}("id"=>run_id, "preset"=>preset, "pixels"=>[[total]], "synthetic"=>true)
        end
        origin = Ref("")
        app = ScanLab.create_app(ScanLab.SessionState(); token="live", origin, compute=busy_compute)
        server = ScanLab.start_server(app; port=0)
        base = origin[] = "http://127.0.0.1:$(HTTP.port(server))"
        call(method, path, body="") = HTTP.request(method, base * path,
            ["x-scanlab-token"=>"live", "content-type"=>"application/json"], body; retry=false, status_exception=false)
        try
            for preset in ("still", "gentle", "larger")
                @test call("POST", "/api/run", JSON.json((preset=preset,))).status == 202
                slowest, mid_scan = 0.0, 0
                while true
                    asked = time()
                    status = JSON.parse(call("GET", "/api/status").body)
                    slowest = max(slowest, time() - asked)
                    status["status"] == "running" || break
                    mid_scan += 1
                    sleep(0.05)
                end
                @test mid_scan >= 3
                @test slowest < 0.5
            end
            @test worker_pools == fill(:default, 3)
        finally
            HTTP.forceclose(server)
        end
    end

    @testset "The startup warm-up takes the real first steps on a throwaway session" begin
        scans = String[]
        function warm_compute(preset; run_id)
            push!(scans, preset)
            Dict{String,Any}("id"=>run_id, "preset"=>preset, "pixels"=>[[1.0, 0.5]], "synthetic"=>true,
                "dicom"=>Dict{String,Any}("fileBase64"=>"RElDTQ=="))
        end
        @test isnothing(ScanLab.warm_requests(; compute=warm_compute))
        @test scans == ["still", "gentle"]

        # A warm-up that cannot finish has to stop startup, never pass quietly.
        failing(preset; run_id) = error("Injected scan failure")
        @test_throws ErrorException ScanLab.warm_requests(; compute=failing, logger=(error, trace)->nothing)
        @test_throws ErrorException ScanLab.warm_requests(; launch=(f)->nothing, timeout=0.2)
    end
end
