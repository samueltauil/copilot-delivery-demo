using Test, HTTP, JSON, LinearAlgebra, SHA
include(joinpath(@__DIR__, "..", "..", "src", "scanlab", "ScanLab.jl"))
using .ScanLab

include("science.jl")
include("state.jl")
include("server.jl")
