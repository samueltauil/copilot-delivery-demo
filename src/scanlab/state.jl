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
end

SessionState() = SessionState(ReentrantLock(), string(uuid4()), "still", "idle", nothing, nothing, nothing, nothing)

function snapshot(state::SessionState)
    lock(state.lock) do
        (instanceId=state.instance_id, selectedPreset=state.selected, status=state.status,
            activeRunId=state.active_id, result=deepcopy(state.result),
            baseline=deepcopy(state.baseline), error=state.error, presets=PRESETS)
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
        return (id=state.active_id, preset=id)
    end
end

function execute_run!(state, job; compute=simulate_experiment,
                      logger=(error, trace)->@error("Simulation failed", exception=(error,trace)))
    try
        result = compute(job.preset; run_id=job.id)
        result["id"] == job.id || error("Simulation returned the wrong run identity.")
        lock(state.lock) do
            state.active_id == job.id || error("Simulation completion does not match the active run.")
            state.result = result
            state.status = "succeeded"
        end
    catch error
        logger(error, catch_backtrace())
        lock(state.lock) do
            if state.active_id == job.id
                state.status = "failed"
                state.error = "Simulation failed. The previous result, if shown, is not this run. See the local diagnostic log."
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
