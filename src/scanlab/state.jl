struct ActionError <: Exception
    status::Int
    message::String
end

Base.showerror(io::IO, error::ActionError) = print(io, error.message)

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
end

SessionState() = SessionState(ReentrantLock(), string(uuid4()), "still", "idle", nothing, nothing, nothing, nothing, "idle")

function snapshot(state::SessionState)
    lock(state.lock) do
        (workflowVersion="dicom-v1", instanceId=state.instance_id, selectedPreset=state.selected, status=state.status,
            activeRunId=state.active_id, result=deepcopy(state.result),
            baseline=deepcopy(state.baseline), error=state.error, stage=state.stage, presets=PRESETS)
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

function select_preset!(state, input)
    id = require_preset(input)
    lock(state.lock) do
        state.status == "running" && throw(ActionError(409, "A simulation is already running."))
        state.selected = id
    end
    snapshot(state)
end

function begin_run!(state, input)
    id = require_preset(input)
    lock(state.lock) do
        state.status == "running" && throw(ActionError(409, "A simulation is already running."))
        state.selected = id
        state.status = "running"
        state.active_id = string(uuid4())
        state.error = nothing
        state.stage = "simulating"
        return (id=state.active_id, preset=id)
    end
end

function execute_run!(state, job; compute=simulate_experiment,
                      logger=(error, trace)->@error("Simulation failed", exception=(error,trace)))
    try
        progress = stage -> lock(state.lock) do
            state.active_id == job.id || error("Progress does not match the active run.")
            state.stage = stage
        end
        result = compute === simulate_experiment ?
            compute(job.preset; run_id=job.id, progress) : compute(job.preset; run_id=job.id)
        result["id"] == job.id || error("Simulation returned the wrong run identity.")
        lock(state.lock) do
            state.active_id == job.id || error("Simulation completion does not match the active run.")
            state.result = result
            state.status = "succeeded"
            state.stage = "complete"
        end
    catch error
        logger(error, catch_backtrace())
        lock(state.lock) do
            if state.active_id == job.id
                state.status = "failed"
                state.stage = "failed"
                state.error = "Acquisition or DICOM verification failed. The previous result, if shown, is not this run. See the local diagnostic log."
            end

        end
    end
    nothing
end

function pin_baseline!(state, input)
    lock(state.lock) do
        state.status == "running" && throw(ActionError(409, "Wait for the active simulation before pinning."))
        isnothing(state.result) && throw(ActionError(409, "Run a successful experiment before pinning a baseline."))
        get(input, "runId", nothing) == state.result["id"] ||
            throw(ActionError(409, "The requested result is not the latest completed run."))
        state.baseline = deepcopy(state.result)
    end
    snapshot(state)
end

function comparison(state)
    lock(state.lock) do
        state.status == "running" && throw(ActionError(409, "Wait for the active simulation before exporting."))
        isnothing(state.result) && throw(ActionError(409, "There is no completed result to export."))
        (schemaVersion=1, synthetic=true, clinicalUse=false, instanceId=state.instance_id,
            current=deepcopy(state.result), baseline=deepcopy(state.baseline))
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
