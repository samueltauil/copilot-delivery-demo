@testset "Live upstream imaging" begin
    results = [ScanLab.simulate_experiment(p.id) for p in ScanLab.PRESETS]
    matrices = [reduce(vcat, permutedims.(r["pixels"])) for r in results]
    for result in results
        @test result["synthetic"] === true
        @test length(result["pixels"]) == 33
        @test all(row -> length(row) == 33 && all(isfinite, row), result["pixels"])
        @test result["parameters"].backend == "CPU"
        @test result["parameters"].spins == 485
        @test result["parameters"].displayRange == [0, 1]
        @test result["computeSeconds"] > 0
        @test length(result["resultHash"]) == 64
        @test length(result["inputHash"]) == 64
        @test result["manifestHash"] == bytes2hex(open(sha256, ScanLab.MANIFEST_PATH))
        @test result["figure"]["data"][1]["type"] == "heatmap"
        @test result["figure"]["data"][1]["zmin"] == 0
        @test result["figure"]["data"][1]["zmax"] == 1
    end
    repeated = ScanLab.simulate_experiment("still")
    @test repeated["id"] != results[1]["id"]
    @test repeated["inputHash"] == results[1]["inputHash"]
    @test repeated["pixels"] == results[1]["pixels"]
    @test isapprox(norm(matrices[2] - matrices[1]) / norm(matrices[1]), 0.34171286; rtol=1e-3)
    @test isapprox(norm(matrices[3] - matrices[1]) / norm(matrices[1]), 0.478424; rtol=1e-3)

    # Invoke the maintained libraries independently to verify the adapter's result.
    object, sequence, scanner = ScanLab.experiment_inputs("still")
    raw = ScanLab.simulate(object, sequence, scanner;
        sim_params=Dict{String,Any}("gpu"=>false, "Nthreads"=>1, "precision"=>"f64"), verbose=false)
    acquisition = ScanLab.AcquisitionData(raw)
    acquisition.traj[1].circular = false
    reference = ScanLab.reconstruction(acquisition, Dict{Symbol,Any}(:reco=>"direct", :reconSize=>(33,33)))
    @test isapprox(matrices[1], abs.(reference[:, :, 1]); atol=5e-6, rtol=5e-5)
    @test_throws ArgumentError ScanLab.simulate_experiment("unbounded-custom-model")
    @test_throws ArgumentError ScanLab.preset_for(nothing)
    @test isfile(ScanLab.plotly_asset())
end
