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
        @test request("GET", "/api/dicom/00000000-0000-4000-8000-000000000001"; token="wrong").status == 403
        @test request("GET", "/api/dicom/00000000-0000-4000-8000-000000000001").status == 404
        @test request("GET", "/api/dicom/not-a-run").status == 400
        for path in ("/", "/app.js", "/styles.css", "/plotly.js")
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
    end
end
