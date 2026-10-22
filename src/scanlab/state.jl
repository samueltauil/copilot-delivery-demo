struct ActionError <: Exception
    status::Int
    message::String
end

Base.showerror(io::IO, error::ActionError) = print(io, error.message)

const WORKFLOW_VERSION = "dicom-v2"
# Who asked for an action. Self-reported by the client for display only; it is not authentication.
const ACTORS = ("you", "copilot", "script")
const ACTIVITY_LIMIT = 40
# "Changed" means a pixel moved by more than 5% of the 0-1 display range.
const CHANGE_THRESHOLD = 0.05

mutable struct SessionState
    lock::ReentrantLock
    instance_id::String
    selected::String
    status::String
    active_id::Union{Nothing,String}
    result::Union{Nothing,Dict{String,Any}}
    baseline::Union{Nothing,Dict{String,Any}}
    error::Union{Nothing,String}
    stage::String
    revision::Int
    activity::Vector{Dict{String,Any}}
end

SessionState() = SessionState(ReentrantLock(), string(uuid4()), "still", "idle", nothing, nothing, nothing, nothing, "idle",
    0, Dict{String,Any}[])

function require_actor(actor)
    actor in ACTORS || throw(ActionError(400, "Unknown actor. Use you, copilot or script."))
    String(actor)
end

# Every visible change bumps `revision`, so clients can poll a tiny status and fetch images only when needed.
function record!(state::SessionState, kind, actor; fields...)
    lock(state.lock) do
        entry = Dict{String,Any}("at"=>string(now(UTC))*"Z", "kind"=>kind, "actor"=>actor)
        for (key, value) in fields
            entry[String(key)] = value
        end
        push!(state.activity, entry)
        length(state.activity) > ACTIVITY_LIMIT && deleteat!(state.activity, 1:length(state.activity)-ACTIVITY_LIMIT)
        state.revision += 1
    end
    nothing
end

# Real results always name their preset; minimal results (such as test doubles) may not.
function preset_fields(result)
    id = get(result, "preset", nothing)
    (id isa AbstractString && any(preset -> preset.id == id, PRESETS)) || return (;)
    (preset=String(id), label=preset_for(id).label)
end

function compare_results(baseline, current)
    (isnothing(baseline) || isnothing(current)) && return nothing
    before = reduce(vcat, baseline["pixels"])
    after = reduce(vcat, current["pixels"])
    length(before) == length(after) || return nothing
    differences = abs.(after .- before)
    total = length(differences)
    changed = count(>(CHANGE_THRESHOLD), differences)
    (baselineRunId=baseline["id"], currentRunId=current["id"], sameRun=baseline["id"] == current["id"],
        identical=all(iszero, differences), threshold=CHANGE_THRESHOLD, totalPixels=total, changedPixels=changed,
        changedPixelsPercent=100 * changed / total, meanChangePercent=100 * sum(differences) / total,
        maxChangePercent=100 * maximum(differences))
end

function snapshot(state::SessionState)
    lock(state.lock) do
        (workflowVersion=WORKFLOW_VERSION, instanceId=state.instance_id, revision=state.revision,
            selectedPreset=state.selected, status=state.status, activeRunId=state.active_id,
            result=deepcopy(state.result), baseline=deepcopy(state.baseline),
            changes=compare_results(state.baseline, state.result), error=state.error, stage=state.stage,
            activity=deepcopy(state.activity), presets=PRESETS)
    end
end

# Small enough to poll every few hundred milliseconds; the browser fetches the full state when ids change.
function status_snapshot(state::SessionState)
    lock(state.lock) do
        (workflowVersion=WORKFLOW_VERSION, instanceId=state.instance_id, revision=state.revision,
            selectedPreset=state.selected, status=state.status, activeRunId=state.active_id,
            resultId=isnothing(state.result) ? nothing : state.result["id"],
            baselineId=isnothing(state.baseline) ? nothing : state.baseline["id"],
            error=state.error, stage=state.stage, activity=deepcopy(state.activity))
    end
end

