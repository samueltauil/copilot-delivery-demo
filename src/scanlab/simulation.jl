const RESOLUTION = 33
const FOV_METERS = 0.23
const MODEL_VERSION = "analytical-phantom-epi-v1"
const PRESETS = (
    (id="still", label="No motion", motionMm=0, description="The reference acquisition."),
    (id="gentle", label="Controlled shift", motionMm=8, description="An 8 mm translation during readout."),
    (id="larger", label="Larger shift", motionMm=16, description="A 16 mm translation during readout."),
)
const MANIFEST_PATH = joinpath(@__DIR__, "..", "..", "scanlab", "Manifest.toml")

function preset_for(id)
    id isa AbstractString || throw(ArgumentError("Choose a known preset."))
    index = findfirst(p -> p.id == id, PRESETS)
    isnothing(index) && throw(ArgumentError("Choose a known preset."))
    PRESETS[index]
end

function analytical_phantom()
    positions = range(-FOV_METERS / 2, FOV_METERS / 2; length=RESOLUTION)
    x, y, rho = Float64[], Float64[], Float64[]
    for py in positions, px in positions
        radius = (px / 0.080)^2 + (py / 0.100)^2
        radius > 1 && continue
        density = radius > 0.82 ? 0.9 : 0.55
        if ((px - 0.024) / 0.013)^2 + ((py + 0.006) / 0.038)^2 < 1 ||
           ((px + 0.024) / 0.013)^2 + ((py + 0.006) / 0.038)^2 < 1
            density = 0.15
        end
        ((px - 0.018) / 0.017)^2 + ((py - 0.047) / 0.016)^2 < 1 && (density = 1.0)
        push!(x, px)
        push!(y, py)
        push!(rho, density)
    end
    Phantom(; name="ScanLab analytical phantom", x, y, ρ=rho,
        T1=fill(1.0, length(x)), T2=fill(0.12, length(x)))
end

function experiment_inputs(id)
    preset = preset_for(id)
    scanner = Scanner()
    readout = PulseDesigner.EPI(FOV_METERS, RESOLUTION, scanner)
    excitation = PulseDesigner.RF_hard(scanner.limits.B1,
        1 / (4 * γ * scanner.limits.B1), scanner)
    sequence = excitation + Delay(0.025) + readout
    object = analytical_phantom()
    if preset.motionMm > 0
        object.motion = translate(preset.motionMm / 1000, 0.0, 0.0,
            TimeRange(dur(excitation) + 0.025, dur(sequence)))
    end
    return object, sequence, scanner
end

function compute_image(id)
    object, sequence, scanner = experiment_inputs(id)
    raw = simulate(object, sequence, scanner;
        sim_params=Dict{String,Any}("gpu"=>false, "Nthreads"=>1, "precision"=>"f64"),
        verbose=false)
    acquisition = AcquisitionData(raw)
    acquisition.traj[1].circular = false
    reconstructed = reconstruction(acquisition,
        Dict{Symbol,Any}(:reco=>"direct", :reconSize=>(RESOLUTION, RESOLUTION)))
    image = Array(abs.(reconstructed[:, :, 1]))
    size(image) == (RESOLUTION, RESOLUTION) && all(isfinite, image) ||
        error("Reconstruction did not produce a finite image of the expected shape.")
    return image, sequence, length(object)
end

function image_figure(image)
    plot = plot_image(image; zmin=0, zmax=1, height=370, darkmode=true,
        colorscale=[[0, "#000000"], [1, "#ffffff"]])
    JSON.parse(JSON.json(plot); dicttype=Dict{String,Any})
end

function simulate_experiment(id; run_id=string(uuid4()))
    preset = preset_for(id)
    elapsed = @elapsed image, sequence, spins = compute_image(id)
    parameters = (
        modelVersion=MODEL_VERSION, phantom="Analytical geometry; no patient-derived data",
        resolution=RESOLUTION, fovMeters=FOV_METERS, motionMm=preset.motionMm,
        motionAxis="x", motionStartSeconds=dur(sequence) - dur(PulseDesigner.EPI(FOV_METERS, RESOLUTION, Scanner())),
        motionEndSeconds=dur(sequence), acquisitionSeconds=dur(sequence),
        relaxationT1Seconds=1.0, relaxationT2Seconds=0.12,
        spins, backend="CPU", simulationPrecision="f64", reconstructionPrecision=string(eltype(image)),
        reconstruction="MRIReco direct", intensityUnit="arbitrary units", displayRange=[0,1],
    )
    pixels = [collect(row) for row in eachrow(image)]
    Dict{String,Any}(
        "id"=>run_id, "preset"=>preset.id, "label"=>preset.label, "synthetic"=>true,
        "completedAt"=>string(now(UTC))*"Z", "parameters"=>parameters,
        "inputHash"=>bytes2hex(sha256(JSON.json(parameters))),
        "manifestHash"=>bytes2hex(open(sha256, MANIFEST_PATH)),
        "sourceHash"=>bytes2hex(open(sha256, @__FILE__)),
        "resultHash"=>bytes2hex(sha256(JSON.json(pixels))),
        "computeSeconds"=>elapsed, "pixels"=>pixels, "figure"=>image_figure(image),
    )
end

function warmup()
    for preset in PRESETS
        JSON.json(simulate_experiment(preset.id))
    end
    nothing
end

function plotly_asset()
    artifact_file = joinpath(dirname(pathof(KomaMRIPlots)), "..", "Artifacts.toml")
    hash = artifact_hash("plotly-artifacts", artifact_file)
    isnothing(hash) && error("Pinned Plotly artifact is unavailable. Run npm run scanlab:setup.")
    path = joinpath(artifact_path(hash), "plotly.min.js")
    isfile(path) || error("Pinned Plotly asset is missing. Run npm run scanlab:setup.")
    path
end
