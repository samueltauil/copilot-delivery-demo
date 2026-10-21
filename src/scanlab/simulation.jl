const RESOLUTION = 96
const FOV_METERS = 0.23
const PHANTOM_SUBSAMPLING = 3
# Fixed scale (not per-run) so intensity loss from motion stays visible in the 0–1 window.
const INTENSITY_SCALE = 3.0
const MODEL_VERSION = "brainweb-phantom-epi-v1"
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

# KomaMRI's bundled BrainWeb-derived digital brain phantom (1.5 mm spin spacing).
brain_phantom() = brain_phantom2D(; axis="axial", ss=PHANTOM_SUBSAMPLING)

# Rotate the reconstruction grid so anterior is at the top, then apply the fixed scale.
orient(image) = rotr90(image) ./ INTENSITY_SCALE

function experiment_inputs(id)
    preset = preset_for(id)
    scanner = Scanner()
    readout = PulseDesigner.EPI(FOV_METERS, RESOLUTION, scanner)
    excitation = PulseDesigner.RF_hard(scanner.limits.B1,
        1 / (4 * γ * scanner.limits.B1), scanner)
    sequence = excitation + Delay(0.025) + readout
    object = brain_phantom()
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
    # NFFT's threaded gridding sums in a varying order, which can flip 16-bit
    # rounding between identical runs; keep reconstruction single-threaded.
    MRIReco.MRIOperators.NFFT._use_threads[] = false
    reconstructed = reconstruction(acquisition,
        Dict{Symbol,Any}(:reco=>"direct", :reconSize=>(RESOLUTION, RESOLUTION)))
    image = orient(Array(abs.(reconstructed[:, :, 1])))
    size(image) == (RESOLUTION, RESOLUTION) && all(isfinite, image) ||
        error("Reconstruction did not produce a finite image of the expected shape.")
    return image, sequence, length(object)
end

function image_figure(image)
    # plot_image draws image[i, j] at x=i, y=j (upwards); rotate so the figure
    # shows the stored row-major DICOM matrix with row 1 at the top.
    plot = plot_image(rotr90(image); zmin=0, zmax=1, height=370, darkmode=true,
        colorscale=[[0, "#000000"], [1, "#ffffff"]])
    JSON.parse(JSON.json(plot); dicttype=Dict{String,Any})
end

function simulate_experiment(id; run_id=string(uuid4()), progress=(_)->nothing)
    preset = preset_for(id)
    progress("simulating")
    elapsed = @elapsed image, sequence, spins = compute_image(id)
    parameters = (
        modelVersion=MODEL_VERSION,
        phantom="KomaMRI brain_phantom2D (BrainWeb-derived digital phantom, axial); no patient record",
        phantomSpacingMm=0.5 * PHANTOM_SUBSAMPLING,
        resolution=RESOLUTION, fovMeters=FOV_METERS, motionMm=preset.motionMm,
        motionAxis="left-right (simulation x)", motionStartSeconds=dur(sequence) - dur(PulseDesigner.EPI(FOV_METERS, RESOLUTION, Scanner())),
        motionEndSeconds=dur(sequence), acquisitionSeconds=dur(sequence),
        tissueProperties="KomaMRI default BrainWeb tissue ρ/T1/T2/T2*",
        spins, backend="CPU", simulationPrecision="f64", reconstructionPrecision=string(eltype(image)),
        reconstruction="MRIReco direct", intensityUnit="arbitrary units",
        intensityScale=INTENSITY_SCALE, displayRange=[0,1],
    )
    source_pixels = pixel_rows(image)
    roundtrip_seconds = @elapsed decoded, dicom = dicom_roundtrip(image; run_id, label=preset.label, progress)
    pixels = pixel_rows(decoded)
    Dict{String,Any}(
        "id"=>run_id, "preset"=>preset.id, "label"=>preset.label, "synthetic"=>true,
        "completedAt"=>string(now(UTC))*"Z", "parameters"=>parameters,
        "inputHash"=>bytes2hex(sha256(JSON.json(parameters))),
        "manifestHash"=>bytes2hex(open(sha256, MANIFEST_PATH)),
        "sourceHash"=>bytes2hex(sha256(vcat(read(@__FILE__), read(joinpath(@__DIR__, "dicom.jl"))))),
        "simulationResultHash"=>bytes2hex(sha256(JSON.json(source_pixels))),
        "resultHash"=>bytes2hex(sha256(JSON.json(pixels))),
        "computeSeconds"=>elapsed, "roundtripSeconds"=>roundtrip_seconds,
        "dicom"=>dicom, "pixels"=>pixels, "figure"=>image_figure(decoded),
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