function require_preset(input)
    id = get(input, "preset", nothing)
    try
        preset_for(id)
    catch error
        error isa ArgumentError || rethrow()
        throw(ActionError(400, "Choose a known preset."))
    end
    String(id)
end

function select_preset!(state, input; actor="script")
    id = require_preset(input)
    actor = require_actor(actor)
    lock(state.lock) do
        state.status == "running" && throw(ActionError(409, "A simulation is already running."))
        if state.selected != id
            state.selected = id
            record!(state, "preset", actor; preset=id, label=preset_for(id).label)
        end
    end
    snapshot(state)
end

function begin_run!(state, input; actor="script")
    id = require_preset(input)
    actor = require_actor(actor)
    lock(state.lock) do
        state.status == "running" && throw(ActionError(409, "A simulation is already running."))
        state.selected = id
        state.status = "running"
        state.active_id = string(uuid4())
        state.error = nothing
        state.stage = "simulating"
        record!(state, "scan_started", actor; runId=state.active_id, preset=id, label=preset_for(id).label)
        return (id=state.active_id, preset=id, actor=actor)
    end
end

function fail_run!(state, job, message)
    lock(state.lock) do
        if state.active_id == job.id
            state.status = "failed"
            state.stage = "failed"
            state.error = message
            record!(state, "scan_failed", job.actor; runId=job.id, preset=job.preset, label=preset_for(job.preset).label)
        end
    end
    nothing
end

function execute_run!(state, job; compute=simulate_experiment,
                      logger=(error, trace)->@error("Simulation failed", exception=(error,trace)))
    try
        progress = stage -> lock(state.lock) do
            state.active_id == job.id || error("Progress does not match the active run.")
            state.stage = stage
            state.revision += 1
        end
        result = compute === simulate_experiment ?
            compute(job.preset; run_id=job.id, progress) : compute(job.preset; run_id=job.id)
        result["id"] == job.id || error("Simulation returned the wrong run identity.")
        # Display-only attribution; it is not part of the result hashes.
        result["requestedBy"] = job.actor
        lock(state.lock) do
            state.active_id == job.id || error("Simulation completion does not match the active run.")
            state.result = result
            state.status = "succeeded"
            state.stage = "complete"
            record!(state, "scan_done", job.actor; runId=job.id, preset=job.preset,
                label=preset_for(job.preset).label, computeSeconds=get(result, "computeSeconds", nothing))
        end
    catch error
        logger(error, catch_backtrace())
        fail_run!(state, job, "Acquisition or DICOM verification failed. The previous result, if shown, is not this run. See the local diagnostic log.")
    end
    nothing
end

function pin_baseline!(state, input; actor="script")
    actor = require_actor(actor)
    lock(state.lock) do
        state.status == "running" && throw(ActionError(409, "Wait for the active simulation before pinning."))
        isnothing(state.result) && throw(ActionError(409, "Run a successful experiment before pinning a baseline."))
        get(input, "runId", nothing) == state.result["id"] ||
            throw(ActionError(409, "The requested result is not the latest completed run."))
        state.baseline = deepcopy(state.result)
        record!(state, "reference_kept", actor; runId=state.baseline["id"], preset_fields(state.baseline)...)
    end
    snapshot(state)
end

function comparison(state)
    lock(state.lock) do
        state.status == "running" && throw(ActionError(409, "Wait for the active simulation before exporting."))
        isnothing(state.result) && throw(ActionError(409, "There is no completed result to export."))
        (schemaVersion=2, synthetic=true, clinicalUse=false, instanceId=state.instance_id,
            current=deepcopy(state.result), baseline=deepcopy(state.baseline),
            changes=compare_results(state.baseline, state.result), activity=deepcopy(state.activity))
    end
end

function dicom_file(state, run_id)
    lock(state.lock) do
        for result in (state.result, state.baseline)
            if !isnothing(result) && result["id"] == run_id
                haskey(result, "dicom") || throw(ActionError(409, "This result has no verified DICOM file."))
                return base64decode(result["dicom"]["fileBase64"])
            end
        end
        throw(ActionError(404, "This run is not the current or pinned acquisition."))
    end
end
