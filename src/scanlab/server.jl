const PUBLIC_DIR = joinpath(@__DIR__, "..", "..", "public", "scanlab")
const STATIC_ASSETS = Dict(
    "/" => ("index.html", "text/html; charset=utf-8"),
    "/app.js" => ("app.js", "text/javascript; charset=utf-8"),
    "/styles.css" => ("styles.css", "text/css; charset=utf-8"),
)

function parse_input(request)
    media = lowercase(strip(first(split(HTTP.header(request, "Content-Type"), ';'))))
    media == "application/json" || throw(ActionError(415, "Content-Type must be application/json."))
    value = try
        JSON.parse(request.body; dicttype=Dict{String,Any}, allownan=false)
    catch error
        error isa ArgumentError || rethrow()
        throw(ActionError(400, "Request body must be valid JSON."))
    end
    value isa AbstractDict || throw(ActionError(400, "Request body must be a JSON object."))
    value
end

function create_app(state=SessionState(); token=string(uuid4()), compute=simulate_experiment,
                    launch=(f)->Threads.@spawn(f()), origin=Ref(""),
                    asset=plotly_asset(), logger=(error, trace)->@error("ScanLab request failed", exception=(error,trace)))
    function handler(request)
        try
            path = HTTP.URI(request.target).path
            if startswith(path, "/api/")
                HTTP.header(request, "x-scanlab-token") == token ||
                    throw(ActionError(403, "This request does not belong to the active demo session."))
                request_origin = HTTP.header(request, "Origin")
                isempty(request_origin) || request_origin == origin[] ||
                    throw(ActionError(403, "This origin is not permitted."))
                if path == "/api/state" && request.method == "GET"
                    return json_response(200, snapshot(state))
                elseif path == "/api/compare" && request.method == "GET"
                    return json_response(200, comparison(state);
                        headers=["content-disposition"=>"attachment; filename=\"scanlab-comparison.json\""])
                elseif startswith(path, "/api/dicom/")
                    request.method == "GET" || return error_response(405, "Method not allowed."; headers=["allow"=>"GET"])
                    run_id = path[length("/api/dicom/")+1:end]
                    occursin(r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$", run_id) ||
                        throw(ActionError(400, "Provide an exact acquisition run ID."))
                    return HTTP.Response(200, [
                        "content-type"=>"application/dicom", "cache-control"=>"no-store",
                        "x-content-type-options"=>"nosniff",
                        "content-disposition"=>"attachment; filename=\"scanlab-$run_id.dcm\"",
                    ], dicom_file(state, run_id))
                elseif path in ("/api/run", "/api/preset", "/api/pin") && request.method == "POST"
                    input = parse_input(request)
                    expected_key = path == "/api/pin" ? "runId" : "preset"
                    Set(keys(input)) == Set([expected_key]) ||
                        throw(ActionError(400, "Provide only the required $expected_key field."))
                    if path == "/api/run"
                        job = begin_run!(state, input)
                        try
                            launch(() -> execute_run!(state, job; compute, logger))
                        catch error
                            logger(error, catch_backtrace())
                            lock(state.lock) do
                                state.status = "failed"
                                state.stage = "failed"
                                state.error = "The simulation could not start. No new result was created."
                            end
                            throw(ActionError(500, state.error))
                        end
                        return json_response(202, (runId=job.id, preset=job.preset))
                    elseif path == "/api/preset"
                        return json_response(200, select_preset!(state, input))
                    end
                    return json_response(200, pin_baseline!(state, input))
                elseif path in ("/api/state", "/api/compare", "/api/run", "/api/preset", "/api/pin")
                    return error_response(405, "Method not allowed.";
                        headers=["allow" => (path in ("/api/state", "/api/compare") ? "GET" : "POST")])
                end
                return error_response(404, "Not found.")
            elseif haskey(STATIC_ASSETS, path) || path == "/plotly.js"
                request.method == "GET" || return error_response(405, "Method not allowed."; headers=["allow"=>"GET"])
                file, media = path == "/plotly.js" ? (asset, "text/javascript; charset=utf-8") :
                    (joinpath(PUBLIC_DIR, STATIC_ASSETS[path][1]), STATIC_ASSETS[path][2])
                headers = [
                    "content-type"=>media, "x-content-type-options"=>"nosniff", "cache-control"=>"no-store",
                    "content-security-policy"=>"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
                ]
                return HTTP.Response(200, headers, read(file))
            end
            error_response(404, "Not found.")
        catch error
            error isa ActionError && return error_response(error.status, error.message)
            logger(error, catch_backtrace())
            error_response(500, "An unexpected server error occurred.")
        end
    end
    handler
end
