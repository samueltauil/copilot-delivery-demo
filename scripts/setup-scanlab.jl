using Pkg
Pkg.instantiate()
include(joinpath(@__DIR__, "..", "src", "scanlab", "ScanLab.jl"))
ScanLab.plotly_asset()
println("ScanLab dependencies and pinned plotting assets are prepared.")
