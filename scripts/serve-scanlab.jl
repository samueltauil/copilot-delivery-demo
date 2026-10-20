include(joinpath(@__DIR__, "..", "src", "scanlab", "ScanLab.jl"))
using .ScanLab

try
    Threads.nthreads() >= 2 || error("ScanLab needs two Julia threads to keep the UI responsive during simulation.")
    println(stderr, "Preparing the live simulation paths; no result will be retained.")
    ScanLab.plotly_asset()
    ScanLab.warmup()
    state = ScanLab.SessionState()
    token = string(ScanLab.uuid4())
    origin = Ref("")
    app = ScanLab.create_app(state; token, origin)
    for path in ("/api/state", "/", "/app.js", "/styles.css", "/plotly.js")
        response = app(ScanLab.HTTP.Request("GET", path, ["x-scanlab-token"=>token]))
        response.status == 200 || error("Startup validation failed for $path.")
    end
    server = ScanLab.start_server(app; port=0)
    origin[] = "http://127.0.0.1:$(ScanLab.HTTP.port(server))"
    readiness = ScanLab.HTTP.get(origin[] * "/api/state",
        ["x-scanlab-token"=>token, "connection"=>"close"]; retry=false)
    readiness.status == 200 || error("Local readiness request failed.")
    println("SCANLAB_READY " * ScanLab.JSON.json((url=origin[], token, instanceId=state.instance_id, pid=getpid())))
    flush(stdout)
    wait(server)
catch error
    @error "ScanLab startup failed" exception=(error, catch_backtrace())
    exit(1)
end
