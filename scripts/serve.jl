include(joinpath(@__DIR__, "..", "src", "ResearchDesk.jl"))
using .ResearchDesk

try
    port = tryparse(Int, get(ENV, "PORT", "3000"))
    !isnothing(port) && 1 <= port <= 65535 || error("PORT must be an integer between 1 and 65535.")
    app = ResearchDesk.create_ready_app()
    server = ResearchDesk.start_server(app; port)
    println("Synthetic research desk: http://127.0.0.1:$port")
    wait(server)
catch error
    @error "Demo server failed" exception = (error, catch_backtrace())
    exit(1)
end
