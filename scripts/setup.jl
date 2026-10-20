using Pkg
Pkg.instantiate()

using HealthSampleData
include(joinpath(@__DIR__, "..", "src", "ResearchDesk.jl"))

cache = joinpath(@__DIR__, "..", ".demo-runs", "data")
mkpath(cache)
ENV["DATADEPS_LOAD_PATH"] = cache

try
    path = HealthSampleData.Eunomia()
    study = ResearchDesk.load_study(path)
    println("Verified synthetic Eunomia: $(study.totalPeople) people; $(study.cohortPeople) in the tutorial cohort.")
    println("Data cache: $path")
catch error
    @error "Demo setup failed; do not present until setup succeeds" exception = (error, catch_backtrace())
    exit(1)
end
