using Test, HTTP, JSON, SQLite, DBInterface, SHA, Logging
include(joinpath(@__DIR__, "..", "src", "ResearchDesk.jl"))
using .ResearchDesk

include("requests.jl")
include("server.jl")
include("study.jl")
